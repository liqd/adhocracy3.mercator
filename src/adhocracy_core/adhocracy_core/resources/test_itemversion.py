import unittest

from pyramid import testing

from adhocracy_core.interfaces import ISheetReferencedItemHasNewVersion
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.interfaces import IItemVersionNewVersionAdded
from adhocracy_core.interfaces import IItemVersion


class ItemVersionIntegrationTest(unittest.TestCase):

    def setUp(self):
        from adhocracy_core.testing import create_pool_with_graph
        config = testing.setUp()
        config.include('adhocracy_core.registry')
        config.include('adhocracy_core.events')
        config.include('adhocracy_core.catalog')
        config.include('adhocracy_core.sheets')
        config.include('adhocracy_core.resources.itemversion')
        config.include('adhocracy_core.resources.subscriber')
        self.config = config
        self.context = create_pool_with_graph()
        self.objectmap = self.context.__objectmap__
        self.graph = self.context.__graph__

    def tearDown(self):
        testing.tearDown()

    def _make_one(self, follows=[], appstructs={}, creator=None):
        from adhocracy_core.sheets.versions import IVersionable
        parent = self.context
        follow = {IVersionable.__identifier__: {'follows': follows}}
        appstructs = appstructs or {}
        appstructs.update(follow)
        itemversion = self.config.registry.content.create(
            IItemVersion.__identifier__,
            parent=parent,
            appstructs=appstructs,
            creator=creator,
            registry=self.config.registry)
        return itemversion

    def test_registry_factory(self):
        content_types = self.config.registry.content.factory_types
        assert IItemVersion.__identifier__ in content_types

    def test_create(self):
        version_0 = self._make_one()
        assert IItemVersion.providedBy(version_0)

    def test_create_new_version(self):
        events = []
        listener = lambda event: events.append(event)
        self.config.add_subscriber(listener, IItemVersionNewVersionAdded)
        creator = self._make_one()

        version_0 = self._make_one()
        version_1 = self._make_one(follows=[version_0], creator=creator)

        assert len(events) == 1
        assert events[0].object == version_0
        assert events[0].new_version == version_1
        assert events[0].creator == creator

    def test_create_new_version_with_referencing_resources(self):
        events = []
        listener = lambda event: events.append(event)
        self.config.add_subscriber(listener, ISheetReferencedItemHasNewVersion)
        creator = self._make_one()

        version_0 = self._make_one()
        other_version_0 = self._make_one()
        self.objectmap.connect(other_version_0, version_0, SheetToSheet)
        self._make_one(follows=[version_0], creator=creator)

        assert len(events) == 1
        assert events[0].creator == creator

    def test_autoupdate_with_referencing_items(self):
        # for more tests see adhocracy_core.resources.subscriber
        from adhocracy_core.sheets.document import ISection
        from adhocracy_core.resources.itemversion import itemversion_metadata
        from adhocracy_core.resources import add_resource_type_to_registry
        from adhocracy_core.sheets.versions import IVersionable
        from adhocracy_core.utils import get_sheet
        self.config.include('adhocracy_core.sheets.document')
        self.config.include('adhocracy_core.sheets.versions')
        metadata = itemversion_metadata._replace(extended_sheets=[ISection])
        add_resource_type_to_registry(metadata, self.config)
        referenced_v0 = self._make_one()
        referenceing_v0 = self._make_one(appstructs={ISection.__identifier__:
                                                     {'subsections': [referenced_v0]}})

        referenced_v1 = self._make_one(follows=[referenced_v0])

        referencing_v0_versions = get_sheet(referenceing_v0, IVersionable).get()
        assert len(referencing_v0_versions['followed_by']) == 1

