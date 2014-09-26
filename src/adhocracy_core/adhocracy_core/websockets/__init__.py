"""Asynchronous client-server communication via Websockets."""


class WebSocketError(Exception):

    """An error that occurs during communication with a WebSocket client."""

    def __init__(self, error_type: str, details: str):
        self.error_type = error_type
        self.details = details

    def __str__(self):
        return '{}: {}'.format(self.error_type, self.details)


def includeme(config):  # pragma: no cover
    """Configure WebSockets client."""
    config.include('.client')
