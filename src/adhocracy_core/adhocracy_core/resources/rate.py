"""Rate resource type."""
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IItem
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.itemversion import itemversion_metadata
from adhocracy_core.resources.item import item_metadata

from adhocracy_core.sheets.rate import IRate


class IRateVersion(IItemVersion):

    """Rate version."""


rateversion_meta = itemversion_metadata._replace(
    iresource=IRateVersion,
    extended_sheets=[IRate],
)


class IRate(IItem):

    """Rate versions pool."""


rate_meta = item_metadata._replace(
    iresource=IRate,
    element_types=[IRateVersion],
    item_type=IRateVersion,
    use_autonaming=True,
    autonaming_prefix='rate_',
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(rate_meta, config)
    add_resource_type_to_registry(rateversion_meta, config)
