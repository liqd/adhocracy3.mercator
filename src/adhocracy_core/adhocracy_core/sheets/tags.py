"""Sheets for tagging."""
from collections.abc import Iterable
from logging import getLogger

from pyramid.traversal import resource_path
from substanced.util import find_catalog
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.sheets import GenericResourceSheet
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.sheets.pool import PoolSheet
from adhocracy_core.schema import UniqueReferences
from adhocracy_core.utils import find_graph


logger = getLogger(__name__)


class ITag(ISheet):

    """Marker interface for the tag sheet."""


class TagElementsReference(SheetToSheet):

    """Tag sheet elements reference."""

    source_isheet = ITag
    source_isheet_field = 'elements'
    target_isheet = IVersionable


class TagSchema(colander.MappingSchema):

    """Tag sheet data structure.

    `elements`: Resources with this Tag
    """

    elements = UniqueReferences(reftype=TagElementsReference)


class TagSheet(GenericResourceSheet):

    """Resource sheet for a tag."""

    def set(self, appstruct: dict, omit=(), send_event=True) -> bool:
        """Store appstruct, updating the catalog."""
        old_element_set = set(self._get_references().get('elements', []))
        new_element_set = set(appstruct.get('elements', []))
        newly_tagged_or_untagged_resources = old_element_set ^ new_element_set
        result = super().set(appstruct, omit, send_event)
        if newly_tagged_or_untagged_resources:
            self._reindex_resources(newly_tagged_or_untagged_resources)
        return result

    def _reindex_resources(self, resources: Iterable):
        adhocracy_catalog = find_catalog(self.context, 'adhocracy')
        for resource in resources:
            adhocracy_catalog.reindex_resource(resource)


tag_metadata = sheet_metadata_defaults._replace(isheet=ITag,
                                                schema_class=TagSchema,
                                                sheet_class=TagSheet
                                                )


class ITags(ISheet):

    """Marker interface for the tag sheet."""


class TagsElementsReference(SheetToSheet):

    """Tags sheet elements reference."""

    source_isheet = ITags
    source_isheet_field = 'elements'
    target_isheet = ITag


class TagsSchema(colander.MappingSchema):

    """Tags sheet data structure.

    `elements`: Tags in this Pool
    """

    elements = UniqueReferences(reftype=TagsElementsReference)


tags_metadata = sheet_metadata_defaults._replace(isheet=ITags,
                                                 schema_class=TagsSchema,
                                                 sheet_class=PoolSheet,
                                                 editable=False,
                                                 creatable=False,
                                                 )


def index_tag(resource, default):
    """Return value for the tag index."""
    graph = find_graph(resource)
    if graph is None:  # pragma: no cover
        logger.warning(
            'Cannot update tag index: No graph found for %s',
            resource_path(resource))
        return default
    tags = graph.get_back_reference_sources(resource,
                                            TagElementsReference)
    tagnames = [tag.__name__ for tag in tags]
    return tagnames if tagnames else default


def includeme(config):
    """Register sheets and add indexviews."""
    add_sheet_to_registry(tag_metadata, config.registry)
    add_sheet_to_registry(tags_metadata, config.registry)
    config.add_indexview(index_tag,
                         catalog_name='adhocracy',
                         index_name='tag',
                         context=IVersionable,
                         )
