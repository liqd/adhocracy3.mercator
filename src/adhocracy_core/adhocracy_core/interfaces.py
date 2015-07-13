"""Interfaces for plugable dependencies, basic metadata structures."""
from collections import Iterable
from collections import namedtuple
from enum import Enum

from pyramid.interfaces import ILocation
from pyramid.interfaces import IAuthorizationPolicy
from pyramid.interfaces import IRequest
from pyramid.security import ACLPermitsResult
from zope.deprecation import deprecated
from zope.interface import Attribute
from zope.interface import Interface
from zope.interface.interface import InterfaceClass
from zope.interface.interfaces import IObjectEvent

from substanced.interfaces import IPropertySheet
from substanced.interfaces import ReferenceClass
from substanced.interfaces import IUserLocator
from substanced.interfaces import IService
from substanced.interfaces import IWorkflow


class ISheet(Interface):

    """Marker interface for resources to enable a specific sheet type."""


Dimensions = namedtuple('Dimensions', ['width', 'height'])
"""Dimensions of a two-dimensional object (e.g. image)."""


class SheetMetadata(namedtuple('SheetMetadata',
                               ['isheet',
                                'sheet_class',
                                'schema_class',
                                'permission_view',
                                'permission_edit',
                                'permission_create',
                                'readable',
                                'editable',
                                'creatable',
                                'create_mandatory',
                                'mime_type_validator',
                                'image_sizes',
                                ])):

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
        Permission to view or search for this data.
    permission_edit:
        Permission to edit this data.
    permission_create:
        Permission to create a new resource with this sheet data.
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


deprecated('IPostPoolSheet', 'Not used anymore; kept for evolution scripts.')


class IPredicateSheet(ISheet):

    """Marker interface for predicate sheets.

    A predicate sheet has outgoing references named `subject`
    and  `object`. It represents a subject-predicate-object data
    structure like :term:`RDF` triples.
    """


class IResourceSheet(IPropertySheet):  # pragma: no cover

    """Sheet for resources to get/set the sheet data structure."""

    meta = Attribute('SheetMetadata')
    registry = Attribute('pyramid registry')

    def set(appstruct, omit=(), send_event=True, request=None,
            omit_readonly=True) -> bool:
        """ Store ``appstruct`` dictionary data.

        :param send_event: throw edit event.
        :param request: the current pyramid request for additional permission
                        checks, may be None.
        :param omit_readonly: do not store readonly ``appstruct`` data.
        """

    def get(params: dict={}, add_back_references=True) -> dict:
        """ Get ``appstruct`` dictionary data.

        :param params: optional parameters that can modify the appearance
        of the returned dictionary. Valid keys/values are defined in
        :class:`adhocracy_core.interfaces.SearchQuery`.
        :param add_backrefs: allow to omit back references
        """

    def get_cstruct(request, params: dict={}):
        """Return cstruct data.

        Bind `request` and `context` (self.context) to colander schema
        (self.schema). Get sheet appstruct data and serialize.

        :param params: optional parameters that can modify the appearance
        of the returned dictionary, e.g. query parameters in a GET request
        """

    def delete_field_values(fields: [str]):
        """Delete values for every field name in `fields`."""


class ResourceMetadata(namedtuple('ResourceMetadata',
                                  ['content_name',
                                   'iresource',
                                   'content_class',
                                   'permission_create',
                                   'is_implicit_addable',
                                   'basic_sheets',
                                   'extended_sheets',
                                   'after_creation',
                                   'use_autonaming',
                                   'autonaming_prefix',
                                   'use_autonaming_random',
                                   'element_types',
                                   'item_type',
                                   ])):

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
    permission_create:
        Permission to create and add this resource to the object hierarchy.
    is_implicit_addable:
        Make this type addable if supertype is addable.
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
    use_autonaming_random:
        Use random the name if the new content object is added to the parent.
        You can enable only one, autonaming or random autonaming.

    IPool fields:
    -------------

    element_types:
        Set addable content types, class heritage is honored.

    IItem fields:
    -------------

    item_type:
        Set addable content types, class heritage is honored
    """

    def _add(self, **kw):
        """Add elements to the value identified by key."""
        last_modified = self
        for key, value in kw.items():
            new_value = getattr(last_modified, key) + value
            last_modified = last_modified._replace(**{key: new_value})
        return last_modified


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
    # TODO remove find_service, substanced.util.find_service does the same


class IServicePool(IPool, IService):

    """Pool serving as a :term:`service`."""


class IItem(IPool):

    """Pool for any versionable objects (DAG), tags and related Pools. """


class ISimple(IResource):

    """Simple resource without versions and children."""


class ITag(ISimple):

    """Tag to link specific versions."""


class IItemVersion(IResource):

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


class ISheetReferenceNewVersion(IObjectEvent):

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
    is_batchmode = Attribute('Flag to do sheet autoupdates in batch request '
                             'mode.')


class ISheetBackReferenceModified(IObjectEvent):  # pragma: no cover

    """An event type sent when a sheet back reference was added/removed.

    See Subtypes for more detailed semantic.
    """

    object = Attribute('The referenced resource')
    isheet = Attribute('The referenced sheet.')
    reference = Attribute('The Reference with `object` as target.')
    registry = Attribute('The pyramid registry')


class ISheetBackReferenceAdded(ISheetBackReferenceModified):

    """An event type sent when a sheet back reference was added."""


class ISheetBackReferenceRemoved(ISheetBackReferenceModified):

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


class VisibilityChange(Enum):

    """Track changes in the visibility of a resource."""

    visible = 1
    """Was and is visible"""

    invisible = 2
    """Was and is NOT visible"""

    concealed = 3
    """Was visible but is now invisible"""

    revealed = 4
    """Was invisible but is now visible"""


class ChangelogMetadata(namedtuple('ChangelogMetadata',
                                   ['modified',
                                    'created',
                                    'followed_by',
                                    'resource',
                                    'last_version',
                                    'changed_descendants',
                                    'changed_backrefs',
                                    'visibility'])):

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
    last_version_in_transaction (None or IResource):
        The last Version created in this transaction (assuming linear history)
        (only for :class:`adhocracy_core.interfaces.IItem`)
    changed_descendants (bool): child or grandchild is modified or has
                                changed_backrefs
    changed_backrefs (bool): References targeting this resource are changed
    visibility (VisibilityChange):
        Tracks the visibility of the resource and whether it has changed
    """


class AuditlogEntry(namedtuple('AuditlogEntry', ['name',
                                                 'resource_path',
                                                 'user_name',
                                                 'user_path'])):

    """Metadata to log which user modifies resources.

    Fields:
    -------

    name (AuditlogAction):
        name of action executed by user
    resource_path: (str):
        modified resource path (:term:`location`)
    user_name: (str):
        name of responsible user
    user_path:
        :term:`user_id` of responsible user
    """


class AuditlogAction(Enum):

    """Name of the Resource modification action."""

    created = 'created'
    modified = 'modified'
    invisible = 'invisible'
    concealed = 'concealed'
    revealed = 'revealed'


SearchResult = namedtuple('SearchResult', ['elements',
                                           'count',
                                           'frequency_of',
                                           'group_by'])


search_result = SearchResult(elements=[],
                             count=0,
                             frequency_of={},
                             group_by={})


class SearchQuery(namedtuple('Query', ['interfaces',
                                       'indexes',
                                       'references',
                                       'root',
                                       'depth',
                                       'only_visible',
                                       'allows',
                                       'resolve',
                                       'sort_by',
                                       'reverse',
                                       'limit',
                                       'offset',
                                       'frequency_of',
                                       'group_by',
                                       ])):

    """Query parameters to search resources.

    Search resources:
    -----------------

    interfaces (IInterface or (IInterface)):
        Resource type (iresource) or sheet (isheet) interfaces
    indexes ({str:object}):
        Mapping index name to wanted index value. Available indexes are defined
        in :class:`adhocracy_core.catalog.adhocracy`
    references (Reference):
        References with (source, isheet, isheet_field, target).
        If `source` is None search for resources referencing target
        (back references).
        If `target` is None search for resources referenced by source
        (reference).
    root (IResource):
       root resource to start searching  in descendants
    depth (int):
       path depth to search descendants
    only_visible (bool):
        filter hidden and deleted resources
    allows ([str], str):
        filter resources that don't allow the :term:`principal`s  the given
        permission ([principal], permission).

    Present search result
    ----------------------

    resolve (bool):
        return `elements` list of resources or lazy iterator set
    sort_by (str):
        index name to sort result. Available indexes are defined in
        :class:`adhocracy_core.catalog.adhocracy` and
        :class:`substanced.catalog.system`
    reverse (bool):
        reverse sort
    limit (int):
        max number of resources in search result
    offset (int):
        starting position of resources in search result (only works together
        with `limit`)
    frequency_of (str):
        index name to count frequency of indexed values.
    group_by (str):
        index name to group result resources by indexed value.
    """


search_query = SearchQuery(interfaces=(),
                           indexes={},
                           references=(),
                           root=None,
                           depth=0,
                           only_visible=False,
                           allows=(),
                           resolve=False,
                           sort_by='',
                           reverse=False,
                           limit=0,
                           offset=0,
                           frequency_of='',
                           group_by='',
                           )


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

    """Reference between two resources.

    Fields:
    -------

    source (IResource):
        Referencing resource
    isheet (IInterface):
        Resource sheet of source with referencing field
    field (str):
        Referencing field
    target (IResource):
        Referenced resource
    """


class HTTPCacheMode(Enum):

    """Caching Mode for :class:`IHTTPCacheStrategy`s.

    You can change the mode in you pyramid ini file with the
    `adhocracy_core.caching.http.mode` setting.
    """

    no_cache = 1
    """Make all cache strategies set do not cache header only."""

    without_proxy_cache = 2
    """Make all cache strategies set headers that work without a proxy cache"""

    with_proxy_cache = 3
    """Make all cache strategies set headers that only work with a proxy cache
    between webserver and backend.
    The proxy cache has to accepts purge requests form the backend.
    To make this work you have to set the `adhocracy_core.caching.http.pureurl`
    setting in you pyramid ini file.
    """


class IHTTPCacheStrategy(Interface):  # pragma: no cover

    """Strategy to set http cache headers."""

    def set_cache_headers_for_mode(mode: HTTPCacheMode):
        """Set response cache headers according to :class:`HTTPCacheMode`."""

    def check_conditional_request():
        """Check if conditional_request and raise 304 Error if needed."""


class IAdhocracyWorkflow(IWorkflow):  # pragma: no cover

    def get_next_states(context, request: IRequest) -> [str]:
        """Get states you can trigger a transition to."""
