"""Rate resource type."""
from pyramid.registry import Registry

from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IServicePool
from adhocracy_core.interfaces import IPool
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.itemversion import itemversion_meta
from adhocracy_core.resources.item import item_meta
from adhocracy_core.resources.service import service_meta
import adhocracy_core.sheets.rate


class IRateVersion(IItemVersion):
    """Rate version."""


rateversion_meta = itemversion_meta._replace(
    iresource=IRateVersion,
    extended_sheets=(adhocracy_core.sheets.rate.IRate,),
    permission_create='edit_rate',
)


class IRate(IItem):
    """Rate versions pool."""


rate_meta = item_meta._replace(
    iresource=IRate,
    element_types=(IRateVersion,),
    item_type=IRateVersion,
    use_autonaming=True,
    autonaming_prefix='rate_',
    permission_create='create_rate',
)


class IRatesService(IServicePool):
    """The 'rates' ServicePool."""


rates_meta = service_meta._replace(
    iresource=IRatesService,
    content_name='rates',
    element_types=(IRate,),
)


def add_ratesservice(context: IPool, registry: Registry, options: dict):
    """Add `rates` service to context."""
    registry.content.create(IRatesService.__identifier__, parent=context)


class ILikeVersion(IItemVersion):
    """Like version."""


likeversion_meta = itemversion_meta._replace(
    iresource=ILikeVersion,
    extended_sheets=(adhocracy_core.sheets.rate.ILike,),
    permission_create='edit_rate',
)


class ILike(IItem):
    """Like versions pool."""


like_meta = item_meta._replace(
    iresource=ILike,
    element_types=(ILikeVersion,),
    item_type=ILikeVersion,
    use_autonaming=True,
    autonaming_prefix='like_',
    permission_create='create_rate',
)


class ILikesService(IServicePool):
    """The 'likes' ServicePool."""


likes_meta = service_meta._replace(
    iresource=ILikesService,
    content_name='likes',
    element_types=(ILike,),
)


def add_likesservice(context: IPool, registry: Registry, options: dict):
    """Add `likes` service to context."""
    registry.content.create(ILikesService.__identifier__, parent=context)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(rate_meta, config)
    add_resource_type_to_registry(rateversion_meta, config)
    add_resource_type_to_registry(rates_meta, config)
    add_resource_type_to_registry(like_meta, config)
    add_resource_type_to_registry(likeversion_meta, config)
    add_resource_type_to_registry(likes_meta, config)
