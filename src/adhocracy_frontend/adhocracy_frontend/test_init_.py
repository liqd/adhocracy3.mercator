import unittest

from pyramid import testing


class ConfigViewTest(unittest.TestCase):

    def _call_fut(self, request):
        from adhocracy_frontend import config_view
        return config_view(request)

    def test_with_empty_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = None
        assert self._call_fut(request) == \
            {'ws_url': 'ws://example.com:8080',
             'pkg_path': '/static/js/Packages',
             'rest_url': 'http://localhost:6541',
             'rest_platform_path': '/adhocracy/',
             'trusted_domains': [],
             }

    def test_ws_url_without_ws_url_settings_scheme_https(self):
        request = testing.DummyRequest(scheme='https')
        request.registry.settings = None
        assert self._call_fut(request)['ws_url'] == 'wss://example.com:8080'

    def test_ws_url_with_ws_url_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.frontend.ws_url': 'ws://l.x'}
        assert self._call_fut(request)['ws_url'] == 'ws://l.x'

    def test_pkg_path_with_pkg_path_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.frontend.pkg_path': '/t'}
        assert self._call_fut(request)['pkg_path'] == '/t'

    def test_root_path_with_platform_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.platform_id': 'adhocracy2'}
        assert self._call_fut(request)['rest_platform_path'] == '/adhocracy2/'

    def test_root_path_with_rest_url_settings(self):
        request = testing.DummyRequest(scheme='http')
        request.registry.settings = {'adhocracy.frontend.rest_url': 'x.org'}
        assert self._call_fut(request)['rest_url'] == 'x.org'


class RootViewTest(unittest.TestCase):

    def _call_fut(self, request):
        from adhocracy_frontend import root_view
        return root_view(request)

    def test_call_and_root_html_exists(self):
        request = testing.DummyRequest()
        resp = self._call_fut(request)
        assert resp.status_code == 200
        assert resp.body_file


class ViewsFunctionalTest(unittest.TestCase):

    def setUp(self):
        from adhocracy_frontend import main
        from webtest import TestApp
        app = main({})
        self.testapp = TestApp(app)

    def test_static_view(self):
        resp = self.testapp.get('/static/root.html', status=200)
        assert '200' in resp.status

    def test_config_json_view(self):
        resp = self.testapp.get('/config.json', status=200)
        assert '200' in resp.status

    def test_embed_view(self):
        resp = self.testapp.get('/embed/XX', status=200)
        assert '200' in resp.status

    def test_register_view(self):
        resp = self.testapp.get('/register', status=200)
        assert '200' in resp.status
