"""Classes used by the standalone Websocket server."""
from collections import defaultdict
from collections import Hashable
from collections import Iterable
from json import dumps
from json import loads
import logging

from autobahn.asyncio.websocket import WebSocketServerProtocol
from autobahn.websocket.protocol import ConnectionRequest
from pyramid.traversal import resource_path
import colander

from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.websockets import WebSocketError
from adhocracy_core.websockets.schemas import ClientRequestSchema
from adhocracy_core.websockets.schemas import ServerNotification
from adhocracy_core.websockets.schemas import Notification
from adhocracy_core.websockets.schemas import StatusConfirmation
from adhocracy_core.websockets.schemas import ChildNotification
from adhocracy_core.websockets.schemas import VersionNotification


logger = logging.getLogger(__name__)


class ClientTracker():

    """"Keeps track of the clients that want notifications."""

    def __init__(self):
        self._clients2resource_paths = defaultdict(set)
        self._resource_paths2clients = defaultdict(set)

    def is_subscribed(self, client: Hashable, resource: IResource) -> bool:
        """Check whether a client is subscribed to a resource."""
        path = resource_path(resource)
        return (client in self._clients2resource_paths and
                path in self._clients2resource_paths[client])

    def subscribe(self, client: Hashable, resource: IResource) -> bool:
        """Subscribe a client to a resource, if necessary.

        :return: True if the subscription was successful, False if it was
                 unnecessary (the client was already subscribed).
        """
        if self.is_subscribed(client, resource):
            return False
        path = resource_path(resource)
        self._clients2resource_paths[client].add(path)
        self._resource_paths2clients[path].add(client)
        return True

    def unsubscribe(self, client: Hashable, resource: IResource) -> bool:
        """Unsubscribe a client from a resource, if necessary.

        :return: True if the unsubscription was successful, False if it was
                 unnecessary (the client was not subscribed).
        """
        if not self.is_subscribed(client, resource):
            return False
        path = resource_path(resource)
        self._discard_from_set_valued_dict(self._clients2resource_paths,
                                           client,
                                           path)
        self._discard_from_set_valued_dict(self._resource_paths2clients,
                                           path,
                                           client)
        return True

    def _discard_from_set_valued_dict(self, set_valued_dict, key, value):
        """Discard one set member from a defaultdict that has sets as values.

        If the resulting set is empty, it is removed from the set_valued_dict.
        """
        set_valued_dict[key].discard(value)
        if not set_valued_dict[key]:
            del set_valued_dict[key]

    def delete_all_subscriptions(self, client: Hashable):
        """Delete all subscriptions for a client."""
        path_set = self._clients2resource_paths.pop(client, set())
        for path in path_set:
            self._discard_from_set_valued_dict(self._resource_paths2clients,
                                               path, client)

    def iterate_subscribers(self, resource: IResource) -> Iterable:
        """Return an iterator over all clients subscribed to a resource."""
        path = resource_path(resource)
        # 'if' check is necessary to avoid creating spurious empty sets
        if path in self._resource_paths2clients:
            for client in self._resource_paths2clients[path]:
                yield client


class DummyRequest:

    """Dummy :term:`request` to create/resolve resource urls.

    This is needed to de/serialize SchemaNodes with
    :class:`adhocracy_core.schema.ResourceObject` schema type.
    """

    def __init__(self, application_url, root):
        self.application_url = application_url
        """URL prefix used to extract resource paths."""
        self.root = root
        """The root resource to resolve resource paths"""

    def resource_url(self, resource):
        """Return the pyramid resource url."""
        path = resource_path(resource)
        return self.application_url + path + '/'


class ClientCommunicator(WebSocketServerProtocol):

    """Communicates with a client through a WebSocket connection.

    Note that the `zodb_connection` attribute **must** be set
    instances of this class can be used!
    """

    # All instances of this class share the same zodb connection object
    zodb_connection = None
    # All instances of this class share the same tracker
    _tracker = ClientTracker()
    # All instances of this class share the same rest server url
    # This is used to generate the resource URLs. It is equal to the
    # url the adhocracy frontend is using to communicate with the rest server.
    rest_url = 'http://localhost:6541'

    def _create_schema(self, schema_class: colander.Schema):
        """Create schema object and bind `context` and `request`."""
        context = self._get_context()
        request = self._get_dummy_request()
        schema = schema_class()
        return schema.bind(context=context, request=request)

    def _get_dummy_request(self) -> DummyRequest:
        """Return a dummy :term:`request` object to resolve resource paths."""
        context = self._get_context()
        return DummyRequest(self.rest_url, context)

    def _get_context(self) -> IResource:
        """Get a context object to resolve resource paths.

        :raises KeyError: if the zodb root has no app_root child.
        :raises AttributeError: if the `zodb_connection` attribute is None.

        """
        self.zodb_connection.sync()
        root = self.zodb_connection.root()
        return root['app_root']

    def onConnect(self, request: ConnectionRequest):  # noqa
        self._client = request.peer
        self._client_may_send_notifications = self._client_runs_on_localhost()
        logger.debug('Client connecting: %s', self._client)

    def _client_runs_on_localhost(self):
        return any(self._client.startswith(prefix) for prefix in
                   ('localhost:', '127.0.0.1:', '::1:'))

    def onOpen(self):  # noqa
        logger.debug('WebSocket connection to %s open', self._client)

    def onMessage(self, payload: bytes, is_binary: bool):    # noqa
        try:
            json_object = self._parse_message(payload, is_binary)
            if self._handle_if_server_notification(json_object):
                return
            request = self._parse_json_via_schema(json_object,
                                                  ClientRequestSchema)
            self._handle_client_request_and_send_response(request)
        except Exception as err:
            self._send_error_message(err)

    def _parse_message(self, payload: bytes, is_binary: bool) -> object:
        """Parse a client message into a JSON object.

        :raise WebSocketError: if the message doesn't contain UTF-8 encoded
                               text or cannot be parsed as JSON
        """
        if is_binary:
            raise WebSocketError('malformed_message', 'message is binary')
        try:
            text = payload.decode()
            logger.debug('Received text message from client %s: %s',
                         self._client, text)
            return loads(text)
        except ValueError as err:
            raise WebSocketError('malformed_message', err.args[0])

    def _handle_if_server_notification(self, json_object) -> bool:
        """Handle message if it's a notifications from our Pyramid app.

        :return: True if the message is a valid event notification from our
                 Pyramid app and has been handled; False otherwise
        """
        if (self._client_may_send_notifications and
                self._looks_like_event_notification(json_object)):
            notification = self._parse_json_via_schema(json_object,
                                                       ServerNotification)
            self._dispatch_event_notification_to_subscribers(notification)
            return True
        else:
            return False

    def _parse_json_via_schema(self, json_object, schema_class) -> dict:
        try:
            schema = self._create_schema(schema_class)
            return schema.deserialize(json_object)
        except colander.Invalid as err:
            self._raise_if_unknown_field_value('action', err, json_object)
            self._raise_if_unknown_field_value('resource', err, json_object)
            self._raise_invalid_json_from_colander_invalid(err)
        except Exception as err:  # pragma: no cover
            self._raise_invalid_json_from_exception(err)

    def _handle_client_request_and_send_response(self, request: dict):
        action = request['action']
        resource = request['resource']
        self._raise_if_forbidden_request(action, resource)
        update_was_necessary = self._update_resource_subscription(action,
                                                                  resource)
        self._send_status_confirmation(update_was_necessary, action, resource)

    def _send_error_message(self, err: Exception):
        if isinstance(err, WebSocketError):
            error = err.error_type
            details = err.details
        else:  # pragma: no cover
            logger.exception(
                'Unexpected error while handling Websocket request')
            error = 'internal_error'
            details = '{}: {}'.format(err.__class__.__name__, err)
        self._send_json_message({'error': error, 'details': details})

    def _looks_like_event_notification(self, json_object) -> bool:
        return isinstance(json_object, dict) and 'event' in json_object

    def _dispatch_event_notification_to_subscribers(self, notification: dict):
        event = notification['event']
        resource = notification['resource']
        if event == 'created':
            self._dispatch_created_event(resource)
        elif event == 'modified':
            self._dispatch_modified_event(resource)
        elif event == 'deleted':
            self._dispatch_deleted_event(resource)
        else:
            details = 'unknown event: {}'.format(event)
            raise WebSocketError('invalid_json', details)

    def _raise_if_unknown_field_value(self, field_name: str,
                                      err: colander.Invalid,
                                      json_object: dict):
        """Raise an 'unknown_xxx' WebSocketError error if appropriate."""
        errdict = err.asdict()
        if (self._is_only_key(errdict, field_name) and
                field_name in json_object):
            field_value = json_object[field_name]
            raise WebSocketError('unknown_' + field_name, field_value)

    def _is_only_key(self, d: dict, key: str) -> bool:
        return key in d and len(d) == 1

    def _raise_invalid_json_from_colander_invalid(self, err: colander.Invalid):
        errdict = err.asdict()
        errlist = ['{}: {}'.format(k, errdict[k]) for k in errdict.keys()]
        details = ' / '.join(sorted(errlist))
        raise WebSocketError('invalid_json', details)

    def _raise_invalid_json_from_exception(self, err: Exception):
        raise WebSocketError('invalid_json', str(err))  # pragma: no cover

    def _raise_if_forbidden_request(self, action: str, resource: IResource):
        """Raise an error if a client tries to subscribe to an ItemVersion."""
        if action == 'subscribe' and IItemVersion.providedBy(resource):
            request = self._get_dummy_request()
            resource_path = request.resource_url(resource)
            raise WebSocketError('subscribe_not_supported', resource_path)

    def _update_resource_subscription(self, action: str,
                                      resource: str) -> bool:
        """(Un)subscribe this instance to/from a resource.

        :return: True if the request was necessary, False if it was an
                 unnecessary no-op
        """
        if action == 'subscribe':
            return self._tracker.subscribe(self, resource)
        else:
            return self._tracker.unsubscribe(self, resource)

    def _send_status_confirmation(self, update_was_necessary: bool,
                                  action: str, resource: IResource):
        status = 'ok' if update_was_necessary else 'redundant'
        schema = self._create_schema(StatusConfirmation)
        json_message = schema.serialize(
            {'status': status, 'action': action, 'resource': resource})
        self._send_json_message(json_message)

    def _send_json_message(self, json_message: dict):
        """Send a JSON object as message to the client."""
        text = dumps(json_message)
        logger.debug('Sending message to client %s: %s', self._client, text)
        self.sendMessage(text.encode())

    def _dispatch_created_event(self, resource: IResource):
        if IItemVersion.providedBy(resource):
            self._notify_new_version(resource.__parent__, resource)
        else:
            self._notify_new_child(resource.__parent__, resource)

    def _dispatch_modified_event(self, resource: IResource):
        self._notify_resource_modified(resource)
        self._notify_modified_child(resource.__parent__, resource)

    def _dispatch_deleted_event(self, resource: IResource):
        # FIXME Should we also notify subscribers of the deleted resource?
        # That's currently not part of the API.
        self._notify_removed_child(resource.__parent__, resource)

    def _notify_new_version(self, parent: IResource,
                            new_version: IItemVersion):
        """Notify subscribers if a new version has been added to an item."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_new_version_notification(parent, new_version)

    def _notify_new_child(self, parent: IResource, child: IResource):
        """Notify subscribers if a child has been added to a pool or item."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_child_notification('new', parent, child)

    def _notify_resource_modified(self, resource: IResource):
        """Notify subscribers if a resource has been modified."""
        for client in self._tracker.iterate_subscribers(resource):
            client.send_modified_notification(resource)

    def _notify_modified_child(self, parent: IResource, child: IResource):
        """Notify subscribers if a child in a pool has been modified."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_child_notification('modified', parent, child)

    def _notify_removed_child(self, parent: IResource, child: IResource):
        """Notify subscribers if a child has been removed from a pool."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_child_notification('removed', parent, child)

    def send_modified_notification(self, resource: IResource):
        """Send notification about a modified resource."""
        schema = self._create_schema(Notification)
        data = schema.serialize({'event': 'modified', 'resource': resource})
        self._send_json_message(data)

    def send_child_notification(self, status: str, resource: IResource,
                                child: IResource):
        """Send notification concerning a child resource.

        :param status: should be 'new', 'removed', or 'modified'
        """
        schema = self._create_schema(ChildNotification)
        data = schema.serialize({'event': status + '_child',
                                 'resource': resource,
                                 'child': child})
        self._send_json_message(data)

    def send_new_version_notification(self, resource: IResource,
                                      new_version: IResource):
        """Send notification if a new version has been added."""
        schema = self._create_schema(VersionNotification)
        data = schema.serialize({'event': 'new_version',
                                 'resource': resource,
                                 'version': new_version})
        self._send_json_message(data)

    def onClose(self, was_clean: bool, code: int, reason: str):  # noqa
        self._tracker.delete_all_subscriptions(self)
        clean_str = 'Clean' if was_clean else 'Unclean'
        logger.debug('%s close of WebSocket connection to %s; reason: %s',
                     clean_str, self._client, reason)
