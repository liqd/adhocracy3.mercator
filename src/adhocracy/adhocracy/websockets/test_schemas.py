import unittest

from pyramid import testing
import colander
import pytest

from adhocracy.websockets.schemas import Notification


class ClientRequestSchemaUnitTests(unittest.TestCase):

    """Test ClientRequestSchema deserialization."""

    def _make_one(self):
        from adhocracy.websockets.schemas import ClientRequestSchema
        return ClientRequestSchema()

    def test_deserialize_subscribe(self):
        inst = self._make_one()
        result = inst.deserialize(
            {'action': 'subscribe', 'resource': '/child'})
        assert result == {'action': 'subscribe', 'resource': '/child'}

    def test_deserialize_unsubscribe(self):
        inst = self._make_one()
        result = inst.deserialize(
            {'action': 'unsubscribe', 'resource': '/child'})
        assert result == {'action': 'unsubscribe', 'resource': '/child'}

    def test_deserialize_invalid_action(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'action': 'blah', 'resource': '/child'})

    def test_deserialize_no_action(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'resource': '/child'})

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
            inst.deserialize({'event': 'created', 'resource': '/child'})

    def test_deserialize_wrong_inner_type(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize({'action': 7, 'resource': '/child'})

    def test_deserialize_wrong_outer_type(self):
        inst = self._make_one()
        with pytest.raises(colander.Invalid):
            inst.deserialize(['subscribe'])


class StatusConfirmationUnitTests(unittest.TestCase):

    """Test StatusConfirmation serialization."""

    def _make_one(self):
        from adhocracy.websockets.schemas import StatusConfirmation
        return StatusConfirmation()

    def test_serialize_ok(self):
        inst = self._make_one()
        result = inst.serialize(
            {'status': 'ok', 'action': 'subscribe', 'resource': '/parent/child'})
        assert result == {'status': 'ok',
                          'action': 'subscribe',
                          'resource': '/parent/child'}

    def test_serialize_redundant(self):
        inst = self._make_one()
        result = inst.serialize(
            {'status': 'redundant',
             'action': 'unsubscribe',
             'resource': '/parent/child'})
        assert result == {'status': 'redundant',
                          'action': 'unsubscribe',
                          'resource': '/parent/child'}

    def test_serialize_default_status(self):
        inst = self._make_one()
        result = inst.serialize({'action': 'subscribe',
                                 'resource': '/parent/child'})
        assert result == {'status': 'ok',
                          'action': 'subscribe',
                          'resource': '/parent/child'}


class NotificationUnitTests(unittest.TestCase):

    """Test serialization of Notification and its subclasses."""

    def test_serialize_notification(self):
        inst = Notification()
        result = inst.serialize({'event': 'modified', 'resource': '/parent'})
        assert result == {'event': 'modified', 'resource': '/parent'}

    def test_deserialize_notification(self):
        inst = Notification()
        result = inst.deserialize(
            {'event': 'created', 'resource': '/parent'})
        assert result == {'event': 'created', 'resource': '/parent'}

    def test_serialize_child_notification(self):
        self.child = testing.DummyResource('child', '/parent')
        from adhocracy.websockets.schemas import ChildNotification
        inst = ChildNotification()
        result = inst.serialize({'event': 'removed_child',
                                 'resource': '/parent',
                                 'child': '/parent/child'})
        assert result == {'event': 'removed_child',
                          'resource': '/parent',
                          'child': '/parent/child'}

    def test_serialize_version_notification(self):
        from adhocracy.websockets.schemas import VersionNotification
        inst = VersionNotification()
        result = inst.serialize({'event': 'removed_child',
                                 'resource': '/parent',
                                 'version': '/parent/version'})
        assert result == {'event': 'removed_child',
                          'resource': '/parent',
                          'version': '/parent/version'}
