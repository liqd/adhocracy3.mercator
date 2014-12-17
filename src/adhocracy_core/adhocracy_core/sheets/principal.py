"""Sheets for :term:`principal`s."""
import colander
from cryptacular.bcrypt import BCRYPTPasswordManager
from pyramid.traversal import resource_path
from pyramid.traversal import find_resource

from adhocracy_core.interfaces import ISheet
from substanced.interfaces import IUserLocator
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.sheets import GenericResourceSheet
from adhocracy_core.sheets import AttributeStorageSheet
from adhocracy_core.schema import Email
from adhocracy_core.schema import Password
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import TimeZoneName
from adhocracy_core.schema import UniqueReferences
from adhocracy_core.schema import Roles


class IGroup(ISheet):

    """Market interface for the group sheet."""


class IUserBasic(ISheet):

    """Market interface for the userbasic sheet."""


class IPermissions(ISheet):

    """Market interface for the permissions sheet."""


class PermissionsGroupsReference(SheetToSheet):

    """permissions sheet reference to preceding versions."""

    source_isheet = IPermissions
    source_isheet_field = 'groups'
    target_isheet = IGroup


class GroupSchema(colander.MappingSchema):

    """Group sheet data structure."""

    users = UniqueReferences(readonly=True,
                             backref=True,
                             reftype=PermissionsGroupsReference)
    roles = Roles()


group_metadata = sheet_metadata_defaults._replace(
    isheet=IGroup,
    schema_class=GroupSchema,
    sheet_class=AttributeStorageSheet,
)


@colander.deferred
def deferred_validate_user_name(node: colander.SchemaNode, kw: dict)\
        -> callable:
    """Return validator to check that the user login `name` is unique or None.

    :param kw: dictionary with 'request' key and
               :class:`pyramid.request.Request` object.
               If this is not available the validator is None.
    :raise: colander.Invalid: if name is not unique.
    """
    request = kw.get('request', None)
    if not request:
        return None
    locator = request.registry.getMultiAdapter((request.root, request),
                                               IUserLocator)

    def validate_user_name_is_unique(node, value):
        if locator.get_user_by_login(value):
            raise colander.Invalid(node, 'The user login name is not unique',
                                   value=value)
    return validate_user_name_is_unique


@colander.deferred
def deferred_validate_user_email(node: colander.SchemaNode, kw: dict)\
        -> callable:
    """Return validator to check that the `email` is unique and valid or None.

    :param kw: dictionary with 'request' key and
               :class:`pyramid.request.Request` object
               If this is not available the validator is None.
    :raise: colander.Invalid: if name is not unique or not an email address.
    """
    request = kw.get('request', None)
    if not request:
        return None
    locator = request.registry.getMultiAdapter((request.root, request),
                                               IUserLocator)

    def validate_user_email_is_unique(node, value):
        if locator.get_user_by_email(value):
            raise colander.Invalid(node, 'The user login email is not unique',
                                   value=value)
    validate_email = Email.validator
    return colander.All(validate_email, validate_user_email_is_unique)


class UserBasicSchema(colander.MappingSchema):

    """Userbasic sheet data structure.

    `email`: email address
    `name`: visible name
    `tzname`: time zone
    """

    email = Email(validator=deferred_validate_user_email)
    name = SingleLine(missing=colander.required,
                      validator=deferred_validate_user_name)
    tzname = TimeZoneName()


userbasic_metadata = sheet_metadata_defaults._replace(
    isheet=IUserBasic,
    schema_class=UserBasicSchema,
    sheet_class=AttributeStorageSheet,
    permission_create='create_sheet_userbasic',
)


@colander.deferred
def deferred_roles_and_group_roles(node: colander.SchemaNode, kw: dict)\
        -> list:
    """Return roles and groups roles for `context`.

    :param kw: dictionary with 'context' key and
              :class:`adhocracy_core.sheets.principal.IPermissions` object.
    :return: list of :term:`roles` or [].
    """
    context = kw.get('context', None)
    if context is None:
        return []
    roles_and_group_roles = set(context.roles)
    groups = [find_resource(context, gid) for gid in context.group_ids]
    for group in groups:
        roles_and_group_roles.update(group.roles)
    return sorted(list(roles_and_group_roles))


class PermissionsSchema(colander.MappingSchema):

    """Userbasic sheet data structure.

    `groups`: groups this user joined
    """

    roles = Roles()
    groups = UniqueReferences(reftype=PermissionsGroupsReference)
    roles_and_group_roles = Roles(readonly=True,
                                  default=deferred_roles_and_group_roles)


class PermissionsAttributeStorageSheet(AttributeStorageSheet):

    """Store the groups field references also as object attribute."""

    def _store_references(self, appstruct, registry):
        super()._store_references(appstruct, registry)
        if 'groups' in appstruct:
            groups = appstruct['groups']
            group_ids = [resource_path(g) for g in groups]
            self.context.group_ids = group_ids


permissions_metadata = sheet_metadata_defaults._replace(
    isheet=IPermissions,
    schema_class=PermissionsSchema,
    permission_create='manage_principals',
    permission_edit='manage_principals',
    sheet_class=PermissionsAttributeStorageSheet,
)


class IPasswordAuthentication(ISheet):

    """Marker interface for the password sheet."""


class PasswordAuthenticationSchema(colander.MappingSchema):

    """Data structure for password based user authentication.

    `password`: plaintext password :class:`adhocracy_core.schema.Password`.
    """

    password = Password(missing=colander.required)


class PasswordAuthenticationSheet(GenericResourceSheet):

    """Sheet for password based user authentication.

    The `password` data is encrypted and stored in the user object (context).
    This assures compatibility with :class:`substanced.principal.User`.

    The `check_plaintext_password` method can be used to validate passwords.
    """

    def _store_data(self, appstruct):
        password = appstruct.get('password', '')
        if not password:
            return
        if not hasattr(self.context, 'password'):
            self.context.password = ''
        if not hasattr(self.context, 'pwd_manager'):
            self.context.pwd_manager = BCRYPTPasswordManager()
        self.context.password = self.context.pwd_manager.encode(password)

    def _get_data_appstruct(self, params: dict={}):
        password = getattr(self.context, 'password', '')
        return {'password': password}

    def check_plaintext_password(self, password: str) -> bool:
        """ Check if `password` matches the stored encrypted password.

        :raises ValueError: if `password` is > 4096 bytes
        """
        if len(password) > 4096:
            # avoid DOS ala
            # https://www.djangoproject.com/weblog/2013/sep/15/security/
            raise ValueError('Not checking password > 4096 bytes')
        stored_password = self.context.password
        return self.context.pwd_manager.check(stored_password, password)


password_metadata = sheet_metadata_defaults._replace(
    isheet=IPasswordAuthentication,
    schema_class=PasswordAuthenticationSchema,
    sheet_class=PasswordAuthenticationSheet,
    readable=False,
    creatable=True,
    editable=True,
    permission_create='create_sheet_password',
)


# def add_user_catalog(root):
#     """Add the user catalog if it doesn't exist yet."""
#     catalogs = root['catalogs']
#     if 'usercatalog' not in catalogs:
#        catalogs.add_catalog('usercatalog', update_indexes=True)


def includeme(config):
    """Register sheets and activate catalog factory."""
    add_sheet_to_registry(userbasic_metadata, config.registry)
    add_sheet_to_registry(password_metadata, config.registry)
    add_sheet_to_registry(group_metadata, config.registry)
    add_sheet_to_registry(permissions_metadata, config.registry)
    # config.scan('.')
    # config.add_evolution_step(add_user_catalog)
