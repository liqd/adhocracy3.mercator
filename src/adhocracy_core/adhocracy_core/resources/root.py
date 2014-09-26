"""The Resource used by the the pyramid root factory."""
from pyramid.registry import Registry
from pyramid.security import Allow
from pyramid.security import ALL_PERMISSIONS
from substanced.interfaces import IRoot
from substanced.objectmap import ObjectMap
from substanced.util import set_acl

from adhocracy_core.interfaces import IPool
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.pool import pool_metadata
from adhocracy_core.resources.pool import IBasicPool
from adhocracy_core.resources.principal import IPrincipalsService


class IRootPool(IPool, IRoot):

    """The appplication root object."""


def create_initial_content_for_app_root(context: IPool, registry: Registry,
                                        options: dict):
    """Add the platform object, Catalog, principals services to the context."""
    _add_objectmap_to_app_root(context)
    _add_graph(context, registry)
    _add_catalog_service(context, registry)
    _add_principals_service(context, registry)
    _add_acl_to_app_root(context, registry)
    _add_platform(context, registry)


def _add_objectmap_to_app_root(root):
    root.__objectmap__ = ObjectMap(root)
    root.__objectmap__.add(root, ('',))


def _add_graph(context, registry):
    graph = registry.content.create('Graph', context)
    context.__graph__ = graph


def _add_catalog_service(context, registry):
    catalogs = registry.content.create('Catalogs')
    context.add_service('catalogs', catalogs, registry=registry)
    catalogs.add_catalog('system')
    catalogs.add_catalog('adhocracy')


def _add_principals_service(context, registry):
    registry.content.create(IPrincipalsService.__identifier__,
                            parent=context)


def _add_acl_to_app_root(context, registry):
    set_acl(context,
            [(Allow, 'system.Everyone', ALL_PERMISSIONS),
             ],
            registry=registry)


def _add_platform(context, registry):
    platform_id = registry.settings.get('adhocracy.platform_id', 'adhocracy')
    appstructs = {'adhocracy_core.sheets.name.IName': {'name': platform_id}}
    registry.content.create(IBasicPool.__identifier__, context,
                            appstructs=appstructs)


root_metadata = pool_metadata._replace(
    iresource=IRootPool,
    after_creation=[create_initial_content_for_app_root] +
    pool_metadata.after_creation,
)


def includeme(config):
    """Add resource types to registry."""
    add_resource_type_to_registry(root_metadata, config)
