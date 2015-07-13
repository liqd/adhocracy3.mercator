"""Basic participation process."""
from adhocracy_core.interfaces import IPool
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.pool import pool_meta
from adhocracy_core.resources.asset import add_assets_service
from adhocracy_core.resources.badge import add_badges_service
from adhocracy_core.sheets.asset import IHasAssetPool
from adhocracy_core.sheets.badge import IHasBadgesPool
from adhocracy_core.sheets.workflow import ISample


class IProcess(IPool):

    """Participation Process Pool."""


process_meta = pool_meta._replace(
    iresource=IProcess,
    # Every process should have a workflow assignment sheet
    extended_sheets=[ISample],
    permission_create='create_process',
    after_creation=[add_assets_service,
                    add_badges_service,
                    ],
)._add(basic_sheets=[IHasAssetPool,
                     IHasBadgesPool])


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(process_meta, config)
