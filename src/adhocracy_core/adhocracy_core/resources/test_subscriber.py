from pytest import mark
from pytest import fixture

from pyramid import testing

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.testing import add_and_register_sheet


class IDummySheetAutoUpdate(ISheet, ISheetReferenceAutoUpdateMarker):
    pass


class IDummySheetNoAutoUpdate(ISheet):
    pass


def add_and_register_sheet(context, mock_sheet, registry):
    from zope.interface import alsoProvides
    from adhocracy_core.interfaces import IResourceSheet
    isheet = mock_sheet.meta.isheet
    alsoProvides(context, isheet)
    registry.registerAdapter(lambda x: mock_sheet, (isheet,),
                             IResourceSheet,
                             isheet.__identifier__)


def _create_new_version_event_with_isheet(context, isheet, registry, creator=None):
    from adhocracy_core.interfaces import ISheetReferencedItemHasNewVersion
    return testing.DummyResource(__provides__=
                                 ISheetReferencedItemHasNewVersion,
                                 object=context,
                                 isheet=isheet,
                                 isheet_field='elements',
                                 old_version=testing.DummyResource(),
                                 new_version=testing.DummyResource(),
                                 registry=registry,
                                 creator=creator,
                                 root_versions=[])

@fixture
def itemversion():
    """Return dummy resource with IItemVersion interfaces."""
    from adhocracy_core.interfaces import IItemVersion
    return testing.DummyResource(__provides__=IItemVersion)


@fixture
def event(transaction_changelog, context):
    registry = testing.DummyResource()
    registry._transaction_changelog = transaction_changelog
    event = testing.DummyResource(object=context, registry=registry)
    return event


class TestResourceCreatedAndAddedSubscriber:

    def _call_fut(self, event):
        from adhocracy_core.resources.subscriber import resource_created_and_added_subscriber
        return resource_created_and_added_subscriber(event)

    def test_call(self, event, transaction_changelog):
        self._call_fut(event)
        assert transaction_changelog['/'].created is True


class TestItemVersionCreated:

    def _call_fut(self, event):
        from adhocracy_core.resources.subscriber import itemversion_created_subscriber
        return itemversion_created_subscriber(event)

    def test_call_with_version_has_no_follows(self, event, transaction_changelog):
        event.new_version = None
        self._call_fut(event)
        assert transaction_changelog['/'].followed_by is None

    def test_call_with_version_has_follows(self, event, transaction_changelog):
        event.new_version = testing.DummyResource()
        self._call_fut(event)
        assert transaction_changelog['/'].followed_by is event.new_version


class TestResourceModifiedSubscriber:

    def _call_fut(self, event):
        from adhocracy_core.resources.subscriber import resource_modified_subscriber
        return resource_modified_subscriber(event)

    def test_call(self, event, transaction_changelog):
        self._call_fut(event)
        assert transaction_changelog['/'].modified is True


def test_create_transaction_changelog():
    from adhocracy_core.interfaces import ChangelogMetadata
    from adhocracy_core.resources.subscriber import create_transaction_changelog
    changelog = create_transaction_changelog()
    changelog_metadata = changelog['/resource/path']
    assert isinstance(changelog_metadata, ChangelogMetadata)


def test_clear_transaction_changelog_exists(registry, transaction_changelog):
    from adhocracy_core.resources.subscriber import clear_transaction_changelog_after_commit_hook
    registry._transaction_changelog = transaction_changelog
    transaction_changelog['/'] = object()
    clear_transaction_changelog_after_commit_hook(True, registry)
    assert len(registry._transaction_changelog) == 0


def test_clear_transaction_changelog_does_not_exists(registry):
    from adhocracy_core.resources.subscriber import clear_transaction_changelog_after_commit_hook
    assert clear_transaction_changelog_after_commit_hook(True, registry) is None


def test_default_changelog_metadata():
    from adhocracy_core.resources.subscriber import changelog_metadata
    assert changelog_metadata.modified is False
    assert changelog_metadata.created is False
    assert changelog_metadata.followed_by is None
    assert changelog_metadata.resource is None


class TestReferenceHasNewVersionSubscriberUnitTest:

    @fixture
    def registry(self, config, registry, mock_resource_registry, transaction_changelog):
        registry.content = mock_resource_registry
        registry._transaction_changelog = transaction_changelog
        return registry

    def _make_one(self, *args):
        from adhocracy_core.resources.subscriber import reference_has_new_version_subscriber
        return reference_has_new_version_subscriber(*args)

    def _create_new_version_event_for_autoupdate_sheet(self, context, registry, mock_sheet):
        from copy import deepcopy
        from adhocracy_core.sheets.versions import IVersionable
        event = _create_new_version_event_with_isheet(context, IDummySheetAutoUpdate, registry)
        sheet_autoupdate = deepcopy(mock_sheet)
        sheet_autoupdate.meta = mock_sheet.meta._replace(isheet=IDummySheetAutoUpdate)
        sheet_autoupdate.get.return_value = {'elements': [event.old_version],
                                             'element': event.old_version}
        add_and_register_sheet(context, sheet_autoupdate, registry)
        sheet_versionable = deepcopy(mock_sheet)
        sheet_versionable.meta = mock_sheet.meta._replace(isheet=IVersionable)
        sheet_versionable.get.return_value = {'follows': []}
        add_and_register_sheet(context, sheet_versionable, registry)
        return event

    def test_call_versionable_with_autoupdate_sheet_once(self, itemversion, registry, mock_sheet):
        from adhocracy_core.sheets.versions import IVersionable
        event = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        event.creator = object()

        self._make_one(event)

        factory = registry.content.create
        assert factory.call_count == 1
        parent = factory.call_args[1]['parent']
        assert parent is itemversion.__parent__
        appstructs = factory.call_args[1]['appstructs']
        assert appstructs[event.isheet.__identifier__]['elements'] == [event.new_version]
        assert appstructs[IVersionable.__identifier__] == {'follows': [itemversion]}
        creator = factory.call_args[1]['creator']
        assert creator == event.creator

    def test_call_versionable_with_autoupdate_sheet_with_single_reference(self, itemversion, registry, mock_sheet):
        event = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        event.creator = object()
        event.isheet_field = 'element'

        self._make_one(event)

        factory = registry.content.create
        assert factory.call_count == 1

    def test_call_versionable_with_autoupdate_sheet_twice(self, itemversion, registry, mock_sheet, transaction_changelog):
        event = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        self._make_one(event)

        event_second = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        transaction_changelog['/'] = transaction_changelog['/']._replace(
            followed_by=event_second.new_version)
        registry._transaction_changelog = transaction_changelog
        self._make_one(event_second)

        factory = registry.content.create
        assert factory.call_count == 1

    def test_call_versionable_with_autoupdate_sheet_twice_without_transaction_changelog(self, itemversion, registry, mock_sheet):
        event = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        self._make_one(event)

        event_second = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        delattr(registry, '_transaction_changelog')
        self._make_one(event_second)

        factory = registry.content.create
        assert factory.call_count == 2

    def test_call_versionable_with_autoupdate_sheet_and_root_versions_and_not_is_insubtree(self,
            itemversion, mock_graph, registry, mock_sheet):
        mock_graph.is_in_subtree.return_value = False
        itemversion.__parent__=testing.DummyResource()
        itemversion.__graph__ = mock_graph
        event = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        event.root_versions = [itemversion]

        self._make_one(event)

        assert not registry.content.create.called

    def test_call_versionable_with_autoupdate_sheet_but_readonly(self, itemversion, registry, mock_sheet):
        isheet = IDummySheetAutoUpdate
        event = _create_new_version_event_with_isheet(itemversion, isheet, registry)
        mock_sheet.meta = mock_sheet.meta._replace(editable=False,
                                                   creatable=False,
                                                   isheet=isheet)
        add_and_register_sheet(itemversion, mock_sheet, registry)

        self._make_one(event)

        assert not registry.content.create.called

    def test_call_versionable_with_autoupdate_sheet_and_other_sheet_readonly(self, itemversion, registry, mock_sheet):
        event = self._create_new_version_event_for_autoupdate_sheet(itemversion, registry, mock_sheet)
        isheet_readonly = IDummySheetNoAutoUpdate
        mock_sheet.meta = mock_sheet.meta._replace(editable=False,
                                                   creatable=False,
                                                   isheet=isheet_readonly)
        add_and_register_sheet(itemversion, mock_sheet, registry)

        self._make_one(event)

        assert registry.content.create.called
        assert isheet_readonly.__identifier__ not in registry.content.create.call_args[1]['appstructs']

    def test_call_versionable_without_autoupdate_sheet(self, itemversion, registry, mock_sheet):
        isheet = IDummySheetNoAutoUpdate
        event = _create_new_version_event_with_isheet(itemversion, isheet, registry)
        mock_sheet.meta = mock_sheet.meta._replace(editable=False,
                                                   creatable=False,
                                                   isheet=isheet)
        add_and_register_sheet(itemversion, mock_sheet, registry)

        self._make_one(event)

        assert not registry.content.create.called

    def test_call_nonversionable_with_autoupdate_sheet(self, context, registry, mock_sheet):
        isheet = IDummySheetAutoUpdate
        event = _create_new_version_event_with_isheet(context, isheet, registry)
        mock_sheet.meta = mock_sheet.meta._replace(isheet=isheet)
        mock_sheet.get.return_value = {'elements': [event.old_version]}
        add_and_register_sheet(context, mock_sheet, registry)

        self._make_one(event)

        assert mock_sheet.set.call_args[0][0] == {'elements': [event.new_version]}

    def test_call_nonversionable_with_autoupdate_readonly(self, context, registry, mock_sheet):
        isheet = IDummySheetAutoUpdate
        event = _create_new_version_event_with_isheet(context, isheet, registry)
        mock_sheet.meta = mock_sheet.meta._replace(editable=False,
                                                   creatable=False,
                                                   isheet=isheet)
        mock_sheet.get.return_value = {'elements': [event.old_version]}
        add_and_register_sheet(context, mock_sheet, registry)

        self._make_one(event)

        assert mock_sheet.set.called is False


@fixture()
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.resources.subscriber')


@mark.usefixtures('integration')
def test_add_transaction_changelog(registry):
    assert hasattr(registry, '_transaction_changelog')


@mark.usefixtures('integration')
def test_register_subscriber(registry):
    from adhocracy_core.resources import subscriber
    handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
    assert subscriber.resource_created_and_added_subscriber.__name__ in handlers
    assert subscriber.itemversion_created_subscriber.__name__ in handlers
    assert subscriber.resource_modified_subscriber.__name__ in handlers
    assert subscriber.reference_has_new_version_subscriber.__name__ in handlers
