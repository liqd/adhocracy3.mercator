"""Simple resource type."""
from adhocracy_core.interfaces import ISimple
import adhocracy_core.sheets.name
import adhocracy_core.sheets.metadata
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.resource import resource_metadata_defaults


simple_metadata = \
    resource_metadata_defaults._replace(
        iresource=ISimple,
        basic_sheets=[adhocracy_core.sheets.name.IName,
                      adhocracy_core.sheets.metadata.IMetadata,
                      ],
    )


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(simple_metadata, config)
