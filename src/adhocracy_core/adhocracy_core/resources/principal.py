"""Principal types (user/group) and helpers to search/get user information."""
from logging import getLogger

from pyramid.registry import Registry
from pyramid.traversal import find_resource
from pyramid.traversal import get_current_registry
from pyramid.request import Request
from pyramid.i18n import TranslationStringFactory
from substanced.util import find_service
from substanced.stats import statsd_incr
from substanced.stats import statsd_timer
from zope.interface import Attribute
from zope.interface import Interface
from zope.interface import implementer

from adhocracy_core.authorization import set_acl
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import IServicePool
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IRolesUserLocator
from adhocracy_core.interfaces import search_query
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources import resource_meta
from adhocracy_core.resources.pool import Pool
from adhocracy_core.resources.pool import pool_meta
from adhocracy_core.resources.service import service_meta
from adhocracy_core.resources.base import Base
from adhocracy_core.resources.badge import add_badge_assignments_service
from adhocracy_core.resources.badge import add_badges_service
from adhocracy_core.resources.asset import add_assets_service
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.metadata import is_older_than
import adhocracy_core.sheets.metadata
import adhocracy_core.sheets.principal
import adhocracy_core.sheets.pool
import adhocracy_core.sheets.rate
import adhocracy_core.sheets.badge
import adhocracy_core.sheets.image
import adhocracy_core.sheets.asset

_ = TranslationStringFactory('adhocracy')

logger = getLogger(__name__)


class IPrincipalsService(IServicePool):
    """Service Pool representing a collection of principals.

    If the object is created via
    :func:`substanced.content.ContentRegistry.create`, it will contain
    three sub services:

      users: an instance of the content type :class:`IUsers`

      group:  an instance of the content type ``Groups``

      resets: an instance of the content type ``Password Resets``
    """


def create_initial_content_for_principals(context: IPool, registry: Registry,
                                          options: dict):
    """Add users, groups and resets subobjects to context."""
    registry.content.create(IUsersService.__identifier__,
                            parent=context, registry=registry)
    registry.content.create(IGroupsService.__identifier__,
                            parent=context, registry=registry)
    registry.content.create(IPasswordResetsService.__identifier__,
                            parent=context, registry=registry)


principals_meta = service_meta._replace(
    iresource=IPrincipalsService,
    content_name='principals',
    element_types=(),  # we don't want the frontend to post resources here
    permission_create='create_service',
    extended_sheets=(adhocracy_core.sheets.badge.IHasBadgesPool,),
)._add(after_creation=(create_initial_content_for_principals,
                       add_badges_service))


class IUser(IPool):
    """User resource.

    This inherits from IPool in order to allow to use this resource as a
    namespace for user objects.

    """

    active = Attribute('Whether the user account has been activated (bool)')
    activation_path = Attribute(
        'Activation path for not-yet-activated accounts (str)')
    roles = Attribute('List of :term:`role`s')
    group_ids = Attribute('List of :term:`group_id`s')
    # TODO: add `password` attribute, this may be set by the
    # password authentication sheet


@implementer(IUser)
class User(Pool):
    """User implementation.

    With attributes to be compatible with :class:`substanced.principals.User`

    """

    tzname = 'UTC'
    password = ''
    email = ''
    name = ''
    active = False
    activation_path = None

    def __init__(self, data=None, family=None):
        """Initialize self."""
        super().__init__(data, family)
        self.roles = []
        self.group_ids = []
        """Readonly :term:`group_id`s for this user."""
        self.hidden = True

    def activate(self, active: bool=True):
        """
        Activate or deactivate the user.

        Inactivate users are always hidden.
        """
        self.active = active
        registry = get_current_registry(self)
        sheet = registry.content.get_sheet(self, IMetadata)
        appstruct = sheet.get()
        appstruct['hidden'] = not active
        statsd_incr('users.activated', 1)
        sheet.set(appstruct)


user_meta = pool_meta._replace(
    iresource=IUser,
    content_class=User,
    basic_sheets=(adhocracy_core.sheets.principal.IUserBasic,
                  adhocracy_core.sheets.principal.IUserExtended,
                  adhocracy_core.sheets.principal.ICaptcha,
                  adhocracy_core.sheets.principal.IPermissions,
                  adhocracy_core.sheets.metadata.IMetadata,
                  adhocracy_core.sheets.pool.IPool,
                  ),
    extended_sheets=(adhocracy_core.sheets.principal.IPasswordAuthentication,
                     adhocracy_core.sheets.rate.ICanRate,
                     adhocracy_core.sheets.badge.ICanBadge,
                     adhocracy_core.sheets.badge.IBadgeable,
                     adhocracy_core.sheets.image.IImageReference,
                     ),
    element_types=(),  # we don't want the frontend to post resources here
    use_autonaming=True,
    permission_create='create_user',
)


class IUsersService(IServicePool):
    """Service Pool for Users."""


users_meta = service_meta._replace(
    iresource=IUsersService,
    content_name='users',
    element_types=(IUser,),
    permission_create='create_service',
    extended_sheets=(adhocracy_core.sheets.asset.IHasAssetPool,),
    after_creation=(add_badge_assignments_service,
                    add_assets_service,
                    ),
)


class IGroup(IPool):
    """Group for Users."""


@implementer(IGroup)
class Group(Pool):
    """Group implementation with roles attribute to improve performance."""

    def __init__(self, data=None, family=None):
        """Initialize self."""
        super().__init__(data, family)
        self.roles = []


group_meta = pool_meta._replace(
    iresource=IGroup,
    content_class=Group,
    extended_sheets=(adhocracy_core.sheets.principal.IGroup,
                     ),
    element_types=(),  # we don't want the frontend to post resources here
    permission_create='create_group',
)


class IGroupsService(IServicePool):
    """Pool for Groups."""


groups_meta = service_meta._replace(
    iresource=IGroupsService,
    content_name='groups',
    element_types=(IGroup,),
    permission_create='create_service',
)


def deny_view_permission(context: IResource, registry: Registry,
                         options: dict):
    """Remove view permission for everyone for `context`."""
    acl = [('deny', 'system.Everyone', 'view')]
    set_acl(context, acl, registry=registry)


def hide(context: IResource, registry: Registry, options: dict):
    """Hide `context`."""
    metadata = registry.content.get_sheet(context, IMetadata)
    metadata.set({'hidden': True})


class IPasswordReset(IResource):
    """Resource to do one user password reset."""


@implementer(IPasswordReset)
class PasswordReset(Base):
    """Password reset implementation."""

    def reset_password(self, password):
        """Set `password` for creator user and delete itself."""
        registry = get_current_registry(self)
        user = registry.content.get_sheet_field(self, IMetadata, 'creator')
        password_sheet = registry.content.get_sheet(
            user, adhocracy_core.sheets.principal.IPasswordAuthentication)
        password_sheet.set({'password': password}, send_event=False)
        if not user.active:  # pragma: no cover
            user.activate()
        del self.__parent__[self.__name__]
        statsd_incr('pwordresets.reset', 1)


passwordreset_meta = resource_meta._replace(
    iresource=IPasswordReset,
    content_class=PasswordReset,
    permission_create='create_password_reset',
    basic_sheets=(adhocracy_core.sheets.metadata.IMetadata,),
    use_autonaming_random=True,
    after_creation=(hide,),
)


class IPasswordResetsService(IServicePool):
    """Service Pool for Password Resets."""


passwordresets_meta = service_meta._replace(
    iresource=IPasswordResetsService,
    content_name='resets',
    element_types=[IPasswordReset],
    permission_create='create_service',
    after_creation=(hide, deny_view_permission),
)


@implementer(IRolesUserLocator)
class UserLocatorAdapter(object):
    """Provides helper methods to find users."""

    def __init__(self, context, request):
        """Initialize self."""
        self.context = context
        self.request = request
        self.registry = request.registry

    def get_user_by_login(self, login: str) -> IUser:
        """Find user per `login` name or return None."""
        user = self._search_user('user_name', login)
        return user

    def get_users(self) -> [IUser]:
        """Return all users."""
        users = find_service(self.context, 'principals', 'users')
        return (u for u in users.values() if IUser.providedBy(u))

    def get_user_by_userid(self, userid: str) -> IUser:
        """Find user by :term:`userid` or return None."""
        # This method is called multiple times, so we cache the result
        # TODO? use decorator for caching with request scope instead
        user = getattr(self.request, '__user__' + userid, None)
        if user is None:
            try:
                user = find_resource(self.context, userid)
                setattr(self.request, '__user__' + userid, user)
            except KeyError:
                return None
        return user

    def get_user_by_email(self, email: str) -> IUser:
        """Find user per email or return None."""
        user = self._search_user('private_user_email', email)
        return user

    def get_user_by_activation_path(self, activation_path: str) -> IUser:
        """Find user per activation path or return None."""
        user = self._search_user('private_user_activation_path',
                                 activation_path)
        return user

    def _search_user(self, index_name: str, value: str) -> IUser:
        catalogs = find_service(self.context, 'catalogs')
        query = search_query._replace(indexes={index_name: value},
                                      resolve=True)
        users = catalogs.search(query).elements
        users_count = len(users)
        if users_count == 1:
            return users[0]
        elif users_count > 1:
            raise ValueError('{} users are indexed by `{}` with value `{}`.'
                             .format(users_count, index_name, value))

    def get_groupids(self, userid: str) -> [str]:
        """Get :term:`groupid`s for term:`userid` or return None."""
        groups = self.get_groups(userid)
        if groups is None:
            return None
        return ['group:' + g.__name__ for g in groups]

    def get_groups(self, userid: str) -> [IGroup]:
        """Get :term:`group`s for term:`userid` or return None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return
        user_sheet = self.registry.content.get_sheet(
            user,
            adhocracy_core.sheets.principal.IPermissions)
        groups = user_sheet.get()['groups']
        return groups

    def get_role_and_group_roleids(self, userid: str) -> [str]:
        """Return the roles for :term:`userid` and all its groups or None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return
        roleids = self.get_roleids(userid)
        group_roleids = self.get_group_roleids(userid)
        role_and_group_roleids = set(roleids + group_roleids)
        return sorted(list(role_and_group_roleids))

    def get_roleids(self, userid: str) -> [str]:
        """Return the roles for :term:`userid` or None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return
        roleids = ['role:' + r for r in user.roles]
        return roleids

    def get_group_roleids(self, userid: str) -> [str]:
        """Return the group roleids for :term:`userid` or None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return
        groups = self.get_groups(userid)
        roleids = set()
        for group in groups:
            group_roleids = ['role:' + r for r in group.roles]
            roleids.update(group_roleids)
        return sorted(list(roleids))


def groups_and_roles_finder(userid: str, request: Request) -> list:
    """A Pyramid authentication policy groupfinder callback."""
    with statsd_timer('authentication.groups', rate=.1):
        userlocator = request.registry.getMultiAdapter((request.context,
                                                        request),
                                                       IRolesUserLocator)
        groupids = userlocator.get_groupids(userid) or []
        roleids = userlocator.get_role_and_group_roleids(userid) or []
        principals = groupids + roleids
    if not principals:
        return None
    else:
        return principals


def delete_not_activated_users(request: Request, age_in_days: int):
    """Delete not activate users that are older than `age_in_days`."""
    userlocator = request.registry.getMultiAdapter((request.context,
                                                    request),
                                                   IRolesUserLocator)
    users = userlocator.get_users()
    not_activated = (u for u in users if not u.active)
    expired = [u for u in not_activated if is_older_than(u, age_in_days)]
    for user in expired:
        msg = 'deleting user {0}: name {1} email {2}'.format(user,
                                                             user.email,
                                                             user.name)
        logger.info(msg)
        del user.__parent__[user.__name__]


def delete_password_resets(request: Request, age_in_days: int):
    """Delete password resets that are older than `age_in_days`."""
    resets = find_service(request.root, 'principals', 'resets')
    expired = [u for u in resets.values() if is_older_than(u, age_in_days)]
    for reset in expired:
        logger.info('deleting reset {0}'.format(reset))
        del resets[reset.__name__]


def includeme(config):
    """Add resource types to registry."""
    add_resource_type_to_registry(principals_meta, config)
    add_resource_type_to_registry(user_meta, config)
    add_resource_type_to_registry(users_meta, config)
    add_resource_type_to_registry(group_meta, config)
    add_resource_type_to_registry(groups_meta, config)
    add_resource_type_to_registry(passwordresets_meta, config)
    add_resource_type_to_registry(passwordreset_meta, config)
    config.registry.registerAdapter(UserLocatorAdapter,
                                    (Interface, Interface),
                                    IRolesUserLocator)
