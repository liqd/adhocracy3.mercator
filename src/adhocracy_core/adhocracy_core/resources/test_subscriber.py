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


@fixture
def registry(registry_with_content, changelog):
    registry_with_content.changelog = changelog
    return registry_with_content


@fixture
def mock_download(mocker):
    mock = mocker.patch('adhocracy_core.resources.subscriber.'
                        '_download_picture_url')
    return mock


class TestAutoupdateVersionableHasNewVersion:

    @fixture
    def mock_sheet(self, mock_sheet):
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IDummySheetAutoUpdate)
        mock_sheet.get.return_value = {'elements': []}
        return mock_sheet

    def call_fut(self, event):
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
        self.call_fut(event)
        mock_graph.is_in_subtree.assert_called_once_with(version, [root_version])
        assert registry.content.create.called is False

    def test_with_sheet_not_editable(self, version, registry, mock_sheet):
        """Ingore event if isheet ist not editable."""
        event = create_new_reference_event(version, registry)
        mock_sheet.meta = mock_sheet.meta._replace(editable=False)
        register_sheet(version, mock_sheet, registry)
        self.call_fut(event)
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
        self.call_fut(event)
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
        self.call_fut(event)
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
        self.call_fut(event)
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
        self.call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}
        assert registry.content.create.called is False

    @fixture
    def mock_get_last_version(self, mocker):
        from . import subscriber
        mock = mocker.patch.object(subscriber, '_get_last_version',
                                   autospec=True)
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
        self.call_fut(event)
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
        self.call_fut(event)
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
        self.call_fut(event)
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
            self.call_fut(event)
        assert err.value.resource is version
        assert err.value.event is event


class TestAutoupdateNoneVersionableHasNewVersion:

    @fixture
    def mock_sheet(self, mock_sheet):
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IDummySheetAutoUpdate)
        mock_sheet.get.return_value = {'elements': []}
        return mock_sheet

    def call_fut(self, event):
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
        self.call_fut(event)
        mock_graph.is_in_subtree.assert_called_once_with(version, [root_version])
        assert not mock_sheet.set.called

    def test_with_sheet_not_editable(self, version, registry, mock_sheet):
        """Ingore event if isheet ist not editable."""
        event = create_new_reference_event(version, registry)
        mock_sheet.meta = mock_sheet.meta._replace(editable=False)
        register_sheet(version, mock_sheet, registry)
        self.call_fut(event)
        assert not mock_sheet.set.called

    def test_multiple_elements(self, version, registry, mock_sheet):
        """Update version (sheet field is list) """
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3,
                                           isheet_field='elements')
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        self.call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}

    def test_single_element(self, version, registry, mock_sheet):
        """Update version (sheet field is list) """
        event = create_new_reference_event(version, registry, old_version=2,
                                           new_version=3,
                                           isheet_field='elements')
        register_sheet(version, mock_sheet, registry)
        mock_sheet.get.return_value = {'elements': [1, 2]}
        self.call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'elements': [1, 3]}


class TestAddDefaultGroupToUserSubscriber:

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

    @fixture
    def event(event, registry):
        event.registry = registry
        return event

    def call_fut(self, event):
        from adhocracy_core.resources.subscriber import\
            add_default_group_to_user
        return add_default_group_to_user(event)

    def test_default_group_exists_and_no_group_set(
            self, registry, principals, event, mock_sheet, mock_user_locator):
        from adhocracy_core.sheets.principal import IPermissions
        default_group = principals['groups']['authenticated']
        user = principals['users']['000000']
        event.object = user
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPermissions)
        register_sheet(event.object, mock_sheet, registry)
        mock_sheet.get.return_value = {'groups': []}
        mock_user_locator.get_groups.return_value = []
        self.call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'groups': [default_group]}

    def test_default_group_exists_and_group_set(
            self, registry, principals, event, mock_sheet, mock_user_locator):
        from adhocracy_core.sheets.principal import IPermissions
        default_group = principals['groups']['authenticated']
        other_group = testing.DummyResource()
        user = principals['users']['000000']
        event.object = user
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPermissions)
        register_sheet(event.object, mock_sheet, registry)
        mock_sheet.get.return_value = {'groups': []}
        mock_user_locator.get_groups.return_value = [other_group]
        self.call_fut(event)
        assert mock_sheet.set.called is False

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

    def call_fut(self, event):
        from .subscriber import update_modification_date_modified_by
        return update_modification_date_modified_by(event)

    def test_with_request(self, context, registry, mock_sheet, monkeypatch):
        from datetime import datetime
        from . import subscriber
        from adhocracy_core.sheets.metadata import IMetadata
        now = datetime.now()
        monkeypatch.setattr(subscriber, 'get_modification_date', lambda x: now)
        register_sheet(context, mock_sheet, registry, isheet=IMetadata)
        request = testing.DummyResource(user=object())
        event = testing.DummyResource(object=context,
                                      registry=registry,
                                      request=request)
        self.call_fut(event)
        assert mock_sheet.set.call_args[0][0] == {'modification_date': now,
                                                  'modified_by': request.user}
        assert mock_sheet.set.call_args[1] == {'send_event': False,
                                               'omit_readonly': False}


class TestSendPasswordResetMail:

    @fixture
    def registry(self, registry, mock_messenger):
        registry.messenger = mock_messenger
        return registry

    @fixture
    def event(self, context, registry):
        event.object = context
        event.registry = registry
        return event

    def call_fut(self, event):
        from .subscriber import send_password_reset_mail
        return send_password_reset_mail(event)

    def test_call(self, event, mock_sheet, registry, mock_messenger):
        user = testing.DummyResource()
        mock_sheet.get.return_value = {'creator': user}
        registry.content.get_sheet.return_value = mock_sheet
        event.object.__name__ = '/reset'
        self.call_fut(event)
        mock_messenger.send_password_reset_mail.assert_called_with(user,
                                                                   event.object)


class TestSendAcitvationMail:

    @fixture
    def registry(self, registry, mock_messenger):
        registry.messenger = mock_messenger
        return registry

    @fixture
    def user(self):
        user = testing.DummyResource(name='user name',
                                     email='test@test.de',
                                     activate=Mock())
        return user

    @fixture
    def event(self, user, registry):
        event.object = user
        event.registry = registry
        return event

    def call_fut(self, event):
        from .subscriber import send_activation_mail_or_activate_user
        return send_activation_mail_or_activate_user(event)

    def test_add_activation_path_and_notify_user(self, event, mock_messenger):
        self.call_fut(event)
        send_mail_call_args = mock_messenger.send_registration_mail.call_args[0]
        assert send_mail_call_args[0] == event.object
        assert send_mail_call_args[1].startswith('/activate/')
        assert event.object.activation_path.startswith('/activate/')

    def test_activate_user_if_skip_settings_is_set(self, event, mock_messenger):
        event.registry.settings['adhocracy.skip_registration_mail'] = 'true'
        self.call_fut(event)
        assert event.object.activate.called
        assert mock_messenger.send_registration_mail.called is False

    def test_activation_if_messenger_is_none(self, registry, event, mock_messenger):
        registry.messenger = None
        self.call_fut(event)
        assert mock_messenger.send_registration_mail.called is False


class TestUpdateDownload:

    def call_fut(self, event):
        from .subscriber import update_asset_download
        return update_asset_download(event)

    def test_call(self, mocker, event, context, registry):
        from . import subscriber
        mock = mocker.patch.object(subscriber, 'add_metadata', autspec=True)
        self.call_fut(event)
        mock.assert_called_with(event.object, event.registry)


class TestUpdateImageDownload:

    def call_fut(self, event):
        from .subscriber import update_image_downloads
        return update_image_downloads(event)

    def test_call(self, mocker, event, context, registry):
        from . import subscriber
        mock = mocker.patch.object(subscriber, 'add_image_size_downloads')
        self.call_fut(event)
        assert mock.called_with(event.object, event.registry)


@fixture
def mock_commentable_sheet(event, registry, mock_sheet):
    event.registry = registry
    registry.content.get_sheet.return_value = mock_sheet
    mock_sheet.get.return_value = {'comments_count': 1}
    return mock_sheet


class TestIncreaseCommentsCount:

    def call_fut(self, *args):
        from .subscriber import increase_comments_count
        return increase_comments_count(*args)

    @fixture
    def mock_event(self):
        return Mock()

    @fixture
    def mock_update(self, mocker):
        from . import subscriber
        return mocker.patch.object(subscriber, 'update_comments_count')

    @fixture
    def mock_parent_version_sheet(self, mock_sheet, registry):
        registry.content.get_sheet.return_value = mock_sheet
        return mock_sheet

    def test_increase_when_first_version_created(self,
                                                 registry,
                                                 mock_event,
                                                 mock_update,
                                                 mock_parent_version_sheet):
        mock_comment_version = Mock()
        mock_event.reference.source = mock_comment_version
        mock_event.registry = registry
        mock_parent_version_sheet.get.return_value = {'FIRST': mock_comment_version}
        self.call_fut(mock_event)
        assert mock_update.called

    def test_no_increase_when_not_first_version_created(self, mock_event, mock_update):
        mock_comment_version = Mock()
        mock_event.reference.source = mock_comment_version
        self.call_fut(mock_event)
        assert not mock_update.called


class TestDecreaseCommentsCount:

    def call_fut(self, *args):
        from .subscriber import decrease_comments_count
        return decrease_comments_count(*args)

    @fixture
    def mock_event(self):
        return Mock()

    @fixture
    def mock_update(self, mocker):
        from . import subscriber
        return mocker.patch.object(subscriber, 'update_comments_count')

    @fixture
    def mock_parent_version_sheet(self, mock_sheet, registry):
        registry.content.get_sheet.return_value = mock_sheet
        return mock_sheet

    def test_decrease_when_first_version_deleted(self,
                                                registry,
                                                mock_event,
                                                mock_update,
                                                mock_parent_version_sheet):
        mock_comment_version = Mock()
        mock_event.reference.source = mock_comment_version
        mock_event.registry = registry
        mock_parent_version_sheet.get.return_value = {'FIRST': mock_comment_version}
        self.call_fut(mock_event)
        assert mock_update.called

    def test_no_decrease_when_not_first_version_deleted(self, mock_event, mock_update):
        mock_comment_version = Mock()
        mock_event.reference.source = mock_comment_version
        self.call_fut(mock_event)
        assert not mock_update.called


class TestUpdateCommentsCount:

    def call_fut(self, *args):
        from .subscriber import update_comments_count
        return update_comments_count(*args)

    def _make_resource(self, parent, iresource, registry):
        return registry.content.create(iresource.__identifier__,
                                       parent=parent,
                                       appstructs={},
                                       send_event=False,
                                       )

    def _get_comments_count(self, resource, registry):
        from adhocracy_core.sheets.comment import ICommentable
        comments_count = registry.content.get_sheet_field(resource,
                                                          ICommentable,
                                                          'comments_count')
        return comments_count

    def test_call(self, registry, pool_with_catalogs):
        from adhocracy_core.resources.comment import IComment
        from adhocracy_core.resources.comment import ICommentVersion
        from adhocracy_core.resources.comment import ICommentsService
        from adhocracy_core.resources.paragraph import IParagraphVersion
        from adhocracy_core.resources.document import IDocumentVersion
        from adhocracy_core.resources.rate import IRateVersion
        from adhocracy_core import sheets
        pool = pool_with_catalogs
        registry.content.create(ICommentsService.__identifier__,
                                parent=pool_with_catalogs)
        comments = pool['comments']
        comment = self._make_resource(comments, IComment, registry)
        comment1 = self._make_resource(comment, ICommentVersion, registry)
        comment2 = self._make_resource(comment, ICommentVersion, registry)
        comment3 = self._make_resource(comment, ICommentVersion, registry)
        non_commentable = self._make_resource(pool, IRateVersion, registry)
        sub_commentable = self._make_resource(pool, IParagraphVersion, registry)
        main_commentable = self._make_resource(pool, IDocumentVersion, registry)

        sheet = registry.content.get_sheet(main_commentable, sheets.document.IDocument)
        sheet.set({'elements': [sub_commentable]}, send_reference_event=False)
        sheet = registry.content.get_sheet(non_commentable, sheets.rate.IRate)
        sheet.set({'object': [sub_commentable]}, send_reference_event=False)

        sheet = registry.content.get_sheet(comment3, sheets.comment.IComment)
        sheet.set({'refers_to': sub_commentable}, send_reference_event=False)
        sheet = registry.content.get_sheet(comment2, sheets.comment.IComment)
        sheet.set({'refers_to': comment3}, send_reference_event=False)
        sheet = registry.content.get_sheet(comment1, sheets.comment.IComment)
        sheet.set({'refers_to': comment2}, send_reference_event=False)

        self.call_fut(comment1, 1, registry)
        self.call_fut(comment2, 1, registry)
        self.call_fut(comment3, 1, registry)

        assert self._get_comments_count(comment1, registry) == 0
        assert self._get_comments_count(comment2, registry) == 1
        assert self._get_comments_count(comment3, registry) == 2
        assert self._get_comments_count(sub_commentable, registry) == 3
        assert self._get_comments_count(main_commentable, registry) == 0


class TestUpdateCommentsCountAfterVisibilityChange:

    @fixture
    def mock_sheet(self, mock_sheet, registry):
        registry.content.get_sheet.return_value = mock_sheet
        return mock_sheet

    @fixture
    def mock_update(self, mocker):
        from . import subscriber
        return mocker.patch.object(subscriber, 'update_comments_count')

    def call_fut(self, *args):
        from .subscriber import update_comments_count_after_visibility_change
        return update_comments_count_after_visibility_change(*args)

    def test_ignore_if_visible(self, mocker, registry, event, mock_update, mock_sheet):
        from adhocracy_core.interfaces import VisibilityChange
        from . import subscriber
        event.registry = registry
        comment_v0 = testing.DummyResource()
        mock_sheet.get.side_effect = [{'FIRST': [comment_v0]}, {'comments_count': 1}]
        mock_visibility = mocker.patch.object(subscriber, 'get_visibility_change')
        mock_visibility.return_value = VisibilityChange.visible
        self.call_fut(event)
        assert not mock_update.called

    def test_decrease_count_if_consealed(self, mocker, registry, event,
                                         mock_update, mock_sheet):
        from adhocracy_core.interfaces import VisibilityChange
        from . import subscriber
        event.registry = registry
        comment_v0 = testing.DummyResource()
        mock_sheet.get.side_effect = [{'FIRST': [comment_v0]}, {'comments_count': 2}]
        mock_visibility = mocker.patch.object(subscriber, 'get_visibility_change')
        mock_visibility.return_value = VisibilityChange.concealed
        self.call_fut(event)
        assert mock_update.called_with(comment_v0, -3, event.registry)

    def test_increase_count_if_revealed(self, mocker, registry, event,
                                        mock_update, mock_sheet):
        from adhocracy_core.interfaces import VisibilityChange
        from . import subscriber
        event.registry = registry
        comment_v0 = testing.DummyResource()
        mock_sheet.get.side_effect = [{'FIRST': [comment_v0]}, {'comments_count': 2}]
        mock_visibility = mocker.patch.object(subscriber, 'get_visibility_change')
        mock_visibility.return_value = VisibilityChange.revealed
        self.call_fut(event)
        assert mock_update.called_with(comment_v0, 3, event.registry)


class TestDownloadPictureForVersion:

    @fixture
    def event(self, event, version, registry):
        event.registry = registry
        event.new_version = version
        return event

    def call_fut(self, *args):
        from .subscriber import download_external_picture_for_version
        return download_external_picture_for_version(*args)


    def test_call_download_picture_url(self, event, mock_download, registry,
                                       mock_sheet):
        from copy import deepcopy
        old_sheet = mock_sheet
        old_sheet.get.return_value = {'external_picture_url': 'old_url'}
        new_sheet = deepcopy(mock_sheet)
        new_sheet.get.return_value = {'external_picture_url': 'new_url'}
        registry.content.get_sheet.side_effect = (old_sheet, new_sheet)
        self.call_fut(event)
        mock_download.assert_called_with(event.new_version, 'old_url',
                                         'new_url', registry)


class TestDownloadPictureForCreated:

    @fixture
    def event(self, event, registry):
        event.registry = registry
        return event

    def call_fut(self, *args):
        from .subscriber import download_external_picture_for_created
        return download_external_picture_for_created(*args)

    def test_ignore_if_context_is_versionable(self, event, version,
                                              mock_download):
        event.object = version
        self.call_fut(event)
        assert not mock_download.called

    def test_call_download_picture_url(self, event, mock_download, registry,
                                       mock_sheet):
        mock_sheet.get.return_value = {'external_picture_url': 'new_url'}
        registry.content.get_sheet.return_value = mock_sheet
        self.call_fut(event)
        mock_download.assert_called_with(event.object, '',
                                         'new_url', registry)


class TestDownloadPictureForEdited:

    @fixture
    def event(self, event, registry):
        event.registry = registry
        return event

    def call_fut(self, *args):
        from .subscriber import download_external_picture_for_edited
        return download_external_picture_for_edited(*args)

    def test_call_download_picture_url(self, event, mock_download, registry):
        event.old_appstruct = {'external_picture_url': 'old_url'}
        event.new_appstruct = {'external_picture_url': 'new_url'}
        self.call_fut(event)
        mock_download.assert_called_with(event.object, 'old_url',
                                         'new_url', registry)

    def test_call_download_picture_url_with_empty_string_if_not_set(
            self, event, mock_download, registry):
        event.old_appstruct = {}
        event.new_appstruct = {}
        self.call_fut(event)
        mock_download.assert_called_with(event.object, '',
                                         '', registry)



class TestDownloadExternalPictureUrl:

    def call_fut(self, *args):
        from .subscriber import _download_picture_url
        return _download_picture_url(*args)

    def test_ignore_if_picture_url_not_changed(self, context, registry):
        old_url = 'http://x'
        new_url = 'http://x'
        self.call_fut(context, old_url, new_url, registry)
        assert not registry.content.create.called

    def test_remove_picture_reference_if_picture_url_changed_to_empty(
            self, context, registry, mock_sheet):
        registry.content.get_sheet.return_value = mock_sheet
        old_url = 'http://x'
        new_url = ''
        self.call_fut(context, old_url, new_url, registry)
        mock_sheet.set.assert_called_with({'picture': None}, send_event=False)

    def test_download_picture_url_and_reference_if_picture_url_changed(
            self, context, registry, mock_sheet, mocker):
        from adhocracy_core.sheets.asset import IAssetData
        from .image import IImage
        image = Mock()
        file = mocker.patch('adhocracy_core.resources.subscriber.'
                            'File').return_value
        assets = mocker.patch('adhocracy_core.resources.subscriber.'
                              'find_service').return_value
        registry.content.create.return_value = image
        registry.content.get_sheet.return_value = mock_sheet
        resp = Mock(content=b'sdfsdf', headers={'Content-Length': 11})
        mocker.patch('requests.get', return_value=resp)

        old_url = ''
        new_url = 'http://x'
        self.call_fut(context, old_url, new_url, registry)

        assert file.size == 11
        registry.content.create.assert_called_with(
            IImage.__identifier__,
            parent=assets,
            registry=registry,
            appstructs={IAssetData.__identifier__: {'data': file}})
        mock_sheet.set.assert_called_with({'picture': image}, send_event=False)


@mark.usefixtures('integration')
def test_register_subscriber(registry):
    from adhocracy_core.resources import subscriber
    from adhocracy_core.authorization import set_acms_for_app_root
    handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
    assert subscriber.autoupdate_non_versionable_has_new_version.__name__ in handlers
    assert subscriber.autoupdate_versionable_has_new_version.__name__ in handlers
    assert subscriber.add_default_group_to_user.__name__ in handlers
    assert subscriber.update_modification_date_modified_by.__name__ in handlers
    assert subscriber.send_password_reset_mail.__name__ in handlers
    assert subscriber.send_activation_mail_or_activate_user.__name__ in handlers
    assert subscriber.update_asset_download.__name__ in handlers
    assert subscriber.update_image_downloads.__name__ in handlers
    assert subscriber.decrease_comments_count.__name__ in handlers
    assert subscriber.increase_comments_count.__name__ in handlers
    assert subscriber.update_comments_count_after_visibility_change.__name__ in handlers
    assert set_acms_for_app_root.__name__ in handlers
    assert subscriber.download_external_picture_for_created.__name__ in handlers
    assert subscriber.download_external_picture_for_version.__name__ in handlers
    assert subscriber.download_external_picture_for_edited.__name__ in handlers


