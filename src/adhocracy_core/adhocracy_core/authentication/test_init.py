import unittest
from unittest.mock import Mock

from pyramid import testing
import pytest


class TokenHeaderAuthenticationPolicy(unittest.TestCase):

    def make_one(self, secret, **kw):
        from adhocracy_core.authentication import TokenHeaderAuthenticationPolicy
        return TokenHeaderAuthenticationPolicy(secret, **kw)

    def setUp(self):
        context = testing.DummyResource()
        self.context = context
        user = testing.DummyResource()
        self.user = user
        context['user'] = user
        self.config = testing.setUp()
        self.request = testing.DummyRequest(context=context,
                                            registry=self.config.registry)
        self.user_url = self.request.application_url + '/user/'
        self.userid = '/user'
        self.token = 'secret'
        self.token_headers = {'X-User-Token': self.token}

    def tearDown(self):
        testing.tearDown()

    def test_create(self):
        from pyramid.interfaces import IAuthenticationPolicy
        from zope.interface.verify import verifyObject
        inst = self.make_one('secret')
        assert verifyObject(IAuthenticationPolicy, inst)
        assert inst.callback is None
        assert inst.secret == 'secret'

    def test_create_with_kw_args(self):
        get_tokenmanager = lambda x: object(),
        groupfinder = object()
        inst = self.make_one('', groupfinder=groupfinder,
                              get_tokenmanager=get_tokenmanager,
                              timeout=1)
        assert inst.callback == groupfinder
        assert inst.timeout == 1
        assert inst.get_tokenmanager == get_tokenmanager

    def test_unauthenticated_userid(self):
        inst = self.make_one('')
        inst.authenticated_userid = Mock()
        inst.unauthenticated_userid(self.request)
        inst.authenticated_userid.assert_called_with(self.request)

    def test_authenticated_userid_without_tokenmanger(self):
        get_tokenmanager = lambda x: None
        inst = self.make_one('', get_tokenmanager=get_tokenmanager)
        assert inst.authenticated_userid(self.request) is None

    def test_authenticated_userid_with_tokenmanger_valid_token(self):
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = self.userid
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager,
                              timeout=10)
        self.request.headers = self.token_headers
        assert inst.authenticated_userid(self.request) == self.userid
        assert tokenmanager.get_user_id.call_args[1] == {'timeout': 10}

    def test_authenticated_userid_with_tokenmanger_wrong_token(self):
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = None
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.headers = self.token_headers
        assert inst.authenticated_userid(self.request) is None

    def test_authenticated_userid_with_token_validation_off_no_token(self):
        tokenmanager = Mock()
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.registry.settings['adhocracy.validate_user_token'] = False
        self.request.headers = {'X-User-Path': self.user_url}
        assert inst.authenticated_userid(self.request) == self.userid

    def test_authenticated_userid_with_token_validation_off_wrong_token(self):
        tokenmanager = Mock()
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.registry.settings['adhocracy.validate_user_token'] = False
        self.request.headers = {'X-User-Path': self.user_url,
                                'X-User-Token': 'whatever'}
        assert inst.authenticated_userid(self.request) == self.userid

    def test_authenticated_userid_set_cached_userid(self):
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = self.userid
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.headers = self.token_headers
        inst.authenticated_userid(self.request)
        assert self.request.__cached_userid__ == self.userid

    def test_authenticated_userid_get_cached_userid(self):
        self.request.__cached_userid__ = self.userid
        inst = self.make_one('', get_tokenmanager=lambda x: None)
        assert inst.authenticated_userid(self.request) == self.userid

    def test_effective_principals_without_headers(self):
        from pyramid.security import Everyone
        inst = self.make_one('')
        assert inst.effective_principals(self.request) == [Everyone]

    def test_effective_principals_without_headers_and_groupfinder_returns_None(self):
        from pyramid.security import Everyone
        def groupfinder(userid, request):
            return None
        inst = self.make_one('', groupfinder=groupfinder)
        assert inst.effective_principals(self.request) == [Everyone]

    def test_effective_principals_with_headers_and_grougfinder_returns_groups(self):
        from pyramid.security import Everyone
        from pyramid.security import Authenticated
        def groupfinder(userid, request):
            return ['group']
        self.request.headers = self.token_headers
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = self.userid
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager,
                              groupfinder=groupfinder)
        result = inst.effective_principals(self.request)
        assert result == [Everyone, Authenticated, self.userid, 'group']

    def test_effective_principals_with_only_user_header_and_groupfinder_returns_groups(self):
        from pyramid.security import Everyone
        def groupfinder(userid, request):
            return ['group']
        self.request.headers = {}
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = None
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager,
                              groupfinder=groupfinder)
        result = inst.effective_principals(self.request)
        assert result == [Everyone]

    def test_effective_principals_set_cache(self):
        from pyramid.security import Authenticated
        from pyramid.security import Everyone
        self.request.headers = self.token_headers
        tokenmanager = Mock()
        tokenmanager.get_user_id.return_value = self.userid
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager,
                              groupfinder=lambda x, y: [])
        inst.effective_principals(self.request)
        assert self.request.__cached_principals__ == [Everyone, Authenticated,
                                                      self.userid]

    def test_effective_principals_get_cache(self):
        """The result is cached for one request!"""
        self.request.__cached_principals__ = ['cached']
        inst = self.make_one('')
        assert inst.effective_principals(self.request) == ['cached']

    def test_remember_without_tokenmanager(self):
        inst = self.make_one('', get_tokenmanager=lambda x: None)
        headers = dict(inst.remember(self.request, self.userid))
        assert headers['X-User-Token'] is None

    def test_remember_with_tokenmanger(self):
        tokenmanager = Mock()
        inst = self.make_one('secret', get_tokenmanager=lambda x: tokenmanager)
        tokenmanager.create_token.return_value = self.token
        headers = dict(inst.remember(self.request, self.userid))
        assert headers['X-User-Token'] is not None
        assert tokenmanager.create_token.call_args[1] == {'secret': 'secret',
                                                          'hashalg': 'sha512'}

    def test_forget_without_tokenmanager(self):
        inst = self.make_one('', get_tokenmanager=lambda x: None)
        self.request.headers = self.token_headers
        assert inst.forget(self.request) == []

    def test_forget_with_tokenmanger(self):
        tokenmanager = Mock()
        inst = self.make_one('', get_tokenmanager=lambda x: tokenmanager)
        self.request.headers = self.token_headers
        assert inst.forget(self.request) == []
        assert tokenmanager.delete_token.is_called

    def delete_expired_tokens(self, timeout: float):
        from . import TokenMangerAnnotationStorage
        tokenmanager = Mock(spec=TokenMangerAnnotationStorage)
        request = testing.DummyRequest()
        timeout = 0.1
        inst = self.make_one('',
                             get_tokenmanager=lambda x: tokenmanager,
                             timeout=timeout)
        inst.delete_expired_tokens(request)
        tokenmanager.delete_expired_tokens.assert_called_with(timeout)


class TokenHeaderAuthenticationPolicyIntegrationTest(unittest.TestCase):

    def setUp(self):
        from substanced.interfaces import IService
        config = testing.setUp()
        config.include('adhocracy_core.content')
        config.include('adhocracy_core.resources.principal')
        config.include('adhocracy_core.authentication')
        self.config = config
        context = testing.DummyResource(__provides__=IService)
        context['principals'] = testing.DummyResource(__provides__=IService)
        context['principals']['users'] = testing.DummyResource(
            __provides__=IService)
        user = testing.DummyResource()
        context['principals']['users']['1'] = user
        self.user_id = '/principals/users/1'
        self.request = testing.DummyRequest(registry=config.registry,
                                            root=context,
                                            context=user)
        self.user_url = self.request.application_url + self.user_id + '/'

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
        headers = dict(remember(self.request, self.user_id))
        assert headers['X-User-Token'] is not None


def test_validate_user_headers_call_view_if_authenticated(context, request_):
    from . import validate_user_headers
    view = Mock()
    request_.headers['X-User-Token'] = 2
    request_.authenticated_userid = object()
    validate_user_headers(view)(context, request_)
    view.assert_called_with(context, request_)


def test_validate_user_headers_raise_if_authentication_failed(context,
                                                               request_):
    from pyramid.httpexceptions import HTTPBadRequest
    from . import validate_user_headers
    view = Mock()
    request_.headers['X-User-Token'] = 2
    request_.authenticated_userid = None
    with pytest.raises(HTTPBadRequest):
        validate_user_headers(view)(context, request_)


class IncludemeIntegrationTest(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.registry = self.config.registry
        self.config.include('adhocracy_core.authentication')
        self.context = testing.DummyResource()

    def test_get_tokenmanager_adapter(self):
        from adhocracy_core.interfaces import ITokenManger
        from zope.interface.verify import verifyObject
        inst = self.registry.getAdapter(self.context, ITokenManger)
        assert verifyObject(ITokenManger, inst)
