from json import dumps
from json import loads
import unittest

import pytest

from adhocracy.websockets.server import ClientCommunicator


def build_message(json_message: dict) -> bytes:
    return dumps(json_message).encode()


class DummyConnectionRequest():

    def __init__(self, peer: str):
        self.peer = peer


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
        self._child = '/child'
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
        self._comm.onConnect(request)

    def test_onOpen(self):
        self._comm.onOpen()
        assert len(self._comm.queue) == 0

    def test_onMessage_valid_subscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'status': 'ok',
                                       'action': 'subscribe',
                                       'resource': '/child'}

    def test_onMessage_valid_unsubscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        msg = build_message({'action': 'unsubscribe', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 2
        assert self._comm.queue[-1] == {'status': 'ok',
                                        'action': 'unsubscribe',
                                        'resource': '/child'}

    def test_onMessage_redundant_subscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 2
        assert self._comm.queue[-1] == {'status': 'redundant',
                                        'action': 'subscribe',
                                        'resource': '/child'}

    def test_onMessage_resubscribe_after_unsubscribe(self):
        msg = build_message({'action': 'subscribe', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        msg = build_message({'action': 'unsubscribe', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        msg = build_message({'action': 'subscribe', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 3
        assert self._comm.queue[-1] == {'status': 'ok',
                                        'action': 'subscribe',
                                        'resource': '/child'}

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
        msg = build_message({'event': 'created', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'invalid_json',
                                       'details': 'action: Required'}

    def test_onMessage_with_invalid_action(self):
        msg = build_message({'action': 'just do it!', 'resource': '/child'})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'unknown_action',
                                       'details': 'just do it!'}

    def test_onMessage_with_invalid_json_type(self):
        msg = build_message({'action': 'subscribe', 'resource': 7})
        self._comm.onMessage(msg, False)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'error': 'invalid_json',
                                       'details': "resource: 7 is not a string: {'resource': ''}"}

    def test_send_modified_notification(self):
        self._comm.send_modified_notification(self._child)
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'event': 'modified',
                                       'resource': '/child'}

    def test_send_child_notification(self):
        child = self._child
        self._comm.send_child_notification('new', child, child + '/grandchild')
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'event': 'new_child',
                                       'resource': '/child',
                                       'child': '/child/grandchild'}

    def test_send_new_version_notification(self):
        child = self._child
        self._comm.send_new_version_notification(child, child + '/version_007')
        assert len(self._comm.queue) == 1
        assert self._comm.queue[0] == {'event': 'new_version',
                                       'resource': '/child',
                                       'version': '/child/version_007'}

    def test_client_may_send_notifications_if_localhost(self):
        self._connect('localhost:1234')
        assert self._comm._client_may_send_notifications is True

    def test_client_may_send_notifications_if_localhost_ipv4(self):
        self._connect('127.0.0.1:1234')
        assert self._comm._client_may_send_notifications is True

    def test_client_may_not_send_notifications_if_not_localhost(self):
        self._connect('78.46.75.118:1234')
        assert self._comm._client_may_send_notifications is False


class EventDispatchUnitTests(unittest.TestCase):

    """Test event dispatch from one ClientCommunicator to others."""

    def setUp(self):
        self._subscriber = QueueingClientCommunicator()
        request = DummyConnectionRequest('websocket peer')
        self._subscriber.onConnect(request)
        msg = build_message({'action': 'subscribe', 'resource': '/child'})
        self._subscriber.onMessage(msg, False)
        self._dispatcher = QueueingClientCommunicator()
        request = DummyConnectionRequest('localhost:1234')
        self._dispatcher.onConnect(request)

    def tearDown(self):
        self._subscriber.onClose(True, 0, 'teardown')
        self._dispatcher.onClose(True, 0, 'teardown')

    def test_dispatch_created_notification(self):
        msg = build_message({'event': 'created',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'new_child',
                                              'resource': '/child',
                                              'child': '/child/grandchild'}

    def test_dispatch_created_notification_new_version(self):
        msg = build_message({'event': 'new_version',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'new_version',
                                              'resource': '/child',
                                              'version': '/child/grandchild'}

    def test_dispatch_modified_notification(self):
        msg = build_message({'event': 'modified', 'resource': '/child'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'modified',
                                              'resource': '/child'}

    def test_dispatch_modified_child_notification(self):
        msg = build_message({'event': 'modified',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'modified_child',
                                              'resource': '/child',
                                              'child': '/child/grandchild'}

    def test_dispatch_deleted_notification(self):
        msg = build_message({'event': 'deleted',
                             'resource': '/child/grandchild'})
        self._dispatcher.onMessage(msg, False)
        assert len(self._dispatcher.queue) == 0
        assert self._subscriber.queue[-1] == {'event': 'removed_child',
                                              'resource': '/child',
                                              'child': '/child/grandchild'}

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
        from adhocracy.websockets.server import ClientTracker
        self._child = '/child'
        self._tracker = ClientTracker()

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
        resource2 = '/child2'
        result1 = self._tracker.subscribe(client, resource1)
        result2 = self._tracker.subscribe(client, resource2)
        assert result1 is True
        assert result2 is True
        assert len(self._tracker._clients2resource_paths) == 1
        assert len(self._tracker._resource_paths2clients) == 2
        assert self._tracker._clients2resource_paths[client] == {'/child', '/child2'}
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

    def test_delete_all_subscriptions_empty(self):
        """Test deleting all subscriptions for a client that has none."""
        client = self._make_client()
        self._tracker.delete_all_subscriptions(client)
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_delete_all_subscriptions_two_resource(self):
        """Test deleting all subscriptions for a client that has two."""
        client = self._make_client()
        resource1 = self._child
        resource2 = self._child
        self._tracker.subscribe(client, resource1)
        self._tracker.subscribe(client, resource2)
        self._tracker.delete_all_subscriptions(client)
        assert len(self._tracker._clients2resource_paths) == 0
        assert len(self._tracker._resource_paths2clients) == 0

    def test_delete_all_subscriptions_two_clients(self):
        """Test deleting all subscriptions for one client subscribed to the
        same resource as another one.
        """
        client1 = self._make_client()
        client2 = self._make_client()
        resource = self._child
        self._tracker.subscribe(client1, resource)
        self._tracker.subscribe(client2, resource)
        self._tracker.delete_all_subscriptions(client1)
        assert len(self._tracker._clients2resource_paths) == 1
        assert len(self._tracker._resource_paths2clients) == 1
        assert self._tracker._clients2resource_paths[client2] == {'/child'}
        assert self._tracker._resource_paths2clients['/child'] == {client2}
        assert client1 not in self._tracker._clients2resource_paths

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


@pytest.mark.functional
class TestFunctionalClientCommunicator:

    @pytest.fixture
    def connection(self, request, server, ws_settings):
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

    def _add_pool(self, server, path, name):
        import json
        import requests
        from adhocracy.resources.pool import IBasicPool
        url = server.application_url + 'adhocracy' + path
        data = {'content_type': IBasicPool.__identifier__,
                'data': {'adhocracy.sheets.name.IName': {'name': name}}}
        requests.post(url, data=json.dumps(data),
                      headers={'content-type': 'application/json'})

    def test_send_child_notification(self, server, connection):
        connection.send('{"resource": "/adhocracy", "action": "subscribe"}')
        connection.recv()
        self._add_pool(server, '/', 'Proposals')
        assert 'Proposals' in connection.recv()
