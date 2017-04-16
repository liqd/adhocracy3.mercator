"""Autoupdate resources."""
from base64 import b64encode
from collections import Sequence
from io import BytesIO
from logging import getLogger
from os import urandom
import requests

from pyramid.interfaces import IApplicationCreated
from pyramid.registry import Registry
from pyramid.request import Request
from pyramid.traversal import find_interface
from pyramid.i18n import get_localizer
from pyramid.i18n import TranslationStringFactory
from substanced.util import find_service
from substanced.file import File
from substanced.file import USE_MAGIC

from adhocracy_core.activity import generate_activity_description
from adhocracy_core.authorization import set_acms_for_app_root
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import ISimple
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IActivitiesGenerated
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import ISheetReferenceNewVersion
from adhocracy_core.interfaces import IItemVersionNewVersionAdded
from adhocracy_core.interfaces import IResourceSheetModified
from adhocracy_core.interfaces import DEFAULT_USER_GROUP_NAME
from adhocracy_core.resources.activity import IActivity
from adhocracy_core.resources.principal import IGroup
from adhocracy_core.resources.principal import IUser
from adhocracy_core.resources.principal import IPasswordReset
from adhocracy_core.resources.asset import add_metadata
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.resources.image import add_image_size_downloads
from adhocracy_core.resources.image import IImage
from adhocracy_core.sheets.principal import IPermissions
from adhocracy_core.sheets.tags import ITags
from adhocracy_core.exceptions import AutoUpdateNoForkAllowedError
from adhocracy_core.utils import find_graph
from adhocracy_core.utils import get_changelog_metadata
from adhocracy_core.utils import get_iresource
from adhocracy_core.utils import get_modification_date
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.asset import IAssetData
from adhocracy_core.sheets.image import IImageReference
from adhocracy_core.sheets.principal import IActivationConfiguration
from adhocracy_core.sheets.principal import IPasswordAuthentication
from adhocracy_core.sheets.principal import IEmailNew

import adhocracy_core.sheets.activity

logger = getLogger(__name__)

_ = TranslationStringFactory('adhocracy')


def update_modification_date_modified_by(event):
    """Update the IMetadata fields `modified_by` and `modification_date`."""
    sheet = event.registry.content.get_sheet(event.object, IMetadata,
                                             request=event.request)
    appstruct = {}
    appstruct['modification_date'] = get_modification_date(event.registry)
    if event.request is not None:
        appstruct['modified_by'] = event.request.user
    sheet.set(appstruct,
              send_event=False,
              omit_readonly=False,
              )


def add_default_group_to_user(event):
    """Add default group to user if no group is set."""
    group = _get_default_group(event.object)
    if group is None:
        return
    user_groups = _get_user_groups(event.object, event.registry)
    if user_groups:
        return None
    _add_user_to_group(event.object, group, event.registry)


def _get_default_group(context) -> IGroup:
    groups = find_service(context, 'principals', 'groups')
    default_group = groups.get(DEFAULT_USER_GROUP_NAME, None)
    return default_group


def _get_user_groups(user: IUser, registry: Registry):
    from pyramid.traversal import resource_path
    from adhocracy_core.interfaces import IRolesUserLocator
    request = Request.blank('/')
    request.registry = registry
    locator = registry.getMultiAdapter((user, request), IRolesUserLocator)
    user_id = resource_path(user)
    groups = locator.get_groups(user_id)
    return groups


def _add_user_to_group(user: IUser, group: IGroup, registry: Registry):
    sheet = registry.content.get_sheet(user, IPermissions)
    groups = sheet.get()['groups']
    groups = groups + [group]
    sheet.set({'groups': groups})


def autoupdate_versionable_has_new_version(event):
    """Auto updated versionable resource if a reference has new version.

    :raises AutoUpdateNoForkAllowedError: if a fork is created but not allowed
    """
    if not _is_in_root_version_subtree(event):
        return
    sheet = event.registry.content.get_sheet(event.object, event.isheet)
    if not sheet.meta.editable:
        return
    appstruct = _get_updated_appstruct(event, sheet)
    new_version = _get_last_version_created_in_transaction(event)
    if new_version is None:
        if _new_version_needed_and_not_forking(event):
            _create_new_version(event, appstruct)
    else:
        new_version_sheet = event.registry.content.get_sheet(new_version,
                                                             event.isheet)
        new_version_sheet.set(appstruct)


def _is_in_root_version_subtree(event: ISheetReferenceNewVersion) -> bool:
    if event.root_versions == []:
        return True
    graph = find_graph(event.object)
    return graph.is_in_subtree(event.object, event.root_versions)


def _get_updated_appstruct(event: ISheetReferenceNewVersion,
                           sheet: ISheet) -> dict:
    appstruct = sheet.get()
    field = appstruct[event.isheet_field]
    if isinstance(field, Sequence):
        old_version_index = field.index(event.old_version)
        field.pop(old_version_index)
        field.insert(old_version_index, event.new_version)
    else:
        appstruct[event.isheet_field] = event.new_version
    return appstruct


def _get_last_version_created_in_transaction(event: ISheetReferenceNewVersion)\
        -> IItemVersion:
    if event.is_batchmode:
        item = find_interface(event.object, IItem)
        changelog = get_changelog_metadata(item, event.registry)
        new_version = changelog.last_version
    else:
        changelog = get_changelog_metadata(event.object, event.registry)
        if changelog.created:
            new_version = event.object
        else:
            new_version = changelog.followed_by
    return new_version


def _new_version_needed_and_not_forking(event: ISheetReferenceNewVersion)\
        -> bool:
    """Check whether to autoupdate if resource is non-forkable.

    If the given resource is the last version or there's no last version yet,
    do autoupdate.

    If it's not the last version, but references the same object (namely the
    one which caused the autoupdate), don't update.

    If it's not the last version, but references a different object,
    throw an AutoUpdateNoForkAllowedError. This should only happen in batch
    requests.
    """
    last = _get_last_version(event.object, event.registry)
    if last is None or last is event.object:
        return True
    value = event.registry.content.get_sheet_field(event.object,
                                                   event.isheet,
                                                   event.isheet_field)
    last_value = event.registry.content.get_sheet_field(last,
                                                        event.isheet,
                                                        event.isheet_field)
    if last_value == value:
        return False
    else:
        raise AutoUpdateNoForkAllowedError(event.object, event)


def _get_last_version(resource: IItemVersion,
                      registry: Registry) -> IItemVersion:
    """Get last version of  resource' according to the last tag."""
    item = find_interface(resource, IItem)
    last = registry.content.get_sheet_field(item, ITags, 'LAST')
    return last


def _create_new_version(event, appstruct) -> IResource:
    appstructs = _get_writable_appstructs(event.object, event.registry)
    appstructs[IVersionable.__identifier__]['follows'] = [event.object]
    appstructs[event.isheet.__identifier__] = appstruct
    registry = event.registry
    iresource = get_iresource(event.object)
    creator = get_sheet(event.object, IMetadata, registry).get()['creator']
    new_version = registry.content.create(iresource.__identifier__,
                                          parent=event.object.__parent__,
                                          appstructs=appstructs,
                                          creator=creator,
                                          registry=event.registry,
                                          root_versions=event.root_versions,
                                          is_batchmode=event.is_batchmode,
                                          autoupdated=True,
                                          )
    return new_version


def _get_writable_appstructs(resource, registry) -> dict:
    appstructs = {}
    sheets = registry.content.get_sheets_all(resource)
    for sheet in sheets:
        editable = sheet.meta.editable
        creatable = sheet.meta.creatable
        if editable or creatable:  # pragma: no branch
            appstructs[sheet.meta.isheet.__identifier__] = sheet.get()
    return appstructs


def autoupdate_non_versionable_has_new_version(event):
    """Auto update non versionable resources if a reference has new version."""
    if not _is_in_root_version_subtree(event):
        return
    sheet = event.registry.content.get_sheet(event.object, event.isheet)
    if not sheet.meta.editable:
        return
    appstruct = _get_updated_appstruct(event, sheet)
    sheet.set(appstruct, autoupdated=True)


def send_password_reset_mail(event):
    """Send mail with reset password link if a reset resource is created."""
    user = event.registry.content.get_sheet_field(event.object,
                                                  IMetadata,
                                                  'creator')
    password_reset = event.object
    event.registry.messenger.send_password_reset_mail(user, password_reset)


def send_password_change_mail(event):
    """Send mail notification when password has changed."""
    user = event.registry.content.get_sheet_field(event.object,
                                                  IMetadata,
                                                  'creator')
    event.registry.messenger.send_password_change_mail(user)


def apply_user_activation_configuration(event):
    """Activate user or send activation or invite email."""
    user = event.object
    registry = event.registry
    sheet = registry.content.get_sheet(user, IActivationConfiguration)
    activation_config = sheet.get()['activation']
    if activation_config == 'direct':
        user.activate()
    elif activation_config == 'registration_mail':
        _send_activation_mail(user, registry)
    elif activation_config == 'invitation_mail':  # pragma: no branch
        _send_invitation_mail(user, registry)


def _send_activation_mail(user, registry):
    activation_path = _generate_activation_path()
    user.activation_path = activation_path
    messenger = getattr(registry, 'messenger', None)
    if messenger is not None:  # ease testing
        messenger.send_registration_mail(user, activation_path)


def _generate_activation_path() -> str:
    random_bytes = urandom(18)
    # TODO: not DRY, .resources.generate_name does almost the same
    # We use '+_' as altchars since both are reliably recognized in URLs,
    # even if they occur at the end. Conversely, '-' at the end of URLs is
    # not recognized as part of the URL by some programs such as Thunderbird,
    # and '/' might cause problems as well, especially if it occurs multiple
    # times in a row.
    return '/activate/' + b64encode(random_bytes, altchars=b'+_').decode()


def _send_invitation_mail(user, registry):
    resets = find_service(user, 'principals', 'resets')
    reset = registry.content.create(IPasswordReset.__identifier__,
                                    resets,
                                    creator=user,
                                    send_event=False,
                                    )
    messenger = getattr(registry, 'messenger', None)
    if messenger is not None:  # ease testing
        messenger.send_invitation_mail(user, reset)


def send_new_user_email_activation(event):
    """Send new email address activation email."""
    registry = event.registry
    user = event.object
    new_email = registry.content.get_sheet_field(user, IEmailNew, 'email')
    if new_email:
        activation_path = _generate_activation_path()
        user.activation_path = activation_path
        messenger = getattr(registry, 'messenger', None)
        messenger.send_new_email_activation_mail(user,
                                                 activation_path, new_email)


def update_asset_download(event):
    """Update asset download."""
    add_metadata(event.object, event.registry)


def update_image_downloads(event):
    """Update image downloads."""
    add_image_size_downloads(event.object, event.registry)


def download_external_picture_for_created(event: IResourceCreatedAndAdded):
    """Download external_picture_url for new resources."""
    if IItemVersion.providedBy(event.object):
        return  # download_external_picture_for_version takes care for it
    registry = event.registry
    new_url = registry.content.get_sheet_field(event.object,
                                               IImageReference,
                                               'external_picture_url')
    _download_picture_url(event.object, '', new_url, registry)


def download_external_picture_for_version(event: IItemVersionNewVersionAdded):
    """Download external_picture_url for new item versions."""
    registry = event.registry
    old_url = registry.content.get_sheet_field(event.object, IImageReference,
                                               'external_picture_url')
    new_url = registry.content.get_sheet_field(event.new_version,
                                               IImageReference,
                                               'external_picture_url')
    _download_picture_url(event.new_version, old_url, new_url, registry)


def download_external_picture_for_edited(event: IResourceSheetModified):
    """Download external_picture_url for edited resources."""
    old_url = event.old_appstruct.get('external_picture_url', '')
    new_url = event.new_appstruct.get('external_picture_url', '')
    _download_picture_url(event.object, old_url, new_url, event.registry)


def _download_picture_url(context: IImageReference,
                          old_url: str,
                          new_url: str,
                          registry: Registry):
    if old_url == new_url:
        return
    elif new_url == '':
        _set_picture_reference(context, None, registry)
    else:
        file = _download(new_url)
        image = _create_image(context, file, registry)
        _set_picture_reference(context, image, registry)


def _set_picture_reference(context: IResource,
                           value: IImage,
                           registry: Registry):
    sheet = registry.content.get_sheet(context, IImageReference)
    sheet.set({'picture': value}, send_event=False)


def _download(url: str) -> File:
    resp = requests.get(url, timeout=5)
    content = BytesIO(resp.content)
    file = File(stream=content,
                mimetype=USE_MAGIC)
    file.size = resp.headers['Content-Length']
    return file


def _create_image(context: IResource,
                  file: File,
                  registry: Registry) -> IImage:
    assets = find_service(context, 'assets')
    appstructs = {IAssetData.__identifier__: {'data': file}}
    image = registry.content.create(IImage.__identifier__,
                                    parent=assets,
                                    appstructs=appstructs,
                                    registry=registry,
                                    )
    return image


def add_activities_to_activity_stream(event: IActivitiesGenerated):
    """Add activity resources to activity_stream."""
    request = event.request
    settings = request.registry['config']
    activity_stream_enabled = settings.adhocracy.activity_stream.enabled
    if not activity_stream_enabled:
        return
    activities = event.activities
    service = find_service(request.root, 'activity_stream')
    translate = get_localizer(request).translate
    for activity in activities:
        description = generate_activity_description(activity, request)
        description_full = translate(description)
        appstructs = {
            adhocracy_core.sheets.activity.IActivity.__identifier__: {
                'subject': activity.subject,
                'type': activity.type.value,
                'object': activity.object,
                'target': activity.target,
                'name': description_full,
                'published': activity.published,
            }
        }
        request.registry.content.create(IActivity.__identifier__,
                                        appstructs=appstructs,
                                        parent=service,
                                        registry=request.registry)


def includeme(config):
    """Register subscribers."""
    config.add_subscriber(set_acms_for_app_root, IApplicationCreated)
    config.add_subscriber(autoupdate_versionable_has_new_version,
                          ISheetReferenceNewVersion,
                          object_iface=IItemVersion,
                          event_isheet=ISheetReferenceAutoUpdateMarker)
    config.add_subscriber(autoupdate_non_versionable_has_new_version,
                          ISheetReferenceNewVersion,
                          object_iface=IPool,
                          event_isheet=ISheetReferenceAutoUpdateMarker)
    config.add_subscriber(autoupdate_non_versionable_has_new_version,
                          ISheetReferenceNewVersion,
                          object_iface=ISimple,
                          event_isheet=ISheetReferenceAutoUpdateMarker)
    config.add_subscriber(add_default_group_to_user,
                          IResourceCreatedAndAdded,
                          object_iface=IUser)
    config.add_subscriber(apply_user_activation_configuration,
                          IResourceCreatedAndAdded,
                          object_iface=IUser)
    config.add_subscriber(send_new_user_email_activation,
                          IResourceSheetModified,
                          event_isheet=IEmailNew)
    config.add_subscriber(update_modification_date_modified_by,
                          IResourceSheetModified,
                          object_iface=IMetadata)
    config.add_subscriber(send_password_reset_mail,
                          IResourceCreatedAndAdded,
                          object_iface=IPasswordReset)
    config.add_subscriber(send_password_change_mail,
                          IResourceSheetModified,
                          event_isheet=IPasswordAuthentication)
    config.add_subscriber(update_asset_download,
                          IResourceSheetModified,
                          object_iface=IAsset,
                          event_isheet=IAssetData)
    config.add_subscriber(update_image_downloads,
                          IResourceSheetModified,
                          object_iface=IImage,
                          event_isheet=IAssetData)
    config.add_subscriber(download_external_picture_for_created,
                          IResourceCreatedAndAdded,
                          object_iface=IImageReference)
    config.add_subscriber(download_external_picture_for_version,
                          IItemVersionNewVersionAdded,
                          object_iface=IImageReference)
    config.add_subscriber(download_external_picture_for_edited,
                          IResourceSheetModified,
                          event_isheet=IImageReference)
    config.add_subscriber(add_activities_to_activity_stream,
                          IActivitiesGenerated)
