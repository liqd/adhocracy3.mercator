"""Data structures / validation specific to rest api requests."""
from datetime import datetime

from colander import All
from colander import Invalid
from colander import Length
from colander import OneOf
from colander import Range
from colander import Regex
from colander import URL_REGEX
from colander import deferred
from colander import drop
from colander import null
from colander import required
from hypatia.interfaces import IIndexSort
from multipledispatch import dispatch
from pyramid.interfaces import IRequest
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.httpexceptions import HTTPGone
from pyramid.registry import Registry
from pyramid.request import Request
from pyramid.traversal import resource_path
from pyramid.util import DottedNameResolver
from substanced.catalog.indexes import SDIndex
from substanced.util import find_catalog
from substanced.util import find_service
from hypatia.field import FieldIndex
from hypatia.keyword import KeywordIndex
from zope import interface
import colander

from adhocracy_core.events import ResourceSheetModified
from adhocracy_core.rest.exceptions import error_entry
from adhocracy_core.interfaces import FieldComparator
from adhocracy_core.interfaces import FieldSequenceComparator
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IUserLocator
from adhocracy_core.interfaces import KeywordComparator
from adhocracy_core.interfaces import KeywordSequenceComparator
from adhocracy_core.interfaces import Reference as ReferenceTuple
from adhocracy_core.interfaces import SearchQuery
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.resources.principal import IPasswordReset
from adhocracy_core.resources.base import Base
from adhocracy_core.sheets.asset import IAssetData
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.metadata import is_older_than
from adhocracy_core.sheets.principal import IUserBasic
from adhocracy_core.schema import AbsolutePath
from adhocracy_core.schema import SchemaNode
from adhocracy_core.schema import MappingSchema
from adhocracy_core.schema import SequenceSchema
from adhocracy_core.schema import TupleSchema
from adhocracy_core.schema import Boolean
from adhocracy_core.schema import Booleans
from adhocracy_core.schema import ContentType
from adhocracy_core.schema import DateTime
from adhocracy_core.schema import DateTimes
from adhocracy_core.schema import Email
from adhocracy_core.schema import Integer
from adhocracy_core.schema import Integers
from adhocracy_core.schema import Interface
from adhocracy_core.schema import Interfaces
from adhocracy_core.schema import MappingType
from adhocracy_core.schema import Password
from adhocracy_core.schema import Reference
from adhocracy_core.schema import References
from adhocracy_core.schema import Resource
from adhocracy_core.schema import ResourcePathAndContentSchema
from adhocracy_core.schema import ResourcePathSchema
from adhocracy_core.schema import Resources
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import SingleLines
from adhocracy_core.schema import Text
from adhocracy_core.schema import URL
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.principal import IPasswordAuthentication
from adhocracy_core.sheets.principal import IUserExtended
from adhocracy_core.catalog import ICatalogsService
from adhocracy_core.catalog.index import ReferenceIndex
from adhocracy_core.utils import now
from adhocracy_core.utils import unflatten_multipart_request
from adhocracy_core.utils import create_schema
from adhocracy_core.utils import get_reason_if_blocked


resolver = DottedNameResolver()


INDEX_EXAMPLE_VALUES = {
    'default': 'str',
    'reference': Base(),
    'item_creation_date': datetime.now(),
    'rate': 1,
    'rates': 1,
    'interfaces': interface.Interface,
}


def validate_request_data(schema_class: object) -> callable:
    """Decorator for :term:`view` to validate request with `schema`."""
    def validate_decorator(view: callable):
        def view_wrapper(context, request):
            schema = create_schema(schema_class, context, request)
            _validate_request_data(context, request, schema)
            return view(context, request)
        return view_wrapper
    return validate_decorator


def _validate_request_data(context: IResource,
                           request: IRequest,
                           schema: colander.Schema):
    """Validate request data.

    :param context: passed to validator functions
    :param request: passed to validator functions
    :param schema: Schema to validate. Data to validate is extracted from the
                   request.body. For schema nodes with attribute `location` ==
                   `querystring` the data is extracted from the query string.
                   The validated data (dict or list) is stored in the
                   `request.validated` attribute.
    :raises HTTPBadRequest: HTTP 400 for bad request data.
    """
    body = {}
    if request.content_type == 'multipart/form-data':
        body = unflatten_multipart_request(request)
    if request.content_type == 'application/json':
        body = _extract_json_body(request)
    qs = _extract_querystring(request)
    _validate_body_or_querystring(body, qs, schema, context, request)
    if request.errors:
        request.validated = {}
        raise HTTPBadRequest()


def _extract_json_body(request: IRequest) -> object:
    json_body = {}
    if request.body == '':
        request.body = '{}'
    try:
        json_body = request.json_body
    except (ValueError, TypeError) as err:
        error = error_entry('body', None,
                            'Invalid JSON request body'.format(err))
        request.errors.append(error)
    return json_body


def _extract_querystring(request: IRequest) -> dict:
    parameters = {}
    for key, value_encoded in request.GET.items():
        import json
        try:
            value = json.loads(value_encoded)
        except (ValueError, TypeError):
            value = value_encoded
        parameters[key] = value
    return parameters


def _validate_body_or_querystring(body, qs: dict, schema: MappingSchema,
                                  context: IResource, request: IRequest):
    """Validate the querystring if this is a GET request, the body otherwise.

    This allows using just a single schema for all kinds of requests.
    """
    if isinstance(schema, GETPoolRequestSchema):
        try:
            schema = add_arbitrary_filter_nodes(qs,
                                                schema,
                                                context,
                                                request.registry)
        except Invalid as err:  # pragma: no cover
            _add_colander_invalid_error(err, request,
                                        location='querystring')
    if request.method.upper() == 'GET':
        _validate_schema(qs, schema, request,
                         location='querystring')
    else:
        _validate_schema(body, schema, request, location='body')


def _validate_schema(cstruct: object, schema: MappingSchema, request: IRequest,
                     location='body'):
    """Validate that the :term:`cstruct` data is conform to the given schema.

    :param request: request with list like `errors` attribute to append errors
                    and the dictionary attribute `validated` to add validated
                    data.
    :param location: filter schema nodes depending on the `location` attribute.
                     The default value is `body`.
    """
    if isinstance(schema, colander.SequenceSchema):
        _validate_list_schema(schema, cstruct, request, location)
    elif isinstance(schema, colander.MappingSchema):
        _validate_dict_schema(schema, cstruct, request, location)
    else:
        error = 'Validation for schema {} is unsupported.'.format(str(schema))
        raise(Exception(error))


def _validate_list_schema(schema: SequenceSchema, cstruct: list,
                          request: IRequest, location='body'):
    if location != 'body':  # for now we only support location == body
        return
    child_cstructs = schema.cstruct_children(cstruct)
    try:
        request.validated = schema.deserialize(child_cstructs)
    except Invalid as err:
        _add_colander_invalid_error(err, request, location)


def _validate_dict_schema(schema: MappingSchema, cstruct: dict,
                          request: IRequest, location='body'):
    validated = {}
    try:
        validated = schema.deserialize(cstruct)
    except Invalid as err:
        for child in err.children:
            _add_colander_invalid_error(child, request, location)
        if not err.children:
            _add_colander_invalid_error(err, request, location)
    request.validated.update(validated)


def _add_colander_invalid_error(error: Invalid, request: IRequest,
                                location: str):
    for name, msg in error.asdict().items():
        request.errors.append(error_entry(location, name, msg))


def validate_visibility(view: callable):
    """Decorator for :term:`view` to check if `context` is visible.

    :raises HTTPGone: if `context` is deleted or hidden and request method
                      is GET, HEAD, or POST.
    """
    def wrapped_view(context: IResource, request: IRequest):
        _validate_visibility(context, request)
        return view(context, request)
    return wrapped_view


def _validate_visibility(context: IResource, request: IRequest):
    if request.method not in ['HEAD', 'GET', 'POST']:
        return
    block_reason = get_reason_if_blocked(context)
    if block_reason is not None:
        raise HTTPGone(detail=block_reason)


class UpdatedResourcesSchema(MappingSchema):
    """List the resources affected by a transaction."""

    created = Resources()
    modified = Resources()
    removed = Resources()
    changed_descendants = Resources()


class ResourceResponseSchema(ResourcePathSchema):
    """Data structure for responses of Resource requests."""

    updated_resources = UpdatedResourcesSchema()


class ItemResponseSchema(ResourceResponseSchema):
    """Data structure for responses of IItem requests."""

    first_version_path = Resource()


class GETResourceResponseSchema(ResourcePathAndContentSchema):
    """Data structure for Resource GET requests."""


class GETItemResponseSchema(ResourcePathAndContentSchema):
    """Data structure for responses of IItem requests."""

    first_version_path = Resource()


def add_put_data_subschemas(node: MappingSchema, kw: dict):
    """Add the resource sheet schemas that are 'editable'."""
    context = kw['context']
    request = kw['request']
    sheets = request.registry.content.get_sheets_edit(context, request)
    if request.content_type == 'multipart/form-data':
        body = unflatten_multipart_request(request)
    else:
        body = request.json_body
    data = body.get('data', {})
    for sheet in sheets:
        name = sheet.meta.isheet.__identifier__
        if name not in data:
            continue
        schema = sheet.get_schema_with_bindings()
        node.add(schema)


class BlockExplanationResponseSchema(MappingSchema):
    """Data structure explaining a 410 Gone response."""

    reason = SingleLine()
    modified_by = Reference()
    modification_date = DateTime(default=null)


class PUTResourceRequestSchema(MappingSchema):
    """Data structure for Resource PUT requests.

    The subschemas for the Resource Sheets
    """

    data = SchemaNode(MappingType(unknown='raise'),
                      after_bind=add_put_data_subschemas,
                      default={})


def validate_claimed_asset_mime_type(self, node: SchemaNode, appstruct: dict):
    """Validate claimed mime type for the uploaded asset file data."""
    if not appstruct:
        return
    file = _get_sheet_field(appstruct, 'data')
    if not file:
        msg = 'Sheet {} and field {} is missing.'\
            .format(IAssetData.__identifier__, 'data')
        raise Invalid(node['data'], msg=msg)
    claimed_type = _get_sheet_field(appstruct, 'mime_type')
    if not claimed_type:
         msg = 'Sheet {} and field {} is missing.'\
            .format(IAssetMetadata.__identifier__, 'mime_type')
         raise Invalid(node['data'], msg=msg)
    detected_type = file.mimetype
    if claimed_type != detected_type:
        msg = 'Claimed MIME type is {} but file content seems to be {}'
        raise Invalid(node['data'], msg.format(claimed_type, detected_type))


def _get_sheet_field(appstruct: dict, field: str) -> object:
    for sheet_appstruct in appstruct['data'].values():
        for key, value in sheet_appstruct.items():
            if key == field:
                return value


class PUTAssetRequestSchema(PUTResourceRequestSchema):

    """Data structure for Asset PUT requests."""

    validator = validate_claimed_asset_mime_type


def add_post_data_subschemas(node: SchemaNode, kw: dict):
    """Add the resource sheet schemas that are 'creatable'."""
    context = kw['context']
    request = kw['request']
    content_type = _get_resource_type_based_on_request_type(request)
    try:
        iresource = ContentType().deserialize(content_type)
    except Invalid:
        return  # the content type is validated later, so we just ignore errors
    registry = request.registry.content
    creates = registry.get_sheets_create(context, request, iresource)
    for sheet in creates:
        schema = sheet.get_schema_with_bindings()
        node.add(schema)


def _get_resource_type_based_on_request_type(request: Request) -> str:
    if request.content_type == 'application/json':
        return request.json_body.get('content_type')
    elif request.content_type == 'multipart/form-data':
        return request.POST['content_type']
    else:
        raise RuntimeError('Unsupported request content_type: {}'.format(
            request.content_type))


@deferred
def deferred_validate_post_content_type(node, kw):
    """Validate the addable content type for post requests."""
    context = kw['context']
    registry = kw['registry']
    request = kw['request']
    addables = registry.content.get_resources_meta_addable(context, request)
    addable_iresources = [r.iresource for r in addables]
    return OneOf(addable_iresources)


class POSTResourceRequestSchema(PUTResourceRequestSchema):
    """Data structure for Resource POST requests."""

    content_type = ContentType(validator=deferred_validate_post_content_type,
                               missing=required)

    data = SchemaNode(MappingType(unknown='raise'),
                      after_bind=add_post_data_subschemas,
                      default={})


class POSTAssetRequestSchema(POSTResourceRequestSchema):

    """Data structure for Asset POST requests."""

    validator = validate_claimed_asset_mime_type


class AbsolutePaths(SequenceSchema):
    """List of resource paths."""

    path = AbsolutePath()


def validate_root_versions(node: SchemaNode,  value: list):
    """Validate root versions."""
    for root_version in value:
        if not IItemVersion.providedBy(root_version):
            msg = 'This resource is not a valid ' \
                  'root version: {}'.format(resource_path(root_version))
            raise Invalid(node, msg=msg)


class POSTItemRequestSchema(POSTResourceRequestSchema):
    """Data structure for Item and ItemVersion POST requests."""

    root_versions = Resources(missing=[],
                              validator=validate_root_versions)


class POSTResourceRequestSchemaList(SequenceSchema):
    """Overview of POST request/response data structure."""

    request_body = POSTResourceRequestSchema()


class GETLocationMapping(MappingSchema):
    """Overview of GET request/response data structure."""

    request_querystring = SchemaNode(MappingType(), default={})
    request_body = SchemaNode(MappingType(), default={})
    response_body = GETResourceResponseSchema()


class PUTLocationMapping(MappingSchema):
    """Overview of PUT request/response data structure."""

    request_body = PUTResourceRequestSchema()
    response_body = ResourceResponseSchema()


class POSTLocationMapping(MappingSchema):
    """Overview of POST request/response data structure."""

    request_body = SchemaNode(POSTResourceRequestSchemaList(), default=[])
    response_body = ResourceResponseSchema()


class POSTLoginUsernameRequestSchema(MappingSchema):
    """Schema for login requests via username and password."""

    name = SingleLine(missing=required)
    password = Password(missing=required)

    @deferred
    def validator(node: SchemaNode, kw: dict) -> All:
        request = kw['request']
        context = kw['context']
        registry = kw['registry']
        return All(create_validate_login(context,
                                         request,
                                         registry,
                                         'name'),
                   create_validate_login_password(request, registry),
                   create_validate_account_active(request, 'name'),
                   )

def create_validate_activation_path(context,
                                    request: Request,
                                    registry: Registry) -> callable:
    """Validate the users activation `path`.

    If valid and activated, the user object is added as 'user' to
    `request.validated`.
    """
    def validate_activation_path(node, value):
        locator = request.registry.getMultiAdapter((context, request),
                                                   IUserLocator)
        user = locator.get_user_by_activation_path(value)
        error_msg = 'Unknown or expired activation path'
        if user is None:
            raise Invalid(node, error_msg)
        elif is_older_than(user, days=8):
            user.activation_path = None
            raise Invalid(node, error_msg)
        else:
            request.validated['user'] = user
            # TODO we should use a sheet to activate the user.
            user.activate()
            user.activation_path = None
            event = ResourceSheetModified(user, IUserBasic, request.registry, {},
                                          {}, request)
            registry.notify(event)  # trigger reindex activation_path index
    return validate_activation_path


@deferred
def deferred_validate_activation_path(node: SchemaNode,
                                      kw: dict) -> All:
    """Validate activation path and add user."""
    context = kw['context']
    request = kw['request']
    registry = kw['registry']
    return All(Regex('^/activate/'),
               create_validate_activation_path(context,
                                               request,
                                               registry,
                                               ),
               )


class POSTActivateAccountViewRequestSchema(MappingSchema):
    """Schema for account activation."""

    path = SingleLine(missing=required,
                      validator=deferred_validate_activation_path)


error_msg_wrong_login = 'User doesn\'t exist or password is wrong'


def create_validate_login(context,
                          request: Request,
                          registry: Registry,
                          child_node_name: str):
    """Return validator to check the user identifier of a login request.

    :param `child_node_name`: child node to get the login (`email` or `name`)

    If valid, the user object is added as 'user' to `request.validated`.
    """
    def validate_login(node: SchemaNode, value: dict):
        login = value[child_node_name]
        locator = registry.getMultiAdapter((context, request), IUserLocator)
        if child_node_name == 'email':
            login = login.lower().strip()
            user = locator.get_user_by_email(login)
        else:
            user = locator.get_user_by_login(login)
        if user is None:
            error = Invalid(node)
            error.add(Invalid(node['password'], msg=error_msg_wrong_login))
            raise error
        else:
            request.validated['user'] = user
    return validate_login


def create_validate_login_password(request: Request,
                                   registry: Registry) -> callable:
    """Return validator to check the password of a login request.

    Requires the user object as `user` in `request.validated`.
    """
    def validate_login_password(node: SchemaNode, value: dict):
        password = value['password']
        user = request.validated.get('user', None)
        if user is None:
            return
        sheet = registry.content.get_sheet(user, IPasswordAuthentication)
        valid = sheet.check_plaintext_password(password)
        if not valid:
            error = Invalid(node)
            error.add(Invalid(node['password'], msg=error_msg_wrong_login))
            raise error
    return validate_login_password


def create_validate_account_active(request: Request,
                                   child_node_name: str) -> callable:
    """Return validator to check the user account is already active.

    :param `child_node_name`: The name of the child node to raise error.

    Requires the user object as `user` in `request.validated`.
    """
    def validate_user_is_active(node: SchemaNode, value: dict):
        user = request.validated.get('user', None)
        if user is None:
            return
        elif not user.active:
            error = Invalid(node)
            error.add(Invalid(node[child_node_name],
                              msg='User account not yet activated'))
            raise error
    return validate_user_is_active


class POSTLoginEmailRequestSchema(MappingSchema):
    """Schema for login requests via email and password."""

    email = Email(missing=required)
    password = Password(missing=required)

    @deferred
    def validator(node: SchemaNode, kw: dict) -> All:
        request = kw['request']
        context = kw['context']
        registry = kw['registry']
        return All(create_validate_login(context,
                                         request,
                                         registry,
                                         'email'),
                   create_validate_login_password(request, registry),
                   create_validate_account_active(request, 'email'),
                   )


class POSTReportAbuseViewRequestSchema(MappingSchema):
    """Schema for abuse reports."""

    url = URL(missing=required)
    remark = Text(missing='')


class MessageUserReference(SheetToSheet):
    """Dummy reference to validate user resources."""

    target_isheet = IUserExtended


class POSTMessageUserViewRequestSchema(MappingSchema):
    """Schema for messages to a user."""

    recipient = Reference(missing=required,
                          reftype=MessageUserReference)
    title = SingleLine(missing=required)
    text = Text(missing=required)


class BatchHTTPMethod(SingleLine):
    """An HTTP method in a batch request."""

    validator = OneOf(['GET', 'POST', 'PUT', 'OPTIONS'])
    missing = required


class BatchRequestPath(SingleLine):
    """A path in a batch request.

    Either a resource url or a preliminary resource path (a relative path
    preceded by '@') or an absolute path.

    Example values: '@item/v1', 'http://a.org/adhocracy/item/v1', '/item/v1/'
    """

    default = ''
    missing = required
    absolutpath = AbsolutePath.relative_regex
    preliminarypath = '[a-zA-Z0-9\_\-\.\/]+'
    validator = All(Regex('^(' + URL_REGEX + '|'
                          + absolutpath + '|@'
                          + preliminarypath + ')$'),
                    Length(min=1, max=8192))


class POSTBatchRequestItem(MappingSchema):
    """A single item in a batch request, encoding a single request."""

    method = BatchHTTPMethod()
    path = BatchRequestPath()
    """A single item in a batch request, encoding a single request."""

    method = BatchHTTPMethod()
    path = BatchRequestPath()
    body = SchemaNode(MappingType(unknown='preserve'),
                      missing={})
    result_path = BatchRequestPath(missing='')
    result_first_version_path = BatchRequestPath(missing='')


class POSTBatchRequestSchema(SequenceSchema):
    """Schema for batch requests (list of POSTBatchRequestItem's)."""

    items = POSTBatchRequestItem()


class PoolElementsForm(SingleLine):
    """The form of the elements attribute returned by the pool sheet."""

    validator = OneOf(['paths', 'content', 'omit'])
    missing = 'paths'


class PoolQueryDepth(Integer):
    """The nesting depth of descendants in a pool response.

    Either a positive number or the string 'all' to return descendants of
    arbitrary depth.
    """

    missing = drop
    validator = Range(min=1)


@deferred
def deferred_validate_aggregateby(node: SchemaNode, kw):
    """Validate if `value` is an catalog index name`."""
    # TODO In the future we may have indexes where aggregateby doesn't make
    # sense, e.g. username or email. We should have a blacklist to prohibit
    # calling aggregateby on such indexes.
    context = kw['context']
    indexes = _get_indexes(context)
    index_names = [x.__name__ for x in indexes
                   if hasattr(x, 'unique_values')]
    return OneOf(index_names)


@deferred
def deferred_validate_sort(node: SchemaNode, kw: dict):
    """Validate if value is an index name that support sorting."""
    context = kw['context']
    indexes = _get_indexes(context)
    # Check that the index has the IIndexSort interfaces or at least a sort
    # method
    valid_indexes = [x.__name__ for x in indexes
                     if IIndexSort.providedBy(x)
                     or 'sort' in x.__dir__()]
    return OneOf(valid_indexes)


def _get_indexes(context) -> list:
    indexes = []
    system = find_catalog(context, 'system') or {}
    indexes.extend(system.values())
    adhocracy = find_catalog(context, 'adhocracy') or {}
    indexes.extend(adhocracy.values())
    return indexes


class GETPoolRequestSchema(MappingSchema):

    """GET parameters accepted for pool queries."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Raise if unknown to tell client the query parameters are wrong.
        self.typ.unknown = 'raise'

    # TODO For now we don't have a way to specify GET parameters that can
    # be repeated, e.g. 'sheet=Blah&sheet=Blub'. The querystring is converted
    # by Cornice into a MultiDict (http://docs.pylonsproject.org/projects
    # /pyramid/en/master/api/interfaces.html#pyramid.interfaces.IMultiDict),
    # which by default will only return the LAST value if a key is specified
    # several times. One possible workaround is to allow specifying multiple
    # values as a comma-separated list instead of repeated key=value pairs,
    # e.g. 'sheet=Blah,Blub'. This would require a custom Multiple SchemaNode
    # that wraps a SchemaType, e.g.
    # sheet = Multiple(Interface(), missing=None, sep=',')
    # Elements in this schema were multiple values should be allowed:
    # sheet, aggregateby, tag.

    depth = PoolQueryDepth()
    elements = PoolElementsForm(missing=drop)
    count = Boolean(missing=drop)
    sort = SingleLine(missing=drop,
                      validator=deferred_validate_sort)
    reverse = Boolean(missing=drop)
    # TODO: validate limit, offset to be multiple of 10, 20, 50, 100, 200, 500
    limit = Integer(missing=drop)
    offset = Integer(missing=drop)
    aggregateby = SingleLine(missing=drop,
                             validator=deferred_validate_aggregateby)

    def deserialize(self, cstruct=null):  # noqa
        """ Deserialize the :term:`cstruct` into an :term:`appstruct`.

        Adapt key/values to :class:`adhocracy_core.interfaces.SearchQuery`. for
        BBB.
        TODO: CHANGE API according to internal SearchQuery api.
             refactor to follow coding guideline better.
        """
        depth_cstruct = cstruct.get('depth', None)
        if depth_cstruct == 'all':
            cstruct['depth'] = 100
        appstruct = super().deserialize(cstruct)
        search_query = {}
        if appstruct:  # pragma: no branch
            search_query['root'] = self.bindings['context']
        if 'depth' in appstruct:  # pragma: no branch
            depth = appstruct['depth']
            if depth == 100:
                depth = None
            search_query['depth'] = depth
        if 'elements' in appstruct:
            elements = appstruct.get('elements')
            search_query['serialization_form'] = elements
            if elements == 'omit':
                search_query['resolve'] = False
        interfaces = ()
        if 'sheet' in appstruct:
            interfaces = appstruct['sheet']
        if interfaces:
            search_query['interfaces'] = interfaces
        if 'aggregateby' in appstruct:
            search_query['frequency_of'] = appstruct['aggregateby']
            search_query['show_frequency'] = True
        if 'sort' in appstruct:
            search_query['sort_by'] = appstruct['sort']
        if 'limit' in appstruct:
            search_query['limit'] = appstruct['limit']
        if 'offset' in appstruct:
            search_query['offset'] = appstruct['offset']
        if 'reverse' in appstruct:
            search_query['reverse'] = appstruct['reverse']
        if 'count' in appstruct:
            search_query['show_count'] = appstruct['count']
        fields = tuple([x.name for x in GETPoolRequestSchema().children])
        fields += ('sheet',)
        for filter, query in appstruct.items():
            if filter in fields + SearchQuery._fields:
                continue
            if ':' in filter:
                if 'references' not in search_query:  # pragma: no branch
                    search_query['references'] = []
                isheet_name, isheet_field = filter.split(':')
                isheet = resolver.resolve(isheet_name)
                target = appstruct[filter]
                reference = ReferenceTuple(None, isheet, isheet_field, target)
                search_query['references'].append(reference)
            else:
                if 'indexes' not in search_query:
                    search_query['indexes'] = {}
                if filter == 'content_type':
                    search_query['indexes'][
                        'interfaces'] = appstruct['content_type']
                    continue
                search_query['indexes'][filter] = query
        return search_query


def add_arbitrary_filter_nodes(cstruct: dict,
                               schema: GETPoolRequestSchema,
                               context: IResource,
                               registry) -> GETPoolRequestSchema:
    """Add schema nodes for arbitrary/references filters to `schema`."""
    extra_filters = [(k, v) for k, v in cstruct.items() if k not in schema]
    if extra_filters:
        schema = schema.clone()
    catalogs = find_service(context, 'catalogs')
    for filter_name, query in extra_filters:
        if _is_reference_filter(filter_name, registry):
            index_name = 'reference'
        elif filter_name == 'sheet':
            index_name = 'interfaces'
        elif filter_name == 'content_type':
            index_name = 'interfaces'
        elif _is_arbitrary_filter(filter_name, catalogs):
            index_name = filter_name
        else:
            continue  # pragma: no cover
        index = catalogs.get_index(index_name)
        example_value = _get_index_example_value(index)
        node = create_arbitrary_filter_node(index, example_value, query)
        _add_node(schema, node, filter_name)
    return schema


def _is_reference_filter(name: str, registry: Registry) -> bool:
    """
    Check whether a name refers to a reference node in a sheet.

    Raises an error if `name` contains a colon but is not a reference node.
    """
    if ':' not in name:
        return False
    resolve = registry.content.resolve_isheet_field_from_dotted_string
    try:
        isheet, field, node = resolve(name)
    except ValueError:
        dummy_node = SingleLine(name=name)
        raise Invalid(dummy_node, 'No such sheet or field')
    if isinstance(node, (Reference, References)):
        return True
    else:
        dummy_node = SingleLine(name=name)
        raise Invalid(dummy_node, 'Not a reference node')


def _is_arbitrary_filter(name: str, catalogs: ICatalogsService) -> bool:
    """
    Return True if `name' refers to an public arbitrary catalog index.
    """

    if name.startswith('private_'):
        return False
    else:
        index = catalogs.get_index(name)
        return index is not None


def _get_index_example_value(index: SDIndex) -> object:
    """Return example entry from `index` or None if `index` is None."""
    if index is None:
        return None
    if index.__name__ in INDEX_EXAMPLE_VALUES:
        return INDEX_EXAMPLE_VALUES[index.__name__]
    else:
        return INDEX_EXAMPLE_VALUES['default']


def _add_node(schema: MappingSchema, node: SchemaNode, name: str):
    node = node.bind(**schema.bindings)
    node.name = name
    schema.add(node)


@dispatch((FieldIndex, KeywordIndex), str, str)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    return SingleLine()


@dispatch((FieldIndex, KeywordIndex), int, (int, str))  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    return Integer()


@dispatch((FieldIndex, KeywordIndex), bool, (bool, str))  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    return Boolean()


@dispatch(FieldIndex, bool, list)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    if query[0] in FieldSequenceComparator.__members__:
        return FieldComparableBooleans()
    else:
        return FieldComparableBoolean()


@dispatch((FieldIndex, KeywordIndex), datetime, str)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    return DateTime()


@dispatch(FieldIndex, datetime, list)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    if query[0] in FieldSequenceComparator.__members__:
        return FieldComparableDateTimes()
    else:
        return FieldComparableDateTime()


@dispatch(KeywordIndex, interface.interface.InterfaceClass, str)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    return Interface()


@dispatch(ReferenceIndex, object, str)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    return Resource()


@dispatch(KeywordIndex, int, list)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    if query[0] in KeywordSequenceComparator.__members__:
        return KeywordComparableIntegers()
    else:
        return KeywordComparableInteger()


@dispatch(FieldIndex, int, list)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    if query[0] in FieldSequenceComparator.__members__:
        return FieldComparableIntegers()
    else:
        return FieldComparableInteger()


@dispatch(KeywordIndex, str, list)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    if query[0] in KeywordSequenceComparator.__members__:
        return KeywordComparableSingleLines()
    else:
        return KeywordComparableSingleLine()


@dispatch(FieldIndex, str, list)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    if query[0] in FieldSequenceComparator.__members__:
        return FieldComparableSingleLines()
    else:
        return FieldComparableSingleLine()


@dispatch(KeywordIndex, interface.interface.InterfaceClass, list)  # flake8: noqa
def create_arbitrary_filter_node(index, example_value, query):
    if query[0] in KeywordSequenceComparator.__members__:
        return KeywordComparableInterfaces()
    else:
        return KeywordComparableInterface()


class KeywordComparableSchema(SingleLine):
    """SingleLine of KeywordComparable value."""

    validator = OneOf(
        [x for x in KeywordComparator.__members__])


class FieldComparableSchema(SingleLine):
    """SingleLine of FieldComparable value."""

    validator = OneOf(
        [x for x in FieldComparator.__members__])


class KeywordSequenceComparableSchema(SingleLine):
    """SingleLine of KeywordSequenceComparable value."""

    validator = OneOf(
        [x for x in KeywordSequenceComparator.__members__])


class FieldSequenceComparableSchema(SingleLine):
    """SingleLine of FieldSequenceComparable value."""

    validator = OneOf(
        [x for x in FieldSequenceComparator.__members__])


class KeywordComparableSequenceBase(TupleSchema):
    """Tuple with value KeywordSequenceComparable."""

    comparable = KeywordSequenceComparableSchema()


class KeywordComparableIntegers(KeywordComparableSequenceBase):
    """Tuple with values KeywordSequenceComparable and Integers."""

    value = Integers()


class KeywordComparableInterfaces(KeywordComparableSequenceBase):
    """Tuple with values KeywordSequenceComparable and Interfaces."""

    value = Interfaces()


class KeywordComparableSingleLines(KeywordComparableSequenceBase):
    """Tuple with values KeywordSequenceComparable and SingleLines."""

    value = SingleLines()


class KeywordComparableDateTimes(KeywordComparableSequenceBase):
    """Tuple with values KeywordSequenceComparable and DateTimes."""

    value = DateTimes()


class KeywordComparableBooleans(KeywordComparableSequenceBase):
    """Tuple with values KeywordSequenceComparable and Booleans."""

    value = Booleans()


class KeywordComparableBase(TupleSchema):
    """Tuple with value KeywordComparable."""

    comparable = KeywordComparableSchema()


class KeywordComparableInteger(KeywordComparableBase):
    """Tuple with values KeywordComparable and Integer."""

    value = Integer()


class KeywordComparableInterface(KeywordComparableBase):
    """Tuple with values KeywordComparable and Interface."""

    value = Interface()


class KeywordComparableSingleLine(KeywordComparableBase):
    """Tuple with values KeywordComparable and SingleLine."""

    value = SingleLine()


class KeywordComparableBoolean(KeywordComparableBase):
    """Tuple with values KeywordComparable and Boolean."""

    value = Boolean()


class KeywordComparableDateTime(KeywordComparableBase):
    """Tuple with values KeywordComparable and DateTime."""

    value = DateTime()


class FieldComparableSchema(SingleLine):
    """SingleLine of FieldComparable value."""

    validator = OneOf(
        [x for x in FieldComparator.__members__])


class FieldComparableSchema(SingleLine):
    """SingleLine of FieldComparable value."""

    validator = OneOf(
        [x for x in FieldComparator.__members__])


class FieldSequenceComparableSchema(SingleLine):
    """SingleLine of FieldSequenceComparable value."""

    validator = OneOf(
        [x for x in FieldSequenceComparator.__members__])


class FieldSequenceComparableSchema(SingleLine):
    """SingleLine of FieldSequenceComparable value."""

    validator = OneOf(
        [x for x in FieldSequenceComparator.__members__])


class FieldComparableSequenceBase(TupleSchema):
    """Tuple with value FieldSequenceComparable."""

    comparable = FieldSequenceComparableSchema()


class FieldComparableIntegers(FieldComparableSequenceBase):
    """Tuple with values FieldSequenceComparable and Integers."""

    value = Integers()


class FieldComparableInterfaces(FieldComparableSequenceBase):
    """Tuple with values FieldSequenceComparable and Interfaces."""

    value = Interfaces()


class FieldComparableSingleLines(FieldComparableSequenceBase):
    """Tuple with values FieldSequenceComparable and SingleLines."""

    value = SingleLines()


class FieldComparableDateTimes(FieldComparableSequenceBase):
    """Tuple with values FieldSequenceComparable and DateTimes."""

    value = DateTimes()


class FieldComparableBooleans(FieldComparableSequenceBase):
    """Tuple with values FieldSequenceComparable and Booleans."""

    value = Booleans()


class FieldComparableBase(TupleSchema):
    """Tuple with value FieldComparable."""

    comparable = FieldComparableSchema()


class FieldComparableInteger(FieldComparableBase):
    """Tuple with values FieldComparable and Integer."""

    value = Integer()


class FieldComparableInterface(FieldComparableBase):
    """Tuple with values FieldComparable and Interface."""

    value = Interface()


class FieldComparableSingleLine(FieldComparableBase):
    """Tuple with values FieldComparable and SingleLine."""

    value = SingleLine()


class FieldComparableBoolean(FieldComparableBase):
    """Tuple with values FieldComparable and Boolean."""

    value = Boolean()


class FieldComparableDateTime(FieldComparableBase):
    """Tuple with values FieldComparable and DateTime."""

    value = DateTime()


options_resource_response_data_dict =\
    {'GET': {'request_body': {},
             'request_querystring': {},
             'response_body': {'content_type': '',
                               'data': {},
                               'path': ''}},
     'HEAD': {},
     'OPTIONS': {},
     'POST': {'request_body': [],
              'response_body': {'content_type': '',
                                'path': ''}},
     'PUT': {'request_body': {'content_type': '',
                              'data': {}},
             'response_body': {'content_type': '',
                               'path': ''}}}


@deferred
def deferred_validate_password_reset_email(node: SchemaNode, kw: dict):
    """Validate the email address of a password reset request.

    If valid, the user object is added as 'user' to
    `request.validated`.

    :raise Invalid: if no user with this email exists.
    """
    context = kw['context']
    request = kw['request']

    def validate_email(node, value):
        locator = request.registry.getMultiAdapter((context, request),
                                                   IUserLocator)
        user = locator.get_user_by_email(value)
        if user is None:
            msg = 'No user exists with this email: {0}'.format(value)
            raise Invalid(node, msg)
        if not IPasswordAuthentication.providedBy(user):
            msg = 'This user has no password to reset: {0}'.format(value)
            raise Invalid(node, msg)
        if not user.active:
            user.activate()
        request.validated['user'] = user
    return validate_email


class POSTCreatePasswordResetRequestSchema(MappingSchema):

    """Schema to create a user password reset."""

    email = Email(missing=required,
                  validator=deferred_validate_password_reset_email)


@deferred
def validate_password_reset_path(node, kw):
    """Validate password reset and add the user needing password reset."""
    request = kw['request']
    registry = kw['registry']

    def validate_path(node, value):
        if value is None:
            return
        _raise_if_no_password_reset(node, value)
        metadata = registry.content.get_sheet(value, IMetadata).get()
        _raise_if_outdated(node, value, metadata['creation_date'])
        request.validated['user'] = metadata['creator']
    return validate_path


def _raise_if_no_password_reset(node: SchemaNode, value: IPasswordReset):
    if not IPasswordReset.providedBy(value):
        raise Invalid(node, 'This is not a valid password reset.')


def _raise_if_outdated(node: SchemaNode, value: IPasswordReset,
                       creation_date: datetime):
        if (now() - creation_date).days >= 7:
            value.__parent__ = None  # commit_suicide
            msg = 'This password reset is older than 7 days.'
            raise Invalid(node, msg)


class POSTPasswordResetRequestSchema(MappingSchema):
    """Schema to get a user password reset resource."""

    path = Resource(missing=required,
                    validator=validate_password_reset_path,
                    )
    password = Password(missing=required)
