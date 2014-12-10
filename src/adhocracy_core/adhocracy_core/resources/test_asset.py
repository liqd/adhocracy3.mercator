from pytest import fixture
from pytest import mark


def test_asset_meta():
    from .asset import asset_meta
    from adhocracy_core.resources.asset import IAsset
    from adhocracy_core.sheets.metadata import IMetadata
    from adhocracy_core.sheets.asset import IAssetData
    from adhocracy_core.sheets.asset import IAssetMetadata
    meta = asset_meta
    assert meta.iresource is IAsset
    assert IMetadata in meta.basic_sheets
    assert IAssetData in meta.basic_sheets
    assert IAssetMetadata in meta.basic_sheets
    assert meta.use_autonaming
    assert meta.permission_add == 'add_asset'


def test_assets_service_meta():
    from .asset import assets_service_meta
    from .asset import IAssetsService
    from adhocracy_core.resources.asset import IAsset
    meta = assets_service_meta
    assert meta.iresource is IAssetsService
    assert meta.element_types == [IAsset]


def test_pool_with_assets_meta():
    from .asset import add_assets_service
    from .asset import IPoolWithAssets
    from .asset import pool_with_assets_meta
    from adhocracy_core.sheets.asset import IHasAssetPool
    meta = pool_with_assets_meta
    assert meta.iresource is IPoolWithAssets
    assert IHasAssetPool in meta.basic_sheets
    assert add_assets_service in meta.after_creation


@fixture
def integration(config):
    config.include('adhocracy_core.registry')
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_core.sheets.asset')
    config.include('adhocracy_core.sheets.metadata')
    config.include('adhocracy_core.resources.asset')


@mark.usefixtures('integration')
class TestRoot:

    @fixture
    def context(self, pool):
        return pool

    def test_create_asset(self, context, registry):
        from adhocracy_core.resources.asset import IAsset
        res = registry.content.create(IAsset.__identifier__, context)
        assert IAsset.providedBy(res)

    def test_add_assets_service(self, context, registry):
        from .asset import add_assets_service
        from .asset import IAssetsService
        add_assets_service(context, registry, {})
        assert context['assets']
        assert IAssetsService.providedBy(context['assets'])

    def test_create_pool_with_assets(self, registry):
        from .asset import IPoolWithAssets
        res = registry.content.create(IPoolWithAssets.__identifier__)
        assert IPoolWithAssets.providedBy(res)

    def test_create_assets_service(self, context, registry):
        from .asset import IAssetsService
        from substanced.util import find_service
        res = registry.content.create(IAssetsService.__identifier__, context)
        assert IAssetsService.providedBy(res)
        assert find_service(context, 'assets')
