"""Basic Interfaces used by all packages."""
from collections import Iterable
from collections import namedtuple
from collections import OrderedDict

from pyramid.interfaces import ILocation
from pyramid.interfaces import IAuthorizationPolicy
from pyramid.security import ACLPermitsResult
from zope.interface import Attribute
from zope.interface import Interface
from zope.interface.interface import InterfaceClass
from zope.interface.interfaces import IObjectEvent

from substanced.interfaces import IPropertySheet
from substanced.interfaces import ReferenceClass
from substanced.interfaces import IUserLocator
from substanced.interfaces import IService


class ISheet(Interface):

    """Marker interface for resources to enable a specific sheet type."""


Dimensions = namedtuple('Dimensions', ['width', 'height'])
"""Dimensions of a two-dimensional object (e.g. image)."""


SHEET_METADATA = {'isheet': None,
                  'sheet_class': None,
                  'schema_class': None,
                  'permission_view': '',
                  'permission_edit': '',
                  'permission_create': '',
                  'readable': True,
                  'editable': True,
                  'creatable': True,
                  'create_mandatory': False,
                  'mime_type_validator': None,
                  'image_sizes': None,
                  }


class SheetMetadata(namedtuple('SheetMetadata', SHEET_METADATA.keys())):

    """Metadata to register a sheet type to set/get resource data.

    Generic fields:
    ---------------

    isheet:
        Marker interface for this sheet type, a subtype of :class:`ISheet`.
        Subtype has to override.
    sheet_class:
        :class:`IResourceSheet` implementation for this sheet
    schema_class:
        :class:`colander.MappingSchema` to define the sheet data structure.
        Subtype must preserve the super type data structure.
    permission_view:
        Permission to view or index this data.
        Subtype should override.
    permission_edit:
        Permission to edit this data.
        Subtype should override.
    readable:
        The sheet data is readable
    editable:
        The sheet data is editable
    creatable:
        The sheet data can be set if you create (post) a new resource
    create_mandatory:
        This Sheet must be set if you create (post) a new resource

    IAsset-related fields:
    ----------------------

    mime_type_validator:
        callable that takes an string and returns a bool, checking whether
        the MIME type of the asset is valid
    image_sizes:
        optional dictionary from names to :class:`Dimensions`, e.g.
        ``{ 'thumbnail': Dimensions(width=100, height=50) }``
    """


sheet_metadata = SheetMetadata(**SHEET_METADATA)


class ISheetReferenceAutoUpdateMarker(ISheet):

    """Sheet Interface to autoupdate sheets with references.

    If one referenced resource has a new version this sheet
    changes the reference to the new version.

    """


class IPostPoolSheet(ISheet):

    """Marker interfaces for sheets with :term:`post_pool` Attributes.

    This implies the sheet schema is a subtype of
    :class:`adhocracy_core.schema.PostPoolSchema` or has at least a
    field node with :class:`adhocracy_core.Schema.PostPool`.
    """


class IPredicateSheet(ISheet):

    """Marker interface for predicate sheets.

    A predicate sheet has outgoing references named `subject`
    and  `object`. It represents a subject-predicate-object data
    structure like :term:`RDF` triples.
    """


class IResourceSheet(IPropertySheet):  # pragma: no cover

    """Sheet for resources to get/set the sheet data structure."""

    meta = Attribute('SheetMetadata')

    def set(appstruct, omit=(), send_event=True, registry=None, request=None,
            omit_readonly=True) -> bool:
        """ Store ``appstruct`` dictionary data.

        :param send_event: throw edit event.
        :param registry: the pyramid registry to use.
        :param request: the current pyramid request for additional permission
                        checks, may be None.
        :param omit_readonly: do not store readonly ``appstruct`` data.
        """

    def get(params: dict={}) -> dict:
        """ Get ``appstruct`` dictionary data.

        :param params: optional parameters that can modify the appearance
        of the returned dictionary, e.g. query parameters in a GET request
        """


RESOURCE_METADATA = OrderedDict({
    'content_name': '',
    'iresource': None,
    'content_class': None,
    'permission_add': '',
    'permission_view': '',
    'is_implicit_addable': False,
    'basic_sheets': [],
    'extended_sheets': [],
    'after_creation': [],
    'element_types': [],
    'item_type': None,
    'use_autonaming': False,
    'autonaming_prefix': '',
})


class ResourceMetadata(namedtuple('ResourceMetadata',
                                  RESOURCE_METADATA.keys())):

    """Metadata to register Resource Types.

    Basic fields:
    -------------

    content_name:
        Human readable name,
        subtypes have to override
    iresource:
        Resource type interface,
        subtypes have to override
    content_class:
        Class to create content objects
    permission_add:
        Permission to add this resource to the object hierarchy.
    permission_view:
        Permission to view resource data and view in listings
    is_implicit_addable:
        Make this type adddable if supertype is addable.
    basic_sheets:
        Basic property interfaces to define data
    extended_sheets:
            Extended property interfaces to define data,
            subtypes should override
    after_creation:
        Callables to run after creation. They are passed the instance being
        created and the registry.
    use_autonaming:
        Automatically generate the name if the new content object is added
        to the parent.
    autonaming_prefix:
        uses this prefix for autonaming.

    IPool fields:
    -------------

    element_types:
        Set addable content types, class heritage is honored.

    IItem fields:
    -------------

    item_type:
        Set addable content types, class heritage is honored
    """


resource_metadata = ResourceMetadata(**RESOURCE_METADATA)


class IResource(ILocation):

    """Basic resource type."""


class IPool(IResource):  # pragma: no cover

    """Resource with children - a folder in the object hierarchy. """

    def keys() -> Iterable:
        """ Return subobject names present in this pool."""

    def __iter__() -> Iterable:
        """ An alias for ``keys``."""

    def values() -> Iterable:
        """ Return subobjects present in this pool."""

    def items() -> Iterable:
        """ Return (name, value) pairs of subobjects in the folder."""

    def get(name: str, default=None) -> object:
        """ Get subobject by name.

        :raises substanced.folder.FolderKeyError: if `name` is not in this pool
        """

    def __contains__(name) -> bool:
        """Check if this pool contains an subobject named by name."""

    def add(name: str, other) -> str:
        """ Add subobject other.

        :returns: The name used to place the subobject in the
        folder (a derivation of ``name``, usually the result of
        ``self.check_name(name)``).
        """

    def check_name(name: str) -> str:
        """ Check that the passed name is valid.

        :returns: The name.
        :raises substanced.folder.FolderKeyError:
            if 'name' already exists in this pool.
        :raises ValueError: if 'name' contains '@@', slashes or is empty.
        """

    def next_name(subobject, prefix='') -> str:
        """Return Name for subobject."""

    def add_next(subobject, prefix='') -> str:
        """Add new subobject and auto generate name."""

    def add_service(service_name: str, other) -> str:
        """Add a term:`service` to this folder named `service_name`."""

    def find_service(service_name: str, *sub_service_names) -> IResource:
        """ Return a :term:`service` named by `service_name`.

        :param service_name: Search in this pool and his :term:`lineage` for a
                             service named `service_name`
        :param sub_service_names: If provided traverse the service to find
                                  the give sub service name. If the sub service
                                  is found, use it to travers to the next
                                  sub service name.

        :return: Return  the :term:`service` for the given context.
                 If nothing is found return None.

        This is a shortcut for :func:`substanced.service.find_service`.
        """


class IServicePool(IPool, IService):

    """Pool serving as a :term:`service`."""


class IItem(IPool):

    """Pool for any versionable objects (DAG), tags and related Pools. """


class ISimple(IResource):

    """Simple resource without versions and children."""


class ITag(ISimple):

    """Tag to link specific versions."""


class IItemVersion(ISimple):

    """Versionable resource, created during a Participation Process."""


class SheetReferenceClass(ReferenceClass):

    """Reference a source and target with a specific ISheet interface.

    Uses class attributes "target_*" and "source_*" to set tagged values.
    """

    def __init__(self, *arg, **kw):
        try:
            attrs = arg[2] or {}
        except IndexError:
            attrs = kw.get('attrs', {})
        # get class attribute values and remove them
        si = attrs.pop('source_integrity', False)
        ti = attrs.pop('target_integrity', False)
        so = attrs.pop('source_ordered', False)
        to = attrs.pop('target_ordered', False)
        sif = attrs.pop('source_isheet', ISheet)
        sifa = attrs.pop('source_isheet_field', u'')
        tif = attrs.pop('target_isheet', ISheet)
        # initialize interface class
        InterfaceClass.__init__(self, *arg, **kw)
        # set tagged values based on attribute values
        self.setTaggedValue('source_integrity', si)
        self.setTaggedValue('target_integrity', ti)
        self.setTaggedValue('source_ordered', so)
        self.setTaggedValue('target_ordered', to)
        self.setTaggedValue('source_isheet', sif)
        self.setTaggedValue('source_isheet_field', sifa)
        self.setTaggedValue('target_isheet', tif)


SheetReference = SheetReferenceClass('SheetReference',
                                     __module__='adhocracy_core.interfaces')


class SheetToSheet(SheetReference):

    """Base type to reference resource ISheets."""


class NewVersionToOldVersion(SheetReference):

    """Base type to reference an old ItemVersion."""


class IResourceSheetModified(IObjectEvent):

    """An event type sent when a resource sheet is modified."""

    object = Attribute('The modified resource')
    isheet = Attribute('The modified sheet interface of the resource')
    registry = Attribute('The pyramid registry')
    old_appstruct = Attribute('The old :term:`appstruct` data')
    new_appstruct = Attribute('The new :term:`appstruct` data')
    request = Attribute('The current request for additional permission checks'
                        'or None (for testing/scripting).')


class IResourceCreatedAndAdded(IObjectEvent):

    """An event type sent when a new IResource is created and added."""

    object = Attribute('The new resource')
    parent = Attribute('The parent of the new resource')
    registry = Attribute('The pyramid registry')
    creator = Attribute('User resource object of the authenticated User')


class IItemVersionNewVersionAdded(IObjectEvent):

    """An event type sent when a new ItemVersion is added."""

    object = Attribute('The old ItemVersion followed by the new one')
    new_version = Attribute('The new ItemVersion')
    registry = Attribute('The pyramid registry')
    creator = Attribute('User resource object of the authenticated User')


class ISheetReferencedItemHasNewVersion(IObjectEvent):

    """An event type sent when a referenced ItemVersion has a new follower."""

    object = Attribute('The resource referencing the outdated ItemVersion.')
    isheet = Attribute('The sheet referencing the outdated ItemVersion')
    isheet_field = Attribute('The sheet field referencing the outdated '
                             'ItemVersion')
    old_version = Attribute('The referenced but outdated ItemVersion')
    new_version = Attribute('The follower of the outdated ItemVersion')
    root_versions = Attribute('Non-empty list of roots of the ItemVersion '
                              '(only resources that can be reached from one '
                              'of the roots should be updated)')
    registry = Attribute('The pyramid registry')
    creator = Attribute('User resource object of the authenticated User')


class ISheetReferenceModified(IObjectEvent):  # pragma: no cover

    """An event type sent when a sheet back reference was added/removed.

    See Subtypes for more detailed semantic.
    """

    object = Attribute('The referenced resource')
    isheet = Attribute('The referenced sheet.')
    reference = Attribute('The Reference with `object` as target.')
    registry = Attribute('The pyramid registry')


class ISheetBackReferenceAdded(ISheetReferenceModified):  # pragma: no cover

    """An event type sent when a sheet back reference was added."""


class ISheetBackReferenceRemoved(ISheetReferenceModified):  # pragma: no cover

    """An event type sent when a sheet back reference was removed."""


class ILocalRolesModfied(IObjectEvent):

    """An event type send when an resource`s :term:`local role` is modified."""

    object = Attribute('The resource being modified')
    new_local_roles = Attribute('The new resource`s local roles')
    old_local_roles = Attribute('The old resource`s local roles')
    registry = Attribute('The pyramid registry')


class ITokenManger(Interface):  # pragma: no cover

    def create_token(userid: str) -> str:
        """ Create authentication token for :term:`userid`."""

    def get_user_id(token: str) -> str:
        """ Get :term:`userid` for authentication token.

        :returns: user id for this token
        :raises KeyError: if there is no corresponding `userid`
        """

    def delete_token(token: str):
        """ Delete authentication token."""


class ChangelogMetadata(namedtuple('ChangelogMetadata',
                                   ['modified', 'created', 'followed_by',
                                    'resource'])):

    """Metadata to track modified resources during one transaction.

    Fields:
    -------

    modified (bool):
        Resource sheets (:class:`adhocracy_core.interfaces.IResourceSheet`) are
        modified.
    created (bool):
        This resource is created and added to a pool.
    followed_by (None or IResource):
        A new Version (:class:`adhocracy_core.interfaces.IItemVersion`) follows
        this resource
    resource (None or IResource):
        The resource that is modified/created.
    """


class IRolesUserLocator(IUserLocator):  # pragma: no cover

    """Adapter responsible for returning a user or get info about it."""

    def get_roleids(userid: str) -> list:
        """Return the roles for :term:`userid` or `None`.

        We return 'None' if the the user does not exists to provide a similar
        behavior as :func:`substanced.interfaces.IUserLocator.get_groupids`.
        """

    def get_group_roleids(userid: str) -> list:
        """Return the group roleids for :term:`userid` or None."""

    def get_groupids(userid: str) -> list:
        """Get :term:`groupid`s for term:`userid` or return None."""

    def get_groups(userid: str) -> list:
        """Get :term:`group`s for term:`userid` or return None."""

    def get_user_by_activation_path(activation_path: str) -> IResource:
        """Find user per activation path or return None."""


class IRoleACLAuthorizationPolicy(IAuthorizationPolicy):  # pragma: no cover

    """A :term:`authorization policy` supporting rule based permissions."""

    group_prefix = Attribute('Prefix to generate the :term:`groupid`')

    role_prefix = Attribute('Prefix to generate the :term:`roleid`')

    def permits(context, principals: list, permission: str)\
            -> ACLPermitsResult:
        """Check that one `principal` has the `permission` for `context`.

        This method extends the behavior of :func:`ACLAuthorizationPolicy`.
        If a principal has the suffix 'group:' the :class:`IRolesUserLocator`
        is called to retrieve the list of roles for this principal. These
        roles extend the given `principals`.
        """


class IRateValidator(Interface):  # pragma: no cover

    """Adapter responsible for validating rates about rateables."""

    def validate(self, rate: int) -> bool:
        """Return True if rate is valid, False otherwise."""

    def helpful_error_message(self) -> str:
        """Return a error message that explains which values are allowed."""


class Reference(namedtuple('Reference', 'source isheet field target')):

    """Fields: source isheet field target."""
