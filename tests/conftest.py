"""Add or override py.test fixtures for all tests in this directory."""
from splinter import Browser
from pytest import fixture
from pytest import skip


def pytest_addoption(parser):
    """Add pytest option --run_embed_tests."""
    parser.addoption('--run_embed_tests', action='store_true', default=False,
                     help='run embed tests (needs /etc/hosts modifications)',
                     )


def pytest_runtest_setup(item):
    """Skip tests with `embed` marker if `--run_embed_tests` is not set."""
    run_embed = item.config.getoption('--run_embed_tests')
    embed_marker = item.get_marker('embed')
    if run_embed:
        return
    elif embed_marker:
        skip('You need to enable embed test with --run_embed_tests')


@fixture(scope='class')
def app(zeo, settings, websocket):
    """Return the adhocracy wsgi application.

    This overrides adhocracy_core.testing.app.
    """
    from pyramid.config import Configurator
    import adhocracy
    configurator = Configurator(settings=settings,
                                root_factory=adhocracy.root_factory)
    configurator.include(adhocracy)
    app = configurator.make_wsgi_app()
    return app


@fixture
def browser(browser, frontend, backend, frontend_url) -> Browser:
    """Return test browser, start sample application and go to `root.html`.

    Add attribute `root_url` pointing to the adhocracy root.html page.
    Add attribute `app_url` pointing to the adhocracy application page.
    Before visiting a new url the browser waits until the angular app is loaded
    """
    from adhocracy_frontend.testing import angular_app_loaded
    browser.root_url = frontend_url
    browser.app_url = frontend_url
    browser.visit(browser.root_url)
    browser.wait_for_condition(angular_app_loaded, 5)
    return browser


@fixture
def browser_embed(browser, frontend, backend, frontend_url) -> Browser:
    """Start embedder application."""
    url = frontend_url + 'static/embed.html'
    browser.visit(url)
    return browser
