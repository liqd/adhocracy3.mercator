"""Token based pyramid authentication policy."""
import hashlib
from datetime import datetime

from persistent.dict import PersistentDict
from pyramid.authentication import CallbackAuthenticationPolicy
from pyramid.interfaces import IAuthenticationPolicy
from pyramid.request import Request
from zope.interface import implementer
from zope.interface import Interface
from zope.component import ComponentLookupError

from adhocracy_core.interfaces import ITokenManger


@implementer(ITokenManger)
class TokenMangerAnnotationStorage:

    """Manage authentication tokens and use object annotation to store them.

    Constructor arguments:

    :param context: the object to annotate the authentication token storage.
    """

    annotation_key = '_tokenmanager_storage'

    def __init__(self, context):
        self.context = context

    @property
    def token_to_user_id_timestamp(self):
        if not hasattr(self.context, self.annotation_key):
            setattr(self.context, self.annotation_key, PersistentDict())
        return getattr(self.context, self.annotation_key)

    def create_token(self, user_id: str, secret='', hashalg='sha512') -> str:
        """Create authentication token for user_id.

        :param secret:  the secret used to salt the generated token.
        :param hashalg: Any hash algorithm supported by :func: `hashlib.new`.
                        This is used to create the authentication token.
        """
        timestamp = datetime.now()
        value = self._build_token_value(user_id, timestamp, secret)
        token = hashlib.new(hashalg, value).hexdigest()
        self.token_to_user_id_timestamp[token] = (user_id, timestamp)
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
        user_id, timestamp = self.token_to_user_id_timestamp[token]
        if self._is_expired(timestamp, timeout):
            del self.token_to_user_id_timestamp[token]
            raise KeyError
        return user_id

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


def get_tokenmanager(request: Request, **kwargs) -> ITokenManger:
    """Adapter request.root to ITokenmanager and return it.

    :returns: :class:'adhocracy_core.interfaces.ITokenManager or None.
    """
    try:
        return ITokenManger(request.root)
    except (ComponentLookupError, TypeError):
        return None


def _get_x_user_headers(request: Request) -> tuple:
    """Return tuple with the X-User-Path/Token values or (None, None)."""
    return (request.headers.get('X-User-Path', None),
            request.headers.get('X-User-Token', None))


@implementer(IAuthenticationPolicy)
class TokenHeaderAuthenticationPolicy(CallbackAuthenticationPolicy):

    """A :term:`authentication policy` based on the the X-User-* header.

    To authenticate the client has to send http header with `X-User-Token`
    and `X-User-Path`.

    Constructor Arguments

    :param groupfinder: callable that accepts `request` and returns the
                        ACL groups of the current user.
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

    def __init__(self, secret,
                 groupfinder: callable=None,
                 timeout: float=None,
                 get_tokenmanager: callable=get_tokenmanager,
                 hashalg: str='sha512',
                 ):
        self.callback = groupfinder  # callback is an inherited class attr.
        self.secret = secret
        self.timeout = timeout
        self.get_tokenmanager = get_tokenmanager
        self.hashalg = hashalg

    def unauthenticated_userid(self, request):
        return _get_x_user_headers(request)[0]

    def authenticated_userid(self, request):
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager is None:
            return None
        try:
            return self._get_authenticated_user_id(request, tokenmanager)
        except KeyError:
            return None

    def _get_authenticated_user_id(self, request: Request,
                                   tokenmanager: ITokenManger) -> str:
        user_id, token = _get_x_user_headers(request)
        authenticated_user_id = tokenmanager.get_user_id(token,
                                                         timeout=self.timeout)
        if authenticated_user_id != user_id:
            raise KeyError
        return authenticated_user_id

    def remember(self, request, user_id, **kw):
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager:
            token = tokenmanager.create_token(user_id, secret=self.secret,
                                              hashalg=self.hashalg)
        else:
            token = None
            user_id = None
        return {'X-User-Path': user_id,
                'X-User-Token': token}

    def forget(self, request):
        tokenmanager = self.get_tokenmanager(request)
        if tokenmanager:
            token = _get_x_user_headers(request)[0]
            tokenmanager.delete_token(token)
        return {}


def includeme(config):
    """Register the TokenManger adapter."""
    config.registry.registerAdapter(TokenMangerAnnotationStorage,
                                    required=(Interface,),
                                    provided=ITokenManger,
                                    )
