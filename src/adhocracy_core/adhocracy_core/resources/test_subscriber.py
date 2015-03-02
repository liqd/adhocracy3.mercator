from unittest.mock import Mock

from pytest import mark
from pytest import raises
from pytest import fixture
from pyramid import testing

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.testing import register_sheet


class IDummySheetAutoUpdate(ISheet, ISheetReferenceAutoUpdateMarker):
    pass


class IDummySheetNoAutoUpdate(ISheet):
    pass


def create_new_reference_event(context,
                               registry,
                               isheet=IDummySheetAutoUpdate,
                               isheet_field='elements',
                               creator=None,
                               old_version=None,
                               new_version=None,
                               root_versions=None,
                               is_batchmode=False,
                               ):
    from zope.interface import verify
    from adhocracy_core.interfaces import ISheetReferenceNewVersion
    event = testing.DummyResource(__provides__= ISheetReferenceNewVersion,
                                  object=context,
                                  isheet=isheet,
                                  isheet_field=isheet_field,
                                  old_version=old_version,
                                  new_version=new_version,
                                  registry=registry,
                                  creator=creator,
                                  root_versions=root_versions or [],
                                  is_batchmode=is_batchmode,
                                  )
    assert verify.verifyObject(ISheetReferenceNewVersion, event)
    return event


@fixture
def version():
    """Return dummy resource with IItemVersion interfaces."""
    from adhocracy_core.interfaces import IItemVersion
    version = testing.DummyResource(__provides__=IItemVersion)
    return version


@fixture
def item(version):
    from adhocracy_core.interfaces import IItem
    item = testing.DummyResource(__provides__=IItem)
    item['version'] = version
    return item


@fixture
def event(changelog, context):
    registry = testing.DummyResource()
    registry.changelog = changelog
    event = testing.DummyResource(object=context, registry=registry)
    return event


class TestAutoupdateVersionableHasNewVersion:

    @fixture
    def registry(self, registry_with_content, changelog):
        registry_with_content.changelog = changelog
        return registry_with_content

    @fixture
    def mock_sheet(self, mock_sheet):
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IDummySheetAutoUpdate)
        mock_sheet.get.return_value = {'elements': []}
        return mock_sheet

    def _call_fut(self, event):
        from adhocracy_core.resources.subscriber import \
            autoupdate_versionable_has_new_version
        return autoupdate_versionable_has_new_version(event)

    def test_with_root_versions_not_in_subtree(self, version, mock_graph,
                                               registry):
        """Ingore event if object ist not in root_versions subtree."""
        root_version = testing.DummyResource()
        mock_graph.is_in_subtree.return_value = False
        version.__graph__ = mock_graph
        event = create_new_reference_event(version, registry,
                                           root_versions=[root_version])
        self._call_fut(event)
        mock_graph.is_in_subtree.assert_called_once_with(version, [root_version])
        assert registry.content.create.called is False

    def test_with_sheet_not_editable(self, version, registry, mock_sheet):
        """Ingore event if isheet ist not editable."""
        event = create_new_reference_event(version, registry)
        mock_sheet.meta = mock_sheet.meta._replace(editable=False)
        register_sheet(version, mock_sheet, registry)
        self._call_fut(event)
        assert registry.content.create.called is False

    def test_transaction_version_created_multiple_elements(
            self, version, registry, mock_sheet, changelog_meta):
        """Update version created in transaction (sheet field is list) """
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3,
                                           isheet_field='elements')
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        registry.changelog['/'] = changelog_meta._replace(created=True)
        self._call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}
        assert registry.content.create.called is False

    def test_transation_version_created_single_element(
            self, version, registry, mock_sheet, changelog_meta):
        """Update version created in transaction (sheet field is single)"""
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3,
                                           isheet_field='element')
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'element': 2}
        registry.changelog['/'] = changelog_meta._replace(created=True)
        self._call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'element': 3}
        assert registry.content.create.called is False

    def test_transaction_version_followed_by(
            self, version, registry, mock_sheet, changelog_meta):
        """Update followed_by version created in transaction."""
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3)
        register_sheet(version, mock_sheet, registry)
        followedby = testing.DummyResource()
        register_sheet(followedby, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        registry.changelog['/'] = changelog_meta._replace(followed_by=followedby)
        self._call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}
        assert registry.content.create.called is False

    def test_transaction_version_batchmode(
            self, item, version, registry, mock_sheet, changelog_meta):
        """Update items last_version created in transaction if batchmode.

           We could create forks if we update followedby/created during batch
           request. So we just take the last created item version.
        """
        from pyramid.traversal import resource_path
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3, is_batchmode=True)
        register_sheet(version, mock_sheet, registry)
        last_version = testing.DummyResource()
        register_sheet(last_version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        registry.changelog[resource_path(item)] =\
            changelog_meta._replace(last_version=last_version)
        self._call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}
        assert registry.content.create.called is False

    @fixture
    def mock_get_last_version(self, monkeypatch):
        import adhocracy_core.resources.subscriber
        mock = Mock(spec=adhocracy_core.utils.get_last_version)
        monkeypatch.setattr(adhocracy_core.resources.subscriber,
                            'get_last_version',
                            mock)
        return mock

    @fixture
    def mock_versionable_sheet(self, mock_sheet, sheet_meta):
        from copy import deepcopy
        from adhocracy_core.sheets.versions import IVersionable
        versionable = deepcopy(mock_sheet)
        versionable.get.return_value = {'follows': []}
        versionable.meta = sheet_meta._replace(isheet=IVersionable)
        return versionable

    def test_version_is_last_version(
            self, item, version, registry, mock_sheet, mock_versionable_sheet,
            mock_get_last_version):
        """If no version created in transaction and version is the items
           last_version create a new version.
        """
        from adhocracy_core.interfaces import IItemVersion
        from adhocracy_core.sheets.versions import IVersionable
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3)
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        mock_get_last_version.return_value = version
        registry.content.get_sheets_all.return_value = [mock_sheet,
                                                        mock_versionable_sheet]
        self._call_fut(event)
        assert registry.content.create.call_args[0][0] == IItemVersion.__identifier__
        assert registry.content.create.call_args[1]['root_versions'] == event.root_versions
        assert registry.content.create.call_args[1]['registry'] == event.registry
        assert registry.content.create.call_args[1]['creator'] is event.creator
        assert registry.content.create.call_args[1]['parent'] is item
        assert registry.content.create.call_args[1]['is_batchmode'] == event.is_batchmode
        assert registry.content.create.call_args[1]['appstructs'] ==\
            {IDummySheetAutoUpdate.__identifier__: {'elements': [1, 3]},
             IVersionable.__identifier__: {'follows': [version]}}

    @fixture
    def mock_sheet_readonly(self, mock_sheet, sheet_meta):
        from copy import deepcopy
        mock_readonly = deepcopy(mock_sheet)
        isheet = IDummySheetNoAutoUpdate
        mock_readonly.meta = sheet_meta._replace(isheet=isheet,
                                                 creatable=False,
                                                 editable=False)
        return mock_readonly

    def test_version_is_last_version_with_readonly_sheet(
            self, version, registry, mock_sheet,
            mock_versionable_sheet, mock_get_last_version, mock_sheet_readonly):
        """If creating a new version, do not copy readonly sheets"""
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        mock_get_last_version.return_value = version
        registry.content.get_sheets_all.return_value = [mock_sheet,
                                                        mock_versionable_sheet,
                                                        mock_sheet_readonly]
        registry.content.get_sheet.side_effect = [mock_sheet,
                                                  mock_sheet_readonly]
        self._call_fut(event)
        assert mock_sheet_readonly.meta.isheet.__identifier__ not in \
               registry.content.create.call_args[1]['appstructs']

    def test_version_is_not_last_version_but_has_same_references(
            self, version, registry, mock_sheet,
            mock_versionable_sheet, mock_get_last_version):
        """If no new version is created in transaction and version is not
           items last_version but has same references ignore
        """
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3)
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        last = testing.DummyResource()
        register_sheet(last, mock_sheet, registry)
        mock_get_last_version.return_value = last
        registry.content.get_sheets_all.return_value = [mock_sheet,
                                                        mock_versionable_sheet]
        self._call_fut(event)
        assert registry.content.create.called is False

    def test_version_is_not_last_version_and_has_not_same_references(
            self, version, registry, mock_sheet,
            mock_versionable_sheet, mock_get_last_version):
        """If no new version is created in transaction and version is not
           items last_version but has same references raise
        """
        from adhocracy_core.exceptions import AutoUpdateNoForkAllowedError
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3)
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        last = testing.DummyResource()
        register_sheet(last, mock_sheet, registry)
        mock_sheet.get.side_effect = [{'elements': [1, 2]}, {'elements': [11]},
                                      {'elements': [22]}]
        mock_get_last_version.return_value = last
        registry.content.get_sheets_all.return_value = [mock_sheet,
                                                        mock_versionable_sheet]
        with raises(AutoUpdateNoForkAllowedError) as err:
            self._call_fut(event)
        assert err.value.resource is version
        assert err.value.event is event


class TestAutoupdateNoneVersionableHasNewVersion:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def mock_sheet(self, mock_sheet):
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IDummySheetAutoUpdate)
        mock_sheet.get.return_value = {'elements': []}
        return mock_sheet

    def _call_fut(self, event):
        from adhocracy_core.resources.subscriber import \
            autoupdate_non_versionable_has_new_version
        return autoupdate_non_versionable_has_new_version(event)

    def test_with_root_versions_not_in_subtree(self, version, mock_graph,
                                               registry, mock_sheet):
        """Ingore event if object ist not in root_versions subtree."""
        root_version = testing.DummyResource()
        mock_graph.is_in_subtree.return_value = False
        version.__graph__ = mock_graph
        event = create_new_reference_event(version, registry,
                                           root_versions=[root_version])
        register_sheet(version, mock_sheet, registry)
        self._call_fut(event)
        mock_graph.is_in_subtree.assert_called_once_with(version, [root_version])
        assert not mock_sheet.set.called

    def test_with_sheet_not_editable(self, version, registry, mock_sheet):
        """Ingore event if isheet ist not editable."""
        event = create_new_reference_event(version, registry)
        mock_sheet.meta = mock_sheet.meta._replace(editable=False)
        register_sheet(version, mock_sheet, registry)
        self._call_fut(event)
        assert not mock_sheet.set.called

    def test_multiple_elements(self, version, registry, mock_sheet):
        """Update version (sheet field is list) """
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3,
                                           isheet_field='elements')
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        self._call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}

    def test_single_element(self, version, registry, mock_sheet):
        """Update version (sheet field is list) """
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3,
                                           isheet_field='elements')
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        self._call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}


class TestAddDefaultGroupToUserSubscriber:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def principals(self, pool, service):
        pool['principals'] = service
        pool['principals']['groups'] = service.clone()
        group = testing.DummyResource()
        pool['principals']['groups']['authenticated'] = group
        pool['principals']['users'] = service.clone()
        user = testing.DummyResource()
        pool['principals']['users']['000000'] = user
        return pool['principals']

    def call_fut(self, event):
        from adhocracy_core.resources.subscriber import\
            user_created_and_added_subscriber
        return user_created_and_added_subscriber(event)

    def test_default_group_exists(
            self, registry, principals, event, mock_sheet):
        from adhocracy_core.sheets.principal import IPermissions
        default_group = principals['groups']['authenticated']
        user = principals['users']['000000']
        event.object = user
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPermissions)
        register_sheet(event.object, mock_sheet, registry)
        mock_sheet.get.return_value = {'groups': []}
        self.call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'groups': [default_group]}

    def test_default_group_not_exists(
            self, registry, principals, event, mock_sheet):
        from adhocracy_core.sheets.principal import IPermissions
        del principals['groups']['authenticated']
        user = principals['users']['000000']
        event.object = user
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPermissions)
        register_sheet(event.object, mock_sheet, registry)
        mock_sheet.get.return_value = {'groups': []}
        self.call_fut(event)
        assert mock_sheet.set.called is False


class TestUpdateModificationDate:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    def _call_fut(self, event):
        from .subscriber import update_modification_date_modified_by
        return update_modification_date_modified_by(event)

    def test_with_request(self, context, registry, mock_sheet, monkeypatch):
        from datetime import datetime
        from . import subscriber
        from adhocracy_core.sheets.metadata import IMetadata
        now = datetime.now()
        monkeypatch.setattr(subscriber, 'get_modification_date', lambda x: now)
        user = object()
        monkeypatch.setattr(subscriber, 'get_user', lambda x: user)
        register_sheet(context, mock_sheet, registry, isheet=IMetadata)
        request = testing.DummyResource()
        event = testing.DummyResource(object=context,
                                      registry=registry,
                                      request=request)
        self._call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'modification_date': now,
                                                  'modified_by': user}
        assert mock_sheet.set.call_args[1] ==\
            {'send_event': False,  'omit_readonly': False, 'request': request,
             'registry': registry}



@fixture()
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.resources.subscriber')


@mark.usefixtures('integration')
def test_register_subscriber(registry):
    from adhocracy_core.resources import subscriber
    handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
    assert subscriber.autoupdate_non_versionable_has_new_version.__name__ in handlers
    assert subscriber.autoupdate_versionable_has_new_version.__name__ in handlers
    assert subscriber.user_created_and_added_subscriber.__name__ in handlers
    assert subscriber.update_modification_date_modified_by.__name__ in handlers


