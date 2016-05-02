"""Authorization with roles/local roles mapped to adhocracy principals."""
from collections import defaultdict
from pyramid.security import ALL_PERMISSIONS
from pyramid.security import Allow
from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.renderers import render
from pyramid.security import ACLPermitsResult
from pyramid.threadlocal import get_current_registry
from pyramid.traversal import lineage
from pyramid.registry import Registry
from pyramid.request import Request
from pyramid.scripting import get_root
from zope.interface import implementer
from zope.interface import Interface
from substanced.util import get_acl
from substanced.util import set_acl
from substanced.stats import statsd_timer
import transaction

from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IRoleACLAuthorizationPolicy
from adhocracy_core.events import LocalRolesModified
from adhocracy_core.schema import ACEPrincipal
from adhocracy_core.schema import ROLE_PRINCIPALS
from adhocracy_core.schema import SYSTEM_PRINCIPALS
from adhocracy_core.schema import ACM


CREATOR_ROLEID = 'role:creator'

god_all_permission_ace = (Allow, 'role:god', ALL_PERMISSIONS)

root_acm_asset = 'adhocracy_core.authorization:root_permissions.yaml'


class IRootACMExtension(Interface):
    """Marker interface for extension :term:`acm` of the  application root."""


@implementer(IRootACMExtension)
def acm_extension_adapter(context: IResource) -> dict:
    """Dummy adpater to extend the `root_acm`."""
    return ACM().deserialize({})


@implementer(IRoleACLAuthorizationPolicy)
class RoleACLAuthorizationPolicy(ACLAuthorizationPolicy):
    """A :term:`authorization policy` supporting :term:`local role`.

    You can get/set local role mapping for an resource with
     :func:`set_local_roles` and :func:`get_local_roles`.

    The local roles are inherited by children, except the `creator` role.
    """

    def permits(self, context: IResource,
                principals: list,
                permission: str) -> ACLPermitsResult:
        """Check `permission` for `context`. Read interface docstring."""
        with statsd_timer('authorization', rate=.1):
            local_roles = get_local_roles_all(context)
            principals_with_roles = set(principals)
            for principal, roles in local_roles.items():
                if principal in principals:
                    principals_with_roles.update(roles)
            return super().permits(context, principals_with_roles, permission)


def set_local_roles(resource, new_local_roles: dict, registry: Registry=None):
    """Set the :term:`local role`s mapping to ``new_local_roles``.

    :param new_local_roles: Mapping from :term:`groupid`/:term:`userid` to
                            a set of :term:`role`s for the `resource`:

                            {'system.Everyone': {'role:reader'}}

    If the resource's `local roles` and the ``new_local_roles`` differ,
    set the ``new_local_roles`` via setattr and send a
    :class:`adhocracy_core.interfaces.ILocalRolesModified` to notify others.
    """
    _assert_values_have_set_type(new_local_roles)
    old_local_roles = getattr(resource, '__local_roles__', None)
    if new_local_roles == old_local_roles:
        return None
    else:
        resource.__local_roles__ = new_local_roles
    if registry is None:
        registry = get_current_registry()
    event = LocalRolesModified(resource, new_local_roles, old_local_roles,
                               registry)
    registry.notify(event)


def _assert_values_have_set_type(mapping: dict):
    for value in mapping.values():
        assert isinstance(value, set)


def get_local_roles(resource) -> dict:
    """Return the :term:`local role`s of the resource."""
    return getattr(resource, '__local_roles__', {})


def get_local_roles_all(resource) -> dict:
    """Return the :term:`local role`s of the resource and its parents.

    The `creator`role is not inherited by children.
    """
    local_roles_all = defaultdict(set)
    local_roles_all.update(get_local_roles(resource))
    for location in lineage(resource.__parent__):
        local_roles = get_local_roles(location)
        for principal, roles in local_roles.items():
            roles_without_creator = filter(lambda x: x != CREATOR_ROLEID,
                                           roles)
            local_roles_all[principal].update(roles_without_creator)
    return local_roles_all


def acm_to_acl(acm: dict) -> [str]:
    """Convert an Access Control Matrix into a pyramid ACL.

    To avoid generating too many ACE, action which are None will not
    generate an ACE.

    Permissions for principals with high priority are listed first and override
    succeding permissions. The order is determined by
    :var:`adhocracy_core.schema.ROLE_PRINCIPALS`. Pricipals with higher
    index in this list have higer priority.
    """
    acl = _migrate_acm_to_acl(acm)
    _sort_by_principal_priority(acl)
    return acl


def _migrate_acm_to_acl(acm: dict) -> dict:
    acl = []
    idx = 0
    for principal in acm['principals']:
        for permissions in acm['permissions']:
            permission_name = permissions[0]
            action = permissions[idx + 1]
            if action is not None:
                ace = (action, principal, permission_name)
                acl.append(ace)
        idx = idx + 1
    return acl


def _sort_by_principal_priority(acl: list) -> list:
    roles = ROLE_PRINCIPALS.copy()
    roles.reverse()
    systems = SYSTEM_PRINCIPALS
    schema = ACEPrincipal()
    principals = [schema.deserialize(x) for x in roles + systems]
    acl.sort(key=lambda x: principals.index(x[1]))
    return acl


def set_acms_for_app_root(event):
    """Set/update :term:`acm`s for the root object of the pyramid application.

    :param event: this function should be used as a subscriber for the
                  :class:`pyramid.interfaces.IApplicationCreated` event.
                  That way everytime the application starts the root `acm`
                  is updated.

    The `root_acm`(:func:`root_acm_asset`) is extended by the :term:`acm`
    returned by the :class:`adhocracy_core.authorization.IRootACMExtension`
    adapter.

    In addition all permissions are granted the god user.
    """
    root, closer = get_root(event.app)
    acl = [god_all_permission_ace]
    acl += _get_root_extension_acl(root, event.app.registry)
    acl += _get_root_base_acl()
    old_acl = get_acl(root, [])
    if old_acl == acl:
        return
    set_acl(root, acl, event.app.registry)
    transaction.commit()
    closer()


def _get_root_base_acl() -> []:
    cstruct = render(root_acm_asset, {})
    acm = ACM().deserialize(cstruct)
    acl = acm_to_acl(acm)
    return acl


def _get_root_extension_acl(context: IResource, registry: Registry) -> []:
    acm_cstruct = registry.queryAdapter(context, IRootACMExtension)
    if acm_cstruct is None:
        return []
    else:
        acm = ACM().deserialize(acm_cstruct)
        acl = acm_to_acl(acm)
        return acl


def create_fake_god_request(registry):
    """Create a fake request issued by god."""
    request = Request.blank('/dummy')
    request.registry = registry
    request.__cached_principals__ = ['role:god']
    return request


def includeme(config):
    """Register adapter to extend the root acm and add authorization policy."""
    config.registry.registerAdapter(acm_extension_adapter,
                                    (Interface,),
                                    IRootACMExtension)
    authz_policy = RoleACLAuthorizationPolicy()
    config.set_authorization_policy(authz_policy)
