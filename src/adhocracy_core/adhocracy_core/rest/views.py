"""Rest API views."""
from copy import deepcopy
from logging import getLogger

from colander import drop
from colander import Invalid
from colander import MappingSchema
from colander import SchemaNode
from colander import SequenceSchema
from cornice.util import json_error
from cornice.util import extract_request_data
from substanced.interfaces import IUserLocator
from pyramid.events import NewResponse
from pyramid.httpexceptions import HTTPMethodNotAllowed
from pyramid.request import Request
from pyramid.view import view_config
from pyramid.view import view_defaults
from pyramid.security import remember

from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ISimple
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import ILocation
from adhocracy_core.rest.schemas import ResourceResponseSchema
from adhocracy_core.rest.schemas import ItemResponseSchema
from adhocracy_core.rest.schemas import POSTItemRequestSchema
from adhocracy_core.rest.schemas import POSTLoginEmailRequestSchema
from adhocracy_core.rest.schemas import POSTLoginUsernameRequestSchema
from adhocracy_core.rest.schemas import POSTResourceRequestSchema
from adhocracy_core.rest.schemas import PUTResourceRequestSchema
from adhocracy_core.rest.schemas import GETPoolRequestSchema
from adhocracy_core.rest.schemas import GETItemResponseSchema
from adhocracy_core.rest.schemas import GETResourceResponseSchema
from adhocracy_core.rest.schemas import OPTIONResourceResponseSchema
from adhocracy_core.rest.schemas import add_get_pool_request_extra_fields
from adhocracy_core.schema import AbsolutePath
from adhocracy_core.schema import References
from adhocracy_core.utils import get_iresource
from adhocracy_core.utils import strip_optional_prefix
from adhocracy_core.utils import to_dotted_name
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_user
from adhocracy_core.resources.root import IRootPool
from adhocracy_core.sheets.user import IPasswordAuthentication
import adhocracy_core.sheets.pool


logger = getLogger(__name__)


def validate_post_root_versions(context, request: Request):
    """Check and transform the 'root_version' paths to resources."""
    # FIXME: make this a colander validator and move to schema.py
    # use the catalog to find IItemversions
    root_versions = request.validated.get('root_versions', [])
    valid_root_versions = []
    for root in root_versions:
        if not IItemVersion.providedBy(root):
            error = 'This resource is not a valid ' \
                    'root version: {}'.format(request.resource_url(root))
            request.errors.add('body', 'root_versions', error)
            continue
        valid_root_versions.append(root)

    request.validated['root_versions'] = valid_root_versions


def validate_request_data(context: ILocation, request: Request,
                          schema=MappingSchema(), extra_validators=[]):
    """ Validate request data.

    :param context: passed to validator functions
    :param request: passed to validator functions
    :param schema: Schema to validate. Data to validate is extracted from the
                   request.body. For schema nodes with attribute `location` ==
                   `querystring` the data is extracted from the query string.
                   The validated data (dict or list) is stored in the
                   `request.validated` attribute.
                   The `None` value is allowed to disable schema validation.
    :param extra_validators: Functions called after schema validation.
                             The passed arguments are `context` and  `request`.
                             The should append errors to `request.errors` and
                             validated data to `request.validated`.

    :raises _JSONError: HTTP 400 for bad request data.
    """
    parent = context if request.method == 'POST' else context.__parent__
    schema_with_binding = schema.bind(context=context, request=request,
                                      parent_pool=parent)
    qs, headers, body, path = extract_request_data(request)
    validate_body_or_querystring(body, qs, schema_with_binding, context,
                                 request)
    _validate_extra_validators(extra_validators, context, request)
    _raise_if_errors(request)


def validate_body_or_querystring(body, qs, schema: MappingSchema,
                                 context: IResource, request: Request):
    """Validate the querystring if this is a GET request, the body otherwise.

    This allows using just a single schema for all kinds of requests.
    """
    if isinstance(schema, GETPoolRequestSchema):
        schema = add_get_pool_request_extra_fields(qs, schema, context,
                                                   request.registry)
    if request.method.upper() == 'GET':
        _validate_schema(qs, schema, request,
                         location='querystring')
    else:
        _validate_schema(body, schema, request, location='body')


def _validate_schema(cstruct: object, schema: MappingSchema, request: Request,
                     location='body'):
    """Validate that the :term:`cstruct` data is conform to the given schema.

    :param request: request with list like `errors` attribute to append errors
                    and the dictionary attribute `validated` to add validated
                    data.
    :param location: filter schema nodes depending on the `location` attribute.
                     The default value is `body`.
    """
    if isinstance(schema, SequenceSchema):
        _validate_list_schema(schema, cstruct, request, location)
    elif isinstance(schema, MappingSchema):
        _validate_dict_schema(schema, cstruct, request, location)
    else:
        error = 'Validation for schema {} is unsupported.'.format(str(schema))
        raise(Exception(error))


def _validate_list_schema(schema: SequenceSchema, cstruct: list,
                          request: Request, location='body'):
    if location != 'body':  # for now we only support location == body
        return
    child_cstructs = schema.cstruct_children(cstruct)
    try:
        request.validated = schema.deserialize(child_cstructs)
    except Invalid as err:
        _add_colander_invalid_error_to_request(err, request, location)


def _validate_dict_schema(schema: MappingSchema, cstruct: dict,
                          request: Request, location='body'):
    validated = {}
    nodes_with_cstruct = [n for n in schema if n.name in cstruct]
    nodes_without_cstruct = [n for n in schema if n.name not in cstruct]

    for node in nodes_without_cstruct:
        appstruct = node.deserialize()
        if appstruct is not drop:
            validated[node.name] = appstruct
    for node in nodes_with_cstruct:
        node_cstruct = cstruct[node.name]
        try:
            validated[node.name] = node.deserialize(node_cstruct)
        except Invalid as err:
            _add_colander_invalid_error_to_request(err, request, location)
    if getattr(schema.typ, 'unknown', None) == 'preserve':
        # Schema asks us to preserve other cstruct values
        for name, value in cstruct.items():
            if name not in validated:
                validated[name] = value
    request.validated.update(validated)


def _add_colander_invalid_error_to_request(error: Invalid, request: Request,
                                           location: str):
    for name, msg in error.asdict().items():
        request.errors.add(location, name, msg)


def _validate_extra_validators(validators: list, context, request: Request):
    """Run `validators` functions. Assuming schema validation run before."""
    if request.errors:
        return
    for val in validators:
        val(context, request)


def _raise_if_errors(request: Request):
    """Raise :class:`cornice.errors._JSONError` and log if request.errors."""
    if not request.errors:
        return
    logger.warning('Found %i validation errors in request: <%s>',
                   len(request.errors), request.body)
    for error in request.errors:
        logger.warning('  %s', error)
    request.validated = {}
    raise json_error(request.errors)


class RESTView:

    """Class stub with request data validation support.

    Subclasses must implement the wanted request methods
    and configure the pyramid view::

        @view_defaults(
            renderer='simplejson',
            context=IResource,
            http_cache=0,
        )
        class MySubClass(RESTView):
            validation_GET = (MyColanderSchema, [my_extra_validation_function])

            @view_config(request_method='GET')
            def get(self):
            ...
    """

    validation_OPTIONS = (None, [])
    validation_HEAD = (None, [])
    validation_GET = (None, [])
    validation_PUT = (None, [])
    validation_POST = (None, [])

    def __init__(self, context, request):
        self.context = context
        """Context Resource."""
        self.request = request
        """:class:`pyramid.request.Request`."""
        schema_class, validators = _get_schema_and_validators(self, request)
        validate_request_data(context, request,
                              schema=schema_class(),
                              extra_validators=validators)

    def options(self) -> dict:
        raise HTTPMethodNotAllowed()

    def get(self) -> dict:
        raise HTTPMethodNotAllowed()

    def put(self) -> dict:
        raise HTTPMethodNotAllowed()

    def post(self) -> dict:
        raise HTTPMethodNotAllowed()

    def delete(self) -> dict:
        raise HTTPMethodNotAllowed()


def _get_schema_and_validators(view_class, request: Request) -> tuple:
    http_method = request.method.upper()
    validation_attr = 'validation_' + http_method
    schema, validators = getattr(view_class, validation_attr, (None, []))
    return schema or MappingSchema, validators


@view_defaults(
    renderer='simplejson',
    context=IResource,
    http_cache=0,
)
class ResourceRESTView(RESTView):

    """Default view for Resources, implements get and options."""

    def __init__(self, context, request):
        super().__init__(context, request)
        self.registry = request.registry.content
        """:class:`pyramid.registry.Registry`."""

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Get possible request/response data structures and http methods."""
        addables = self.registry.resource_addables(self.context, self.request)
        sheets_view = self.registry.resource_sheets(self.context, self.request,
                                                    onlyviewable=True)
        sheets_edit = self.registry.resource_sheets(self.context, self.request,
                                                    onlyeditable=True)

        cstruct_singleton = OPTIONResourceResponseSchema().serialize()
        cstruct = deepcopy(cstruct_singleton)
        for sheet in sheets_edit:
            cstruct['PUT']['request_body']['data'][sheet] = {}
            cstruct['PUT']['request_body']['content_type'] = ''
            cstruct['PUT']['response_body']['content_type'] = ''
        cstruct['PUT']['response_body']['content_type'] = ''
        for sheet in sheets_view:
            cstruct['GET']['response_body']['data'][sheet] = {}
            cstruct['GET']['response_body']['content_type'] = ''
        for type, sheets in addables.items():
            names = sheets['sheets_optional'] + sheets['sheets_mandatory']
            sheets_dict = dict([(s, {}) for s in names])
            post_data = {'content_type': type, 'data': sheets_dict}
            cstruct['POST']['request_body'].append(post_data)
            cstruct['POST']['response_body']['content_type'] = ''
        cstruct['POST']['response_body']['content_type'] = ''
        return cstruct

    @view_config(request_method='GET')
    def get(self) -> dict:
        """Get resource data."""
        schema = GETResourceResponseSchema().bind(request=self.request)
        appstruct = _get_resource_response_appstruct(self.context)
        cstruct = schema.serialize(appstruct)
        cstruct['data'] = self._get_sheets_data_cstruct()
        return cstruct

    def _get_sheets_data_cstruct(self):
        queryparams = self.request.validated if self.request.validated else {}
        sheets_view = self.registry.resource_sheets(self.context, self.request,
                                                    onlyviewable=True)
        data_cstruct = {}
        for sheet in sheets_view.values():
            key = sheet.meta.isheet.__identifier__
            schema = sheet.schema.bind(context=self.context,
                                       request=self.request)
            appstruct = sheet.get(params=queryparams)
            if sheet.meta.isheet is adhocracy_core.sheets.pool.IPool:
                _set_pool_sheet_elements_serialization_form(schema,
                                                            queryparams)
                # FIXME? readd the get_cstruct method but with parameters
                # 'request'/'context'. Then we can handle this stuff at
                #  one place, the pool sheet package.
            cstruct = schema.serialize(appstruct)
            data_cstruct[key] = cstruct
        return data_cstruct


def _set_pool_sheet_elements_serialization_form(schema: MappingSchema,
                                                queryparams: dict):
    if queryparams.get('elements', 'path') != 'content':
        return
    elements_node = schema['elements']
    elements_typ_copy = deepcopy(elements_node.children[0].typ)
    elements_typ_copy.serialization_form = 'content'
    elements_node.children[0].typ = elements_typ_copy


def _get_resource_response_appstruct(resource: IResource) -> dict:
        iresource = get_iresource(resource)
        return {
            'path': resource,
            'content_type': iresource.__identifier__,
        }


@view_defaults(
    renderer='simplejson',
    context=ISimple,
    http_cache=0,
)
class SimpleRESTView(ResourceRESTView):

    """View for simples (non versionable), implements get, options and put."""

    validation_PUT = (PUTResourceRequestSchema, [])

    @view_config(request_method='PUT',
                 content_type='application/json')
    def put(self) -> dict:
        """Edit resource and get response data."""
        sheets = self.registry.resource_sheets(self.context, self.request,
                                               onlyeditable=True)
        appstructs = self.request.validated.get('data', {})
        for sheetname, appstruct in appstructs.items():
            sheet = sheets[sheetname]
            sheet.set(appstruct)
        schema = ResourceResponseSchema().bind(request=self.request)
        appstruct = _get_resource_response_appstruct(self.context)
        cstruct = schema.serialize(appstruct)
        return cstruct


@view_defaults(
    renderer='simplejson',
    context=IPool,
    http_cache=0,
)
class PoolRESTView(SimpleRESTView):

    """View for Pools, implements get, options, put and post."""

    validation_GET = (GETPoolRequestSchema, [])

    validation_POST = (POSTResourceRequestSchema, [])

    @view_config(request_method='GET')
    def get(self) -> dict:
        """Get resource data."""
        # This delegation method is necessary since otherwise validation_GET
        # won't be found.
        return super().get()

    def build_post_response(self, resource) -> dict:
        """Build response data structure for a POST request. """
        appstruct = _get_resource_response_appstruct(resource)
        if IItem.providedBy(resource):
            appstruct['first_version_path'] = self._get_first_version(resource)
            schema = ItemResponseSchema().bind(request=self.request)
        else:
            schema = ResourceResponseSchema().bind(request=self.request)
        return schema.serialize(appstruct)

    def _get_first_version(self, item: IItem) -> IItemVersion:
        for child in item.values():
            if IItemVersion.providedBy(child):
                return child

    @view_config(request_method='POST',
                 content_type='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        resource_type = self.request.validated['content_type']
        appstructs = self.request.validated.get('data', {})
        creator = get_user(self.request)
        resource = self.registry.create(resource_type, self.context,
                                        creator=creator,
                                        appstructs=appstructs)
        return self.build_post_response(resource)


@view_defaults(
    renderer='simplejson',
    context=IItem,
    http_cache=0,
)
class ItemRESTView(PoolRESTView):

    """View for Items and ItemVersions, overwrites GET and  POST handling."""

    validation_POST = (POSTItemRequestSchema, [validate_post_root_versions])

    @view_config(request_method='GET')
    def get(self) -> dict:
        """Get resource data."""
        schema = GETItemResponseSchema().bind(request=self.request)
        appstruct = _get_resource_response_appstruct(self.context)
        first_version = self._get_first_version(self.context)
        if first_version is not None:
            appstruct['first_version_path'] = first_version
        cstruct = schema.serialize(appstruct)
        cstruct['data'] = self._get_sheets_data_cstruct()
        return cstruct

    @view_config(request_method='POST',
                 content_type='application/json')
    def post(self):
        """Create new resource and get response data."""
        resource_type = self.request.validated['content_type']
        appstructs = self.request.validated.get('data', {})
        creator = get_user(self.request)
        root_versions = self.request.validated.get('root_versions', [])
        resource = self.registry.create(resource_type, self.context,
                                        appstructs=appstructs,
                                        creator=creator,
                                        root_versions=root_versions)
        return self.build_post_response(resource)


@view_defaults(
    renderer='simplejson',
    context=IRootPool,
    http_cache=0,
    name='meta_api'
)
class MetaApiView(RESTView):

    """Access to metadata about the API specification of this installation.

    Returns a JSON document describing the existing resources and sheets.
    """

    def _describe_resources(self, resources_meta):
        """Build a description of the resources registered in the system.

        Args:
          resources_meta (dict): mapping from resources names to metadata

        Returns:
          resource_map (dict): a dict (suitable for JSON serialization) that
                               describes all the resources registered in the
                               system.
        """
        resource_map = {}

        for name, metadata in resources_meta.items():
            prop_map = {}

            # List of sheets
            sheets = []
            sheets.extend(metadata.basic_sheets)
            sheets.extend(metadata.extended_sheets)
            prop_map['sheets'] = [to_dotted_name(s) for s in sheets]

            # Main element type if this is a pool or item
            if metadata.item_type:
                prop_map['item_type'] = to_dotted_name(metadata.item_type)

            # Other addable element types
            if metadata.element_types:
                element_names = []
                for typ in metadata.element_types:
                    element_names.append(to_dotted_name(typ))
                prop_map['element_types'] = element_names

            resource_map[name] = prop_map
        return resource_map

    def _describe_sheets(self, sheet_metadata):
        """Build a description of the sheets used in the system.

        Args:
          sheet_metadata: mapping of sheet names to metadata about them, as
            returned by the registry

        Returns:
          A dict (suitable for JSON serialization) that describes the sheets
          and their fields

        """
        sheet_map = {}
        for sheet_name, metadata in sheet_metadata.items():
            # readable and create_mandatory flags are currently defined for
            # the whole sheet, but we copy them as attributes into each field
            # definition, since this might change in the future.
            # (The _sheet_field_readable method already allows overwriting the
            # readable flag on a field-by-field basis, but it's somewhat
            # ad-hoc.)
            fields = []

            # Create field definitions
            for node in metadata.schema_class().children:

                fieldname = node.name
                valuetype = type(node)
                valuetyp = type(node.typ)
                typ = to_dotted_name(valuetyp)
                containertype = None
                targetsheet = None
                readonly = getattr(node, 'readonly', False)

                # If the outer type is not a container and it's not
                # just a generic SchemaNode, we use the outer type
                # as "valuetype" since it provides most specific
                # information (e.g. "adhocracy_core.schema.Identifier"
                # instead of just "SingleLIne")
                if valuetype is not SchemaNode:
                    typ = to_dotted_name(valuetype)

                if issubclass(valuetype, References):
                    empty_appstruct = node.default
                    containertype = empty_appstruct.__class__.__name__
                    typ = to_dotted_name(AbsolutePath)

                if hasattr(node, 'reftype'):
                    # set targetsheet
                    reftype = node.reftype
                    target_isheet = reftype.getTaggedValue('target_isheet')
                    source_isheet = reftype.getTaggedValue('source_isheet')
                    isheet = source_isheet if node.backref else target_isheet
                    targetsheet = to_dotted_name(isheet)

                typ_stripped = strip_optional_prefix(typ, 'colander.')

                fielddesc = {
                    'name': fieldname,
                    'valuetype': typ_stripped,
                    'create_mandatory':
                        False if readonly else metadata.create_mandatory,
                    'editable': False if readonly else metadata.editable,
                    'creatable': False if readonly else metadata.creatable,
                    'readable': metadata.readable,
                }
                if containertype is not None:
                    fielddesc['containertype'] = containertype
                if targetsheet is not None:
                    fielddesc['targetsheet'] = targetsheet

                fields.append(fielddesc)

            # For now, each sheet definition only contains a 'fields' attribute
            # listing the defined fields
            sheet_map[sheet_name] = {'fields': fields}

        return sheet_map

    @view_config(request_method='GET')
    def get(self) -> dict:
        """Get the API specification of this installation as JSON."""
        # Collect info about all resources
        resources_meta = self.request.registry.content.resources_meta
        resource_map = self._describe_resources(resources_meta)

        # Collect info about all sheets referenced by any of the resources
        sheet_metadata = self.request.registry.content.sheets_meta
        sheet_map = self._describe_sheets(sheet_metadata)

        struct = {'resources': resource_map,
                  'sheets': sheet_map,
                  }
        return struct


def _add_no_such_user_or_wrong_password_error(request: Request):
    request.errors.add('body', 'password',
                       'User doesn\'t exist or password is wrong')


def validate_login_name(context, request: Request):
    """Validate the user name of a login request.

    If valid, the user object is added as 'user' to
    `request.validated`.
    """
    name = request.validated['name']
    locator = request.registry.getMultiAdapter((context, request),
                                               IUserLocator)
    user = locator.get_user_by_login(name)
    if user is None:
        _add_no_such_user_or_wrong_password_error(request)
    else:
        request.validated['user'] = user


def validate_login_email(context, request: Request):
    """Validate the email address of a login request.

    If valid, the user object is added as 'user' to
    `request.validated`.
    """
    email = request.validated['email']
    locator = request.registry.getMultiAdapter((context, request),
                                               IUserLocator)
    user = locator.get_user_by_email(email)
    if user is None:
        _add_no_such_user_or_wrong_password_error(request)
    else:
        request.validated['user'] = user


def validate_login_password(context, request: Request):
    """Validate the password of a login request.

    Requires the user object as `user` in `request.validated`.
    """
    user = request.validated.get('user', None)
    if user is None:
        return
    password_sheet = get_sheet(user, IPasswordAuthentication)
    password = request.validated['password']
    try:
        valid = password_sheet.check_plaintext_password(password)
    except ValueError:
        valid = False
    if not valid:
        _add_no_such_user_or_wrong_password_error(request)


@view_defaults(
    renderer='simplejson',
    context=IRootPool,
    http_cache=0,
)
class LoginUsernameView(RESTView):

    """Log in a user via their name."""

    validation_POST = (POSTLoginUsernameRequestSchema,
                       [validate_login_name, validate_login_password])

    @view_config(name='login_username',
                 request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for login_username view.

        FIXME: Return something useful. This currently only exist in order to
        satisfy the preflight request, which browsers do in CORS situations
        before doing the actual POST.

        """
        return {}

    @view_config(name='login_username',
                 request_method='POST',
                 content_type='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        return _login_user(self.request)


def _login_user(request: Request) -> dict:
    """Log-in a user and return a response indicating success."""
    user = request.validated['user']
    user_path = request.resource_url(user)
    headers = remember(request, user_path) or {}
    user_path = headers['X-User-Path']
    user_token = headers['X-User-Token']
    return {'status': 'success',
            'user_path': user_path,
            'user_token': user_token}


@view_defaults(
    renderer='simplejson',
    context=IRootPool,
    http_cache=0,
)
class LoginEmailView(RESTView):

    """Log in a user via their email address."""

    validation_POST = (POSTLoginEmailRequestSchema,
                       [validate_login_email, validate_login_password])

    @view_config(name='login_email',
                 request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for login_email view.

        FIXME: Return something useful. This currently only exist in order to
        satisfy the preflight request, which browsers do in CORS situations
        before doing the actual POST.

        """
        return {}

    @view_config(name='login_email',
                 request_method='POST',
                 content_type='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        return _login_user(self.request)


def add_cors_headers_subscriber(event):
    """Add CORS headers to response."""
    event.response.headers.update({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
        'Origin, Content-Type, Accept, X-User-Path, X-User-Token',
        'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS',
    })


def includeme(config):
    """Register Views."""
    config.scan('.views')
    config.add_subscriber(add_cors_headers_subscriber, NewResponse)
