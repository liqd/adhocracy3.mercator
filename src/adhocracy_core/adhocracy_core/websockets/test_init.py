import unittest


class WebSocketErrorUnitTests(unittest.TestCase):

    def test_str(self):
        from adhocracy_core.websockets import WebSocketError
        err = WebSocketError('malformed_message', 'message is binary')
        assert str(err) == 'malformed_message: message is binary'
