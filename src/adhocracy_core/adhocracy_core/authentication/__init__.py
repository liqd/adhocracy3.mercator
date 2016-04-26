"""Authentication with support for token http headers."""
from pyramid.authentication import CallbackAuthenticationPolicy
from pyramid.interfaces import IAuthenticationPolicy
from pyramid.interfaces import IRequest
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.traversal import resource_path
from pyramid.settings import asbool
from zope.interface import implementer
from zope.interface import Interface
from zope.component import ComponentLookupError

from adhocracy_core.utils import create_schema
from adhocracy_core.interfaces import ITokenManger
from adhocracy_core.interfaces import error_entry
from adhocracy_core.schema import Resource


UserTokenHeader = 'X-User-Token'
"""The request header parameter to set the authentication token."""

UserPathHeader = 'X-User-Path'
"""Deprecated: The optional request header to set the userid."""



@implementer(IAuthenticationPolicy)
class TokenHeaderAuthenticationPolicy(CallbackAuthenticationPolicy):
    """A :term:`authentication policy` based on X-User-* request headers.

    To authenticate the client has to send http header with `X-User-Token`.

    Constructor Arguments

    :param groupfinder: callable that accepts `userid` and `request` and
                        returns the ACL groups of this user.
                        The `None` value is allowed to ease unit testing.
    :param secret: random string to salt the generated token.
    :param timeout:  Maximum number of seconds which a newly create token
                     will be considered valid.
                     The `None` value is allowed to disable the timeout.
    :param get_tokenmanager: callable that accepts `request` and returns
                             :class:`adhocracy_core.interfaces.ITokenManager`.
    :param hashalg: Any hash algorithm supported by :func: `hashlib.new`.
                    This is used to create the authentication token.

    This Policy implements :class:`pyramid.interfaces.IAuthentictionPolicy`
    except that not authenticated user get the additional principal
    `system.Anynymous`.
    """

    def __init__(self, secret: str,
                 groupfinder: callable=None,
                 timeout: float=None,
                 get_tokenmanager: callable=get_tokenmanager,
                 hashalg: str='sha512',
                 ):
        """Initialize self."""
        self.callback = groupfinder  # callback is an inherited class attr.
        self.secret = secret
        self.timeout = timeout
        self.get_tokenmanager = get_tokenmanager
        self.hashalg = hashalg

    def unauthenticated_userid(self, request) -> str:
        """Return authenticated userid or None.

        The authenticated userid is returned because the client does not
        provide a userid.
        """
        return self.authenticated_userid(request)

    def authenticated_userid(self, request) -> str:
        """Return authenticated userid or None.

        THE RESULT IS CACHED for the current request in the request attribute
        called: __cached_userid__ .
        """
        cached_userid = getattr(request, '__cached_userid__', None)
        if cached_userid:
            return cached_userid
        settings = request.registry.settings
        if not asbool(settings.get('adhocracy.validate_user_token', True)):
            # used for work in progress thentos integration
            userid = self._get_user_path(request)
            return userid
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager is None:
            return None
        token = request.headers.get(UserTokenHeader, None)
        userid = tokenmanager.get_user_id(token, timeout=self.timeout)
        request.__cached_userid__ = userid
        return userid

    def _get_user_path(self, request: IRequest) -> str:
        """Return normalised X-User-Path request header or None."""
        user_path_header = request.headers.get(UserPathHeader, None)
        user_path = None
        if user_path_header is not None:  # pragma: no branch
            schema = create_schema(Resource, request.context, request)
            user = schema.deserialize(user_path_header)
            user_path = resource_path(user)
        return user_path

    def remember(self, request, userid, **kw) -> [tuple]:
        """Create persistent user session and return authentication headers."""
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager:  # for testing
            token = tokenmanager.create_token(userid,
                                              secret=self.secret,
                                              hashalg=self.hashalg)
        else:
            token = None
        return [('X-User-Token', token)]

    def forget(self, request) -> [tuple]:
        """Remove user session and return "forget this session" headers."""
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager:
            token = request.headers.get(UserTokenHeader, None)
            tokenmanager.delete_token(token)
        return []  # forget user session headers are not implemented

    def effective_principals(self, request: IRequest) -> list:
        """Return userid, roles and groups for the authenticated user.

        THE RESULT IS CACHED for the current request in the request attribute
        called: __cached_principals__ .
        """
        cached_principals = getattr(request, '__cached_principals__', None)
        if cached_principals:
            return cached_principals
        principals = super().effective_principals(request)
        request.__cached_principals__ = principals
        return principals


def validate_user_headers(view: callable):
    """Decorator vor :term:`view` to check if the user token.

    :raise `pyramid.httpexceptions.HTTPBadRequest: if user token is invalid
    """
    def wrapped_view(context, request):
        token_is_set = UserTokenHeader in request.headers
        authenticated_is_empty = request.authenticated_userid is None
        if token_is_set and authenticated_is_empty:
            error = error_entry('header', 'X-User-Token', 'Invalid user token')
            request.errors.append(error)
            raise HTTPBadRequest()
        return view(context, request)
    return wrapped_view


def includeme(config):
    """Register the TokenManger adapter."""
