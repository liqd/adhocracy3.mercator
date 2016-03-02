from pytest import mark
from pytest import fixture


def test_rateversion_meta():
    from .rate import rateversion_meta
    from adhocracy_core.sheets.rate import IRate
    assert rateversion_meta.extended_sheets == (IRate,)


def test_rate_meta():
    from .rate import rate_meta
    from .rate import IRateVersion
    assert rate_meta.element_types == (IRateVersion,)
    assert rate_meta.item_type == IRateVersion
    assert rate_meta.use_autonaming
    assert rate_meta.autonaming_prefix == 'rate_'


@mark.usefixtures('integration')
class TestRate:

    def test_register_factories(self, registry):
        from adhocracy_core.resources.rate import IRate
        from adhocracy_core.resources.rate import IRateVersion
        content_types = registry.content.factory_types
        assert IRate.__identifier__ in content_types
        assert IRateVersion.__identifier__ in content_types

    def test_create_rate(self, registry, pool_with_catalogs):
        from adhocracy_core.resources.rate import IRate
        pool = pool_with_catalogs
        assert registry.content.create(IRate.__identifier__, parent=pool)

    def test_create_rateversion(self, registry, pool_with_catalogs):
        from adhocracy_core.resources.rate import IRateVersion
        pool = pool_with_catalogs
        assert registry.content.create(IRateVersion.__identifier__, parent=pool)

    def test_create_ratesservice(self, registry, pool):
        from adhocracy_core.resources.rate import IRatesService
        from substanced.util import find_service
        assert registry.content.create(IRatesService.__identifier__, parent=pool)
        assert find_service(pool, 'rates')

    def test_add_ratesservice(self, registry, pool):
        from adhocracy_core.resources.rate import add_ratesservice
        add_ratesservice(pool, registry, {})
        assert pool['rates']

    def test_search_rateversion(self, registry, pool_with_catalogs):
        from adhocracy_core.resources.rate import IRateVersion
        pool = pool_with_catalogs
        rate = registry.content.create(IRateVersion.__identifier__, parent=pool)
        rate_index = pool['catalogs']['adhocracy']['rate']
        rate_index.reindex_resource(rate)
        search_result = set(rate_index.eq(0).execute())
        assert rate in search_result


@mark.usefixtures('integration')
class TestLike:

    def test_register_factories(self, registry):
        from adhocracy_core.resources.rate import ILike
        from adhocracy_core.resources.rate import ILikeVersion
        content_types = registry.content.factory_types
        assert ILike.__identifier__ in content_types
        assert ILikeVersion.__identifier__ in content_types

    def test_create_like(self, registry, pool_with_catalogs):
        from adhocracy_core.resources.rate import ILike
        pool = pool_with_catalogs
        assert registry.content.create(ILike.__identifier__, parent=pool)

    def test_create_likeversion(self, registry, pool_with_catalogs):
        from adhocracy_core.resources.rate import ILikeVersion
        pool = pool_with_catalogs
        assert registry.content.create(ILikeVersion.__identifier__, parent=pool)

    def test_create_likesservice(self, registry, pool):
        from adhocracy_core.resources.rate import ILikesService
        from substanced.util import find_service
        assert registry.content.create(ILikesService.__identifier__, parent=pool)
        assert find_service(pool, 'likes')

    def test_add_likesservice(self, registry, pool):
        from adhocracy_core.resources.rate import add_likesservice
        add_likesservice(pool, registry, {})
        assert pool['likes']
