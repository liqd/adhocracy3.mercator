"""The Resource used by the the pyramid root factory."""
from pyramid.registry import Registry
from pyramid.security import Allow
from pyramid.security import ALL_PERMISSIONS
from substanced.interfaces import IRoot
from substanced.objectmap import ObjectMap
from substanced.util import set_acl
from substanced.util import find_service

from adhocracy_core.interfaces import IPool
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.pool import pool_metadata
from adhocracy_core.resources.pool import IBasicPool
from adhocracy_core.resources.principal import IPrincipalsService
from adhocracy_core.resources.principal import IUser
from adhocracy_core.resources.principal import IGroup
import adhocracy_core.sheets.principal
import adhocracy_core.sheets.name


root_acl = [(Allow, 'system.Everyone', 'view'),
            (Allow, 'system.Everyone', 'add_user'),
            (Allow, 'system.Everyone', 'create_sheet_password'),
            (Allow, 'system.Everyone', 'create_sheet_userbasic'),
            (Allow, 'role:annotator', 'view'),
            (Allow, 'role:annotator', 'add_resource'),
            (Allow, 'role:annotator', 'create_sheet'),
            (Allow, 'role:annotator', 'add_asset'),
            (Allow, 'role:annotator', 'add_comment'),
            (Allow, 'role:annotator', 'add_rate'),
            (Allow, 'role:contributor', 'view'),
            (Allow, 'role:contributor', 'add_resource'),
            (Allow, 'role:contributor', 'create_sheet'),
            (Allow, 'role:contributor', 'add_proposal'),
            (Allow, 'role:contributor', 'add_section'),
            (Allow, 'role:contributor', 'add_paragraph'),
            (Allow, 'role:contributor', 'add_externalresource'),
            (Allow, 'role:creator', 'add_commentversion'),
            (Allow, 'role:creator', 'add_rateversion'),
            (Allow, 'role:creator', 'add_proposalversion'),
            (Allow, 'role:creator', 'add_sectionversion'),
            (Allow, 'role:creator', 'add_paragraphversion'),
            (Allow, 'role:manager', 'hide_resource'),
            (Allow, 'role:admin', 'view'),
            (Allow, 'role:admin', 'add_resource'),
            (Allow, 'role:admin', 'create_sheet'),
            (Allow, 'role:admin', 'add_group'),
            (Allow, 'role:admin', 'add_pool'),
            (Allow, 'role:admin', 'edit_group'),
            (Allow, 'role:admin', 'edit_sheet'),
            (Allow, 'role:admin', 'manage_principals'),
            (Allow, 'role:god', ALL_PERMISSIONS),
            ]
# FIXME every sheet/resource should have the posibility to add the needed ACEs


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
    _add_default_group(context, registry)
    _add_initial_user_and_group(context, registry)
    _add_platform(context, registry)
    # FIXME: Move mercator platform creation to mercator package
    _add_platform(context, registry, 'mercator')


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
                            parent=context,
                            registry=registry)


def _add_acl_to_app_root(context, registry):
    set_acl(context, root_acl, registry=registry)


def _add_platform(context, registry, platform_id=None):
    if platform_id is None:
        platform_id = registry.settings.get('adhocracy.platform_id',
                                            'adhocracy')
    appstructs = {'adhocracy_core.sheets.name.IName': {'name': platform_id}}
    registry.content.create(IBasicPool.__identifier__, context,
                            appstructs=appstructs, registry=registry)


def _add_default_group(context, registry):
    if not registry.settings.get('adhocracy.add_default_group',
                                 True):  # pragma: no cover
        return
    # FIXME: the 'app' fixture  in adhocracy.testing does not work with setting
    # a default group. So we allow to disable here.
    group_name = 'authenticated'
    group_roles = ['reader', 'annotator', 'contributor']
    # FIXME these rules only makes sense for mercator
    # FIXME groups should be created with an evolve script
    groups = find_service(context, 'principals', 'groups')
    appstructs = {adhocracy_core.sheets.principal.IGroup.__identifier__:
                  {'roles': group_roles},
                  adhocracy_core.sheets.name.IName.__identifier__:
                  {'name': group_name},
                  }
    registry.content.create(IGroup.__identifier__, groups,
                            appstructs=appstructs,
                            registry=registry)


def _add_initial_user_and_group(context, registry):

    user_name = registry.settings.get('adhocracy.initial_login', 'god')
    user_password = registry.settings.get('adhocracy.initial_password',
                                          'password')
    user_email = registry.settings.get('adhocracy.initial_email',
                                       'sysadmin@test.de')
    group_name = registry.settings.get('adhocracy.initial_group_name', 'gods')
    group_roles = ['god']
    groups = find_service(context, 'principals', 'groups')
    appstructs = {adhocracy_core.sheets.principal.IGroup.__identifier__:
                  {'roles': group_roles},
                  adhocracy_core.sheets.name.IName.__identifier__:
                  {'name': group_name},
                  }
    group = registry.content.create(IGroup.__identifier__, groups,
                                    appstructs=appstructs,
                                    registry=registry)
    users = find_service(context, 'principals', 'users')
    password_sheet = adhocracy_core.sheets.principal.IPasswordAuthentication
    appstruct = {adhocracy_core.sheets.principal.IUserBasic.__identifier__:
                 {'name': user_name,
                  'email': user_email},
                 adhocracy_core.sheets.principal.IPermissions.__identifier__:
                 {'groups': [group]},
                 password_sheet.__identifier__:
                 {'password': user_password},
                 }
    user = registry.content.create(IUser.__identifier__, users, appstruct,
                                   run_after_creation=False,
                                   registry=registry)

    user.active = True


root_metadata = pool_metadata._replace(
    iresource=IRootPool,
    after_creation=[create_initial_content_for_app_root] +
    pool_metadata.after_creation,
)


def includeme(config):
    """Add resource types to registry."""
    add_resource_type_to_registry(root_metadata, config)
