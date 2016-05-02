from unittest.mock import Mock
import unittest

from pyramid import testing
from pytest import raises
from pytest import fixture


class TokenManagerUnitTest(unittest.TestCase):

    def setUp(self):
        from datetime import datetime
        self.context = testing.DummyResource()
        self.secret = 'secret'
        self.userid = '/principals/user/1'
        self.token = 'secret'
        self.timestamp = datetime.now()

    def make_one(self, context, **kw):
        from adhocracy_core.authentication import TokenMangerAnnotationStorage
        return TokenMangerAnnotationStorage(context)

    def test_create(self):
        from adhocracy_core.interfaces import ITokenManger
        from zope.interface.verify import verifyObject
        inst = self.make_one(self.context)
        assert verifyObject(ITokenManger, inst)
        assert ITokenManger.providedBy(inst)

    def test_create_token_with_user_id(self):
        inst = self.make_one(self.context)
        token = inst.create_token(self.userid)
        assert len(token) == 128

    def test_create_token_with_user_id_and_secret_and_hashalg(self):
        inst = self.make_one(self.context)
        token = inst.create_token(self.userid,
                                  secret='secret',
                                  hashalg='sha256')
        assert len(token) == 64

    def test_create_token_with_user_id_second_time(self):
        inst = self.make_one(self.context)
        token = inst.create_token(self.userid)
        token_second = inst.create_token(self.userid)
        assert token != token_second

    def test_get_user_id_with_existing_token(self):
        inst = self.make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.userid, self.timestamp)
        assert inst.get_user_id(self.token) == self.userid

    def test_get_user_id_with_multiple_existing_token(self):
        inst = self.make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.userid, self.timestamp)
        token_second = 'secret_second'
        inst.token_to_user_id_timestamp[token_second] = (self.userid, self.timestamp)
        assert inst.get_user_id(token_second) == self.userid

    def test_get_user_id_with_non_existing_token(self):
        inst = self.make_one(self.context)
        assert inst.get_user_id('wrong_token') is None

    def test_get_user_id_with_existing_token_but_passed_timeout(self):
        inst = self.make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.userid, self.timestamp)
        assert inst.get_user_id(self.token, timeout=0) is None

    def test_delete_token_with_non_existing_user_id(self):
        inst = self.make_one(self.context)
        assert inst.delete_token('wrong_token') is None

    def test_delete_token_with_existing_user_id(self):
        inst = self.make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.userid, self.timestamp)
        inst.delete_token(self.token)
        assert self.token not in inst.token_to_user_id_timestamp

    def test_delete_expired_tokens_delete_token_if_expired(self):
        inst = self.make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.userid, self.timestamp)
        inst._is_expired = Mock(return_value=True)
        inst.delete_token = Mock()
        timeout = 0.1
        inst.delete_expired_tokens(timeout)

        inst._is_expired.assert_called_with(self.timestamp, timeout)
        inst.delete_token.assert_called_with(self.token)

    def test_delete_expired_tokens_ignore_token_if_not_expired(self):
        inst = self.make_one(self.context)
        inst.token_to_user_id_timestamp[self.token] = (self.userid, self.timestamp)
        inst._is_expired = Mock(return_value=False)
        inst.delete_token = Mock()
        timeout = 0.1
        inst.delete_expired_tokens(timeout)
        assert not inst.delete_token.called


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


class GetTokenManagerUnitTest(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.request = testing.DummyRequest(registry=self.config.registry,
                                            root=testing.DummyResource())

    def call_fut(self, request):
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
        inst = self.call_fut(self.request)
        assert ITokenManger.providedBy(inst)

    def test_tokenmanager_adapter_not_registered(self):
        inst = self.call_fut(self.request)
        assert inst is None

    def test_request_has_no_root(self):
        """For pyramid scripts request.root is None and no authentication
           is needed.
        """
        self.request.root = None
        inst = self.call_fut(self.request)
        assert inst is None


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
    with raises(HTTPBadRequest):
        validate_user_headers(view)(context, request_)


class TestMultiRouteAuthenticationPolicy:

    @fixture
    def inst(self):
        from . import MultiRouteAuthenticationPolicy
        return MultiRouteAuthenticationPolicy()

    @fixture
    def policy(self, mocker):
        from pyramid.interfaces import IAuthenticationPolicy
        return mocker.Mock(spec=IAuthenticationPolicy)()

    @fixture
    def other_policy(self, mocker):
        from pyramid.interfaces import IAuthenticationPolicy
        return mocker.Mock(spec=IAuthenticationPolicy)()

    @fixture
    def route(self, mocker):
        from pyramid.interfaces import IRoute
        return mocker.Mock(spec=IRoute,
                           name='route_name')()

    def test_is_authentication_policy(self, inst):
        from pyramid.interfaces import IAuthenticationPolicy
        from zope.interface.verify import verifyObject
        assert IAuthenticationPolicy.providedBy(inst)
        assert verifyObject(IAuthenticationPolicy, inst)

    def test_is_subclass_of_callback_policy(self, inst):
        from pyramid.authentication import CallbackAuthenticationPolicy
        assert isinstance(inst, CallbackAuthenticationPolicy)

    def test_add_policy(self, inst, policy):
        inst.add_policy('route_name', policy)
        assert inst.policies['route_name'] is policy

    def test_get_matching_policy_return_none_if_no_policy(self, request_, inst):
        request_.matched_route = None
        inst.policies = {}
        assert inst._get_matching_policy(request_) is None

    def test_get_matching_policy_return_none_if_wrong_policy(
        self, request_, inst, policy):
        request_.matched_route = None
        inst.policies = {'other_policy': policy}
        assert inst._get_matching_policy(request_) is None

    def test_get_matching_policy_return_policy_if_none_matches(
        self, request_, inst, policy):
        request_.matched_route = None
        inst.policies = {None: policy}
        assert inst._get_matching_policy(request_) is policy

    def test_get_matching_policy_return_policy_if_route_name_matches(
        self, request_, inst, policy, other_policy, route):
        request_.matched_route = route
        inst.policies = {route.name: policy,
                         'other_route': other_policy}
        assert inst._get_matching_policy(request_) is policy

    def test_unauthenticated_userid_return_none_if_no_policy_policy_machted(
        self, request_, inst, mocker):
        inst._get_matching_policy = mocker.Mock(return_value=None)
        assert inst.unauthenticated_userid(request_) is None

    def test_unauthenticated_userid_return_userid_of_matched_policy(
        self, inst, request_, policy, mocker):
        inst._get_matching_policy = mocker.Mock(return_value=policy)
        policy.unauthenticated_userid.return_value = 'userid'
        assert inst.unauthenticated_userid(request_) == 'userid'

    def test_effective_principals_return_everyone_if_no_policy_policy_machted(
        self, request_, inst, mocker):
        from pyramid.security import Everyone
        inst._get_matching_policy = mocker.Mock(return_value=None)
        assert inst.effective_principals(request_) == [Everyone]

    def test_effective_principals_return_principals_of_matched_policy(
        self, inst, request_, policy, mocker):
        inst._get_matching_policy = mocker.Mock(return_value=policy)
        policy.effective_principals.return_value = ['Group1']
        assert inst.effective_principals(request_) == ['Group1']

    def test_remember_return_empty_list_if_no_policies(self, inst, request_):
        assert inst.remember(request_, 'principal') == []

    def test_remember_return_headers_of_all_policies(
        self, inst, request_, policy, other_policy):
        inst.policies['route1'] = policy
        policy.remember.return_value = [('1', '1')]
        inst.policies['route2'] = other_policy
        other_policy.remember.return_value = [('2', '2')]
        assert inst.remember(request_, 'principal') == [('1','1'), ('2', '2')]

    def test_forget_return_empty_list_if_no_policies(self, inst, request_):
        assert inst.forget(request_) == []

    def test_forget_return_headers_of_all_policies(
        self, inst, request_, policy, other_policy):
        inst.policies['route1'] = policy
        policy.forget.return_value = [('1', '1')]
        inst.policies['route2'] = other_policy
        other_policy.forget.return_value = [('2', '2')]
        assert inst.forget(request_) == [('1','1'), ('2', '2')]


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
