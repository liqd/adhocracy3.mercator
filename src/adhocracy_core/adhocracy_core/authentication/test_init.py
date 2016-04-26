import unittest
from unittest.mock import Mock

from pyramid import testing
from pytest import fixture
from pytest import raises
from pytest import mark


class TestTokenHeaderAuthenticationPolicy:


    def make_one(self, secret, **kw):
        from adhocracy_core.authentication import TokenHeaderAuthenticationPolicy
        return TokenHeaderAuthenticationPolicy(secret, **kw)

    @fixture
    def inst(self):
        return self.make_one('secret')

    def test_create(self):
        inst = self.make_one('secret')
        assert inst.private_key == 'secret'

    def test_implements_authentication_policy(self, inst):
        from pyramid.interfaces import IAuthenticationPolicy
        from zope.interface.verify import verifyObject
        assert verifyObject(IAuthenticationPolicy, inst)
        assert IAuthenticationPolicy.providedBy(inst)

    def test_subclasses_jwt_policy(self, inst):
        from pyramid_jwt import JWTAuthenticationPolicy
        assert isinstance(inst, JWTAuthenticationPolicy)

    def test_create_with_kwargs(self):
        callback = lambda x: x
        timeout = 100
        inst = self.make_one('secret', callback=callback, timeout=timeout)
        assert inst.callback is callback
        assert inst.expiration.seconds == timeout

    def test_effective_principals_returns_super(self, inst, mocker, request_):
        mocker.patch('pyramid_jwt.JWTAuthenticationPolicy.effective_principals',
                     return_value=['principal1'])
        assert inst.effective_principals(request_) == ['principal1']

    def test_effective_principals_set_cache(self, inst, mocker, request_):
        mocker.patch('pyramid_jwt.JWTAuthenticationPolicy.effective_principals',
                     return_value=['principal1'])
        inst.effective_principals(request_)
        assert request_.__cached_principals__ == ['principal1']

    def test_effective_principals_get_cache(self, inst, request_):
        """The result is cached for one request!"""
        request_.__cached_principals__ = ['principal1']
        assert inst.effective_principals(request_) == ['principal1']

    def test_remember_returns_list_with_token_header(self, inst, request_):
        import jwt
        from . import UserTokenHeader
        header = inst.remember(request_, 'userid')[0]
        name = header[0]
        assert name == UserTokenHeader
        token = jwt.decode(header[1], 'secret')
        assert token


class TokenHeaderAuthenticationPolicyIntegrationTest(unittest.TestCase):

    def setUp(self):
        from substanced.interfaces import IService
        config = testing.setUp()
        config.include('adhocracy_core.content')
        config.include('adhocracy_core.resources.principal')
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
