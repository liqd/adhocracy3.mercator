"""Common fixtures for adhocracy_mercator."""
from pytest import fixture


@fixture(scope='class')
def app(app_settings):
    """Return the adhocracy_s1 test wsgi application."""
    from pyramid.config import Configurator
    from adhocracy_core.testing import add_create_test_users_subscriber
    import adhocracy_s1
    configurator = Configurator(settings=app_settings,
                                root_factory=adhocracy_s1.root_factory)
    configurator.include(adhocracy_s1)
    configurator.commit()
    add_create_test_users_subscriber(configurator)
    app = configurator.make_wsgi_app()
    return app


@fixture
def integration(integration):
    """Include resource types and sheets."""
    integration.include('adhocracy_s1.sheets')
    integration.include('adhocracy_s1.resources')
    integration.include('adhocracy_s1.workflows')
    return integration
