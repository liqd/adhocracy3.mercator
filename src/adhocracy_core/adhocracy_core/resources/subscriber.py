"""Autoupdate resources."""

from collections import Sequence
from logging import getLogger

from pyramid.registry import Registry
from substanced.util import find_service

from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import ISimple
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import ISheetReferenceNewVersion
from adhocracy_core.interfaces import IResourceSheetModified
from adhocracy_core.resources.principal import IGroup
from adhocracy_core.resources.principal import IUser
from adhocracy_core.sheets.principal import IPermissions
from adhocracy_core.exceptions import AutoUpdateNoForkAllowedError
from adhocracy_core.utils import find_graph
from adhocracy_core.utils import get_following_new_version
from adhocracy_core.utils import get_last_new_version
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_sheet_field
from adhocracy_core.utils import get_iresource
from adhocracy_core.utils import get_last_version
from adhocracy_core.utils import get_modification_date
from adhocracy_core.utils import get_user
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.sheets.metadata import IMetadata


logger = getLogger(__name__)


def update_modification_date_modified_by(event):
    """Update the IMetadata fields `modified_by` and `modification_date`."""
    sheet = get_sheet(event.object, IMetadata, registry=event.registry)
    request = event.request
    appstruct = {}
    appstruct['modification_date'] = get_modification_date(event.registry)
    if request is not None:
        appstruct['modified_by'] = get_user(request)
    sheet.set(appstruct,
              send_event=False,
              registry=event.registry,
              request=request,
              omit_readonly=False,
              )


def user_created_and_added_subscriber(event):
    """Add default group to user."""
    group = _get_default_group(event.object)
    if group is None:  # ease testing,
        return
    _add_user_to_group(event.object, group, event.registry)


def _get_default_group(context) -> IGroup:
    groups = find_service(context, 'principals', 'groups')
    if groups is None:  # ease testing
        return
    default_group = groups.get('authenticated', None)
    return default_group


def _add_user_to_group(user: IUser, group: IGroup, registry: Registry):
    sheet = get_sheet(user, IPermissions)
    groups = sheet.get()['groups']
    groups.append(group)
    sheet.set({'groups': groups}, registry=registry)


def autoupdate_versionable_has_new_version(event):
    """Auto updated versionable resource if a reference has new version.

    :raises AutoUpdateNoForkAllowedError: if a fork is created but not allowed
    """
    if not _is_in_root_version_subtree(event):
        return
    sheet = get_sheet(event.object, event.isheet, event.registry)
    if not sheet.meta.editable:
        return
    appstruct = _get_updated_appstruct(event, sheet)
    new_version = _get_last_version_created_in_transaction(event)
    if new_version is None:
        if _new_version_needed_and_not_forking(event):
            _create_new_version(event, appstruct)
    else:
        new_version_sheet = get_sheet(new_version, event.isheet,
                                      event.registry)
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
        new_version = get_last_new_version(event.registry, event.object)
    else:
        new_version = get_following_new_version(event.registry, event.object)
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
    last = get_last_version(event.object, event.registry)
    if last is None or last is event.object:
        return True
    value = get_sheet_field(event.object, event.isheet, event.isheet_field,
                            event.registry)
    last_value = get_sheet_field(last, event.isheet, event.isheet_field,
                                 event.registry)
    if last_value == value:
        return False
    else:
        raise AutoUpdateNoForkAllowedError(event.object, event)


def _create_new_version(event, appstruct) -> IResource:
    appstructs = _get_writable_appstructs(event.object, event.registry)
    appstructs[IVersionable.__identifier__]['follows'] = [event.object]
    appstructs[event.isheet.__identifier__] = appstruct
    registry = event.registry
    iresource = get_iresource(event.object)
    new_version = registry.content.create(iresource.__identifier__,
                                          parent=event.object.__parent__,
                                          appstructs=appstructs,
                                          creator=event.creator,
                                          registry=event.registry,
                                          root_versions=event.root_versions,
                                          is_batchmode=event.is_batchmode,
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
    sheet = get_sheet(event.object, event.isheet, event.registry)
    if not sheet.meta.editable:
        return
    appstruct = _get_updated_appstruct(event, sheet)
    sheet.set(appstruct)


def includeme(config):
    """Register subscribers."""
    config.add_subscriber(autoupdate_versionable_has_new_version,
                          ISheetReferenceNewVersion,
                          interface=IItemVersion,
                          isheet=ISheetReferenceAutoUpdateMarker)
    config.add_subscriber(autoupdate_non_versionable_has_new_version,
                          ISheetReferenceNewVersion,
                          interface=IPool,
                          isheet=ISheetReferenceAutoUpdateMarker)
    config.add_subscriber(autoupdate_non_versionable_has_new_version,
                          ISheetReferenceNewVersion,
                          interface=ISimple,
                          isheet=ISheetReferenceAutoUpdateMarker)
    config.add_subscriber(user_created_and_added_subscriber,
                          IResourceCreatedAndAdded,
                          interface=IUser)
    config.add_subscriber(update_modification_date_modified_by,
                          IResourceSheetModified,
                          isheet=IMetadata)
