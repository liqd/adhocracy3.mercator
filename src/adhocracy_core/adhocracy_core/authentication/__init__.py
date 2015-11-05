"""Authentication with support for token http headers."""
import hashlib
from datetime import datetime

from colander import Invalid
from persistent.dict import PersistentDict
from pyramid.authentication import CallbackAuthenticationPolicy
from pyramid.interfaces import IAuthenticationPolicy
from pyramid.request import Request
from pyramid.traversal import resource_path
from pyramid.security import Everyone
from pyramid.settings import asbool
from zope.interface import implementer
from zope.interface import Interface
from zope.component import ComponentLookupError
from substanced.stats import statsd_timer

from adhocracy_core.interfaces import ITokenManger
from adhocracy_core.interfaces import IRolesUserLocator
from adhocracy_core.schema import Resource


Anonymous = 'system.Anonymous'
"""The anonymous (not authenticated) principal"""


@implementer(ITokenManger)
class TokenMangerAnnotationStorage:
    """Manage authentication tokens and use object annotation to store them.

    Constructor arguments:

    :param context: the object to annotate the authentication token storage.
    """

    annotation_key = '_tokenmanager_storage'

    def __init__(self, context):
        """Initialize self."""
        self.context = context

    @property
    def token_to_user_id_timestamp(self):
        tokens = getattr(self.context, self.annotation_key, None)
        if tokens is None:
            tokens = PersistentDict()
            setattr(self.context, self.annotation_key, tokens)
        return tokens

    def create_token(self, userid: str, secret='', hashalg='sha512') -> str:
        """Create authentication token for user_id.

        :param secret:  the secret used to salt the generated token.
        :param hashalg: Any hash algorithm supported by :func: `hashlib.new`.
                        This is used to create the authentication token.
        """
        timestamp = datetime.now()
        value = self._build_token_value(userid, timestamp, secret)
        token = hashlib.new(hashalg, value).hexdigest()
        self.token_to_user_id_timestamp[token] = (userid, timestamp)
        return token

    def _build_token_value(self, user_id: str, timestamp: datetime,
                           secret: '') -> str:
        time_bytes = timestamp.isoformat().encode('UTF-8')
        secret_bytes = secret.encode('UTF-8', 'replace')
        user_bytes = user_id.encode('UTF-8', 'replace')
        return time_bytes + secret_bytes + user_bytes

    def get_user_id(self, token: str, timeout: float=None) -> str:
        """Get user_id for authentication token.

        :param timeout:  Maximum number of seconds which a newly create token
                        will be considered valid.
                        The `None` value is allowed to disable the timeout.
        :returns: user id for this token
        :raises KeyError: if there is no corresponding user_id
        """
        userid, timestamp = self.token_to_user_id_timestamp[token]
        if self._is_expired(timestamp, timeout):
            del self.token_to_user_id_timestamp[token]
            raise KeyError
        return userid

    def _is_expired(self, timestamp: datetime, timeout: float=None) -> bool:
        if timeout is None:
            return False
        now = datetime.now()
        delta = now - timestamp
        return delta.total_seconds() >= timeout

    def delete_token(self, token: str):
        """Delete authentication token."""
        if token in self.token_to_user_id_timestamp:

            del self.token_to_user_id_timestamp[token]

    def delete_expired_tokens(self, timeout: float):
        all = self.token_to_user_id_timestamp.items()
        expired = [t for t, (u, date) in all if self._is_expired(date,
                                                                 timeout)]
        for token in expired:
            self.delete_token(token)


def get_tokenmanager(request: Request, **kwargs) -> ITokenManger:
    """Adapter request.root to ITokenmanager and return it.

    :returns: :class:'adhocracy_core.interfaces.ITokenManager or None.
    """
    # allow to run pyramid scripts without authentication
    if getattr(request, 'root', None) is None:
        return None
    try:
        return ITokenManger(request.root)
    except (ComponentLookupError, TypeError):
        return None


def _get_raw_x_user_headers(request: Request) -> tuple:
    """Return not validated tuple with the X-User-Path/Token values."""
    user_url = request.headers.get('X-User-Path', '')
    # TODO find a proper solution, userid should just be an identifier.
    # user_url/path as userid does not work
    # well with the pyramid authentication system. We don't have the
    # a context or root object to resolve the resource path when processing
    # the unauthenticated_userid and effective_principals methods.
    app_url_length = len(request.application_url)
    user_path = None
    if user_url.startswith('/'):
        user_path = user_url
    elif len(user_url) >= app_url_length:
        user_path = user_url[app_url_length:][:-1]
    token = request.headers.get('X-User-Token', None)
    return user_path, token


def _get_x_user_headers(request: Request) -> tuple:
    """Return tuple with the X-User-Path/Token values or (None, None)."""
    schema = Resource().bind(request=request, context=request.context)
    user_url = request.headers.get('X-User-Path', None)
    user_path = None
    if user_url is not None:
        try:
            user = schema.deserialize(user_url)
            user_path = resource_path(user)
        except Invalid:
            # TODO: raise a proper colander error.
            pass
    token = request.headers.get('X-User-Token', None)
    return (user_path, token)


@implementer(IAuthenticationPolicy)
class TokenHeaderAuthenticationPolicy(CallbackAuthenticationPolicy):
    """A :term:`authentication policy` based on the the X-User-* header.

    To authenticate the client has to send http header with `X-User-Token`
    and `X-User-Path`.

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

    def unauthenticated_userid(self, request):
        """Return unauthenticated userid."""
        return _get_raw_x_user_headers(request)[0]

    def authenticated_userid(self, request):
        """Return authenticated userid."""
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager is None:
            return None
        try:
            return self._get_authenticated_user_id(request, tokenmanager)
        except KeyError:
            return None

    def _get_authenticated_user_id(self, request: Request,
                                   tokenmanager: ITokenManger) -> str:
        userid, token = _get_x_user_headers(request)
        settings = request.registry.settings
        if not asbool(settings.get('adhocracy.validate_user_token', True)):
            return userid
        if token is None:
            raise KeyError
        with statsd_timer('authenticationuser', rate=.1):
            authenticated_userid = \
                tokenmanager.get_user_id(token, timeout=self.timeout)
        if authenticated_userid != userid:
            raise KeyError
        return authenticated_userid

    def remember(self, request, userid, **kw) -> dict:
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager:  # for testing
            token = tokenmanager.create_token(userid, secret=self.secret,
                                              hashalg=self.hashalg)
        else:
            token = None
        locator = request.registry.queryMultiAdapter(
            (request.context, request), IRolesUserLocator)
        if locator is not None:  # for testing
            user = locator.get_user_by_userid(userid)
        else:
            user = None
        if user is not None:
            url = request.resource_url(user)
        else:
            url = None
        return {'X-User-Path': url,
                'X-User-Token': token}

    def forget(self, request):
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager:
            token = _get_x_user_headers(request)[0]
            tokenmanager.delete_token(token)
        return {}

    def effective_principals(self, request: Request) -> list:
        """Return roles and groups for the current user.

        THE RESULT IS CACHED for the current request in the request attribute
        called: __cached_principals__ .
        """
        cached_principals = getattr(request, '__cached_principals__', None)
        if cached_principals:
            return cached_principals
        if self.authenticated_userid(request) is None:
            # FIXME this should go to principals.groups_and_roles_finder
            # to make adhocracy work with other authentication polices.
            return [Everyone, Anonymous]
        principals = super().effective_principals(request)
        request.__cached_principals__ = principals
        return principals


def includeme(config):
    """Register the TokenManger adapter."""
    config.registry.registerAdapter(TokenMangerAnnotationStorage,
                                    required=(Interface,),
                                    provided=ITokenManger,
                                    )
