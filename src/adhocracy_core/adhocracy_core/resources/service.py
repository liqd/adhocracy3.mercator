"""Pool resource type and zodb persistent IPool implementation."""

from adhocracy_core.interfaces import IServicePool
from adhocracy_core.resources.pool import pool_metadata
from adhocracy_core.resources import add_resource_type_to_registry
import adhocracy_core.sheets.name
import adhocracy_core.sheets.pool
import adhocracy_core.sheets.metadata


class IBasicService(IServicePool):

    """Basic :term:`service` resource type.

    The resource name is always set to the `content_name`.
    """


service_metadata = pool_metadata._replace(
    content_name='Service',
    iresource=IBasicService,
    basic_sheets=[adhocracy_core.sheets.pool.IPool,
                  adhocracy_core.sheets.metadata.IMetadata,
                  ],
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(service_metadata, config)
