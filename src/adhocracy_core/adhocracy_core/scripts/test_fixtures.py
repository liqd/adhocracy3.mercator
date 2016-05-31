
class TestImportFixture:

    def call_fut(self, *args, **kwargs):
        from .fixtures import _import_fixtures
        return _import_fixtures(*args, **kwargs)

    def test_ignore_if_no_fixtures_registered(self, mocker, context, registry):
        mock = mocker.patch('adhocracy_core.scripts.fixtures.import_fixture')
        registry.getUtilitiesFor = mocker.Mock(return_value=[])
        self.call_fut(context, registry)
        assert not mock.called

    def test_list_registered_fixtures(self, mocker, context, registry, capfd,
                                      log):
        from mock import call
        from adhocracy_core.interfaces import IFixtureAsset
        mock = mocker.patch('adhocracy_core.scripts.fixtures.import_fixture')
        registry.registerUtility('', IFixtureAsset, name='adhocracy_core:fixt')
        self.call_fut(context, registry)
        out, err = capfd.readouterr()
        assert out.startswith('\nThe following')
        assert call('adhocracy_core:fixt', context, registry, log_only=True)\
               in mock.call_args_list

    def test_import_registered_fixtures(self, mocker, context, registry, log):
        from mock import call
        from adhocracy_core.interfaces import IFixtureAsset
        mock = mocker.patch('adhocracy_core.scripts.fixtures.import_fixture')
        registry.registerUtility('', IFixtureAsset, name='adhocracy_core:fixt')
        registry.registerUtility('', IFixtureAsset, name='adhocracy_core:test')
        self.call_fut(context, registry, all=True)
        assert call('adhocracy_core:fixt', context, registry, log_only=False)\
               in mock.call_args_list
        assert call('adhocracy_core:test', context, registry, log_only=False)\
               in mock.call_args_list

    def test_import_custom_fixture(self, mocker, context, registry, log):
        from mock import call
        from adhocracy_core.interfaces import IFixtureAsset
        mock = mocker.patch('adhocracy_core.scripts.fixtures.import_fixture')
        registry.registerUtility('', IFixtureAsset, name='adhocracy_core:fixt')
        self.call_fut(context, registry, custom='/absolute/path/fixture')
        assert call('adhocracy_core:fixt', context, registry, log_only=False)\
               not in mock.call_args_list
        assert call('/absolute/path/fixture', context, registry, log_only=False)\
               in mock.call_args_list

