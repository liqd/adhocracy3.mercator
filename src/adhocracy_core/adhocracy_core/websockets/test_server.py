from json import dumps
from json import loads
import unittest

from pyramid import testing
from zope.interface import alsoProvides
import pytest

from adhocracy_core.websockets.server import ClientCommunicator


def build_message(json_message: dict) -> bytes:
    return dumps(json_message).encode()


class DummyConnectionRequest():

    def __init__(self, peer: str):
        self.peer = peer

class DummyZODBDatabase:

    def __init__(self, zodb_root=None):
        self.zodb_root = zodb_root

    def open(self):
        return DummyZODBConnection(self.zodb_root)

class DummyZODBConnection:

    def __init__(self, zodb_root=None):
        self.zodb_root = zodb_root

    def sync(self):
        pass

    def root(self):
        return self.zodb_root or {}


class QueueingClientCommunicator(ClientCommunicator):

    """ClientCommunicator that adds outgoing messages to an internal queue."""

    def __init__(self):
        super().__init__()
        self.queue = []

    def sendMessage(self, payload: bytes):
        """Decode message back into JSON object and add it to the queue."""
        json_message = loads(payload.decode())
        self.queue.append(json_message)


class ClientCommunicatorUnitTests(unittest.TestCase):

    def setUp(self):
        app_root = testing.DummyResource()
        app_root['child'] = testing.DummyResource()
        zodb_root = testing.DummyResource()
        zodb_root['app_root'] = app_root
        app_root.__name__ = app_root.__parent__ = None
        self._child = app_root['child']
        rest_url = 'http://localhost:6541'
        request = testing.DummyRequest()
        request.registry = object()
        request.root = app_root
        request.application_url = rest_url
        self.request = request
        QueueingClientCommunicator.zodb_database = DummyZODBDatabase(
            zodb_root=zodb_root)
        QueueingClientCommunicator.rest_url = rest_url
        self._comm = QueueingClientCommunicator()
        self._peer = 'websocket peer'
        self._connect()

    def tearDown(self):
        self._comm.onClose(True, 0, 'teardown')

    def test_autobahn_installed(self):
        from autobahn import __version__
        assert isinstance(__version__, str)

    def test_onConnect(self):
        self._connect()
        assert self._comm._client == self._peer
        assert len(self._comm.queue) == 0

    def _connect(self, peer=None):
        if peer is None:
            peer = self._peer
        request = DummyConnectionRequest(peer)
        request.registry = object()
        self._comm.onConnect(request)

    def test_onOpen(self):
        self._comm.onOpen()
        assert len(self._comm.queue) == 0

    def test_onMessage_valid_subscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'status': 'ok',
                                       'action': 'subscribe',
                                       'resource': self.request.application_url + '/child/'}

    def test_onMessage_valid_unsubscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        msg = build_message({'action': 'unsubscribe', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 2
        assert self._comm.queue[-1] == {'status': 'ok',
                                        'action': 'unsubscribe',
                                        'resource': self.request.application_url + '/child/'}

    def test_onMessage_redundant_subscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 2
        assert self._comm.queue[-1] == {'status': 'redundant',
                                        'action': 'subscribe',
                                        'resource': self.request.application_url + '/child/'}

    def test_onMessage_resubscribe_after_unsubscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        msg = build_message({'action': 'unsubscribe', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        msg = build_message({'action': 'subscribe', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 3
        assert self._comm.queue[-1] == {'status': 'ok',
                                        'action': 'subscribe',
                                        'resource': self.request.application_url + '/child/'}

    def test_onMessage_subscribe_item_version(self):
        # Subscribing ItemVersions used to be forbidden, but it's now allowed.
        from adhocracy_core.interfaces import IItemVersion
        alsoProvides(self._child, IItemVersion)
        msg = build_message(
            {'action': 'subscribe',
             'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {
            'status': 'ok',
            'action': 'subscribe',
            'resource': self.request.application_url + '/child/'}

    def test_onMessage_with_binary_message(self):
        self._comm.onMessage(b'DEADBEEF', True)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'malformed_message',
                                       'details': 'message is binary'}

    def test_onMessage_with_invalid_json(self):
        self._comm.onMessage('This is not a JSON dict'.encode(), False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0]['error'] == 'malformed_message'
        details = self._comm.queue[0]['details']
        # exact details message depends on the Python version used
        assert 'JSON' in details or 'value' in details

    def test_onMessage_with_json_array(self):
        msg = build_message(['This', 'is an array', 'not a dict'])
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        last_message = self._comm.queue[0]
        assert last_message['error'] == 'invalid_json'
        assert 'not a mapping type' in last_message['details']

    def test_onMessage_with_wrong_field(self):
        msg = build_message({'event': 'created', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'invalid_json',
                                       'details': 'action: Required'}

    def test_onMessage_with_invalid_action(self):
        msg = build_message({'action': 'just do it!', 'resource': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'unknown_action',
                                       'details': 'just do it!'}

    def test_onMessage_with_invalid_resource(self):
        msg = build_message({'action': 'subscribe',
                             'resource': '/wrong_child'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'unknown_resource',
                                       'details': '/wrong_child'}

    def test_onMessage_with_both_invalid(self):
        msg = build_message({'action': 'just do it!',
                             'resource': '/wrong_child'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        last_message = self._comm.queue[0]
        assert last_message['error'] == 'invalid_json'
        assert 'action' in last_message['details']
        assert 'resource' in last_message['details']

    def test_onMessage_with_no_mapping(self):
        self._comm.onMessage(b'1', False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'invalid_json',
            'details': ': "1" is not a mapping type: Does not implement dict-like functionality.'}

    def test_onMessage_with_wrong_field_name(self):
        msg = build_message({'action': 'subscribe', 'wrong_name': self.request.application_url + '/child/'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'invalid_json',
                                       'details': 'resource: Required'}

    def test_onMessage_with_wrong_resource_value(self):
        msg = build_message({'action': 'subscribe', 'resource': 7})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'unknown_resource', 'details': 7}

    def test_send_modified_notification(self):
        self._comm.send_notification(self._child, 'modified')
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {
            'event': 'modified',
            'resource': self.request.application_url + '/child/'}

    def test_send_child_notification(self):
        child = self._child
        child['grandchild'] = testing.DummyResource()
        self._comm.send_child_notification('new', child, child['grandchild'])
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'event': 'new_child',
                                       'resource': self.request.application_url + '/child/',
                                       'child': self.request.application_url + '/child/grandchild/'}

    def test_send_new_version_notification(self):
        child = self._child
        child['version_007'] = testing.DummyResource()
        self._comm.send_new_version_notification(child, child['version_007'])
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'event': 'new_version',
                                       'resource': self.request.application_url + '/child/',
                                       'version': self.request.application_url + '/child/version_007/'}

    def test_client_may_send_notifications_if_localhost(self):
        self._connect('tcp:localhost:1234')
        assert self._comm._client_may_send_notifications is True

    def test_client_may_send_notifications_if_localhost_ipv4(self):
        self._connect('tcp:127.0.0.1:1234')
        assert self._comm._client_may_send_notifications is True

    def test_client_may_not_send_notifications_if_not_localhost(self):
        self._connect('tcp:78.46.75.118:1234')
        assert self._comm._client_may_send_notifications is False


class EventDispatchUnitTests(unittest.TestCase):

    """Test event dispatch from one ClientCommunicator to others."""

    def setUp(self):
        app_root = testing.DummyResource()
        app_root['child'] = testing.DummyResource()
        app_root['child']['grandchild'] = testing.DummyResource()
        zodb_root = testing.DummyResource()
        zodb_root['app_root'] = app_root
        app_root.__name__ = app_root.__parent__ = None
        self._child = app_root['child']
        self._grandchild = app_root['child']['grandchild']
        rest_url = 'http://localhost:6541'
        request = testing.DummyRequest()
        request.registry = object()
        request.root = app_root
        request.application_url = rest_url
        self.request = request
        QueueingClientCommunicator.zodb_database = DummyZODBDatabase(
            zodb_root=zodb_root)
        QueueingClientCommunicator.rest_url = rest_url
        self._subscriber = QueueingClientCommunicator()
        connection_request = DummyConnectionRequest('websocket peer')
        self._subscriber.onConnect(connection_request)
        msg = build_message({'action': 'subscribe', 'resource': request.application_url + '/child/'})
        self._subscriber.onMessage(msg, False)
        self._dispatcher = QueueingClientCommunicator()
        connection_request = DummyConnectionRequest('tcp:localhost:1234')
        self._dispatcher.onConnect(connection_request)

    def tearDown(self):
        self._subscriber.onClose(True, 0, 'teardown')
        self._dispatcher.onClose(True, 0, 'teardown')

    def test_dispatch_created_notification(self):
        msg = build_message({'event': 'created',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'new_child',
                                              'resource': self.request.application_url + '/child/',
                                              'child': self.request.application_url + '/child/grandchild/'}

    def test_dispatch_created_notification_new_version(self):
        from adhocracy_core.interfaces import IItemVersion
        alsoProvides(self._grandchild, IItemVersion)
        msg = build_message({'event': 'created',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'new_version',
                                              'resource': self.request.application_url + '/child/',
                                              'version': self.request.application_url + '/child/grandchild/'}

    def test_dispatch_modified_notification(self):
        msg = build_message({'event': 'modified', 'resource': '/child'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'modified',
                                              'resource': self.request.application_url + '/child/'}

    def test_dispatch_modified_child_notification(self):
        msg = build_message({'event': 'modified',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'modified_child',
                                              'resource': self.request.application_url + '/child/',
                                              'child': self.request.application_url + '/child/grandchild/'}

    def test_dispatch_removed_notification_removed_child(self):
        msg = build_message({'event': 'removed',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {
            'event': 'removed_child',
            'resource': self.request.application_url + '/child/',
            'child': self.request.application_url + '/child/grandchild/'}

    def test_dispatch_removed_notification_removed_resource(self):
        msg = build_message({'event': 'removed',
                             'resource': '/child'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {
            'event': 'removed',
            'resource': self.request.application_url + '/child/'}

    def test_dispatch_changed_descendants_notification(self):
        msg = build_message({'event': 'changed_descendants',
                             'resource': '/child'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {
            'event': 'changed_descendants',
            'resource': self.request.application_url + '/child/'}

    def test_dispatch_invalid_event_notification(self):
        msg = build_message({'event': 'new_child',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 1
        assert self._dispatcher.queue[0]['error'] == 'invalid_json'
        assert 'event' in self._dispatcher.queue[0]['details']


class ClientTrackerUnitTests(unittest.TestCase):

    def _make_client(self):
        return object()

    def setUp(self):
        from adhocracy_core.websockets.server import ClientTracker
        app_root = testing.DummyResource()
        app_root['child'] = testing.DummyResource()
        self._child = app_root['child']
        self._tracker = ClientTracker()

    def _make_child2(self):
        result = self._child.__parent__['child2'] = testing.DummyResource()
        return result

    def test_subscribe(self):
        client = self._make_client()
        resource = self._child
        result = self._tracker.subscribe(client, resource)
        assert result is True
        assert len(self._tracker._clients2resource_paths) == 1
        assert len(self._tracker._resource_paths2clients) == 1
        assert self._tracker._clients2resource_paths[client] == {'/child'}
        assert self._tracker._resource_paths2clients['/child'] == {client}

    def test_subscribe_redundant(self):
        """Test client subscribing same resource twice."""
        client = self._make_client()
        resource = self._child
        self._tracker.subscribe(client, resource)
        result = self._tracker.subscribe(client, resource)
        assert result is False

    def test_subscribe_two_resources(self):
        """Test client subscribing to two resources."""
        client = self._make_client()
        resource1 = self._child
        resource2 = self._make_child2()
        result1 = self._tracker.subscribe(client, resource1)
        result2 = self._tracker.subscribe(client, resource2)
        assert result1 is True
        assert result2 is True
        assert len(self._tracker._clients2resource_paths) == 1
        assert len(self._tracker._resource_paths2clients) == 2
        assert self._tracker._clients2resource_paths[client] == {'/child',
                                                                 '/child2'}
        assert self._tracker._resource_paths2clients['/child'] == {client}
        assert self._tracker._resource_paths2clients['/child2'] == {client}

    def test_subscribe_two_clients(self):
        """Test two clients subscribing to same resource."""
        client1 = self._make_client()
        client2 = self._make_client()
        resource = self._child
        result1 = self._tracker.subscribe(client1, resource)
        result2 = self._tracker.subscribe(client2, resource)
        assert result1 is True
        assert result2 is True
        assert len(self._tracker._clients2resource_paths) == 2
        assert len(self._tracker._resource_paths2clients) == 1
        assert self._tracker._clients2resource_paths[client1] == {'/child'}
        assert self._tracker._clients2resource_paths[client2] == {'/child'}
        assert self._tracker._resource_paths2clients['/child'] == {client1, client2}

    def test_unsubscribe(self):
        client = self._make_client()
        resource = self._child
        self._tracker.subscribe(client, resource)
        result = self._tracker.unsubscribe(client, resource)
        assert result is True
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_unsubscribe_redundant(self):
        """Test client unsubscribing from the same resource twice."""
        client = self._make_client()
        resource = self._child
        self._tracker.subscribe(client, resource)
        self._tracker.unsubscribe(client, resource)
        result = self._tracker.unsubscribe(client, resource)
        assert result is False

    def test_delete_subscriptions_for_client_empty(self):
        """Test deleting all subscriptions for a client that has none."""
        client = self._make_client()
        self._tracker.delete_subscriptions_for_client(client)
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_delete_subscriptions_for_client_two_resources(self):
        """Test deleting all subscriptions for a client that has two."""
        client = self._make_client()
        resource1 = self._child
        resource2 = self._make_child2()
        self._tracker.subscribe(client, resource1)
        self._tracker.subscribe(client, resource2)
        self._tracker.delete_subscriptions_for_client(client)
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_delete_subscriptions_for_client_two_clients(self):
        """Test deleting all subscriptions for one client subscribed to the
        same resource as another one.
        """
        client1 = self._make_client()
        client2 = self._make_client()
        resource = self._child
        self._tracker.subscribe(client1, resource)
        self._tracker.subscribe(client2, resource)
        self._tracker.delete_subscriptions_for_client(client1)
        assert len(self._tracker._clients2resource_paths) == 1
        assert len(self._tracker._resource_paths2clients) == 1
        assert self._tracker._clients2resource_paths[client2] == {'/child'}
        assert self._tracker._resource_paths2clients['/child'] == {client2}
        assert client1 not in self._tracker._clients2resource_paths

    def test_delete_subscriptions_to_resource_empty(self):
        """Test deleting all subscriptions to a resource that has none."""
        resource = self._child
        self._tracker.delete_subscriptions_to_resource(resource)
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_delete_subscriptions_to_resource_two_clients(self):
        """Test deleting all subscriptions to a resource that has two."""
        client1 = self._make_client()
        client2 = self._make_client()
        resource = self._child
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0
        self._tracker.subscribe(client1, resource)
        self._tracker.subscribe(client2, resource)
        self._tracker.delete_subscriptions_to_resource(resource)
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_delete_subscriptions_to_resource_two_resources(self):
        """Test deleting all subscriptions to a resource if the client has
        multiple subscriptions.
        """
        client = self._make_client()
        resource1 = self._child
        resource2 = self._make_child2()
        self._tracker.subscribe(client, resource1)
        self._tracker.subscribe(client, resource2)
        self._tracker.delete_subscriptions_to_resource(resource1)
        assert len(self._tracker._clients2resource_paths) == 1
        assert len(self._tracker._resource_paths2clients) == 1
        assert self._tracker._clients2resource_paths[client] == {'/child2'}
        assert self._tracker._resource_paths2clients['/child2'] == {client}

    def test_iterate_subscribers_empty(self):
        """Test iterating subscribers for a resource that has none."""
        resource = self._child
        result = list(self._tracker.iterate_subscribers(resource))
        assert len(result) == 0
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_iterate_subscribers_two(self):
        """Test iterating subscribers for a resource that has two."""
        client1 = self._make_client()
        client2 = self._make_client()
        resource = self._child
        self._tracker.subscribe(client1, resource)
        self._tracker.subscribe(client2, resource)
        result = list(self._tracker.iterate_subscribers(resource))
        assert len(result) == 2
        assert client1 in result
        assert client2 in result


@pytest.mark.websocket
@pytest.mark.functional
class TestFunctionalClientCommunicator:

    @pytest.fixture
    def connection(self, request, ws_settings):
        from websocket import create_connection
        connection = create_connection('ws://localhost:%s' %
                                       ws_settings['port'])
        def tearDown():
            print('teardown websocket connection')
            if connection.connected:
                connection.send_close(reason=b'done')
                connection.close()
        request.addfinalizer(tearDown)

        return connection

    def _add_pool(self, rest_url, path, name):
        import json
        import requests
        from adhocracy_core.authentication import UserTokenHeader
        from adhocracy_core.testing import admin_password
        from adhocracy_core.testing import admin_login
        from adhocracy_core.resources.pool import IBasicPool
        resp = requests.post(rest_url + '/login_username',
                             json={'name': admin_login,
                                   'password': admin_password})
        god_header = {UserTokenHeader: resp['user_token']}
        url = rest_url + 'adhocracy' + path
        data = {'content_type': IBasicPool.__identifier__,
                'data': {'adhocracy_core.sheets.name.IName': {'name': name}}}
        headers = {'content-type': 'application/json'}
        headers.update(god_header)
        resp = requests.post(url, data=json.dumps(data), headers=headers)
        assert resp.status_code == 200

    @pytest.mark.xfail
    @pytest.mark.timeout(30)
    def test_send_child_notification(
            self, backend_with_ws, settings, connection):
        rest_url = 'http://{}:{}/'.format(settings['host'], settings['port'])
        connection.send('{"resource": "' + rest_url + 'adhocracy/", "action": "subscribe"}')
        connection.recv()
        self._add_pool(rest_url, '/', 'Proposals')
        response = connection.recv()
        assert 'Proposals' in response
