"""Cornice colander schemas und validators to validate request data."""
from substanced.util import find_catalog
import colander

from adhocracy_core.interfaces import IResource
from adhocracy_core.schema import AbsolutePath
from adhocracy_core.schema import AdhocracySchemaNode
from adhocracy_core.schema import Email
from adhocracy_core.schema import Interface
from adhocracy_core.schema import Password
from adhocracy_core.schema import Resource
from adhocracy_core.schema import Resources
from adhocracy_core.schema import Reference
from adhocracy_core.schema import References
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import ResourcePathSchema
from adhocracy_core.schema import ResourcePathAndContentSchema


class ResourceResponseSchema(ResourcePathSchema):

    """Data structure for responses of Resource requests."""


class ItemResponseSchema(ResourceResponseSchema):

    """Data structure for responses of IItem requests."""

    first_version_path = Resource()


class GETResourceResponseSchema(ResourcePathAndContentSchema):

    """Data structure for Resource GET requests."""


class GETItemResponseSchema(ResourcePathAndContentSchema):

    """Data structure for responses of IItem requests."""

    first_version_path = Resource()


def add_put_data_subschemas(node: colander.MappingSchema, kw: dict):
    """Add the resource sheet colander schemas that are 'editable'."""
    context = kw['context']
    request = kw['request']
    sheets = request.registry.content.resource_sheets(context, request,
                                                      onlyeditable=True)
    data = request.json_body.get('data', {})
    sheets_meta = request.registry.content.sheets_meta
    for name in [x for x in sheets if x in data]:
        subschema = sheets_meta[name].schema_class(name=name)
        node.add(subschema.bind(**kw))


class PUTResourceRequestSchema(colander.Schema):

    """Data structure for Resource PUT requests.

    The subschemas for the Resource Sheets
    """

    data = colander.SchemaNode(colander.Mapping(unknown='raise'),
                               after_bind=add_put_data_subschemas,
                               default={})


def add_post_data_subschemas(node: colander.MappingSchema, kw: dict):
    """Add the resource sheet colander schemas that are 'creatable'."""
    context = kw['context']
    request = kw['request']
    resource_type = request.json_body.get('content_type', None)
    data = request.json_body.get('data', {})
    addables = request.registry.content.resource_addables(context, request)
    resource_sheets = addables.get(resource_type, {'sheets_mandatory': [],
                                                   'sheets_optional': []})
    sheets_meta = request.registry.content.sheets_meta
    subschemas = []
    for name in [x for x in resource_sheets['sheets_mandatory'] if x in data]:
        schema = sheets_meta[name].schema_class(name=name)
        subschemas.append(schema)
    for name in [x for x in resource_sheets['sheets_optional'] if x in data]:
        schema = sheets_meta[name].schema_class(name=name, missing={})
        subschemas.append(schema)
    for schema in subschemas:
        node.add(schema.bind(**kw))


@colander.deferred
def deferred_validate_post_content_type(node, kw):
    """Validate the addable content type for post requests."""
    context = kw['context']
    request = kw['request']
    resource_addables = request.registry.content.resource_addables
    addable_content_types = resource_addables(context, request)
    return colander.OneOf(addable_content_types.keys())


class POSTResourceRequestSchema(PUTResourceRequestSchema):

    """Data structure for Resource POST requests."""

    content_type = SingleLine(validator=deferred_validate_post_content_type,
                              missing=colander.required)

    data = colander.SchemaNode(colander.Mapping(unknown='raise'),
                               after_bind=add_post_data_subschemas,
                               default={})


class AbsolutePaths(colander.SequenceSchema):

    """List of resource paths."""

    path = AbsolutePath()


class POSTItemRequestSchema(POSTResourceRequestSchema):

    """Data structure for Item and ItemVersion POST requests."""

    root_versions = Resources(missing=[])


class POSTResourceRequestSchemaList(colander.List):

    """Overview of POST request/response data structure."""

    request_body = POSTResourceRequestSchema()


class GETLocationMapping(colander.Schema):

    """Overview of GET request/response data structure."""

    request_querystring = colander.SchemaNode(colander.Mapping(), default={})
    request_body = colander.SchemaNode(colander.Mapping(), default={})
    response_body = GETResourceResponseSchema()


class PUTLocationMapping(colander.Schema):

    """Overview of PUT request/response data structure."""

    request_body = PUTResourceRequestSchema()
    response_body = ResourceResponseSchema()


class POSTLocationMapping(colander.Schema):

    """Overview of POST request/response data structure."""

    request_body = colander.SchemaNode(POSTResourceRequestSchemaList(),
                                       default=[])
    response_body = ResourceResponseSchema()


class POSTLoginUsernameRequestSchema(colander.Schema):

    """Schema for login requests via username and password."""

    name = colander.SchemaNode(colander.String(),
                               missing=colander.required)
    password = Password(missing=colander.required)


class POSTLoginEmailRequestSchema(colander.Schema):

    """Schema for login requests via email and password."""

    email = Email(missing=colander.required)
    password = Password(missing=colander.required)


class BatchHTTPMethod(colander.SchemaNode):

    """An HTTP method in a batch request."""

    schema_type = colander.String
    validator = colander.OneOf(['GET', 'POST', 'PUT', 'OPTION'])
    missing = colander.required


class BatchRequestPath(AdhocracySchemaNode):

    """A path in a batch request.

    Either a resource url or a preliminary resource path (a relative path
    preceded by '@') or an absolute path.

    Example values: '@item/v1', 'http://a.org/adhocracy/item/v1', '/item/v1/'
    """

    schema_type = colander.String
    default = ''
    missing = colander.required
    absolutpath = AbsolutePath.relative_regex
    preliminarypath = '[a-zA-Z0-9\_\-\.\/]+'
    validator = colander.All(colander.Regex('^' + colander.URL_REGEX + '|'
                                            + absolutpath + '|@'
                                            + preliminarypath + '$'),
                             colander.Length(min=1, max=200))


class POSTBatchRequestItem(colander.Schema):

    """A single item in a batch request, encoding a single request."""

    method = BatchHTTPMethod()
    path = BatchRequestPath()
    body = colander.SchemaNode(colander.Mapping(unknown='preserve'),
                               missing={})
    result_path = BatchRequestPath(missing='')
    result_first_version_path = BatchRequestPath(missing='')


class POSTBatchRequestSchema(colander.SequenceSchema):

    """Schema for batch requests (list of POSTBatchRequestItem's)."""

    items = POSTBatchRequestItem()


class PoolElementsForm(colander.SchemaNode):

    """The form of the elements attribute returned by the pool sheet."""

    schema_type = colander.String
    validator = colander.OneOf(['paths', 'content', 'omit'])
    missing = 'paths'


class PoolQueryDepth(colander.SchemaNode):

    """The nesting depth of descendants in a pool response.

    Either a positive number or the string 'all' to return descendants of
    arbitrary depth.
    """

    schema_type = colander.String
    validator = colander.Regex(r'^\d+|all$')
    missing = '1'


@colander.deferred
def deferred_validate_aggregateby(node: colander.MappingSchema, kw):
    """Validate if `value` is an catalog index with `unique_values`."""
    # FIXME In the future we may have indexes where aggregateby doesn't make
    # sense, e.g. username or email. We should have a blacklist to prohibit
    # calling aggregateby on such indexes.
    context = kw['context']
    adhocracy = find_catalog(context, 'adhocracy') or {}
    adhocracy_index = [k for k, v in adhocracy.items()
                       if 'unique_values' in v.__dir__()]
    system = find_catalog(context, 'system') or {}
    system_index = [k for k, v in system.items()
                    if 'unique_values' in v.__dir__()]
    return colander.OneOf(adhocracy_index + system_index)


class GETPoolRequestSchema(colander.MappingSchema):

    """GET parameters accepted for pool queries."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Raise if unknown to tell client the query parameters are wrong.
        self.typ.unknown = 'raise'

    # FIXME For now we don't have a way to specify GET parameters that can
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

    content_type = colander.SchemaNode(Interface(), missing=colander.drop)
    sheet = colander.SchemaNode(Interface(), missing=colander.drop)
    depth = PoolQueryDepth(missing=colander.drop)
    elements = PoolElementsForm(missing=colander.drop)
    count = colander.SchemaNode(colander.Boolean(), missing=colander.drop)
    aggregateby = colander.SchemaNode(colander.String(), missing=colander.drop,
                                      validator=deferred_validate_aggregateby)


def add_get_pool_request_extra_fields(cstruct: dict,
                                      schema: GETPoolRequestSchema,
                                      context: IResource,
                                      registry) -> GETPoolRequestSchema:
    """Validate arbitrary fields in GETPoolRequestSchema data."""
    extra_fields = _get_unknown_fields(cstruct, schema)
    if not extra_fields:
        return schema
    schema_extra = schema.clone()
    for name in extra_fields:
        if _maybe_reference_filter_node(name, registry):
            _add_reference_filter_node(name, schema_extra)
        elif _maybe_arbitrary_filter_node(name, context):
            _add_arbitrary_filter_node(name, schema_extra)
    return schema_extra


def _get_unknown_fields(cstruct, schema):
    unknown_fields = [key for key in cstruct if key not in schema]
    return unknown_fields


def _maybe_reference_filter_node(name, registry):
    if ':' not in name:
        return False
    resolve = registry.content.resolve_isheet_field_from_dotted_string
    try:
        isheet, field, node = resolve(name)
    except ValueError:
        return False
    if isinstance(node, (Reference, References)):
        return True
    else:
        return False


def _add_reference_filter_node(name, schema):
    node = Resource(name=name).bind(**schema.bindings)
    schema.add(node)


def _maybe_arbitrary_filter_node(name, context):
    catalog = find_catalog(context, 'adhocracy')
    if not catalog:
        return False
    if name in catalog:
        return True
    else:
        return False


def _add_arbitrary_filter_node(name, schema):
    node = SingleLine(name=name).bind(**schema.bindings)
    schema.add(node)


class OPTIONResourceResponseSchema(colander.Schema):

    """Overview of all request/response data structures."""

    GET = GETLocationMapping()
    PUT = PUTLocationMapping()
    POST = POSTLocationMapping()
    HEAD = colander.MappingSchema(default={})
    OPTION = colander.MappingSchema(default={})
