"""Public py.test fixtures: http://pytest.org/latest/fixture.html. """
from unittest.mock import Mock
from configparser import ConfigParser
from shutil import rmtree
import json
import os
import subprocess
import time

from cornice.util import extract_json_data
from cornice.errors import Errors
from pyramid.config import Configurator
from pyramid import testing
from pyramid.traversal import resource_path_tuple
from pyramid.util import DottedNameResolver
from pytest import fixture
from substanced.objectmap import ObjectMap
from substanced.objectmap import find_objectmap
from ZODB import FileStorage
from webtest import TestApp
from webtest import TestResponse
from zope.interface.interfaces import IInterface
import colander

from adhocracy_core.interfaces import SheetMetadata
from adhocracy_core.interfaces import ChangelogMetadata
from adhocracy_core.interfaces import ResourceMetadata


#####################################
# Integration/Function test helper  #
#####################################

god_header = {'X-User-Path': '/principals/users/0000000',
              'X-User-Token': 'SECRET_GOD'}
"""The authentication headers for the `god` user, used by functional fixtures.
This assumes the initial user is created and has the `god` role.
"""
god_login = 'god'
"""The login name for the god user, default value."""
god_password = 'password'
"""The password for the god user, default value."""
god_email = 'sysadmin@test.de'
"""The email for the god user, default value."""
reader_header = {'X-User-Path': '/principals/users/0000001',
                 'X-User-Token': 'SECRET_READER'}
"""The authentication headers for the `reader`, used by functional fixtures.
This assumes the user exists with path == 'X-User-Path'.
"""
reader_login = 'reader'
reader_password = 'password'
reader_roles = ['reader']
annotator_header = {'X-User-Path': '/principals/users/0000002',
                    'X-User-Token': 'SECRET_ANNOTATOR'}
annotator_login = 'annotator'
annotator_password = 'password'
annotator_roles = ['annotator']
contributor_header = {'X-User-Path': '/principals/users/0000003',
                      'X-User-Token': 'SECRET_CONTRIBUTOR'}
contributor_login = 'contributor'
contributor_password = 'password'
contributor_roles = ['contributor']
editor_header = {'X-User-Path': '/principals/users/0000004',
                 'X-User-Token': 'SECRET_EDITOR'}
editor_login = 'editor'
editor_password = 'password'
editor_roles = ['editor']
reviewer_header = {'X-User-Path': '/principals/users/0000005',
                   'X-User-Token': 'SECRET_REVIEWER'}
reviewer_login = 'reviewer'
reviewer_password = 'password'
reviewer_roles = ['reviewer']
manager_header = {'X-User-Path': '/principals/users/0000006',
                  'X-User-Token': 'SECRET_EDITOR'}
manager_login = 'manager'
manager_password = 'password'
manager_roles = ['manager']
admin_header = {'X-User-Path': '/principals/users/0000007',
                'X-User-Token': 'SECRET_ADMIN'}
admin_login = 'admin'
admin_password = 'password'
admin_roles = ['admin']

broken_header = {'X-User-Path': '/principals/users/0000001',
                 'X-User-Token': ''}

batch_url = '/batch'


class DummyPool(testing.DummyResource):

    """Dummy Pool based on :class:`pyramid.testing.DummyResource`."""

    def add(self, name, resource, **kwargs):
        self[name] = resource
        resource.__parent__ = self
        resource.__name__ = name

    def next_name(self, obj, prefix=''):
        return prefix + '_0000000'

    def add_service(self, name, resource, **kwargs):
        from substanced.interfaces import IService
        from zope.interface import alsoProvides
        alsoProvides(resource, IService)
        resource.__is_service__ = True
        self.add(name, resource)

    def find_service(self, service_name, *sub_service_names):
        from substanced.util import find_service
        return find_service(self, service_name, *sub_service_names)


class DummyPoolWithObjectMap(DummyPool):

    def add(self, name, obj, **kwargs):
        super().add(name, obj)
        objectmap = find_objectmap(self)
        obj.__oid__ = objectmap.new_objectid()
        path_tuple = resource_path_tuple(obj)
        objectmap.add(obj, path_tuple)

    def next_name(self, obj, prefix=''):
        return prefix + '_0000000' + str(hash(obj))


def create_pool_with_graph() -> testing.DummyResource:
    """Return pool like dummy object with objectmap and graph."""
    # FIXME use pool_graph or pool_graph_catalog fixture instead
    from adhocracy_core.interfaces import IPool
    from substanced.interfaces import IFolder
    from adhocracy_core.graph import Graph
    context = DummyPoolWithObjectMap(__oid__=0,
                                     __provides__=(IPool, IFolder))
    objectmap = ObjectMap(context)
    context.__objectmap__ = objectmap
    context.__graph__ = Graph(context)
    return context


def register_sheet(context, mock_sheet, registry, isheet=None) -> Mock:
    """Register `mock_sheet` for `context`. You can ony use this only once.

    If you need to register multiple mock_sheets in you test add side effects:
    `registry.content.get_sheet.side_effects = [sheet1, sheet2]`.
    You can also set single sheets directly:
    `registry.content.get_sheet.return_value = sheet1
    """
    from zope.interface import alsoProvides
    if isheet is not None:
        mock_sheet.meta = mock_sheet.meta._replace(isheet=isheet)
    if context is not None:
        alsoProvides(context, mock_sheet.meta.isheet)
    registry.content.get_sheet.return_value = mock_sheet
    return mock_sheet


def create_event_listener(config: Configurator, ievent: IInterface) -> list:
    """Register dummy event listener that adds events to the returned List."""
    events = []
    listener = lambda event: events.append(event)
    config.add_subscriber(listener, ievent)
    return events


##################
# Fixtures       #
##################


@fixture
def pool_graph(config):
    """Return pool with graph for integration/functional tests."""
    from adhocracy_core.resources.pool import Pool
    from adhocracy_core.resources.root import _add_graph
    from adhocracy_core.resources.root import _add_objectmap_to_app_root
    config.include('adhocracy_core.content')
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.graph')
    context = Pool()
    _add_objectmap_to_app_root(context)
    _add_graph(context, config.registry)
    return context


@fixture
def pool_graph_catalog(config, pool_graph):
    """Return pool wit graph and catalog for integration/functional tests."""
    from substanced.interfaces import MODE_IMMEDIATE
    from adhocracy_core.resources.root import _add_catalog_service
    config.include('adhocracy_core.catalog')
    context = pool_graph
    _add_catalog_service(context, config.registry)
    context['catalogs']['system']['name'].action_mode = MODE_IMMEDIATE
    context['catalogs']['system']['interfaces'].action_mode = MODE_IMMEDIATE
    context['catalogs']['adhocracy']['tag'].action_mode = MODE_IMMEDIATE
    context['catalogs']['adhocracy']['rate'].action_mode = MODE_IMMEDIATE
    return context


@fixture
def resource_meta() -> ResourceMetadata:
    """ Return basic resource metadata."""
    from adhocracy_core.interfaces import resource_metadata
    from adhocracy_core.interfaces import IResource
    return resource_metadata._replace(iresource=IResource)


@fixture
def sheet_meta() -> SheetMetadata:
    """ Return basic sheet metadata."""
    from adhocracy_core.interfaces import sheet_metadata
    from adhocracy_core.interfaces import ISheet
    return sheet_metadata._replace(isheet=ISheet,
                                   schema_class=colander.MappingSchema)


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
def changelog_meta() -> ChangelogMetadata:
    """ Return changelog metadata."""
    from adhocracy_core.changelog import changelog_metadata
    return changelog_metadata


@fixture
def context() -> testing.DummyResource:
    """ Return dummy context with IResource interface."""
    from adhocracy_core.interfaces import IResource
    return testing.DummyResource(__provides__=IResource)


@fixture
def pool() -> DummyPool:
    """ Return dummy pool with IPool interface."""
    from adhocracy_core.interfaces import IPool
    from substanced.interfaces import IFolder
    return DummyPool(__provides__=(IPool, IFolder))


@fixture
def service() -> DummyPool:
    """ Return dummy pool with IServicePool interface."""
    from adhocracy_core.interfaces import IServicePool
    from substanced.interfaces import IFolder
    return DummyPool(__provides__=(IServicePool, IFolder),
                     __is_service__=True)


@fixture
def item() -> DummyPool:
    """ Return dummy pool with IItem and IMetadata interface."""
    from adhocracy_core.interfaces import IItem
    from adhocracy_core.sheets.metadata import IMetadata
    return DummyPool(__provides__=(IItem, IMetadata))


@fixture
def node() -> colander.MappingSchema:
    """Return dummy node."""
    return colander.MappingSchema()


@fixture
def changelog(changelog_meta):
    """Return transaction_changelog dictionary."""
    from collections import defaultdict
    metadata = lambda: changelog_meta
    return defaultdict(metadata)


@fixture
def registry_with_changelog(registry, changelog):
    """Return registry with transaction_changelog."""
    registry.changelog = changelog
    return registry


@fixture
def mock_sheet() -> Mock:
    """Mock :class:`adhocracy_core.sheets.GenericResourceSheet`."""
    from adhocracy_core.interfaces import sheet_metadata
    from adhocracy_core.interfaces import ISheet
    # FIXME: Use spec=GenericResourceSheet for Mock; however this fails if the
    # mock object is deepcopied.
    sheet = Mock()
    sheet.meta = sheet_metadata._replace(isheet=ISheet,
                                         schema_class=colander.MappingSchema)
    sheet.schema = colander.MappingSchema()
    sheet.get.return_value = {}
    return sheet


@fixture
def mock_graph() -> Mock:
    """Mock :class:`adhocracy_core.graph.Graph`."""
    from adhocracy_core.graph import Graph
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
def mock_content_registry() -> Mock:
    """Mock :class:`adhocracy_core.content.ResourceContentRegistry`."""
    from adhocracy_core.content import ResourceContentRegistry
    mock = Mock(spec=ResourceContentRegistry)
    mock.sheets_meta = {}
    mock.resources_meta = {}
    mock.get_resources_meta_addable.return_value = []
    mock.resources_meta_addable = {}
    mock.get_sheets_read.return_value = []
    mock.get_sheets_edit.return_value = []
    mock.get_sheets_create.return_value = []
    mock.get_sheet.return_value = None
    mock.sheets_read = {}
    mock.sheets_edit = {}
    mock.sheets_create = {}
    mock.sheets_create_mandatory = {}
    return mock


@fixture
def registry_with_content(registry, mock_content_registry):
    """Return registry with content registry attribute."""
    registry.content = mock_content_registry
    return registry


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
    """Mock :class:`adhocracy_core.resource.principal.UserLocatorAdapter`."""
    from zope.interface import Interface
    from adhocracy_core.interfaces import IRolesUserLocator
    from adhocracy_core.resources.principal import UserLocatorAdapter
    locator = Mock(spec=UserLocatorAdapter)
    locator.get_groupids.return_value = None
    locator.get_roleids.return_value = None
    locator.get_user_by_userid.return_value = None
    locator.get_user_by_login.return_value = None
    locator.get_user_by_email.return_value = None
    locator.get_group_roleids.return_value = None
    locator.get_role_and_group_roleids.return_value = None
    registry.registerAdapter(lambda y, x: locator, (Interface, Interface),
                             IRolesUserLocator)
    return locator


def _get_settings(request, part, config_path_key='pyramid_config'):
    """Return settings of a config part."""
    config_parser = ConfigParser()
    config_file = request.config.getoption(config_path_key) \
        or 'etc/test_with_ws.ini'
    config_parser.read(config_file)
    settings = {}
    for option, value in config_parser.items(part):
        settings[option] = value
    return settings


@fixture(scope='session')
def settings(request) -> dict:
    """Return app:main and server:main settings."""
    settings = {}
    app = _get_settings(request, 'app:main')
    settings.update(app)
    server = _get_settings(request, 'server:main')
    settings.update(server)
    return settings


@fixture(scope='session')
def app_settings(request) -> dict:
    """Return settings to start the test wsgi app."""
    settings = {}
    # disable creating a default group, this causes
    # ZODB.POSException.InvalidObjectReference
    settings['adhocracy.add_default_group'] = False
    # enable create test user for every :term:`role`
    settings['adhocracy.add_test_users'] = True
    # don't look for the websocket server
    settings['adhocracy.ws_url'] = ''
    # use in memory database without zeo
    settings['zodbconn.uri'] = 'memory://'
    # satisfy substanced
    settings['substanced.secret'] = 'secret'
    # extra dependenies
    settings['pyramid.includes'] = [
        # commit after request
        'pyramid_tm',
        # mock mail server
        'pyramid_mailer.testing',
    ]
    settings['mail.default_sender'] = 'substanced_demo@example.com'
    settings['adhocracy.abuse_handler_mail'] \
        = 'abuse_handler@unconfigured.domain'
    settings['adhocracy.message_user_subject'] =\
        '[{site_name}] Message from {sender_name}: {title}'
    return settings


@fixture(scope='session')
def ws_settings(request) -> Configurator:
    """Return websocket server settings."""
    return _get_settings(request, 'websockets')


@fixture(scope='session')
def supervisor(request) -> str:
    """Start supervisord daemon."""
    pid_file = 'var/supervisord.pid'
    if _is_running(pid_file):
        return True
    output = subprocess.check_output('bin/supervisord',
                                     shell=True,
                                     stderr=subprocess.STDOUT)
    assert bool(output) is False  # assert there are no error messages
    return output


@fixture(scope='class')
def zeo(request, supervisor) -> str:
    """Start zeo server with supervisor."""
    output = subprocess.check_output(
        'bin/supervisorctl restart adhocracy_test:test_zeo',
        shell=True,
        stderr=subprocess.STDOUT)

    def fin():
        subprocess.check_output(
            'bin/supervisorctl stop adhocracy_test:test_zeo',
            shell=True,
            stderr=subprocess.STDOUT)
    request.addfinalizer(fin)

    return output


@fixture(scope='class')
def websocket(request, supervisor) -> bool:
    """Start websocket server with supervisor."""
    output = subprocess.check_output(
        'bin/supervisorctl restart adhocracy_test:test_autobahn',
        shell=True,
        stderr=subprocess.STDOUT)

    def fin():
        subprocess.check_output(
            'bin/supervisorctl stop adhocracy_test:test_autobahn',
            shell=True,
            stderr=subprocess.STDOUT)
    request.addfinalizer(fin)

    return output


def _kill_pid_in_file(path_to_pid_file):
    if os.path.isfile(path_to_pid_file):
        pid = open(path_to_pid_file).read().strip()
        pid_int = int(pid)
        os.kill(pid_int, 15)
        time.sleep(1)
        subprocess.call(['rm', path_to_pid_file])


def _is_running(path_to_pid_file) -> bool:
    if os.path.isfile(path_to_pid_file):
        pid = open(path_to_pid_file).read().strip()
        pid_int = int(pid)
        try:
            os.kill(pid_int, 0)
        except OSError:
            subprocess.call(['rm', path_to_pid_file])
        else:
            return True


def add_user_token(root, userid: str, token: str, registry):
    """Add user authentication token to :app:`Pyramid`."""
    from datetime import datetime
    from adhocracy_core.interfaces import ITokenManger
    timestamp = datetime.now()
    token_manager = registry.getAdapter(root, ITokenManger)
    token_manager.token_to_user_id_timestamp[token] = (userid, timestamp)


def add_user(root, login: str=None, password: str=None, email: str=None,
             roles=None, registry=None) -> str:
    """Add user to :app:`Pyramid`."""
    from substanced.util import find_service
    from adhocracy_core.resources.principal import IUser
    import adhocracy_core.sheets
    users = find_service(root, 'principals', 'users')
    roles = roles or []
    passwd_sheet = adhocracy_core.sheets.principal.IPasswordAuthentication
    appstructs =\
        {adhocracy_core.sheets.principal.IUserBasic.__identifier__:
         {'name': login},
         adhocracy_core.sheets.principal.IUserExtended.__identifier__:
         {'email': email},
         adhocracy_core.sheets.principal.IPermissions.__identifier__:
         {'roles': roles},
         passwd_sheet.__identifier__:
         {'password': password},
         }
    user = registry.content.create(IUser.__identifier__,
                                   parent=users,
                                   appstructs=appstructs,
                                   registry=registry,
                                   run_after_creation=False,
                                   )
    user.activate()
    return user


def add_test_users(root, registry, options):
    """Add test user and dummy authentication token for every role."""
    add_user_token(root,
                   god_header['X-User-Path'],
                   god_header['X-User-Token'],
                   registry)
    add_user(root, login=reader_login, password=reader_password,
             email='reader@example.org', roles=['reader'], registry=registry)
    add_user_token(root,
                   reader_header['X-User-Path'],
                   reader_header['X-User-Token'],
                   registry)
    add_user(root, login=annotator_login, password=annotator_password,
             email='annotator@example.org', roles=['annotator'],
             registry=registry)
    add_user_token(root,
                   annotator_header['X-User-Path'],
                   annotator_header['X-User-Token'],
                   registry)
    add_user(root, login=contributor_login, password=contributor_password,
             email='contributor@example.org', roles=['contributor'],
             registry=registry)
    add_user_token(root,
                   contributor_header['X-User-Path'],
                   contributor_header['X-User-Token'],
                   registry)
    add_user(root, login=editor_login, password=editor_password,
             email='editor@example.org', roles=['editor'], registry=registry)
    add_user_token(root,
                   editor_header['X-User-Path'],
                   editor_header['X-User-Token'],
                   registry)
    add_user(root, login=reviewer_login, password=reviewer_password,
             email='reviewer@example.org', roles=['reviewer'],
             registry=registry)
    add_user_token(root,
                   reviewer_header['X-User-Path'],
                   reviewer_header['X-User-Token'],
                   registry)
    add_user(root, login=manager_login, password=manager_password,
             email='manager@example.org', roles=['manager'], registry=registry)
    add_user_token(root,
                   manager_header['X-User-Path'],
                   manager_header['X-User-Token'],
                   registry)
    add_user(root, login=admin_login, password=admin_password,
             email='admin@example.org', roles=['admin'], registry=registry)
    add_user_token(root,
                   admin_header['X-User-Path'],
                   admin_header['X-User-Token'],
                   registry)


def includeme_root_with_test_users(config):
    """Override IRootPool to create initial test users."""
    from adhocracy_core.resources import add_resource_type_to_registry
    from adhocracy_core.resources.root import root_metadata
    config.commit()
    after_creation = root_metadata.after_creation + [add_test_users]
    root_metadata = root_metadata._replace(after_creation=after_creation)
    add_resource_type_to_registry(root_metadata, config)


@fixture(scope='class')
def app(app_settings):
    """Return the adhocracy test wsgi application."""
    return _make_app(app_settings)


def _make_app(app_config):
    import adhocracy_core
    import adhocracy_core.resources.sample_paragraph
    import adhocracy_core.resources.sample_section
    import adhocracy_core.resources.sample_proposal
    configurator = Configurator(settings=app_config,
                                root_factory=adhocracy_core.root_factory)
    configurator.include(adhocracy_core)
    configurator.include(adhocracy_core.resources.sample_paragraph)
    configurator.include(adhocracy_core.resources.sample_proposal)
    configurator.include(adhocracy_core.resources.sample_section)
    configurator.include(adhocracy_core.resources.comment)
    configurator.include(adhocracy_core.resources.rate)
    app = configurator.make_wsgi_app()
    return app


@fixture(scope='class')
def app_with_filestorage(app_settings: dict):
    """
    Return the adhocracy test wsgi application using a DB with file storage.

    Any DB contents are cleared by this fixture.
    """
    db_file = 'var/test_zeodata/Data.fs'
    blob_dir = 'var/test_zeodata/blobs'
    # Delete old content
    storage = FileStorage.FileStorage(db_file, blob_dir=blob_dir)
    storage.cleanup()
    # This doesn't seem to clear the blob_dir, hence we do so manually
    rmtree(blob_dir, ignore_errors=True)
    our_settings = app_settings.copy()
    our_settings['zodbconn.uri'] = 'file://{}?blobstorage_dir={}'.format(
        db_file, blob_dir)
    return _make_app(our_settings)


@fixture(scope='class')
def newest_activation_path(app):
    """Return the newest activation path generated by app."""
    import re
    mailer = app.registry.messenger._get_mailer()
    last_message_body = mailer.outbox[-1].body
    path_match = re.search(r'/activate/\S+', last_message_body)
    return path_match.group()


@fixture(scope='class')
def backend(request, zeo, supervisor):
    """Start the backend server with supervisor."""
    output = subprocess.check_output(
        'bin/supervisorctl restart adhocracy_test:test_backend',
        shell=True,
        stderr=subprocess.STDOUT
    )

    def fin():
        subprocess.check_output(
            'bin/supervisorctl stop adhocracy_test:test_backend',
            shell=True,
            stderr=subprocess.STDOUT
        )
    request.addfinalizer(fin)

    return output


@fixture(scope='class')
def backend_with_ws(request, zeo, websocket, supervisor):
    """Start the backend and websocket server with supervisor."""
    output = subprocess.check_output(
        'bin/supervisorctl restart test_backend_with_ws',
        shell=True,
        stderr=subprocess.STDOUT
    )

    def fin():
        subprocess.check_output(
            'bin/supervisorctl stop test_backend_with_ws',
            shell=True,
            stderr=subprocess.STDOUT
        )
    request.addfinalizer(fin)

    return output


class AppUser:

    """:class:`webtest.TestApp` wrapper for backend functional testing."""

    def __init__(self, app,
                 rest_url: str='http://localhost',
                 base_path: str='/',
                 header: dict=None):
        self.app = TestApp(app)
        """:class:`webtest.TestApp`to send requests to the backend server."""
        self.rest_url = rest_url
        """backend server url to generate request urls."""
        self.base_path = base_path
        """path prefix to generate request urls."""
        self.header = header or {}
        """default header for requests, mostly for authentication."""
        self._resolver = DottedNameResolver()

    def post(self,
             path: str, iresource: IInterface, cstruct: dict) -> TestResponse:
        """Build and post request to the backend rest server."""
        url = self.rest_url + self.base_path + path
        props = self._build_post_body(iresource, cstruct)
        resp = self.app.post_json(url, props, headers=self.header,
                                  expect_errors=True)
        return resp

    def _build_post_body(self, iresource: IInterface, cstruct: dict) -> dict:
        return {'content_type': iresource.__identifier__,
                'data': cstruct}

    def batch(self, subrequests: list):
        """Build and post batch request to the backend rest server."""
        resp = self.app.post_json(batch_url, subrequests, headers=self.header,
                                  expect_errors=True)
        return resp

    def get(self, path: str) -> TestResponse:
        """Send get request to the backend rest server."""
        url = self.rest_url + self.base_path + path
        resp = self.app.get(url, headers=self.header, expect_errors=True)
        return resp

    def options(self, path: str) -> TestResponse:
        """Send options request to the backend rest server."""
        url = self.rest_url + self.base_path + path
        resp = self.app.options(url, headers=self.header, expect_errors=True)
        return resp

    def get_postable_types(self, path: str) -> []:
        """Send options request and return the postable content types."""
        resp = self.options(path)
        if 'POST' not in resp.json:
            return []
        post_request_body = resp.json['POST']['request_body']
        type_names = sorted([r['content_type'] for r in post_request_body])
        iresources = [self._resolver.resolve(t) for t in type_names]
        return iresources


@fixture(scope='class')
def app_anonymous(app) -> TestApp:
    """Return backend test app wrapper with reader authentication."""
    return AppUser(app, base_path='/adhocracy')


@fixture(scope='class')
def app_broken_token(app) -> TestApp:
    """Return backend test app wrapper with reader authentication."""
    return AppUser(app, base_path='/adhocracy', header=broken_header)


@fixture(scope='class')
def app_reader(app) -> TestApp:
    """Return backend test app wrapper with reader authentication."""
    return AppUser(app, base_path='/adhocracy', header=reader_header)


@fixture(scope='class')
def app_annotator(app):
    """Return backend test app wrapper with annotator authentication."""
    return AppUser(app, base_path='/adhocracy', header=annotator_header)


@fixture(scope='class')
def app_contributor(app):
    """Return backend test app wrapper with contributor authentication."""
    return AppUser(app, base_path='/adhocracy', header=contributor_header)


@fixture(scope='class')
def app_editor(app):
    """Return backend test app wrapper with editor authentication."""
    return AppUser(app, base_path='/adhocracy', header=editor_header)


@fixture(scope='class')
def app_manager(app):
    """Return backend test app wrapper with manager authentication."""
    return AppUser(app, base_path='/adhocracy', header=manager_header)


@fixture(scope='class')
def app_admin(app):
    """Return backend test app wrapper with admin authentication."""
    return AppUser(app, base_path='/adhocracy', header=admin_header)


@fixture(scope='class')
def app_god(app):
    """Return backend test app wrapper with god authentication."""
    return AppUser(app, base_path='/adhocracy', header=god_header)
