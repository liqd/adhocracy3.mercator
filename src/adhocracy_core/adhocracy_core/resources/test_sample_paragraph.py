from pyramid import testing

import unittest


class IncludemeIntegrationTest(unittest.TestCase):

    def setUp(self):
        from adhocracy_core.testing import create_pool_with_graph
        config = testing.setUp()
        config.include('adhocracy_core.registry')
        config.include('adhocracy_core.events')
        config.include('adhocracy_core.catalog')
        config.include('adhocracy_core.sheets')
        config.include('adhocracy_core.resources.sample_paragraph')
        self.config = config
        self.context = create_pool_with_graph()

    def tearDown(self):
        testing.tearDown()

    def test_includeme_registry_register_factories(self):
        from adhocracy_core.resources.sample_paragraph import IParagraphVersion
        from adhocracy_core.resources.sample_paragraph import IParagraph
        content_types = self.config.registry.content.factory_types
        assert IParagraph.__identifier__ in content_types
        assert IParagraphVersion.__identifier__ in content_types

    def test_includeme_registry_create_content(self):
        from adhocracy_core.resources.sample_paragraph import IParagraphVersion
        res = self.config.registry.content.create(IParagraphVersion.__identifier__,
                                                  self.context)
        assert IParagraphVersion.providedBy(res)
