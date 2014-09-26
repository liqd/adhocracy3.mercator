import unittest

from pyramid import testing
from pytest import raises
import colander

from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ITag


#############
#  helpers  #
#############

def make_itemversion(parent=None, follows=[]):
    from adhocracy_core.resources import ResourceFactory
    from adhocracy_core.sheets.versions import IVersionable
    from adhocracy_core.resources.itemversion import itemversion_metadata
    appstructs = {IVersionable.__identifier__: {'follows': follows}}
    return ResourceFactory(itemversion_metadata)(parent=parent,
                                                 appstructs=appstructs)


def make_forkable_itemversion(parent=None, follows=[]):
    from adhocracy_core.resources import ResourceFactory
    from adhocracy_core.sheets.versions import IForkableVersionable
    from adhocracy_core.resources.itemversion import itemversion_metadata
    forkable_itemversion_metadata = itemversion_metadata._replace(
        extended_sheets=[IForkableVersionable]
    )
    appstructs = {IForkableVersionable.__identifier__: {'follows': follows}}
    return ResourceFactory(forkable_itemversion_metadata)(
        parent=parent, appstructs=appstructs)


###########
#  tests  #
###########


class TestItemIntegrationTest(unittest.TestCase):

    def setUp(self):
        from adhocracy_core.testing import create_pool_with_graph
        from adhocracy_core.resources.item import item_metadata
        from adhocracy_core.resources.root import _add_catalog_service
        config = testing.setUp()
        config.include('adhocracy_core.registry')
        config.include('adhocracy_core.events')
        config.include('adhocracy_core.catalog')
        config.include('adhocracy_core.sheets')
        config.include('adhocracy_core.resources.itemversion')
        config.include('adhocracy_core.resources.item')
        config.include('adhocracy_core.resources.tag')
        config.include('adhocracy_core.resources.subscriber')
        self.config = config
        self.context = create_pool_with_graph()
        _add_catalog_service(self.context, config.registry)
        self.objectmap = self.context.__objectmap__
        self.graph = self.context.__graph__
        self.metadata = item_metadata

    def tearDown(self):
        testing.tearDown()

    def make_one(self, name='name'):
        from adhocracy_core.sheets.name import IName
        from adhocracy_core.resources import ResourceFactory
        appstructs = {IName.__identifier__: {'name': name}}
        inst = ResourceFactory(self.metadata)(parent=self.context,
                                              appstructs=appstructs)
        return inst

    def test_create(self):
        from adhocracy_core.sheets.tags import ITag as ITagS

        item = self.make_one()

        version0 = item['VERSION_0000000']
        assert IItemVersion.providedBy(version0)
        first_tag = item['FIRST']
        assert ITag.providedBy(first_tag)
        last_tag = item['LAST']
        assert ITag.providedBy(last_tag)
        first_targets = self.graph.get_references_for_isheet(first_tag, ITagS)['elements']
        assert first_targets == [version0]
        last_targets = self.graph.get_references_for_isheet(last_tag, ITagS)['elements']
        assert last_targets == [version0]

    def test_update_last_tag(self):
        """Test that LAST tag is updated correctly."""
        from adhocracy_core.sheets.tags import ITag as ITagS
        item = self.make_one()
        version0 = item['VERSION_0000000']

        version1 = make_itemversion(parent=item, follows=[version0])

        last_tag = item['LAST']
        last_targets = self.graph.get_references_for_isheet(last_tag, ITagS)['elements']
        assert last_targets == [version1]

    def test_update_last_tag_two_versions(self):
        """Test that an error is thrown if we try to branch off two versions
        from the same version (since items have a linear history).
        """
        from adhocracy_core.sheets.tags import ITag as ITagS
        self.config.include('adhocracy_core.sheets.versions')
        self.config.include('adhocracy_core.events')
        self.config.include('adhocracy_core.resources.subscriber')
        item = self.make_one()
        version0 = item['VERSION_0000000']

        version1 = make_itemversion(parent=item, follows=[version0])
        with raises(colander.Invalid):
            make_itemversion(parent=item, follows=[version0])

        last_tag = item['LAST']
        last_targets = self.graph.get_references_for_isheet(last_tag, ITagS)['elements']
        assert last_targets == [version1]

    def test_update_last_tag_two_versions_with_forkable(self):
        """Test branching off two versions from the same version,
        using forkable versionables.
        """
        from adhocracy_core.sheets.tags import ITag as ITagS
        self.config.include('adhocracy_core.sheets.versions')
        self.config.include('adhocracy_core.events')
        self.config.include('adhocracy_core.resources.subscriber')
        item = self.make_one()
        version0 = item['VERSION_0000000']

        version1 = make_forkable_itemversion(parent=item, follows=[version0])
        version2 = make_forkable_itemversion(parent=item, follows=[version0])

        last_tag = item['LAST']
        last_targets = self.graph.get_references_for_isheet(last_tag,
                                                            ITagS)['elements']
        assert last_targets == [version1, version2]


class IncludemeIntegrationTest(unittest.TestCase):

    def setUp(self):
        from adhocracy_core.testing import create_pool_with_graph
        from adhocracy_core.resources.item import item_metadata
        config = testing.setUp()
        config.include('adhocracy_core.registry')
        config.include('adhocracy_core.events')
        config.include('adhocracy_core.resources.item')
        config.include('adhocracy_core.sheets.metadata')
        self.config = config
        self.context = create_pool_with_graph()
        self.metadata = item_metadata

    def tearDown(self):
        testing.tearDown()

    def test_includeme_registry_register_factories(self):
        content_types = self.config.registry.content.factory_types
        assert IItem.__identifier__ in content_types

    def test_includeme_registry_create_content(self):
        res = self.config.registry.content.create(IItem.__identifier__,
                                                  run_after_creation=False)
        assert IItem.providedBy(res)
