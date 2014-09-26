"""Tests for the principal package."""
import unittest

from pyramid import testing


class PrincipalIntegrationTest(unittest.TestCase):

    def setUp(self):
        from adhocracy_core.testing import create_pool_with_graph
        config = testing.setUp()
        config.include('adhocracy_core.registry')
        config.include('adhocracy_core.events')
        config.include('adhocracy_core.sheets.metadata')
        config.include('adhocracy_core.resources.principal')
        self.config = config
        self.context = create_pool_with_graph()

    def tearDown(self):
        testing.tearDown()

    def test_create_principals(self):
        from adhocracy_core.resources.principal import IPrincipalsService
        from adhocracy_core.resources.principal import IUsersService
        from adhocracy_core.resources.principal import IGroupsService
        from adhocracy_core.resources.principal import IPasswordResetsService

        inst = self.config.registry.content.create(
            IPrincipalsService.__identifier__, parent=self.context)

        assert IPrincipalsService.providedBy(inst)
        assert 'users' in inst
        assert 'groups' in inst
        assert 'resets' in inst
        assert IUsersService.providedBy(inst['users'])
        assert IGroupsService.providedBy(inst['groups'])
        assert IPasswordResetsService.providedBy(inst['resets'])

    def test_register_services(self):
        from adhocracy_core.resources.principal import IPrincipalsService

        self.config.registry.content.create(IPrincipalsService.__identifier__,
                                            parent=self.context)

        from substanced.util import find_service
        assert find_service(self.context, 'principals', 'users')
        assert find_service(self.context, 'principals', 'groups')
        assert find_service(self.context, 'principals', 'resets')

    def test_create_user(self):
        from adhocracy_core.resources.principal import IUser
        from adhocracy_core.resources.principal import User

        inst = self.config.registry.content.create(IUser.__identifier__)

        assert IUser.providedBy(inst)
        assert isinstance(inst, User)

    def test_create_and_add_user(self):
        from adhocracy_core.resources.principal import IPrincipalsService
        from adhocracy_core.resources.principal import IUser
        from adhocracy_core.sheets.user import IPasswordAuthentication
        from adhocracy_core.sheets.user import IUserBasic

        self.config.include('adhocracy_core.sheets.user')

        principals_pool = self.config.registry.content.create(
            IPrincipalsService.__identifier__)
        users_pool = principals_pool['users']
        appstructs = {
            IUserBasic.__identifier__ : {
                'name': 'Anna Müller',
                'email': 'anna@example.org'
            },
            IPasswordAuthentication.__identifier__ : {
                'password': 'fodThyd2'
            },
        }
        inst = self.config.registry.content.create(IUser.__identifier__,
                                                   parent=users_pool,
                                                   appstructs=appstructs)

        got_it = False
        for child in users_pool:
            if users_pool[child] == inst:
                got_it = True
                break
        assert got_it


class UserUnitTest(unittest.TestCase):

    def _makeOne(self):
        from adhocracy_core.resources.principal import User
        return User()

    def test_create(self):
        user = self._makeOne()
        assert user.email == ''
        assert user.password == ''
        assert user.tzname == 'UTC'


class UserLocatorAdapterUnitTest(unittest.TestCase):

    def _make_one(self, context=None, request=None):
        from adhocracy_core.resources.principal import UserLocatorAdapter
        return UserLocatorAdapter(context, request)

    def setUp(self):
        from substanced.interfaces import IFolder
        self.config = testing.setUp()
        context = testing.DummyResource(__provides__=IFolder)
        context['principals'] = testing.DummyResource(__is_service__=True,
                                                       __provides__=IFolder)
        context['principals']['users'] = testing.DummyResource()
        self.context = context

    def tearDown(self):
        testing.tearDown()

    def test_create(self):
        from substanced.interfaces import IUserLocator
        from zope.interface.verify import verifyObject
        inst = self._make_one()
        assert IUserLocator.providedBy(inst)
        assert verifyObject(IUserLocator, inst)

    def test_get_user_by_email_user_exists(self):
        user = testing.DummyResource(email='test@test.de')
        self.context['principals']['users']['User1'] = user
        inst = self._make_one(self.context, testing.DummyRequest())
        assert inst.get_user_by_email('test@test.de') is user

    def test_get_user_by_email_user_not_exists(self):
        user = testing.DummyResource(email='')
        self.context['principals']['users']['User1'] = user
        inst = self._make_one(self.context, testing.DummyRequest())
        assert inst.get_user_by_email('wrong@test.de') is None

    def test_get_user_by_login_user_exists(self):
        user = testing.DummyResource(name='login name')
        self.context['principals']['users']['User1'] = user
        inst = self._make_one(self.context, testing.DummyRequest())
        assert inst.get_user_by_login('login name') is user

    def test_get_user_by_login_user_not_exists(self):
        user = testing.DummyResource(name='')
        self.context['principals']['users']['User1'] = user
        inst = self._make_one(self.context, testing.DummyRequest())
        assert inst.get_user_by_login('wrong login name') is None


class UserLocatorAdapterIntegrationTest(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.config.include('adhocracy_core.registry')
        self.config.include('adhocracy_core.resources.principal')
        self.context = testing.DummyResource()

    def tearDown(self):
        testing.tearDown()

    def test_create(self):
        from substanced.interfaces import IUserLocator
        from zope.component import getMultiAdapter
        assert getMultiAdapter((self.context, testing.DummyRequest), IUserLocator)
