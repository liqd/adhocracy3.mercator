"""Reindex subscribers.

Read :mod:`substanced.catalog.subscribers` for default reindex subscribers.
"""

from substanced.util import find_service

from adhocracy_core.utils import get_visibility_change
from adhocracy_core.interfaces import VisibilityChange
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IResourceSheetModified
from adhocracy_core.interfaces import ISheetBackReferenceModified
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.interfaces import IItem
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.sheets.badge import IBadgeAssignment
from adhocracy_core.sheets.badge import IBadgeable
from adhocracy_core.utils import list_resource_with_descendants
from adhocracy_core.utils import get_sheet_field


def reindex_tag(event):
    """Reindex tag index if a tag backreference is modified."""
    catalogs = find_service(event.object, 'catalogs')
    catalogs.reindex_index(event.object, 'tag')


def reindex_rates(event):
    """Reindex the rates index if a rate backreference is modified."""
    catalogs = find_service(event.object, 'catalogs')
    catalogs.reindex_index(event.object, 'rates')


def reindex_badge(event):
    """Reindex badge index if a backreference is modified/created."""
    # TODO we cannot listen to the backreference modified event of the
    # IBadgeable sheet here, because this event is send before the
    # IBadgeAssignment fields 'subject' and 'badge' are properly stored.
    catalogs = find_service(event.object, 'catalogs')
    badgeable = get_sheet_field(event.object, IBadgeAssignment, 'object',
                                registry=event.registry)
    catalogs.reindex_index(badgeable, 'badge')


def reindex_visibility(event):
    """Reindex the private_visibility index for all descendants if modified."""
    visibility = get_visibility_change(event)
    if visibility in (VisibilityChange.concealed, VisibilityChange.revealed):
        _reindex_resource_and_descendants(event.object)


def _reindex_resource_and_descendants(resource: IResource):
    catalogs = find_service(resource, 'catalogs')
    if catalogs is None:  # ease testing
        return
    resource_and_descendants = list_resource_with_descendants(resource)
    for res in resource_and_descendants:
        catalogs.reindex_index(res, 'private_visibility')


def reindex_item_badge(event):
    """Reindex `item_badge` for all item versions of èvent.object."""
    catalogs = find_service(event.object, 'catalogs')
    children = event.object.values()
    versionables = (c for c in children if IVersionable.providedBy(c))
    for versionable in versionables:
        catalogs.reindex_index(versionable, 'item_badge')


def includeme(config):
    """Register index subscribers."""
    config.add_subscriber(reindex_tag,
                          ISheetBackReferenceModified,
                          object_iface=IVersionable)
    config.add_subscriber(reindex_visibility,
                          IResourceSheetModified,
                          event_isheet=IMetadata)
    config.add_subscriber(reindex_rates,
                          ISheetBackReferenceModified,
                          event_isheet=IRateable)
    config.add_subscriber(reindex_badge,
                          IResourceSheetModified,
                          event_isheet=IBadgeAssignment)
    config.add_subscriber(reindex_badge,
                          IResourceCreatedAndAdded,
                          object_iface=IBadgeAssignment)
    config.add_subscriber(reindex_item_badge,
                          ISheetBackReferenceModified,
                          object_iface=IItem,
                          event_isheet=IBadgeable)
    # add subscriber to updated allowed index
    config.scan('substanced.objectmap.subscribers')
