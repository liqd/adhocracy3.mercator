"""Principal types (user/group) and helpers to search/get user information."""
from base64 import b64encode
from logging import getLogger
from os import urandom
from smtplib import SMTPException

from pyramid.registry import Registry
from pyramid.settings import asbool
from pyramid.traversal import find_resource
from pyramid.request import Request
from substanced.util import find_service
from zope.interface import Attribute
from zope.interface import Interface
from zope.interface import implementer

from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import IServicePool
from adhocracy_core.interfaces import IRolesUserLocator
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.pool import Pool
from adhocracy_core.resources.pool import pool_metadata
from adhocracy_core.resources.service import service_metadata
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.utils import raise_colander_style_error
from adhocracy_core.utils import get_sheet
import adhocracy_core.sheets.metadata
import adhocracy_core.sheets.principal
import adhocracy_core.sheets.pool
import adhocracy_core.sheets.rate


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


principals_metadata = service_metadata._replace(
    iresource=IPrincipalsService,
    content_name='principals',
    after_creation=[create_initial_content_for_principals] +
    service_metadata.after_creation,
    element_types=[],  # we don't want the frontend to post resources here
    permission_add='add_service',
)


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
        sheet = get_sheet(self, IMetadata)
        appstruct = sheet.get()
        appstruct['hidden'] = not active
        sheet.set(appstruct)


def send_registration_mail(context: IUser,
                           registry: Registry,
                           options: dict={}):
    """
    Send a registration mail to validate the email of a user account.

    But if the "adhocracy.skip_registration_mail" parameter is true, no mail
    is sent and the account is instead activated immediately. This can be
    useful for testing.
    """
    if asbool(registry.settings.get('adhocracy.skip_registration_mail',
                                    'false')):
        context.activate()
        return
    # FIXME subject should be configurable
    name = context.name
    email = context.email
    activation_path = _generate_activation_path()
    context.activation_path = activation_path
    logger.debug('Sending registration mail to %s for new user named %s, '
                 'activation path=%s', email, name, context.activation_path)
    site_name = registry.settings.get('adhocracy.site_name', 'Adhocracy')
    frontend_url = registry.settings.get('adhocracy.frontend_url',
                                         'http://localhost:6551')
    subject = ('%s: Account Verification / Aktivierung Deines Nutzerkontos'
               % site_name)

    args = {
        'activation_path': activation_path,
        'frontend_url': frontend_url,
        'name': name,
        'site_name': site_name,
    }
    try:
        registry.messenger.render_and_send_mail(
            subject=subject,
            recipients=[email],
            template_asset_base='adhocracy_core:templates/registration_mail',
            args=args)
    except SMTPException as err:
        msg = 'Cannot send registration mail: {}'.format(str(err))
        raise_colander_style_error(
            adhocracy_core.sheets.principal.IUserExtended, 'email', msg)


def _generate_activation_path() -> str:
    random_bytes = urandom(18)
    # We use '+_' as altchars since both are reliably recognized in URLs,
    # even if they occur at the end. Conversely, '-' at the end of URLs is
    # not recognized as part of the URL by some programs such as Thunderbird,
    # and '/' might cause problems as well, especially if it occurs multiple
    # times in a row.
    return '/activate/' + b64encode(random_bytes, altchars=b'+_').decode()


user_metadata = pool_metadata._replace(
    iresource=IUser,
    content_class=User,
    after_creation=[send_registration_mail] + pool_metadata.after_creation,
    basic_sheets=[adhocracy_core.sheets.principal.IUserBasic,
                  adhocracy_core.sheets.principal.IUserExtended,
                  adhocracy_core.sheets.principal.IPermissions,
                  adhocracy_core.sheets.metadata.IMetadata,
                  adhocracy_core.sheets.pool.IPool,
                  ],
    extended_sheets=[adhocracy_core.sheets.principal.IPasswordAuthentication,
                     adhocracy_core.sheets.rate.ICanRate],
    element_types=[],  # we don't want the frontend to post resources here
    use_autonaming=True,
    permission_add='add_user',
)


class IUsersService(IServicePool):

    """Service Pool for Users."""


users_metadata = service_metadata._replace(
    iresource=IUsersService,
    content_name='users',
    element_types=[IUser],
    permission_add='add_service',
)


class IGroup(IPool):

    """Group for Users."""


@implementer(IGroup)
class Group(Pool):

    """Group implementation with roles attribute to improve performance."""

    def __init__(self, data=None, family=None):
        super().__init__(data, family)
        self.roles = []


group_metadata = pool_metadata._replace(
    iresource=IGroup,
    content_class=Group,
    extended_sheets=[adhocracy_core.sheets.principal.IGroup,
                     ],
    element_types=[],  # we don't want the frontend to post resources here
    permission_add='add_group',
)


class IGroupsService(IServicePool):

    """Pool for Groups."""


groups_metadata = service_metadata._replace(
    iresource=IGroupsService,
    content_name='groups',
    element_types=[IGroup],
    permission_add='add_service',
)


class IPasswordResetsService(IServicePool):

    """Service Pool for Password Resets."""


passwordresets_metadata = service_metadata._replace(
    iresource=IPasswordResetsService,
    content_name='resets',
    element_types=[],
    permission_add='add_service',
)


@implementer(IRolesUserLocator)
class UserLocatorAdapter(object):

    """Provides helper methods to find users."""

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def get_user_by_login(self, login: str) -> IUser:
        """Find user per `login` name or return None."""
        # FIXME use catalog for all get_user_by_ methods
        users = find_service(self.context, 'principals', 'users')
        for user in users.values():
            if user.name == login:
                return user

    def get_user_by_userid(self, userid: str) -> IUser:
        """Find user by :term:`userid` or return None."""
        # This method is called multiple times, so we cache the result
        # FIXME use decorator for caching with request scope instead
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
        users = find_service(self.context, 'principals', 'users')
        for user in users.values():
            if user.email == email:
                return user

    def get_user_by_activation_path(self, activation_path: str) -> IUser:
        """Find user per activation path or return None."""
        users = find_service(self.context, 'principals', 'users')
        for user in users.values():
            if user.activation_path == activation_path:
                return user

    def get_groupids(self, userid: str) -> list:
        """Get :term:`groupid`s for term:`userid` or return None."""
        groups = self.get_groups(userid)
        if groups is None:
            return None
        return ['group:' + g.__name__ for g in groups]

    def get_groups(self, userid: str) -> list:
        """Get :term:`group`s for term:`userid` or return None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return None
        user_sheet = get_sheet(user,
                               adhocracy_core.sheets.principal.IPermissions,
                               registry=self.request.registry)
        groups = user_sheet.get()['groups']
        return groups

    def get_role_and_group_roleids(self, userid: str) -> list:
        """Return the roles for :term:`userid` and all its groups or None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return None
        roleids = self.get_roleids(userid)
        group_roleids = self.get_group_roleids(userid)
        role_and_group_roleids = set(roleids + group_roleids)
        return sorted(list(role_and_group_roleids))

    def get_roleids(self, userid: str) -> list:
        """Return the roles for :term:`userid` or None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return None
        roleids = ['role:' + r for r in user.roles]
        return roleids

    def get_group_roleids(self, userid: str) -> list:
        """Return the group roleids for :term:`userid` or None."""
        user = self.get_user_by_userid(userid)
        if user is None:
            return None
        groups = self.get_groups(userid)
        roleids = set()
        for group in groups:
            group_roleids = ['role:' + r for r in group.roles]
            roleids.update(group_roleids)
        return sorted(list(roleids))


def groups_and_roles_finder(userid: str, request: Request) -> list:
    """A Pyramid authentication policy groupfinder callback."""
    userlocator = request.registry.getMultiAdapter((request.context, request),
                                                   IRolesUserLocator)
    groupids = userlocator.get_groupids(userid) or []
    roleids = userlocator.get_role_and_group_roleids(userid) or []
    return groupids + roleids


def includeme(config):
    """Add resource types to registry."""
    add_resource_type_to_registry(principals_metadata, config)
    add_resource_type_to_registry(user_metadata, config)
    add_resource_type_to_registry(users_metadata, config)
    add_resource_type_to_registry(group_metadata, config)
    add_resource_type_to_registry(groups_metadata, config)
    add_resource_type_to_registry(passwordresets_metadata, config)
    config.registry.registerAdapter(UserLocatorAdapter,
                                    (Interface, Interface),
                                    IRolesUserLocator)
