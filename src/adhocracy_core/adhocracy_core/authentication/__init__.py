"""Authentication with support for token http headers."""
from pyramid_jwt import JWTAuthenticationPolicy
from pyramid.interfaces import IAuthenticationPolicy
from pyramid.interfaces import IRequest
from pyramid.httpexceptions import HTTPBadRequest
from zope.interface import implementer

from adhocracy_core.interfaces import error_entry


UserTokenHeader = 'X-User-Token'
"""The request header parameter to set the authentication token."""


@implementer(IAuthenticationPolicy)
class TokenHeaderAuthenticationPolicy(JWTAuthenticationPolicy):
    """Http header token authentication based on :mod:`pyramid_jwt`.

    The init parameters are restricted to default parameters for
    :class:`pyramid.security.CallbackAuthenticationPolicy`.

    The following methods are extendend:

    * `remember` return a list with the header/value to authenticate

    * `effective_principals` cache principals for one request
    """

    def __init__(self, secret: str, callback: callable=None, timeout: int=10):
        super().__init__(secret,
                         http_header=UserTokenHeader,
                         expiration=timeout,
                         callback=callback,
                         )

    def remember(self, request, userid, **kw) -> [tuple]:
        """Create persistent user session and return authentication headers."""
        token = self.create_token(userid)
        return [(UserTokenHeader, token)]

    def effective_principals(self, request: IRequest) -> list:
        """Return userid, roles and groups for the authenticated user.

        THE RESULT IS CACHED for the current request in the request attribute
        called: __cached_principals__ .
        """
        cached_principals = getattr(request, '__cached_principals__', None)
        if cached_principals:
            return cached_principals
        else:
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
            error = error_entry('header',
                                UserTokenHeader,
                                'Invalid user token')
            request.errors.append(error)
            raise HTTPBadRequest()
        return view(context, request)
    return wrapped_view
