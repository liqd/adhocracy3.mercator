"""Workaround to force fixture override for doctest."""
from pytest import fixture


@fixture(scope='class', autouse=True)  # autouse needed to make the doctest run
def app_router_filestorage(app_settings_filestorage):
    """Return the test wsgi application using a DB with file storage."""
    import adhocracy_meinberlin
    from adhocracy_core.testing import make_configurator
    configurator = make_configurator(app_settings_filestorage,
                                     adhocracy_meinberlin)
    return configurator.make_wsgi_app()
