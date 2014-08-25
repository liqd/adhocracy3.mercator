import unittest

from websocket import ABNF
from pytest import fixture
from pytest import mark
from pyramid.testing import DummyResource


class DummyClient():

    messages_sent = False

    def send_messages(self, changelog_metadata):
        if changelog_metadata:
            self.messages_sent = True


class DummyWSConnection():

    def __init__(self, dummy_frame: ABNF):
        self.dummy_frame = dummy_frame
        self.connected = True
        self.nothing_sent = True
        self.close_reason = None
        self.pong_text = None
        self.queue = []

    def recv_frame(self):
        return self.dummy_frame

    def send(self, message):
        self.nothing_sent = False
        self.queue.append(message)

    def send_close(self, reason: bytes):
        self.nothing_sent = False
        self.close_reason = reason

    def close(self):
        self.nothing_sent = False
        self.connected = False

    def pong(self, text):
        self.nothing_sent = False
        self.pong_text = text


class SendMessageAfterCommitUnitTests(unittest.TestCase):

    def setUp(self):
        from pyramid.testing import DummyResource
        from adhocracy.resources.subscriber import changelog_metadata
        self._client = DummyClient()
        self._registry = DummyResource()
        self._registry.ws_client = self._client
        self._registry._transaction_changelog = dict()
        self._changelog_metadata = changelog_metadata

    def test_send_messages_after_commit_hook_success_and_empty_changelog(self):
        from adhocracy.websockets.client import send_messages_after_commit_hook
        send_messages_after_commit_hook(success=True, registry=self._registry)
        assert self._client.messages_sent is False

    def test_send_messages_after_commit_hook_no_success_and_empty_changelog(self):
        from adhocracy.websockets.client import send_messages_after_commit_hook
        send_messages_after_commit_hook(success=False, registry=self._registry)
        assert self._client.messages_sent is False

    def test_send_messages_after_commit_hook_success_and_non_empty_changelog(self):
        from pyramid.testing import DummyResource
        from adhocracy.websockets.client import send_messages_after_commit_hook
        self._registry._transaction_changelog['/'] = \
            self._changelog_metadata._replace(modified=True,
                                              resource=DummyResource())
        send_messages_after_commit_hook(success=True, registry=self._registry)
        assert self._client.messages_sent is True


class TestClient:

    @fixture()
    def changelog_meta(self, changelog_meta):
        child = self._make_resource()
        return changelog_meta._replace(resource=child)

    def _make_one(self, frame: ABNF):
        from adhocracy.websockets.client import Client
        client = Client(None)
        self._dummy_connection = DummyWSConnection(frame)
        client._ws_connection = self._dummy_connection
        return client

    def _make_resource(self, name='child'):
        from pyramid.testing import DummyResource
        context = DummyResource()
        resource = DummyResource()
        context[name] = resource
        return resource

    def test_receive_text_frame(self):
        frame = ABNF(opcode=ABNF.OPCODE_TEXT, data='hello dear')
        client = self._make_one(frame)
        client._connect_and_receive_and_log_messages()
        assert self._dummy_connection.nothing_sent is True
        assert self._dummy_connection.connected is True

    def test_receive_close_frame(self):
        frame = ABNF(opcode=ABNF.OPCODE_CLOSE, data='time to say goodbye')
        client = self._make_one(frame)
        client._connect_and_receive_and_log_messages()
        assert self._dummy_connection.nothing_sent is False
        assert self._dummy_connection.connected is False
        assert self._dummy_connection.close_reason == b'server triggered close'

    def test_receive_ping_frame(self):
        frame = ABNF(opcode=ABNF.OPCODE_PING, data='hello')
        client = self._make_one(frame)
        client._connect_and_receive_and_log_messages()
        assert self._dummy_connection.nothing_sent is False
        assert self._dummy_connection.pong_text == 'Hi!'

    def test_receive_unexpected_frame(self):
        frame = ABNF(opcode=ABNF.OPCODE_BINARY, data='hello')
        client = self._make_one(frame)
        client._connect_and_receive_and_log_messages()
        assert self._dummy_connection.nothing_sent is True
        assert self._dummy_connection.connected is True

    def test_receive_none_frame(self):
        client = self._make_one(None)
        client._connect_and_receive_and_log_messages()
        assert self._dummy_connection.nothing_sent is True
        assert self._dummy_connection.connected is True

    def test_send_messages_empty_queue(self):
        client = self._make_one(None)
        client._is_running = True
        client.send_messages()
        assert self._dummy_connection.nothing_sent is True

    def test_send_messages_nonempty_queue(self, changelog_meta):
        client = self._make_one(None)
        client._is_running = True
        metadata = [changelog_meta._replace(created=True)]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is False
        assert len(self._dummy_connection.queue) == 1
        assert 'created' in self._dummy_connection.queue[0]

    def test_send_messages_if_not_running(self, changelog_meta):
        client = self._make_one(None)
        client._is_running = False
        metadata = [changelog_meta._replace(created=True)]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is True

    def test_send_messages_not_modified_or_created(self, changelog_meta):
        client = self._make_one(None)
        client._is_running = True
        metadata = [changelog_meta]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is True
        assert len(self._dummy_connection.queue) == 0

    def test_send_messages_without_resource(self, changelog_meta):
        client = self._make_one(None)
        client._is_running = True
        metadata = [changelog_meta._replace(resource=None,
                                            created=True)]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is True
        assert len(self._dummy_connection.queue) == 0

    def test_send_messages_duplicate_modified(self, changelog_meta):
        """If a resource has been modified (or created) twice, only one
        event should be sent.
        """
        client = self._make_one(None)
        client._is_running = True
        metadata = [changelog_meta._replace(modified=True),
                    changelog_meta._replace(modified=True)]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is False
        assert len(self._dummy_connection.queue) == 1
        assert 'modified' in self._dummy_connection.queue[0]

    def test_send_messages_created_and_modified(self, changelog_meta):
        """If a resource has been created and then modified, only a
        'created' event should be sent.
        """
        client = self._make_one(None)
        client._is_running = True
        metadata = [changelog_meta._replace(created=True,
                                            modified=True)]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is False
        assert len(self._dummy_connection.queue) == 1
        assert 'created' in self._dummy_connection.queue[0]

    def test_send_messages_created_new_version(self, changelog_meta):
        from adhocracy.interfaces import IItemVersion
        client = self._make_one(None)
        client._is_running = True
        resource = DummyResource(__provides__=IItemVersion)
        metadata = [changelog_meta._replace(created=True,
                                            resource=resource)]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is False
        assert len(self._dummy_connection.queue) == 1
        assert 'new_version' in self._dummy_connection.queue[0]

    def test_send_messages_two_resources(self, changelog_meta):
        client = self._make_one(None)
        client._is_running = True
        resource2 = DummyResource()
        metadata = [changelog_meta._replace(created=True),
                    changelog_meta._replace(created=True,
                                            resource=resource2)]
        client.send_messages(metadata)
        assert self._dummy_connection.nothing_sent is False
        assert len(self._dummy_connection.queue) == 2


@mark.websocket
class TestFunctionalClient:

    @fixture
    def websocket_client(self, request, websocket, settings):
        from adhocracy.websockets.client import Client
        client = Client(ws_url=settings['adhocracy.ws_url'])
        request.addfinalizer(client.stop)
        return client

    def test_create(self, websocket_client):
        assert websocket_client._is_running
        assert websocket_client._ws_connection.connected

    def test_stop(self, websocket_client):
        websocket_client.stop()
        assert not websocket_client._is_running
        assert not websocket_client._ws_connection.connected

    def test_queue_and_send_messages(self, websocket_client, changelog_meta):
        from pyramid.testing import DummyResource
        context = DummyResource()
        child = DummyResource()
        context['child'] = child
        metadata = [changelog_meta._replace(resource=child)]
        websocket_client._send_messages(metadata)
        assert websocket_client.changelog_metadata_messages_to_send == set()

    def test_includeme_without_ws_url_setting(self, config):
        from adhocracy.websockets.client import includeme
        config.registry.settings['adhocracy.ws_url'] = ''
        includeme(config)
        assert not hasattr(config.registry, 'ws_client')

    def test_includeme_with_ws_url_setting(self, config):
        from adhocracy.websockets.client import includeme
        from adhocracy.websockets.client import Client
        settings = config.registry.settings
        settings['adhocracy.ws_url'] = 'ws://localhost:8080'
        includeme(config)
        assert isinstance(config.registry.ws_client, Client)


def test_get_ws_client_with_none():
    from adhocracy.websockets.client import get_ws_client
    assert get_ws_client(None) is None


def test_get_ws_client_with_registry():
    from adhocracy.websockets.client import get_ws_client
    assert get_ws_client(None) is None


def test_get_ws_client_with_registry_and_ws_client(context):
    context.ws_client = object()
    from adhocracy.websockets.client import get_ws_client
    assert get_ws_client(context) == context.ws_client


