"""Classes used by the standalone Websocket server."""
from collections import defaultdict
from collections import Hashable
from collections import Iterable
from json import dumps
from json import loads
import logging

from autobahn.asyncio.websocket import WebSocketServerProtocol
from autobahn.websocket.protocol import ConnectionRequest
import colander

from adhocracy.websockets import WebSocketError
from adhocracy.websockets.schemas import ClientRequestSchema
from adhocracy.websockets.schemas import Notification
from adhocracy.websockets.schemas import StatusConfirmation
from adhocracy.websockets.schemas import ChildNotification
from adhocracy.websockets.schemas import VersionNotification


logger = logging.getLogger(__name__)


class ClientTracker():

    """"Keeps track of the clients that want notifications."""

    def __init__(self):
        self._clients2resource_paths = defaultdict(set)
        self._resource_paths2clients = defaultdict(set)

    def is_subscribed(self, client: Hashable, path: str) -> bool:
        """Check whether a client is subscribed to a resource path."""
        return (client in self._clients2resource_paths and
                path in self._clients2resource_paths[client])

    def subscribe(self, client: Hashable, path: str) -> bool:
        """Subscribe a client to a resource path, if necessary.

        :return: True if the subscription was successful, False if it was
                 unnecessary (the client was already subscribed).
        """
        if self.is_subscribed(client, path):
            return False
        self._clients2resource_paths[client].add(path)
        self._resource_paths2clients[path].add(client)
        return True

    def unsubscribe(self, client: Hashable, path: str) -> bool:
        """Unsubscribe a client from a resource, if necessary.

        :return: True if the unsubscription was successful, False if it was
                 unnecessary (the client was not subscribed).
        """
        if not self.is_subscribed(client, path):
            return False
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

    def iterate_subscribers(self, path: str) -> Iterable:
        """Return an iterator over all clients subscribed to a resource."""
        # 'if' check is necessary to avoid creating spurious empty sets
        if path in self._resource_paths2clients:
            for client in self._resource_paths2clients[path]:
                yield client


class ClientCommunicator(WebSocketServerProtocol):

    """Communicates with a client through a WebSocket connection.

    Note that the `zodb_connection` attribute **must** be set
    instances of this class can be used!
    """

    # All instances of this class share the same zodb connection object
    zodb_connection = None
    # All instances of this class share the same tracker
    _tracker = ClientTracker()

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
            if self._handle_if_event_notification(json_object):
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

    def _handle_if_event_notification(self, json_object) -> bool:
        """Handle message if it's a notifications from our Pyramid app.

        :return: True if the message is a valid event notification from our
                 Pyramid app and has been handled; False otherwise
        """
        if (self._client_may_send_notifications and
                self._looks_like_event_notification(json_object)):
            notification = self._parse_json_via_schema(json_object,
                                                       Notification)
            self._dispatch_event_notification_to_subscribers(notification)
            return True
        else:
            return False

    def _parse_json_via_schema(self, json_object, schema:
                               colander.MappingSchema) -> dict:
        try:
            return schema().deserialize(json_object)
        except colander.Invalid as err:
            # FIXME: why do we need this special error "unknown action"?
            # The normal json error gives your more detailed error information
            self._raise_if_unknown_field_value('action', err, json_object)
            self._raise_invalid_json_from_colander_invalid(err)

    def _handle_client_request_and_send_response(self, request: dict):
        action = request['action']
        resource = request['resource']
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
        path = notification['resource']
        if event == 'created':
            self._dispatch_created_event(path)
        elif event == 'new_version':
            self._dispatch_new_version_event(path)
        elif event == 'modified':
            self._dispatch_modified_event(path)
        elif event == 'deleted':
            self._dispatch_deleted_event(path)
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

    def _update_resource_subscription(self, action: str,
                                      path: str) -> bool:
        """(Un)subscribe this instance to/from a resource.

        :return: True if the request was necessary, False if it was an
                 unnecessary no-op
        """
        if action == 'subscribe':
            return self._tracker.subscribe(self, path)
        else:
            return self._tracker.unsubscribe(self, path)

    def _send_status_confirmation(self, update_was_necessary: bool,
                                  action: str, path: str):
        status = 'ok' if update_was_necessary else 'redundant'
        schema = StatusConfirmation()
        json_message = schema.serialize(
            {'status': status, 'action': action, 'resource': path})
        self._send_json_message(json_message)

    def _send_json_message(self, json_message: dict):
        """Send a JSON object as message to the client."""
        text = dumps(json_message)
        logger.debug('Sending message to client %s: %s', self._client, text)
        self.sendMessage(text.encode())

    def _dispatch_created_event(self, path: str):
        parent_path = self._get_parent_path(path)
        self._notify_new_child(parent_path, path)

    def _dispatch_new_version_event(self, path: str):
        # FIXME: we assume here the parent of the item version is
        # the item this version belongs to. This works but now but may change
        # in the future.
        parent_path = self._get_parent_path(path)
        self._notify_new_version(parent_path, path)

    def _get_parent_path(self, path):
        parent_parts = path.split('/')[:-1]
        parent_path = '/'.join(parent_parts)
        return parent_path

    def _dispatch_modified_event(self, path: str):
        self._notify_resource_modified(path)
        parent_path = self._get_parent_path(path)
        self._notify_modified_child(parent_path, path)

    def _dispatch_deleted_event(self, path: str):
        # FIXME Should we also notify subscribers of the deleted resource?
        # Deleting is currently not part of the API, so we can remove this.
        parent = self._get_parent_path(path)
        self._notify_removed_child(parent, path)

    def _notify_new_version(self, parent: str, new_version: str):
        """Notify subscribers if a new version has been added to an item."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_new_version_notification(parent, new_version)

    def _notify_new_child(self, parent: str, child: str):
        """Notify subscribers if a child has been added to a pool or item."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_child_notification('new', parent, child)

    def _notify_resource_modified(self, path: str):
        """Notify subscribers if a resource has been modified."""
        for client in self._tracker.iterate_subscribers(path):
            client.send_modified_notification(path)

    def _notify_modified_child(self, parent: str, child: str):
        """Notify subscribers if a child in a pool has been modified."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_child_notification('modified', parent, child)

    def _notify_removed_child(self, parent: str, child: str):
        """Notify subscribers if a child has been removed from a pool."""
        for client in self._tracker.iterate_subscribers(parent):
            client.send_child_notification('removed', parent, child)

    def send_modified_notification(self, path: str):
        """Send notification about a modified resource path."""
        schema = Notification()
        data = schema.serialize({'event': 'modified', 'resource': path})
        self._send_json_message(data)

    def send_child_notification(self, status: str, path: str,
                                child_path: str):
        """Send notification concerning a child resource path.

        :param status: should be 'new', 'removed', or 'modified'
        """
        schema = ChildNotification()
        data = schema.serialize({'event': status + '_child',
                                 'resource': path,
                                 'child': child_path})
        self._send_json_message(data)

    def send_new_version_notification(self, path: str,
                                      new_version_path: str):
        """Send notification if a new version has been added."""
        schema = VersionNotification()
        data = schema.serialize({'event': 'new_version',
                                 'resource': path,
                                 'version': new_version_path})
        self._send_json_message(data)

    def onClose(self, was_clean: bool, code: int, reason: str):  # noqa
        self._tracker.delete_all_subscriptions(self)
        clean_str = 'Clean' if was_clean else 'Unclean'
        logger.debug('%s close of WebSocket connection to %s; reason: %s',
                     clean_str, self._client, reason)
