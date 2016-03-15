"""Frontend view and simple pyramid app configurations."""
import pkg_resources
from urllib.parse import urlparse
from urllib.parse import urlunparse

from pyramid.renderers import render
from pyramid.config import Configurator
from pyramid.events import NewResponse
from pyramid.request import Request
from pyramid.response import FileResponse
from pyramid.response import Response
from pyramid.settings import asbool
from pyramid.settings import aslist

from adhocracy_core.rest.subscriber import add_cors_headers


def url_origin(url):
    """Return the origin part of an url (schema, host, port)."""
    o = urlparse(url)
    return urlunparse((o.scheme, o.netloc, '', '', '', ''))


def config_view(request):
    """Return the frontend configuration."""
    settings = request.registry.settings or {}
    config = {}
    if 'adhocracy.frontend.ws_url' in settings:
        public_ws_url = settings.get('adhocracy.frontend.ws_url')
    else:
        public_ws_url = _build_ws_url(request)
    config['ws_url'] = public_ws_url
    config['rest_url'] = settings.get('adhocracy.frontend.rest_url',
                                      'http://localhost:6541')
    config['canonical_url'] = settings.get('adhocracy.canonical_url',
                                           'http://localhost:6551')
    config['redirect_url'] = settings.get('adhocracy.redirect_url', '/')
    config['rest_platform_path'] = settings.get('adhocracy.rest_platform_path',
                                                '/adhocracy/')
    config['netiquette_url'] = settings.get(
        'adhocracy.frontend.netiquette_url', '')
    config['pkg_path'] = settings.get('adhocracy.frontend.pkg_path',
                                      '/static/js/Packages')
    config['trusted_domains'] = aslist(
        settings.get('adhocracy.trusted_domains', []))
    config['support_email'] = settings.get('adhocracy.frontend.support_email')
    config['support_url'] = settings.get('adhocracy.frontend.support_url')
    config['captcha_enabled'] = asbool(settings.get(
        'adhocracy.thentos_captcha.enabled', 'false'))
    config['captcha_url'] = settings.get(
        'adhocracy.thentos_captcha.frontend_url', 'http://localhost:6542/')
    config['locale'] = settings.get('adhocracy.frontend.locale', 'en')
    custom_keys = settings.get('adhocracy.custom', '').split()
    config['custom'] = {k: settings.get('adhocracy.custom.%s' % k)
                        for k in custom_keys}
    config['site_name'] = settings.get('adhocracy.site_name',
                                       'Adhocracy')
    config['debug'] = asbool(settings.get('adhocracy.frontend.debug', 'false'))
    config['terms_url'] = {}
    config['terms_url']['en'] = settings.get('adhocracy.frontend.terms_url.en')
    config['terms_url']['de'] = settings.get('adhocracy.frontend.terms_url.de')
    config['piwik_enabled'] = asbool(settings.get(
        'adhocracy.frontend.piwik_enabled', 'false'))
    config['piwik_host'] = settings.get('adhocracy.frontend.piwik_host')
    config['piwik_site_id'] = settings.get('adhocracy.frontend.piwik_site_id')
    config['piwik_use_cookies'] = asbool(settings.get(
        'adhocracy.frontend.piwik_use_cookies', 'false'))
    config['piwik_track_user_id'] = asbool(settings.get(
        'adhocracy.frontend.piwik_track_user_id', 'false'))
    config['profile_images_enabled'] = asbool(settings.get(
        'adhocracy.frontend.profile_images_enabled', 'true'))
    use_cachbust = asbool(settings.get('cachebust.enabled', 'false'))
    if not use_cachbust:  # ease testing
        return config
    config['cachebust'] = use_cachbust
    config['cachebust_suffix'] = cachebust_query_params(request)
    return config


def cachebust_query_params(request) -> dict:
    """Return cachebust query params.

    Due to simplicity, we currently use the same query parameter for all
    static resources. If we use individual checksums, this will go away.

    :raises FileNotFoundError: if asset 'build/stylesheets/a3.css' is not
    available.
    """
    url = request.cachebusted_url('adhocracy_frontend:build/'
                                  'stylesheets/a3.css')
    if '?' in url:
        query_params = url.split('?')[1]
    else:
        query_params = None
    return query_params


def require_config_view(request):
    """Return require config."""
    query_params = cachebust_query_params(request)
    config = config_view(request)
    result = render(
        'adhocracy_frontend:build/require-config.js.mako', {
            'url_args': query_params,
            'minify': not config['debug'],
        }, request=request)
    response = Response(result)
    response.content_type = 'application/javascript'
    return response


def adhocracy_auth_view(request):
    """Return embeddable code optimized for authentication."""
    config = config_view(request)
    result = render(
        'adhocracy_frontend:build/js/AdhocracyAuth.html.mako', {
            'canonical_origin': url_origin(config['canonical_url']),
        }, request=request)
    response = Response(result)
    return response


def root_view(request):
    """Return the embeddee HTML."""
    if not hasattr(request, 'cachebusted_url'):  # ease testing
        return Response()
    debug = config_view(request)['debug']
    css_path = 'stylesheets/a3.css' if debug else 'stylesheets/min/a3.css'
    query_params = cachebust_query_params(request)
    result = render(
        'adhocracy_frontend:build/root.html.mako',
        {'css': [request.cachebusted_url('adhocracy_frontend:build/'
                                         + css_path),
                 request.cachebusted_url('adhocracy_frontend:build/'
                                         'lib/leaflet/dist/leaflet.css'),
                 ],
         'js': [request.cachebusted_url('adhocracy_frontend:build/'
                                        'lib/requirejs/require.js'),
                request.cachebusted_url('adhocracy_frontend:build/'
                                        'lib/jquery/dist/jquery.min.js'),
                '/static/require-config.js%s' % (
                    '?' + query_params if query_params else ''),
                ],
         'meta_api': '/static/meta_api.json',
         'config': '/config.json',
         },
        request=request)
    response = Response(result)
    return response


def _build_ws_url(request: Request) -> str:
    ws_domain = request.domain
    ws_port = 6561
    ws_scheme = 'wss' if request.scheme == 'https' else 'ws'
    return '{}://{}:{}'.format(ws_scheme, ws_domain, ws_port)


def adhocracy_sdk_view(request):
    """Return AdhocracySDK.js."""
    path = pkg_resources.resource_filename('adhocracy_frontend',
                                           'build/js/AdhocracySDK.js')
    return FileResponse(path, request=request)


def includeme(config):
    """Add routing and static view to deliver the frontend application."""
    config.include('pyramid_cachebust')
    config.include('pyramid_mako')
    settings = config.registry.settings
    cachebust_enabled = asbool(settings.get('cachebust.enabled', 'false'))
    if cachebust_enabled:
        cache_max_age = 30 * 24 * 60 * 60  # 30 days
    else:
        cache_max_age = 0
    config.add_route('config_json', 'config.json')
    config.add_view(config_view, route_name='config_json', renderer='json',
                    http_cache=(cache_max_age, {'public': True}))
    add_frontend_route(config, 'embed', 'embed/{directive}')
    add_frontend_route(config, 'register', 'register')
    add_frontend_route(config, 'login', 'login')
    add_frontend_route(config, 'password_reset', 'password_reset/')
    add_frontend_route(config, 'create_password_reset',
                       'create_password_reset')
    add_frontend_route(config, 'activate', 'activate/{key}')
    add_frontend_route(config, 'activation_error', 'activation_error')
    add_frontend_route(config, 'root', '')
    add_frontend_route(config, 'resource', 'r/*path')
    config.add_route('require_config', 'static/require-config.js')
    config.add_view(require_config_view, route_name='require_config',
                    http_cache=(cache_max_age, {'public': True}))
    # AdhocracySDK shall not be cached the way other static files are cached
    config.add_route('adhocracy_sdk', 'AdhocracySDK.js')
    config.add_view(adhocracy_sdk_view, route_name='adhocracy_sdk')
    config.add_route('adhocracy_auth', 'AdhocracyAuth.html')
    config.add_view(adhocracy_auth_view, route_name='adhocracy_auth')
    config.add_static_view('static', 'adhocracy_frontend:build/',
                           cache_max_age=cache_max_age)
    config.add_subscriber(add_cors_headers, NewResponse)


def add_frontend_route(config, name, pattern):
    """Add view and route to adhocracy frontend."""
    config.add_route(name, pattern)
    config.add_view(root_view, route_name=name, renderer='html')


def main(global_config, **settings):
    """Return a Pyramid WSGI application to serve the frontend application."""
    config = Configurator(settings=settings)
    includeme(config)
    return config.make_wsgi_app()
