"""Tag resource type."""
from adhocracy_core.interfaces import ITag
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.resource import resource_metadata_defaults
import adhocracy_core.sheets.name
import adhocracy_core.sheets.tags
import adhocracy_core.sheets.metadata


tag_metadata = resource_metadata_defaults._replace(
    iresource=ITag,
    basic_sheets=[adhocracy_core.sheets.name.IName,
                  adhocracy_core.sheets.metadata.IMetadata,
                  adhocracy_core.sheets.tags.ITag,
                  ],
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(tag_metadata, config)
