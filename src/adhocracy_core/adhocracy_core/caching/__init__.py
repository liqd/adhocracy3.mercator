"""Adapter and helper functions to set the http response caching headers."""
import logging

from pyramid.httpexceptions import HTTPNotModified
from pyramid.interfaces import IRequest
from pyramid.registry import Registry
from pyramid.traversal import resource_path
from zope.interface import implementer
from zope.interface.interfaces import IInterface
from requests.exceptions import RequestException
import requests

from adhocracy_core.interfaces import HTTPCacheMode
from adhocracy_core.interfaces import IHTTPCacheStrategy
from adhocracy_core.interfaces import IResource
from adhocracy_core.exceptions import ConfigurationError
from adhocracy_core.resources.asset import IAssetDownload
from adhocracy_core.sheets.workflow import IWorkflowAssignment
from adhocracy_core.utils import get_reason_if_blocked
from adhocracy_core.utils import exception_to_str
from adhocracy_core.utils import extract_events_from_changelog_metadata
from adhocracy_core.utils import get_sheet_field


DISABLED_VIEWS_OR_METHODS = ['PATCH', 'POST', 'PUT']

logger = logging.getLogger(__name__)


def set_cache_header(view: callable):
    """Decorator for :term:`view` to set http cache headers of the response."""
    def wrapped_view(context: IResource, request: IRequest):
        _set_cache_header(context, request)
        return view(context, request)
    return wrapped_view


def _set_cache_header(context: IResource, request: IRequest):
    mode = _get_cache_mode(request.registry)
    strategy = _get_cache_strategy(context, request)
    if strategy is None:
        return
    strategy.check_conditional_request()
    strategy.set_cache_headers_for_mode(mode)


def _get_cache_mode(registry) -> HTTPCacheMode:
    mode_name = registry.settings.get('adhocracy_core.caching.http.mode',
                                      HTTPCacheMode.no_cache.name)
    mode = HTTPCacheMode[mode_name]
    return mode


def _get_cache_strategy(context: IResource,
                        request: IRequest) -> IHTTPCacheStrategy:
    view_or_method = request.view_name or request.method
    if view_or_method in DISABLED_VIEWS_OR_METHODS:
        return
    strategy = request.registry.queryMultiAdapter((context, request),
                                                  IHTTPCacheStrategy,
                                                  view_or_method)
    return strategy


def register_cache_strategy(strategy_adapter: IHTTPCacheStrategy,
                            iresource: IInterface,
                            registry: Registry,
                            view_or_method: str):
    """Register a cache strategy for a specific context interface and view."""
    if view_or_method in DISABLED_VIEWS_OR_METHODS:
        raise ConfigurationError('Setting cache strategy for this view_or_meth'
                                 'od is disabled: {0}'.format(view_or_method))
    registry.registerAdapter(strategy_adapter,
                             (iresource, IRequest),
                             IHTTPCacheStrategy,
                             view_or_method)


@implementer(IHTTPCacheStrategy)
class HTTPCacheStrategyBaseAdapter:
    """Basic cache strategy adapter a to set http cache headers.

    You can register a cache strategy for a specific context and view with
    :func:`adhocracy_core.caching.register_http_cache_strategy_adapter`.

    For more information about caching headers read:
    http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
    """

    browser_max_age = 0
    """Time (in seconds) to cache the response in the browser or caching proxy.
       Adds a "Cache-Control: max-age=<value>" header.
    """
    proxy_max_age = 0
    """Time (in seconds) to cache the response in the caching proxy.
       Adds a "Cache-Control: s-maxage=<value>" header to the response.
    """
    last_modified = False
    """Adds a "Last-Modified" header to the response and turns on  "304 Not
       Modified" responses for "If-Modified-Since" conditional requests.
    """
    etags = tuple()
    """Tuple of etag functions (accepting `context` and `request`, return str)
       to build the Etag header. Turns on "304 Not Modified" responses for
       "If-None-Match" conditional requests.
    """
    vary = tuple()
    """Tuple of names of HTTP headers in the request that must match for a
        caching proxy to return a cached response.
    """

    def __init__(self, context, request):
        """Initialize self."""
        self.context = context
        """The view context."""
        self.request = request
        """The request to set the cache headers."""

    def check_conditional_request(self):
        """Check if conditional_request and raise 304 Error if needed.

        raise `pyramid.httpexceptions.HTTPNotModified`:
            if conditional request and context is not modified.
        """
        if self.request.if_none_match:    # check etag first
            self._check_condition_none_match()
        elif self.request.if_modified_since:  # last_modified as backup only
            self._check_condition_modified_since()

    def _check_condition_modified_since(self):
        self.set_last_modified()
        last_modified = self.request.response.last_modified
        if last_modified is None:  # pragma: no coverage
            return
        modified_since = self.request.if_modified_since
        if last_modified <= modified_since:  # pragma: no branch
            raise HTTPNotModified()

    def _check_condition_none_match(self):
        self.set_etag()
        etag = self.request.response.etag
        if etag is None:
            return
        if etag == self.request.if_none_match.etags[0]:  # pragma: no branch
            raise HTTPNotModified()

    def set_cache_headers_for_mode(self, mode: HTTPCacheMode):
        """Set response cache headers according to :class:`HTTPCacheMode`."""
        self.set_debug_info(mode)
        if mode == HTTPCacheMode.no_cache:
            self.set_do_not_cache()
        elif mode == HTTPCacheMode.without_proxy_cache:
            self.set_cache_control_without_proxy()
            self.set_last_modified()
            self.set_etag()
        elif mode == HTTPCacheMode.with_proxy_cache:  # pragma: no branch
            self.set_cache_control_with_proxy()
            self.set_last_modified()
            self.set_etag()
            self.set_vary()

    def set_debug_info(self, mode: HTTPCacheMode):
        """Set debug info."""
        self.request.response.headers['X-Caching-Mode'] = mode.name
        strategy_name = self.__class__.__name__
        self.request.response.headers['X-Caching-Strategy'] = strategy_name

    def set_do_not_cache(self):
        """Disable caching."""
        self.request.response.cache_control.no_cache = True
        self.request.response.expires = -1
        self.request.response.pragma = 'no-cache'

    def set_cache_control_without_proxy(self):
        """Set cache control without proxy."""
        cache_control = self.request.response.cache_control
        cache_control.max_age = self.browser_max_age
        cache_control.must_revalidate = True

    def set_cache_control_with_proxy(self):
        """Set cache control with proxy."""
        cache_control = self.request.response.cache_control
        cache_control.max_age = self.browser_max_age
        cache_control.s_max_age = self.proxy_max_age
        cache_control.proxy_revalidate = True

    def set_last_modified(self):
        """Set last_modified attribute."""
        if not self.last_modified:
            return
        date = getattr(self.context, 'modification_date', None)
        self.request.response.last_modified = date

    def set_etag(self):
        """Set etag."""
        if not self.etags:
            return
        tags = [t(self.context, self.request) for t in self.etags]
        etag = '|'.join(tags)
        self.request.response.etag = etag

    def set_vary(self):
        """Set vary attribute."""
        self.request.response.vary = self.vary


def etag_backrefs(context: IResource, request: IRequest) -> str:
    """Return changed backrefs counter value."""
    changed_backrefs = getattr(context, '__changed_backrefs_counter__', None)
    if changed_backrefs is not None:
        return str(changed_backrefs())
    return str(None)


def etag_descendants(context: IResource, request: IRequest) -> str:
    """Return changed descendants counter value."""
    changed_descendants = getattr(context, '__changed_descendants_counter__',
                                  None)
    if changed_descendants is not None:
        return str(changed_descendants())
    return str(None)


def etag_modified(context: IResource, request: IRequest) -> str:
    """Return modification date."""
    modified = str(getattr(context, 'modification_date', None))
    return modified


def etag_userid(context: IResource, request: IRequest) -> str:
    """Return :term:`userid`."""
    userid = request.authenticated_userid
    return str(userid)


def etag_blocked(context: IResource, request: IRequest) -> str:
    """Return `resource` blocked status."""
    reason = get_reason_if_blocked(context)
    return str(reason)


def etag_workflow(context: IResource, request: IRequest) -> str:
    """Return `resource` workflow status."""
    status = None
    if IWorkflowAssignment.providedBy(context):
        status = get_sheet_field(context, IWorkflowAssignment,
                                 'workflow_state', registry=request.registry)
    return str(status)


@implementer(IHTTPCacheStrategy)
class HTTPCacheStrategyWeakAdapter(HTTPCacheStrategyBaseAdapter):
    """Weak strategy adapter to set http cache header.

    mode without-proxy-cache: browser cache 0 and force revalidate

    mode with-proxy-cache: browser cache 0, proxy cache forever but force
                           revalidate
    """

    browser_max_age = 0
    proxy_max_age = 60 * 60 * 24 * 30 * 12
    vary = ('Accept-Encoding', 'X-User-Path', 'X-User-Token')
    etags = (etag_backrefs, etag_descendants, etag_modified, etag_userid,
             etag_blocked, etag_workflow)


@implementer(IHTTPCacheStrategy)
class HTTPCacheStrategyStrongAdapter(HTTPCacheStrategyBaseAdapter):
    """Strong strategy adapter to set http cache header.

    mode without-proxy-cache: browser cache forever

    mode with-proxy-cache: browser cache forever, proxy cache forever but force
                           revalidate
    """

    browser_max_age = 60 * 60 * 24 * 30 * 12
    proxy_max_age = 60 * 60 * 24 * 30 * 12
    vary = ('Accept-Encoding', 'X-User-Path', 'X-User-Token')
    etags = (etag_modified, etag_userid, etag_blocked)


def purge_varnish_after_commit_hook(success: bool, registry: Registry,
                                    request: IRequest):
    """Send PURGE requests for all changed resources to Varnish."""
    varnish_url = registry.settings.get('adhocracy.varnish_url')
    if not (success and varnish_url):
        return
    changelog_metadata = registry.changelog.values()
    errcount = 0
    for meta in changelog_metadata:
        events = extract_events_from_changelog_metadata(meta)
        if events == []:
            continue
        path = resource_path(meta.resource)
        url = varnish_url + request.script_name + path
        for event in events:
            headers = {'X-Purge-Host': request.host}
            headers['X-Purge-Regex'] = '/?\??[^/]*'
            try:
                resp = requests.request('PURGE', url, headers=headers)
                if resp.status_code != 200:
                    logger.warning(
                        'Varnish responded %s to purge request for %s',
                        resp.status_code, path)
            except RequestException as err:
                logger.error(
                    'Couldn\'t send purge request for %s to Varnish: %s',
                    path, exception_to_str(err))
                errcount += 1
                if errcount >= 3:  # pragma: no cover
                    logger.error('Giving up on purge requests')
                    return


def includeme(config):
    """Register cache strategies."""
    register_cache_strategy(HTTPCacheStrategyWeakAdapter,
                            IResource,
                            config.registry,
                            'GET')
    register_cache_strategy(HTTPCacheStrategyWeakAdapter,
                            IResource,
                            config.registry,
                            'HEAD')
    register_cache_strategy(HTTPCacheStrategyStrongAdapter,
                            IAssetDownload,
                            config.registry,
                            'GET')
    register_cache_strategy(HTTPCacheStrategyStrongAdapter,
                            IAssetDownload,
                            config.registry,
                            'HEAD')
