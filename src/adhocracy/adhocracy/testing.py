"""Public py.test fixtures: http://pytest.org/latest/fixture.html. """
from unittest.mock import Mock
from configparser import ConfigParser
import types
import json
import os
import subprocess
import time

from cornice.util import extract_json_data
from cornice.errors import Errors
from pyramid.config import Configurator
from pyramid import testing
from pyramid.traversal import resource_path_tuple
from substanced.objectmap import ObjectMap
from substanced.objectmap import find_objectmap
from splinter import Browser
from webtest.http import StopableWSGIServer
from pytest import fixture
import colander

from adhocracy.interfaces import SheetMetadata
from adhocracy.interfaces import ResourceMetadata
from adhocracy.resources.subscriber import ChangelogMetadata
# FIXME: move this to adhocracy.interface to import package isolation


#####################################
# Integration/Function test helper  #
#####################################


class DummyPoolWithObjectMap(testing.DummyResource):

    def add(self, name, obj, **kwargs):
        self[name] = obj
        obj.__name__ = name
        obj.__parent__ = self
        objectmap = find_objectmap(self)
        obj.__oid__ = objectmap.new_objectid()
        path_tuple = resource_path_tuple(obj)
        objectmap.add(obj, path_tuple)

    def next_name(self, obj, prefix=''):
        return prefix + '_0000000' + str(hash(obj))


def create_pool_with_graph() -> testing.DummyResource:
    """Return pool like dummy object with objectmap and graph."""
    from adhocracy.interfaces import IPool
    from adhocracy.graph import Graph
    context = DummyPoolWithObjectMap(__oid__=0,
                                     __provides__=IPool)
    objectmap = ObjectMap(context)
    context.__objectmap__ = objectmap
    context.__graph__ = Graph(context)
    return context


##################
# Fixtures       #
##################

@fixture
def resource_meta() -> ResourceMetadata:
    """ Return basic resource metadata."""
    from adhocracy.interfaces import resource_metadata
    from adhocracy.interfaces import IResource
    return resource_metadata._replace(iresource=IResource)


@fixture
def sheet_meta() -> SheetMetadata:
    """ Return basic sheet metadata."""
    from adhocracy.interfaces import sheet_metadata
    from adhocracy.interfaces import ISheet
    return sheet_metadata._replace(isheet=ISheet,
                                   schema_class=colander.MappingSchema)


@fixture
def changelog_meta() -> ChangelogMetadata:
    """ Return changelog metadata."""
    from adhocracy.resources.subscriber import changelog_metadata
    return changelog_metadata


@fixture
class CorniceDummyRequest(testing.DummyRequest):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.validated = {}
        self.errors = Errors(self)
        self.content_type = 'application/json'
        deserializer = {'application/json': extract_json_data}
        self.registry.cornice_deserializers = deserializer

    def authenticated_userid(self):
        return None

    @property
    def json_body(self):
        return json.loads(self.body)


@fixture
def cornice_request():
    """ Return dummy request with additional validation attributes.

    Additional Attributes:
        `errors`, `validated`, `content_type`
    """
    return CorniceDummyRequest()


@fixture
def context() -> testing.DummyResource:
    """ Return dummy context with IResource interface."""
    from adhocracy.interfaces import IResource
    return testing.DummyResource(__provides__=IResource)


class DummyPool(testing.DummyResource):

    """Dummy Pool based on :class:`pyramid.testing.DummyResource`."""

    def add(self, name, resource, **kwargs):
        self[name] = resource
        resource.__parent__ = self
        resource.__name__ = name

    def next_name(self, obj, prefix=''):
        return prefix + '_0000000'


@fixture
def pool() -> DummyPool:
    """ Return dummy pool with IPool interface."""
    from adhocracy.interfaces import IPool
    return DummyPool(__provides__=IPool)


@fixture
def node() -> colander.MappingSchema:
    """Return dummy node."""
    return colander.MappingSchema()


@fixture
def transaction_changelog(changelog_meta):
    """Return transaction_changelog dictionary."""
    from collections import defaultdict
    metadata = lambda: changelog_meta
    return defaultdict(metadata)


@fixture
def mock_sheet() -> Mock:
    """Mock :class:`adhocracy.sheets.GenericResourceSheet`."""
    from adhocracy.interfaces import sheet_metadata
    from adhocracy.interfaces import ISheet
    # FIXME: Use spec=GenericResourceSheet for Mock; however this fails if the
    # mock object is deepcopied.
    sheet = Mock()
    sheet.meta = sheet_metadata._replace(isheet=ISheet)
    return sheet


@fixture
def mock_graph() -> Mock:
    """Mock :class:`adhocracy.graph.Graph`."""
    from adhocracy.graph import Graph
    mock = Mock(spec=Graph)
    return mock


@fixture
def mock_objectmap() -> Mock:
    """Mock :class:`substanced.objectmap.ObjectMap`."""
    from substanced.objectmap import ObjectMap
    mock = Mock(spec=ObjectMap)
    mock.get_reftypes.return_value = []
    return mock


@fixture
def mock_resource_registry() -> Mock:
    """Mock :class:`adhocracy.registry.ResourceContentRegistry`."""
    from adhocracy.registry import ResourceContentRegistry
    mock = Mock(spec=ResourceContentRegistry)
    mock.sheets_meta = {}
    mock.resources_meta = {}
    mock.resource_sheets.return_value = {}
    mock.resource_addables.return_value = {}
    return mock


@fixture
def config(request) -> Configurator:
    """Return dummy testing configuration."""
    config = testing.setUp()
    request.addfinalizer(testing.tearDown)
    return config


@fixture
def registry(config) -> object:
    """Return dummy registry."""
    return config.registry


@fixture
def mock_user_locator(registry) -> Mock:
    """Mock :class:`adhocracy.resource.principal.UserLocatorAdapter`."""
    from zope.interface import Interface
    from substanced.interfaces import IUserLocator
    from adhocracy.resources.principal import UserLocatorAdapter
    locator = Mock(spec=UserLocatorAdapter)
    registry.registerAdapter(lambda y, x: locator, (Interface, Interface),
                             IUserLocator)
    return locator


def _get_settings(request, part):
    """Return settings of a config part."""
    config_parser = ConfigParser()
    config_file = request.config.getvalue('pyramid_config')
    config_parser.read(config_file)
    settings = {}
    for option, value in config_parser.items(part):
        settings[option] = value
    return settings


@fixture(scope='session')
def settings(request) -> dict:
    """Return pyramid settings."""
    return _get_settings(request, 'app:main')


@fixture(scope='session')
def ws_settings(request) -> Configurator:
    """Return websocket server settings."""
    return _get_settings(request, 'websockets')


@fixture(scope='class')
def zeo(request) -> bool:
    """Start the test zeo server."""
    is_running = os.path.isfile('var/test_zeodata/ZEO.pid')
    if is_running:
        return True
    process = subprocess.Popen('bin/runzeo -Cetc/test_zeo.conf', shell=True,
                               stderr=subprocess.STDOUT)
    time.sleep(1)

    def fin():
        print('teardown zeo server')
        process.kill()
        _kill_pid_in_file('var/test_zeodata/ZEO.pid')

    request.addfinalizer(fin)
    return True


@fixture(scope='class')
def websocket(request, ws_settings) -> bool:
    """Start websocket server."""
    is_running = os.path.isfile(ws_settings['pid_file'])
    if is_running:
        return True
    config_file = request.config.getvalue('pyramid_config')
    process = subprocess.Popen('bin/start_ws_server ' + config_file,
                               shell=True,
                               stderr=subprocess.STDOUT)
    time.sleep(1)

    def fin():
        print('teardown websocket server')
        process.kill()
        _kill_pid_in_file(ws_settings['pid_file'])

    request.addfinalizer(fin)
    return True


def _kill_pid_in_file(path_to_pid_file):
    if os.path.isfile(path_to_pid_file):
        pid = open(path_to_pid_file).read().strip()
        pid_int = int(pid)
        os.kill(pid_int, 15)
        time.sleep(1)
        if os.path.isfile(path_to_pid_file):
            subprocess.call(['rm', path_to_pid_file])


@fixture(scope='class')
def app(websocket, zeo, settings):
    """Return the adhocracy wsgi application."""
    import adhocracy
    configurator = Configurator(settings=settings,
                                root_factory=adhocracy.root_factory)
    configurator.include(adhocracy)
    return configurator.make_wsgi_app()


@fixture(scope='class')
def server(request, app) -> StopableWSGIServer:
    """Return a http server with the adhocracy wsgi application."""
    server = StopableWSGIServer.create(app)
    request.addfinalizer(server.shutdown)
    return server


@fixture(scope='session')
def server_static(request) -> StopableWSGIServer:
    """Return a http server that only serves the static files."""
    from adhocracy.frontend import includeme
    config = Configurator(settings={})
    includeme(config)
    app = config.make_wsgi_app()

    server = StopableWSGIServer.create(app)

    def fin():
        print('teardown static http server')
        server.shutdown()

    request.addfinalizer(fin)
    return server


def evaluate_script_with_kwargs(self, code: str, **kwargs) -> object:
    """Replace kwargs in javascript code and evaluate."""
    code_with_kwargs = self.compile_js_code(code, **kwargs)
    return self.evaluate_script(code_with_kwargs)


def compile_js_code(self, code: str, **kwargs) -> str:
    """Generate a single JavaScript expression from complex code.

    This is accomplished by wrapping the code in a JavaScript function
    and passing any key word arguments to that function.  All arguments
    will be JSON encoded.

    :param code: any JavaScript code
    :param kwargs: arguments that will be passed to the wrapper function

    :returns: a string containing a single JavaScript expression suitable
        for consumption by splinter's ``evaluate_script``

    >>> code = "var a = 1; test.y = a; return test;"
    >>> compile_js_code(code, test={"x": 2})
    '(function(test) {var a = 1; test.y = a; return test;})({"x": 2})'

    """
    # make sure keys and values are in the same order
    keys = []
    values = []
    for key in kwargs:
        keys.append(key)
        values.append(kwargs[key])

    keys = ', '.join(keys)
    values = ', '.join((json.dumps(v) for v in values))

    return '(function({}) {{{}}})({})'.format(keys, code, values)


def add_helper_methods_to_splinter_browser_wrapper(inst: Browser) -> Browser:
    """Add additional helper functions to the splinter browser wrapper."""
    inst.compile_js_code = types.MethodType(compile_js_code, inst)
    inst.evaluate_script_with_kwargs = types.MethodType(
        evaluate_script_with_kwargs, inst)
    return inst


def angular_app_loaded(browser: Browser) -> bool:
    """Check that the angular app is loaded."""
    code = 'window.hasOwnProperty("adhocracy") '\
           '&& window.adhocracy.hasOwnProperty("loadState") '\
           '&& window.adhocracy.loadState === "complete";'
    return browser.evaluate_script(code)


@fixture
def browser_root(browser, server) -> Browser:
    """Return test browser, start application and go to `root.html`."""
    add_helper_methods_to_splinter_browser_wrapper(browser)
    url = server.application_url + 'frontend_static/root.html'
    browser.visit(url)
    browser.wait_for_condition(angular_app_loaded, 5)
    return browser


@fixture
def browser_test(browser, server_static) -> Browser:
    """Return test browser and go to `test.html`."""
    add_helper_methods_to_splinter_browser_wrapper(browser)

    url = server_static.application_url + 'frontend_static/test.html'
    browser.visit(url)

    def jasmine_finished(browser):
        code = 'jsApiReporter.finished'
        return browser.browser.evaluate_script(code)

    browser.wait_for_condition(jasmine_finished, 5)

    return browser
