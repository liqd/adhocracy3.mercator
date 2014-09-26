import unittest
from unittest.mock import Mock

from pyramid import testing
import pytest


class TokenManagerUnitTest(unittest.TestCase):

    def setUp(self):
        from datetime import datetime
        self.context = testing.DummyResource()
        self.secret = 'secret'
        self.user_id = '/principals/user/1'
        self.token = 'secret'
        self.timestamp = datetime.now()

    def _make_one(self, context, **kw):
        from adhocracy_core.authentication import TokenMangerAnnotationStorage
        return TokenMangerAnnotationStorage(context)

    def test_create(self):
        from adhocracy_core.interfaces import ITokenManger
        from zope.interface.verify import verifyObject
        inst = self._make_one(self.context)
        assert verifyObject(ITokenManger, inst)
        assert ITokenManger.providedBy(inst)

    def test_create_token_with_user_id(self):
        inst = self._make_one(self.context)
        token = inst.create_token(self.user_id)
        assert len(token) == 128

    def test_create_token_with_user_id_and_secret_and_hashalg(self):
        inst = self._make_one(self.context)
        token = inst.create_token(self.user_id,
                                  secret='secret',
                                  hashalg='sha256')
        assert len(token) == 64

    def test_create_token_with_user_id_second_time(self):
        inst = self._make_one(self.context)
        token = inst.create_token(self.user_id)
        token_second = inst.create_token(self.user_id)
        assert token != token_second

    def test_get_user_id_with_existing_token(self):
        inst = self._make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.user_id, self.timestamp)
        assert inst.get_user_id(self.token) == self.user_id

    def test_get_user_id_with_multiple_existing_token(self):
        inst = self._make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.user_id, self.timestamp)
        token_second = 'secret_second'
        inst.token_to_user_id_timestamp[token_second] = (self.user_id, self.timestamp)
        assert inst.get_user_id(token_second) == self.user_id

    def test_get_user_id_with_non_existing_token(self):
        inst = self._make_one(self.context)
        with pytest.raises(KeyError):
            inst.get_user_id('wrong_token')

    def test_get_user_id_with_existing_token_but_passed_timeout(self):
        inst = self._make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.user_id, self.timestamp)
        with pytest.raises(KeyError):
            inst.get_user_id(self.token, timeout=0)

    def test_delete_token_with_non_existing_user_id(self):
        inst = self._make_one(self.context)
        assert inst.delete_token('wrong_token') is None

    def test_delete_token_with_existing_user_id(self):
        inst = self._make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.user_id, self.timestamp)
        inst.delete_token(self.token)
        assert self.token not in inst.token_to_user_id_timestamp


class TokenHeaderAuthenticationPolicy(unittest.TestCase):

    def _make_one(self, secret, **kw):
        from adhocracy_core.authentication import TokenHeaderAuthenticationPolicy
        return TokenHeaderAuthenticationPolicy(secret, **kw)

    def setUp(self):
        self.request = testing.DummyRequest()
        self.user_id = 'principals/users/1'
        self.token = 'secret'
        self.token_and_user_id_headers = {'X-User-Token': self.token,
                                          'X-User-Path': self.user_id}

    def test_create(self):
        from pyramid.interfaces import IAuthenticationPolicy
        from zope.interface.verify import verifyObject
        inst = self._make_one('secret')
        assert verifyObject(IAuthenticationPolicy, inst)
        assert inst.callback is None
        assert inst.secret == 'secret'

    def test_create_with_kw_args(self):
        get_tokenmanager = lambda x: object(),
        groupfinder = object()
        inst = self._make_one('', groupfinder=groupfinder,
                              get_tokenmanager=get_tokenmanager,
                              timeout=1)
        assert inst.callback == groupfinder
        assert inst.timeout == 1
        assert inst.get_tokenmanager == get_tokenmanager

    def test_unauthenticated_userid_without_header(self):
        inst = self._make_one('')
        assert inst.unauthenticated_userid(self.request) is None

    def test_unauthenticated_userid_with_header(self):
        inst = self._make_one('')
        self.request.headers = self.token_and_user_id_headers
        assert inst.unauthenticated_userid(self.request) == self.user_id

    def test_authenticated_userid_without_tokenmanger(self):
        get_tokenmanager=lambda x: None
        inst = self._make_one('', get_tokenmanager=get_tokenmanager)
        assert inst.authenticated_userid(self.request) is None

    def test_authenticated_userid_with_tokenmanger_valid_token(self):
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = self.user_id
        inst = self._make_one('', get_tokenmanager=lambda x: tokenmanager,
                              timeout=10)
        self.request.headers = self.token_and_user_id_headers
        assert inst.authenticated_userid(self.request) == self.user_id
        assert tokenmanager.get_user_id.call_args[1] == {'timeout': 10}

    def test_authenticated_userid_with_tokenmanger_valid_token_but_wrong_user_id(self):
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = self.user_id + 'WRONG_ID'
        inst = self._make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.headers = self.token_and_user_id_headers
        assert inst.authenticated_userid(self.request) is None

    def test_authenticated_userid_with_tokenmanger_wrong_token(self):
        tokenmanager = Mock()
        tokenmanager.get_user_id.side_effect = KeyError
        inst = self._make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.headers = self.token_and_user_id_headers
        assert inst.authenticated_userid(self.request) == None

    def test_effective_principals_without_headers(self):
        from pyramid.security import Everyone
        inst = self._make_one('')
        assert inst.effective_principals(self.request) == [Everyone]

    def test_effective_principals_without_headers_and_groupfinder_returns_None(self):
        from pyramid.security import Everyone
        def groupfinder(userid, request):
            return None
        inst = self._make_one('', groupfinder=groupfinder)
        assert inst.effective_principals(self.request) == [Everyone]

    def test_effective_principals_with_headers_and_grougfinder_returns_groups(self):
        from pyramid.security import Everyone
        from pyramid.security import Authenticated
        def groupfinder(userid, request):
            return ['group']
        inst = self._make_one('', groupfinder=groupfinder)
        self.request.headers = self.token_and_user_id_headers
        result = inst.effective_principals(self.request)
        assert result == [Everyone, Authenticated, self.user_id, 'group']

    def test_remember_without_tokenmanager(self):
        inst = self._make_one('', get_tokenmanager=lambda x: None)
        result = inst.remember(self.request, self.user_id)
        assert result == {'X-User-Path': None, 'X-User-Token': None}

    def test_remember_with_tokenmanger(self):
        tokenmanager = Mock()
        inst = self._make_one('secret', get_tokenmanager=lambda x: tokenmanager)
        tokenmanager.create_token.return_value = self.token
        result = inst.remember(self.request, self.user_id)
        assert result == self.token_and_user_id_headers
        assert tokenmanager.create_token.call_args[1] =={'secret': 'secret',
                                                         'hashalg': 'sha512'}

    def test_forget_without_tokenmanager(self):
        inst = self._make_one('', get_tokenmanager=lambda x: None)
        self.request.headers = self.token_and_user_id_headers
        assert inst.forget(self.request) == {}

    def test_forget_with_tokenmanger(self):
        tokenmanager = Mock()
        inst = self._make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.headers = self.token_and_user_id_headers
        assert inst.forget(self.request) == {}
        assert tokenmanager.delete_token.is_called


class GetTokenManagerUnitTest(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest(registry=self.config.registry,
                                            root=testing.DummyResource())

    def _call_fut(self, request):
        from adhocracy_core.authentication import get_tokenmanager
        return get_tokenmanager(request)

    def _register_tokenmanager_adapter(self):
        from adhocracy_core.interfaces import ITokenManger
        from zope.interface import Interface
        dummy = testing.DummyResource(__provides__=ITokenManger)
        self.config.registry.registerAdapter(lambda x: dummy,
                                    required=(Interface,),
                                    provided=ITokenManger)

    def test_tokenmanager_adapter_registered(self):
        from adhocracy_core.interfaces import ITokenManger
        self._register_tokenmanager_adapter()
        inst = self._call_fut(self.request)
        assert ITokenManger.providedBy(inst)

    def test_tokenmanager_adapter_not_registered(self):
        inst = self._call_fut(self.request)
        assert inst is None


class TokenHeaderAuthenticationPolicyIntegrationTest(unittest.TestCase):

    def setUp(self):
        config = testing.setUp()
        config.include('adhocracy_core.authentication')
        self.config = config
        self.request = testing.DummyRequest(registry=self.config.registry,
                                            root=testing.DummyResource())
        self.user_id = '/principals/user/1'

    def _register_authentication_policy(self):
        from adhocracy_core.authentication import TokenHeaderAuthenticationPolicy
        from pyramid.authorization import ACLAuthorizationPolicy
        authz_policy = ACLAuthorizationPolicy()
        self.config.set_authorization_policy(authz_policy)
        authn_policy = TokenHeaderAuthenticationPolicy('secret')
        self.config.set_authentication_policy(authn_policy)

    def test_remember(self):
        from pyramid.security import remember
        self._register_authentication_policy()
        headers = remember(self.request, self.user_id)
        assert headers['X-User-Path'] == self.user_id
        assert headers['X-User-Token'] is not None


class IncludemeIntegrationTest(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.config.include('adhocracy_core.authentication')
        self.context = testing.DummyResource()

    def test_get_tokenmanager_adapter(self):
        from zope.component import getAdapter
        from adhocracy_core.interfaces import ITokenManger
        from zope.interface.verify import verifyObject
        inst = getAdapter(self.context, ITokenManger)
        assert verifyObject(ITokenManger, inst)
