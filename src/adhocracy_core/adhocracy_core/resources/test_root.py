import unittest

from pyramid import testing


class RootPoolIntegrationTest(unittest.TestCase):

    def setUp(self):
        config = testing.setUp()
        config.include('adhocracy_core.registry')
        config.include('adhocracy_core.events')
        config.include('adhocracy_core.catalog')
        config.include('adhocracy_core.graph')
        config.include('adhocracy_core.resources.root')
        config.include('adhocracy_core.resources.pool')
        config.include('adhocracy_core.resources.principal')
        config.include('adhocracy_core.sheets')
        self.config = config
        self.context = testing.DummyResource()

    def tearDown(self):
        testing.tearDown()

    def test_includeme_registry_register_factories(self):
        from adhocracy_core.resources.root import IRootPool
        content_types = self.config.registry.content.factory_types
        assert IRootPool.__identifier__ in content_types

    def test_includeme_registry_register_meta(self):
        from adhocracy_core.resources.root import IRootPool
        meta = self.config.registry.content.meta
        assert IRootPool.__identifier__ in meta

    def test_includeme_registry_create_content_with_default_platform_id(self):
        from adhocracy_core.resources.root import IRootPool
        from adhocracy_core.interfaces import IPool
        from adhocracy_core.utils import find_graph
        from substanced.util import find_objectmap
        from substanced.util import find_catalog
        from substanced.util import find_service
        from substanced.util import get_acl
        inst = self.config.registry.content.create(IRootPool.__identifier__)
        assert IRootPool.providedBy(inst)
        assert IPool.providedBy(inst['adhocracy'])
        assert find_objectmap(inst) is not None
        assert find_graph(inst) is not None
        assert find_graph(inst)._objectmap is not None
        assert find_catalog(inst, 'system') is not None
        assert find_catalog(inst, 'adhocracy') is not None
        assert find_service(inst, 'principals', 'users') is not None
        assert len(get_acl(inst)) > 0


    def test_includeme_registry_create_content_with_custom_platform_id(self):
        from adhocracy_core.resources.root import IRootPool
        from adhocracy_core.interfaces import IPool
        self.config.registry.settings['adhocracy.platform_id'] = 'platform'
        inst = self.config.registry.content.create(IRootPool.__identifier__)
        assert IPool.providedBy(inst['platform'])
