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
        config.include('adhocracy_core.sheets.comment')
        config.include('adhocracy_core.resources.comment')
        self.config = config
        self.context = create_pool_with_graph()

    def tearDown(self):
        testing.tearDown()

    def test_includeme_registry_register_factories(self):
        from adhocracy_core.resources.comment import ICommentVersion
        from adhocracy_core.resources.comment import IComment
        content_types = self.config.registry.content.factory_types
        assert IComment.__identifier__ in content_types
        assert ICommentVersion.__identifier__ in content_types

    def test_includeme_registry_create_content(self):
        from adhocracy_core.resources.comment import ICommentVersion
        res = self.config.registry.content.create(ICommentVersion.__identifier__,
                                                  self.context)
        assert ICommentVersion.providedBy(res)
