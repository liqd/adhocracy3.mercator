"""Colander schemas to validate and (de)serialize Websocket messages."""
import colander

from adhocracy_core.schema import ResourceObject
from adhocracy_core.schema import Resource


class Action(colander.SchemaNode):

    """An action requested by a client."""

    schema_type = colander.String
    validator = colander.OneOf(['subscribe', 'unsubscribe'])


class ClientRequestSchema(colander.MappingSchema):

    """Data structure for client requests."""

    action = Action(missing=colander.required)
    resource = Resource(missing=colander.required)


class Status(colander.SchemaNode):

    """A status sent to the client."""

    schema_type = colander.String
    validator = colander.OneOf(['ok', 'redundant'])
    default = 'ok'


class StatusConfirmation(ClientRequestSchema):

    """Data structure for status confirmations sent to the client."""

    status = Status()


class Event(colander.SchemaNode):

    """The type of event notifications sent to the client."""

    schema_type = colander.String
    validator = colander.OneOf(['modified',  # Used internally / for the client
                                'new_child',
                                'removed_child',
                                'modified_child',
                                'new_version',
                                'created',   # Only sent internally from
                                'deleted'])  # the Pyramid WS client
    default = 'modified'


class ServerNotification(colander.MappingSchema):

    """Notification sent to the server from the Pyramid WS client."""

    event = Event()
    resource = colander.SchemaNode(ResourceObject(serialization_form='path'))


class Notification(colander.MappingSchema):

    """Notification sent to a client if a resource has changed."""

    event = Event()
    resource = Resource()


class ChildNotification(Notification):

    """ServerNotification involving a child resource."""

    child = Resource()


class VersionNotification(Notification):

    """ServerNotification involving a version."""

    version = Resource()
