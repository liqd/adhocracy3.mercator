"""Reindex subscribers.

Read :mod:`substanced.catalog.subscribers` for default reindex subscribers.
"""

from substanced.util import find_catalog

from adhocracy_core.utils import get_visibility_change
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.interfaces import VisibilityChange
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IResourceSheetModified
from adhocracy_core.interfaces import ISheetReferenceModified
from adhocracy_core.sheets.tags import ITag
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.utils import list_resource_with_descendants


def reindex_tagged(event):
    """Reindex tagged Itemversions subscriber."""
    # FIXME use ISheetBackReferenceModified subscriber instead
    adhocracy_catalog = find_catalog(event.object, 'adhocracy')
    old_elements_set = set(event.old_appstruct['elements'])
    new_elements_set = set(event.new_appstruct['elements'])
    newly_tagged_or_untagged_resources = old_elements_set ^ new_elements_set
    for tagged in newly_tagged_or_untagged_resources:
            adhocracy_catalog.reindex_resource(tagged)


def reindex_rate(event):
    """Reindex the rates index if a rate backreference is modified."""
    adhocracy_catalog = find_catalog(event.object, 'adhocracy')
    adhocracy_catalog.reindex_resource(event.object)


def reindex_visibility(event):
    """Reindex the private_visibility index for all descendants if modified."""
    visibility = get_visibility_change(event)
    if visibility in (VisibilityChange.concealed, VisibilityChange.revealed):
        _reindex_resource_and_descendants(event.object)


def _reindex_resource_and_descendants(resource: IResource):
    adhocracy_catalog = find_catalog(resource, 'adhocracy')
    if adhocracy_catalog is None:
        return  # ease testing
    resource_and_descendants = list_resource_with_descendants(resource)
    for res in resource_and_descendants:
        adhocracy_catalog.reindex_resource(res)


def includeme(config):
    """Register index subscribers."""
    config.add_subscriber(reindex_tagged,
                          IResourceCreatedAndAdded,
                          isheet=ITag)
    config.add_subscriber(reindex_tagged,
                          IResourceSheetModified,
                          isheet=ITag)
    config.add_subscriber(reindex_visibility,
                          IResourceSheetModified,
                          isheet=IMetadata)
    config.add_subscriber(reindex_rate,
                          ISheetReferenceModified,
                          isheet=IRateable)
