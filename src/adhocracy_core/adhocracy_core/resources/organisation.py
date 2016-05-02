"""Basic organisation pool to structure processes."""
from pyramid.registry import Registry

from adhocracy_core.interfaces import IPool
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.asset import add_assets_service
from adhocracy_core.resources.pool import pool_meta
from adhocracy_core.resources.process import IProcess
from adhocracy_core.sheets.asset import IHasAssetPool
from adhocracy_core.sheets.description import IDescription
from adhocracy_core.sheets.image import IImageReference


class IOrganisation(IPool):
    """Organisation Pool."""


def enabled_ordering(pool: IPool, registry: Registry, **kwargs):
    """Enabled ordering for `pool` children."""
    initial_order = list(pool.keys())
    if hasattr(pool, '__oid__'):  # ease testing
        pool.set_order(initial_order, reorderable=True)


organisation_meta = pool_meta._replace(
    iresource=IOrganisation,
    permission_create='create_organisation',
    is_implicit_addable=True,
    is_sdi_addable=True,
    element_types=(IProcess,
                   IOrganisation,
                   ),
    after_creation=(add_assets_service,
                    enabled_ordering)
)._add(basic_sheets=(IDescription,
                     IImageReference,),
       extended_sheets=(IHasAssetPool,),)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(organisation_meta, config)
