import unittest

from pyramid import testing
from pytest import fixture
from pytest import mark


class UrlOriginTest(unittest.TestCase):
    def test_full_url(self):
        from adhocracy_frontend import url_origin
        url = 'https://example.com:123/some/path?query#hash'
        expected = 'https://example.com:123'
        assert url_origin(url) == expected

    def test_no_port(self):
        from adhocracy_frontend import url_origin
        url = 'https://example.com/some/path?query#hash'
        expected = 'https://example.com'
        assert url_origin(url) == expected


class ConfigViewTest(unittest.TestCase):

    def call_fut(self, request):
        from adhocracy_frontend import config_view
        return config_view(request)

    def test_with_empty_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = None
        assert self.call_fut(request) == \
            {'ws_url': 'ws://example.com:6561',
             'pkg_path': '/static/js/Packages',
             'rest_url': 'http://localhost:6541',
             'rest_platform_path': '/adhocracy/',
             'trusted_domains': [],
             'support_email': None,
             'locale': 'en',
             'site_name': 'Adhocracy',
             'netiquette_url': '',
             'canonical_url': 'http://localhost:6551',
             'redirect_url': '/',
             'custom': {},
             'debug': False,
             'piwik_enabled': False,
             'piwik_host': None,
             'piwik_site_id': None,
             'piwik_track_user_id': False,
             'piwik_use_cookies': False,
             'profile_images_enabled': True,
             'captcha_enabled': False,
             'captcha_url': 'http://localhost:6542/',
             'support_url': None,
             'terms_url': {
                'de': None,
                'en': None
             }}

    def test_ws_url_without_ws_url_settings_scheme_https(self):
        request = testing.DummyRequest(scheme='https')
        request.registry.settings = None
        assert self.call_fut(request)['ws_url'] == 'wss://example.com:6561'

    def test_ws_url_with_ws_url_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.frontend.ws_url': 'ws://l.x'}
        assert self.call_fut(request)['ws_url'] == 'ws://l.x'

    def test_redirect_url_with_redirect_url_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.redirect_url': '/r/example/'}
        assert self.call_fut(request)['redirect_url'] == '/r/example/'

    def test_pkg_path_with_pkg_path_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.frontend.pkg_path': '/t'}
        assert self.call_fut(request)['pkg_path'] == '/t'

    def test_root_path_with_platform_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.rest_platform_path':
                                     '/adhocracy2/'}
        assert self.call_fut(request)['rest_platform_path'] == '/adhocracy2/'

    def test_root_path_with_rest_url_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.frontend.rest_url': 'x.org'}
        assert self.call_fut(request)['rest_url'] == 'x.org'

    def test_support_email_with_support_email_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {
            'adhocracy.frontend.support_email': 'x.org'
        }
        assert self.call_fut(request)['support_email'] == 'x.org'


class RootViewTest(unittest.TestCase):

    def call_fut(self, request):
        from adhocracy_frontend import root_view
        return root_view(request)

    def test_call_and_root_html_exists(self):
        request = testing.DummyRequest(scheme='https')
        resp = self.call_fut(request)
        assert resp.status_code == 200
        assert resp.body_file


class ViewsFunctionalTest(unittest.TestCase):

    def setUp(self):
        from adhocracy_frontend import main
        from webtest import TestApp
        app = main({})
        self.testapp = TestApp(app)

    @mark.xfail(reason='asset build:/stylesheets/a3.css must exists')
    def test_static_view(self):
        resp = self.testapp.get('/static/root.html', status=200)
        assert '200' in resp.status

    def test_config_json_view(self):
        resp = self.testapp.get('/config.json', status=200)
        assert '200' in resp.status

    @mark.xfail(reason='asset build:/stylesheets/a3.css must exists')
    def test_embed_view(self):
        resp = self.testapp.get('/embed/XX', status=200)
        assert '200' in resp.status

    @mark.xfail(reason='asset build:/stylesheets/a3.css must exists')
    def test_register_view(self):
        resp = self.testapp.get('/register', status=200)
        assert '200' in resp.status


@fixture()
def integration(config):
    config.include('adhocracy_frontend')


@mark.usefixtures('integration')
class TestIntegrationIncludeme:

    def test_includeme(self):
        """Check that includeme runs without errors."""
        assert True

    def test_register_subscriber(self, registry):
        from . import add_cors_headers
        handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
        assert add_cors_headers.__name__ in handlers
