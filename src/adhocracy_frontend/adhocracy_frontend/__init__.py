"""Frontend view and simple pyramid app configurations."""
import os

from pyramid.config import Configurator
from pyramid.request import Request
from pyramid.response import FileResponse
from pyramid.settings import aslist


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
    platform_id = settings.get('adhocracy.platform_id', 'adhocracy')
    config['rest_platform_path'] = '/{}/'.format(platform_id)
    config['pkg_path'] = settings.get('adhocracy.frontend.pkg_path',
                                      '/static/js/Packages')
    config['trusted_domains'] = aslist(
        settings.get('adhocracy.trusted_domains', []))
    return config


def root_view(request):
    """Return the embeddee HTML."""
    here = os.path.dirname(__file__)
    path = os.path.join(here, 'static', 'root.html')
    return FileResponse(path, request=request)


def _build_ws_url(request: Request) -> str:
    ws_domain = request.domain
    ws_port = 8080
    ws_scheme = 'wss' if request.scheme == 'https' else 'ws'
    return '{}://{}:{}'.format(ws_scheme, ws_domain, ws_port)


def includeme(config):
    """Add routing and static view to deliver the frontend application."""
    config.add_static_view('static', 'adhocracy_frontend:static',
                           cache_max_age=0)
    config.add_route('config_json', 'config.json')
    config.add_view(config_view, route_name='config_json', renderer='json',
                    http_cache=0)
    add_frontend_route(config, 'embed', 'embed/{directive}')
    add_frontend_route(config, 'register', 'register')
    add_frontend_route(config, 'login', 'login')
    add_frontend_route(config, 'activate', 'activate/{key}')
    add_frontend_route(config, 'root', '')


def add_frontend_route(config, name, pattern):
    """Add view and route to adhocracy frontend."""
    config.add_route(name, pattern)
    config.add_view(root_view, route_name=name, renderer='html', http_cache=0)


def main(global_config, **settings):
    """ Return a Pyramid WSGI application to serve the frontend application."""
    config = Configurator(settings=settings)
    includeme(config)
    return config.make_wsgi_app()
