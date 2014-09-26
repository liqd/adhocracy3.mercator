"""Subscriber to track changed resources during one transaction."""
from collections import defaultdict
from collections import Sequence

from pyramid.registry import Registry
from pyramid.traversal import resource_path

from adhocracy_core.interfaces import ChangelogMetadata
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.interfaces import IResourceSheetModified
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IItemVersionNewVersionAdded
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import ISheetReferencedItemHasNewVersion
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.utils import find_graph
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_iresource
from adhocracy_core.utils import get_all_sheets


changelog_metadata = ChangelogMetadata(False, False, None, None)


def resource_created_and_added_subscriber(event):
    """Add created message to the transaction_changelog."""
    _add_changelog_metadata(event.registry, event.object, created=True)


def resource_modified_subscriber(event):
    """Add modified message to the transaction_changelog."""
    _add_changelog_metadata(event.registry, event.object, modified=True)


def itemversion_created_subscriber(event):
    """Add new follwed_by version to the transaction_changelog."""
    if event.new_version is None:
        return
    _add_changelog_metadata(event.registry, event.object,
                            followed_by=event.new_version)


def _add_changelog_metadata(registry: Registry, resource: IResource, **kwargs):
    """Add changelog metadata `kwargs` to the transaction changelog."""
    changelog = registry._transaction_changelog
    path = resource_path(resource)
    metadata = changelog[path]
    changelog[path] = metadata._replace(resource=resource, **kwargs)


def create_transaction_changelog():
    """Return dict that maps resource path to :class:`ChangelogMetadata`."""
    metadata = lambda: changelog_metadata
    return defaultdict(metadata)


def clear_transaction_changelog_after_commit_hook(success: bool,
                                                  registry: Registry):
    """Delete all entries in the transaction changelog."""
    changelog = getattr(registry, '_transaction_changelog', dict())
    changelog.clear()


def reference_has_new_version_subscriber(event):
    """Auto updated resource if a referenced Item has a new version."""
    resource = event.object
    root_versions = event.root_versions
    isheet = event.isheet
    registry = event.registry
    creator = event.creator
    sheet = get_sheet(resource, isheet)
    autoupdate = isheet.extends(ISheetReferenceAutoUpdateMarker)
    editable = sheet.meta.editable

    if autoupdate and editable:
        appstruct = sheet.get()
        field = appstruct[event.isheet_field]
        if isinstance(field, Sequence):
            old_version_index = field.index(event.old_version)
            field.pop(old_version_index)
            field.insert(old_version_index, event.new_version)
        else:
            appstruct[event.isheet_field] = event.new_version
        new_version = _get_new_version_created_in_this_transaction(registry,
                                                                   resource)
        if IItemVersion.providedBy(resource) and new_version is None:
            _update_versionable(resource, isheet, appstruct, root_versions,
                                registry, creator)
        else:
            sheet.set(appstruct)


def _get_new_version_created_in_this_transaction(registry,
                                                 resource) -> IResource:
        if not hasattr(registry, '_transaction_changelog'):
            return
        path = resource_path(resource)
        changelog_metadata = registry._transaction_changelog[path]
        return changelog_metadata.followed_by


def _update_versionable(resource, isheet, appstruct, root_versions, registry,
                        creator) -> IResource:
    graph = find_graph(resource)
    if root_versions and not graph.is_in_subtree(resource, root_versions):
        return resource
    else:
        appstructs = _get_writable_appstructs(resource)
        appstructs[IVersionable.__identifier__]['follows'] = [resource]
        appstructs[isheet.__identifier__] = appstruct
        iresource = get_iresource(resource)
        new_resource = registry.content.create(iresource.__identifier__,
                                               parent=resource.__parent__,
                                               appstructs=appstructs,
                                               creator=creator,
                                               options=root_versions)
        return new_resource


def _get_writable_appstructs(resource) -> dict:
    # FIXME maybe move this to utils or better use resource registry
    appstructs = {}
    for sheet in get_all_sheets(resource):
        editable = sheet.meta.editable
        creatable = sheet.meta.creatable
        writable = editable or creatable
        if writable:
            appstructs[sheet.meta.isheet.__identifier__] = sheet.get()
    return appstructs


def includeme(config):
    """Add transaction changelog to the registry and register subscribers."""
    changelog = create_transaction_changelog()
    config.registry._transaction_changelog = changelog
    config.add_subscriber(resource_created_and_added_subscriber,
                          IResourceCreatedAndAdded)
    config.add_subscriber(resource_modified_subscriber,
                          IResourceSheetModified)
    config.add_subscriber(itemversion_created_subscriber,
                          IItemVersionNewVersionAdded)
    config.add_subscriber(reference_has_new_version_subscriber,
                          ISheetReferencedItemHasNewVersion,
                          isheet=ISheetReferenceAutoUpdateMarker)
