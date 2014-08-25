"""Colander schemas to validate and (de)serialize Websocket messages."""
import colander

from adhocracy.schema import AbsolutePath


class Action(colander.SchemaNode):

    """An action requested by a client."""

    schema_type = colander.String
    validator = colander.OneOf(['subscribe', 'unsubscribe'])


class ClientRequestSchema(colander.MappingSchema):

    """Data structure for client requests."""

    action = Action()
    resource = AbsolutePath()


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
    validator = colander.OneOf(['modified',
                                'new_child',
                                'removed_child',
                                'modified_child',
                                'new_version',
                                'created',   # Only sent internally from
                                'deleted'])  # the Pyramid WS client
    default = 'modified'


class Notification(colander.MappingSchema):

    """Notification sent to a client if a resource has changed."""

    event = Event()
    resource = AbsolutePath()


class ChildNotification(Notification):

    """Notification involving a child resource."""

    child = AbsolutePath()


class VersionNotification(Notification):

    """Notification involving a version."""

    version = AbsolutePath()
