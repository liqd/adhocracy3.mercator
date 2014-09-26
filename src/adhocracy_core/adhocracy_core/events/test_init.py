import unittest

from pyramid import testing
from zope.interface.verify import verifyObject


class ResourceCreatedAndAddedUnitTest(unittest.TestCase):

    def _make_one(self, *arg):
        from adhocracy_core.events import ResourceCreatedAndAdded
        return ResourceCreatedAndAdded(*arg)

    def test_create(self):
        from adhocracy_core.interfaces import IResourceCreatedAndAdded
        context = testing.DummyResource()
        parent = testing.DummyResource()
        registry = testing.DummyResource()
        creator = testing.DummyResource()

        inst = self._make_one(context, parent, registry, creator)

        assert IResourceCreatedAndAdded.providedBy(inst)
        assert verifyObject(IResourceCreatedAndAdded, inst)


class ResourceSheetModifiedUnitTest(unittest.TestCase):

    def _make_one(self, *arg):
        from adhocracy_core.events import ResourceSheetModified
        return ResourceSheetModified(*arg)

    def test_create(self):
        from adhocracy_core.interfaces import IResourceSheetModified
        context = testing.DummyResource()
        parent = testing.DummyResource()
        registry = testing.DummyResource()

        inst = self._make_one(context, parent, registry)

        assert IResourceSheetModified.providedBy(inst)
        assert verifyObject(IResourceSheetModified, inst)


class ItemNewVersionAddedUnitTest(unittest.TestCase):

    def _make_one(self, *arg):
        from adhocracy_core.events import ItemVersionNewVersionAdded
        return ItemVersionNewVersionAdded(*arg)

    def test_create(self):
        from adhocracy_core.interfaces import IItemVersionNewVersionAdded
        context = testing.DummyResource()
        new_version = testing.DummyResource()
        registry = testing.DummyResource()
        creator = testing.DummyResource()

        inst = self._make_one(context, new_version, registry, creator)

        assert IItemVersionNewVersionAdded.providedBy(inst)
        assert verifyObject(IItemVersionNewVersionAdded, inst)


class SheetReferencedItemHasNewVersionUnitTest(unittest.TestCase):

    def _make_one(self, *arg, **kwargs):
        from adhocracy_core.events import SheetReferencedItemHasNewVersion
        return SheetReferencedItemHasNewVersion(*arg, **kwargs)

    def test_create(self):
        from adhocracy_core.interfaces import ISheetReferencedItemHasNewVersion
        from adhocracy_core.interfaces import ISheet
        context = testing.DummyResource()
        isheet = ISheet
        isheet_field = 'example_field'
        old_version = testing.DummyResource()
        new_version = testing.DummyResource()
        root_versions = [context]
        registry = testing.DummyResource()
        creator = testing.DummyResource()

        inst = self._make_one(context, isheet, isheet_field, old_version,
                              new_version, registry, creator,
                              root_versions=root_versions)

        assert ISheetReferencedItemHasNewVersion.providedBy(inst)
        assert verifyObject(ISheetReferencedItemHasNewVersion, inst)


class _ISheetPredicateUnitTest(unittest.TestCase):

    def _make_one(self, *arg):
        from adhocracy_core.events import _ISheetPredicate
        return _ISheetPredicate(*arg)

    def test_create(self):
        from adhocracy_core.interfaces import ISheet
        inst = self._make_one(ISheet, None)
        assert inst.isheet == ISheet

    def test_call_event_without_isheet(self):
        from adhocracy_core.interfaces import ISheet
        dummy_event = testing.DummyResource()
        inst = self._make_one(ISheet, None)
        assert not inst.__call__(dummy_event)

    def test_call_event_with_isheet(self):
        from adhocracy_core.interfaces import ISheet
        dummy_event = testing.DummyResource()
        dummy_event.isheet = ISheet
        inst = self._make_one(ISheet, None)
        assert inst.__call__(dummy_event)


class _InterfacePredicateUnitTest(unittest.TestCase):

    def _make_one(self, *arg):
        from adhocracy_core.events import _InterfacePredicate
        return _InterfacePredicate(*arg)

    def test_create(self):
        from adhocracy_core.interfaces import ILocation
        inst = self._make_one(ILocation, None)
        assert inst.interface == ILocation

    def test_call_event_without_object_iface(self):
        from adhocracy_core.interfaces import ILocation
        dummy_event = testing.DummyResource()
        dummy_event.object = testing.DummyResource()
        inst = self._make_one(ILocation, None)
        assert not inst.__call__(dummy_event)

    def test_call_event_with_object_iface(self):
        from adhocracy_core.interfaces import ILocation
        dummy_event = testing.DummyResource()
        dummy_event.object = testing.DummyResource(__provides__=ILocation)
        inst = self._make_one(ILocation, None)
        assert inst.__call__(dummy_event)


class IncludemeIntegrationTest(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.config.include('adhocracy_core.events')

    def tearDown(self):
        testing.tearDown()

    def test_register_subsriber_predicats(self):
        assert self.config.get_predlist('isheet')
        assert self.config.get_predlist('interface')
