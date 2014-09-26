import unittest

from pyramid import testing
import colander
import pytest


class ClientRequestSchemaUnitTests(unittest.TestCase):

    """Test ClientRequestSchema deserialization."""

    def setUp(self):
        child = testing.DummyResource()
        self.child = child
        context = testing.DummyResource()
        context['child'] = child
        request = testing.DummyRequest()
        request.root = context
        self.request = request

    def _make_one(self):
        from adhocracy_core.websockets.schemas import ClientRequestSchema
        schema = ClientRequestSchema()
        return schema.bind(request=self.request)

    def test_deserialize_subscribe(self):
        inst = self._make_one()
        result = inst.deserialize(
            {'action': 'subscribe', 'resource': self.request.application_url + '/child/'})
        assert result == {'action': 'subscribe', 'resource': self.child}

    def test_deserialize_unsubscribe(self):
        inst = self._make_one()
        result = inst.deserialize(
            {'action': 'unsubscribe', 'resource': self.request.application_url + '/child/'})
        assert result == {'action': 'unsubscribe', 'resource': self.child}

    def test_deserialize_invalid_action(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'action': 'blah', 'resource': self.request.application_url + '/child'})

    def test_deserialize_invalid_resource(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize(
                {'action': 'subscribe', 'resource': self.request.application_url + '/wrong_child'})

    def test_deserialize_no_action(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'resource': self.request.application_url + '/child'})

    def test_deserialize_no_resource(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'action': 'subscribe'})

    def test_deserialize_empty_dict(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({})

    def test_deserialize_wrong_field(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'event': 'created', 'resource': self.request.application_url + '/child'})

    def test_deserialize_wrong_inner_type(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'action': 7, 'resource': self.request.application_url + '/child'})

    def test_deserialize_wrong_outer_type(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize(['subscribe'])


class StatusConfirmationUnitTests(unittest.TestCase):

    """Test StatusConfirmation serialization."""

    def setUp(self):
        child = testing.DummyResource()
        self.child = child
        context = testing.DummyResource()
        context['child'] = child
        request = testing.DummyRequest()
        request.root = context
        self.request = request

    def _make_one(self):
        from adhocracy_core.websockets.schemas import StatusConfirmation
        schema = StatusConfirmation()
        return schema.bind(request=self.request)

    def test_serialize_ok(self):
        inst = self._make_one()
        result = inst.serialize(
            {'status': 'ok', 'action': 'subscribe', 'resource': self.child})
        assert result == {'status': 'ok',
                          'action': 'subscribe',
                          'resource': self.request.application_url + '/child/'}

    def test_serialize_redundant(self):
        inst = self._make_one()
        result = inst.serialize(
            {'status': 'redundant',
             'action': 'unsubscribe',
             'resource': self.child})
        assert result == {'status': 'redundant',
                          'action': 'unsubscribe',
                          'resource': self.request.application_url + '/child/'}

    def test_serialize_default_status(self):
        inst = self._make_one()
        result = inst.serialize({'action': 'subscribe',
                                 'resource': self.child})
        assert result == {'status': 'ok',
                          'action': 'subscribe',
                          'resource': self.request.application_url + '/child/'}


class ServerNotificationUnitTests(unittest.TestCase):

    """Test serialization of ServerNotification and its subclasses."""

    def setUp(self):
        parent = testing.DummyResource()
        self.parent = parent
        context = testing.DummyResource()
        context['parent'] = parent
        self.context = context

    def _bind(self, schema: colander.SchemaNode) -> colander.SchemaNode:
        return schema.bind(context=self.context)

    def test_serialize_notification(self):
        from adhocracy_core.websockets.schemas import ServerNotification
        schema = ServerNotification()
        inst = self._bind(schema)
        result = inst.serialize({'event': 'modified', 'resource': self.parent})
        assert result == {'event': 'modified', 'resource': '/parent'}

    def test_deserialize_notification(self):
        from adhocracy_core.websockets.schemas import ServerNotification
        schema = ServerNotification()
        inst = self._bind(schema)
        result = inst.deserialize(
            {'event': 'created', 'resource': '/parent'})
        assert result == {'event': 'created', 'resource': self.parent}


class NotificationUnitTests(unittest.TestCase):

    """Test serialization of Notification and its subclasses."""

    def setUp(self):
        parent = testing.DummyResource()
        self.parent = parent
        context = testing.DummyResource()
        context['parent'] = parent
        self.context = context
        request = testing.DummyRequest()
        request.root = context
        self.request = request

    def _bind(self, schema: colander.SchemaNode) -> colander.SchemaNode:
        return schema.bind(request=self.request)

    def test_serialize_notification(self):
        from adhocracy_core.websockets.schemas import Notification
        schema = Notification()
        inst = self._bind(schema)
        result = inst.serialize({'event': 'modified', 'resource': self.parent})
        assert result == {'event': 'modified', 'resource': self.request.application_url + '/parent/'}

    def test_deserialize_notification(self):
        from adhocracy_core.websockets.schemas import Notification
        schema = Notification()
        inst = self._bind(schema)
        result = inst.deserialize(
            {'event': 'created', 'resource': self.request.application_url + '/parent/'})
        assert result == {'event': 'created', 'resource': self.parent}

    def test_serialize_child_notification(self):
        from adhocracy_core.websockets.schemas import ChildNotification
        self.child = testing.DummyResource('child', self.parent)
        schema = ChildNotification()
        inst = self._bind(schema)
        result = inst.serialize({'event': 'removed_child',
                                 'resource': self.parent,
                                 'child': self.child})
        assert result == {'event': 'removed_child',
                          'resource': self.request.application_url + '/parent/',
                          'child': self.request.application_url + '/parent/child/'}

    def test_serialize_version_notification(self):
        from adhocracy_core.websockets.schemas import VersionNotification
        self.version = testing.DummyResource('version', self.parent)
        schema = VersionNotification()
        inst = self._bind(schema)
        result = inst.serialize({'event': 'removed_child',
                                 'resource': self.parent,
                                 'version': self.version})
        assert result == {'event': 'removed_child',
                          'resource': self.request.application_url + '/parent/',
                          'version': self.request.application_url + '/parent/version/'}
