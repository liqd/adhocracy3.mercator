import unittest

from pyramid import testing
from pytest import raises
from pytest import fixture
from pytest import mark
import colander

from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ITag


def test_item_meta():
    from .item import item_meta
    from .item import create_initial_content_for_item
    from .item import IItem
    from .item import IItemVersion
    import adhocracy_core.sheets
    meta = item_meta
    assert meta.iresource == IItem
    assert meta.basic_sheets == (adhocracy_core.sheets.tags.ITags,
                                 adhocracy_core.sheets.versions.IVersions,
                                 adhocracy_core.sheets.pool.IPool,
                                 adhocracy_core.sheets.metadata.IMetadata,
                                 adhocracy_core.sheets.workflow.IWorkflowAssignment,
                                 )
    assert meta.element_types == (
        IItemVersion,
        ITag
    )
    assert create_initial_content_for_item in meta.after_creation
    assert meta.item_type == IItemVersion
    assert meta.permission_create == 'create_item'
    assert meta.use_autonaming
    assert meta.autonaming_prefix == 'item_'


def make_itemversion(parent=None, follows=[]):
    from adhocracy_core.resources import ResourceFactory
    from adhocracy_core.sheets.versions import IVersionable
    from adhocracy_core.resources.itemversion import itemversion_meta
    appstructs = {IVersionable.__identifier__: {'follows': follows}}
    return ResourceFactory(itemversion_meta)(parent=parent,
                                                 appstructs=appstructs)


def make_forkable_itemversion(parent=None, follows=[]):
    from adhocracy_core.resources import ResourceFactory
    from adhocracy_core.sheets.versions import IForkableVersionable
    from adhocracy_core.resources.itemversion import itemversion_meta
    forkable_itemversion_metadata = itemversion_meta._replace(
        extended_sheets=(IForkableVersionable,)
    )
    appstructs = {IForkableVersionable.__identifier__: {'follows': follows}}
    return ResourceFactory(forkable_itemversion_metadata)(
        parent=parent, appstructs=appstructs)


@mark.usefixtures('integration')
class TestItem:

    @fixture
    def context(self, pool_with_catalogs):
        return pool_with_catalogs

    def make_one(self, context, registry, name='name'):
        from adhocracy_core.sheets.name import IName
        inst = registry.content.create(IItem.__identifier__,
                                       appstructs={},
                                       parent=context)
        return inst

    def test_create(self, context, registry):
        from adhocracy_core.sheets.tags import ITag as ITagS

        item = self.make_one(context, registry)

        version0 = item['VERSION_0000000']
        assert IItemVersion.providedBy(version0)
        first_tag = item['FIRST']
        assert ITag.providedBy(first_tag)
        last_tag = item['LAST']
        assert ITag.providedBy(last_tag)
        first_targets = context.__graph__.get_references_for_isheet(first_tag, ITagS)['elements']
        assert first_targets == [version0]
        last_targets = context.__graph__.get_references_for_isheet(last_tag, ITagS)['elements']
        assert last_targets == [version0]

    def test_update_last_tag(self, context, registry):
        """Test that LAST tag is updated correctly."""
        from adhocracy_core.sheets.tags import ITag as ITagS
        item = self.make_one(context, registry)
        version0 = item['VERSION_0000000']

        version1 = make_itemversion(parent=item, follows=[version0])

        last_tag = item['LAST']
        last_targets = context.__graph__.get_references_for_isheet(last_tag, ITagS)['elements']
        assert last_targets == [version1]

    @mark.xfail(reason="Forkables resources are not yet supported")
    def test_update_last_tag_two_versions_with_forkable(self, context, registry):
        """Test branching off two versions from the same version,
        using forkable versionables.
        """
        from adhocracy_core.sheets.tags import ITag as ITagS
        item = self.make_one(context, registry)
        version0 = item['VERSION_0000000']

        version1 = make_forkable_itemversion(parent=item, follows=[version0])
        version2 = make_forkable_itemversion(parent=item, follows=[version0])

        last_tag = item['LAST']
        last_targets = context.__graph__.get_references_for_isheet(last_tag,
                                                                   ITagS)['elements']
        assert last_targets == [version1, version2]
