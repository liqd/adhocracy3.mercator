from pyramid import testing
from pytest import fixture
from pytest import mark


def test_add_cors_headers(request_):
    from .subscriber import add_cors_headers
    response = testing.DummyResource(headers={})
    event = testing.DummyResource(response=response,
                                  request=request_)
    add_cors_headers(event)
    assert response.headers == \
        {'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept,'
                                         ' X-User-Path, X-User-Token',
         'Access-Control-Allow-Credentials': 'true',
         'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS'}


def test_add_cors_headers_use_request_origin_as_allow_origin(request_):
    from .subscriber import add_cors_headers
    response = testing.DummyResource(headers={})
    request_.headers = {'Origin': 'http://x.org'}
    event = testing.DummyResource(response=response,
                                  request=request_)
    add_cors_headers(event)
    assert response.headers['Access-Control-Allow-Origin'] == 'http://x.org'


@fixture()
def integration(config):
    config.include('adhocracy_core.rest.subscriber')


@mark.usefixtures('integration')
class TestIntegrationIncludeme:

    def test_register_subscriber(self, registry):
        from .subscriber import add_cors_headers
        handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
        assert add_cors_headers.__name__ in handlers

