"""Rest API views."""
from copy import deepcopy
from datetime import datetime
from datetime import timezone
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
from pyramid.traversal import resource_path

from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ISimple
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import ILocation
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.resources.asset import IAssetView
from adhocracy_core.resources.asset import IAssetsService
from adhocracy_core.resources.asset import validate_and_complete_asset
from adhocracy_core.resources.principal import IUser
from adhocracy_core.resources.principal import IUsersService
from adhocracy_core.rest.schemas import BlockExplanationResponseSchema
from adhocracy_core.rest.schemas import ResourceResponseSchema
from adhocracy_core.rest.schemas import ItemResponseSchema
from adhocracy_core.rest.schemas import POSTActivateAccountViewRequestSchema
from adhocracy_core.rest.schemas import POSTItemRequestSchema
from adhocracy_core.rest.schemas import POSTLoginEmailRequestSchema
from adhocracy_core.rest.schemas import POSTLoginUsernameRequestSchema
from adhocracy_core.rest.schemas import POSTReportAbuseViewRequestSchema
from adhocracy_core.rest.schemas import POSTResourceRequestSchema
from adhocracy_core.rest.schemas import PUTResourceRequestSchema
from adhocracy_core.rest.schemas import GETPoolRequestSchema
from adhocracy_core.rest.schemas import GETItemResponseSchema
from adhocracy_core.rest.schemas import GETResourceResponseSchema
from adhocracy_core.rest.schemas import options_resource_response_data_dict
from adhocracy_core.rest.schemas import add_get_pool_request_extra_fields
from adhocracy_core.schema import AbsolutePath
from adhocracy_core.schema import References
from adhocracy_core.sheets.asset import retrieve_asset_file
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.metadata import view_blocked_by_metadata
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_user
from adhocracy_core.utils import strip_optional_prefix
from adhocracy_core.utils import to_dotted_name
from adhocracy_core.utils import unflatten_multipart_request
from adhocracy_core.resources.root import IRootPool
from adhocracy_core.sheets.principal import IPasswordAuthentication
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
    if request.content_type == 'multipart/form-data':
        body = unflatten_multipart_request(request)
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
        try:
            schema = add_get_pool_request_extra_fields(qs, schema, context,
                                                       request.registry)
        except Invalid as err:  # pragma: no cover
            _add_colander_invalid_error_to_request(err, request,
                                                   location='querystring')
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
                   len(request.errors), _show_request_body(request))
    for error in request.errors:
        logger.warning('  %s', error)
    request.validated = {}
    raise json_error(request.errors)


def _show_request_body(request: Request) -> str:
    """
    Show the request body.

    In case of multipart/form-data requests (file upload), only the 120
    first characters of the body are shown.
    """
    result = request.body
    if request.content_type == 'multipart/form-data' and len(result) > 120:
        result = '{}...'.format(result[:120])
    return result


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
        """Return options for view.

        Note: This default implementation currently only exist in order to
        satisfy the preflight request, which browsers do in CORS situations
        before doing an actual POST request. Subclasses still have to
        configure the view and delegate to this implementation explictly if
        they want to use it.
        """
        return {}

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
        context = self.context
        request = self.request
        registry = self.registry
        empty = {}  # tiny performance tweak
        cstruct = deepcopy(options_resource_response_data_dict)

        if request.has_permission('edit_sheet', context):
            edits = self.registry.get_sheets_edit(context, request)
            put_sheets = [(s.meta.isheet.__identifier__, empty) for s in edits]
            if put_sheets:
                cstruct['PUT']['request_body']['data'] = dict(put_sheets)
            else:
                del cstruct['PUT']
        else:
            del cstruct['PUT']

        if request.has_permission('view', context):
            views = self.registry.get_sheets_read(context, request)
            get_sheets = [(s.meta.isheet.__identifier__, empty) for s in views]
            if get_sheets:
                cstruct['GET']['response_body']['data'] = dict(get_sheets)
            else:
                del cstruct['GET']
        else:
            del cstruct['GET']

        is_users = IUsersService.providedBy(context) \
            and request.has_permission('add_user', self.context)
        # FIXME move the iuser specific part the UsersRestView
        if request.has_permission('add_resource', self.context) or is_users:
            addables = registry.get_resources_meta_addable(context, request)
            if addables:
                for resource_meta in addables:
                    iresource = resource_meta.iresource
                    resource_typ = iresource.__identifier__
                    creates = registry.get_sheets_create(context, request,
                                                         iresource)
                    sheet_typs = [s.meta.isheet.__identifier__ for s in
                                  creates]
                    sheets_dict = dict.fromkeys(sheet_typs, empty)
                    post_data = {'content_type': resource_typ,
                                 'data': sheets_dict}
                    cstruct['POST']['request_body'].append(post_data)
            else:
                del cstruct['POST']
        else:
            del cstruct['POST']

        # FIXME? maybe simplify options response data structure,
        # do we really need request/response_body, content_type,..?
        return cstruct

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """Get resource data (unless deleted or hidden)."""
        response_if_blocked = self.respond_if_blocked()
        if response_if_blocked is not None:
            return response_if_blocked
        schema = GETResourceResponseSchema().bind(request=self.request,
                                                  context=self.context)
        cstruct = schema.serialize()
        cstruct['data'] = self._get_sheets_data_cstruct()
        return cstruct

    def respond_if_blocked(self):
        """
        Set 410 Gone and construct response if resource is deleted or hidden.

        Otherwise return None.
        Note that subclasses MUST overwriting `get()` MUST invoke this method!
        """
        block_explanation = view_blocked_by_metadata(self.context,
                                                     self.request.registry)
        if block_explanation:
            self.request.response.status_code = 410  # Gone
            schema = BlockExplanationResponseSchema().bind(
                request=self.request, context=self.context)
            return schema.serialize(block_explanation)
        else:
            return None

    def _get_sheets_data_cstruct(self):
        queryparams = self.request.validated if self.request.validated else {}
        sheets_view = self.registry.get_sheets_read(self.context,
                                                    self.request)
        data_cstruct = {}
        for sheet in sheets_view:
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


@view_defaults(
    renderer='simplejson',
    context=ISimple,
    http_cache=0,
)
class SimpleRESTView(ResourceRESTView):

    """View for simples (non versionable), implements get, options and put."""

    validation_PUT = (PUTResourceRequestSchema, [])

    @view_config(request_method='PUT',
                 permission='edit_sheet',
                 content_type='application/json')
    def put(self) -> dict:
        """Edit resource and get response data."""
        sheets = self.registry.get_sheets_edit(self.context, self.request)
        appstructs = self.request.validated.get('data', {})
        for sheet in sheets:
            name = sheet.meta.isheet.__identifier__
            if name in appstructs:
                sheet.set(appstructs[name],
                          registry=self.request.registry,
                          request=self.request)
        schema = ResourceResponseSchema().bind(request=self.request,
                                               context=self.context)
        cstruct = schema.serialize()
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

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """Get resource data."""
        # This delegation method is necessary since otherwise validation_GET
        # won't be found.
        return super().get()

    def build_post_response(self, resource) -> dict:
        """Build response data structure for a POST request. """
        appstruct = {}
        if IItem.providedBy(resource):
            appstruct['first_version_path'] = self._get_first_version(resource)
            schema = ItemResponseSchema().bind(request=self.request,
                                               context=resource)
        else:
            schema = ResourceResponseSchema().bind(request=self.request,
                                                   context=resource)
        return schema.serialize(appstruct)

    def _get_first_version(self, item: IItem) -> IItemVersion:
        for child in item.values():
            if IItemVersion.providedBy(child):
                return child

    @view_config(request_method='POST',
                 permission='add_resource',
                 content_type='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        iresource = self.request.validated['content_type']
        resource_type = iresource.__identifier__
        appstructs = self.request.validated.get('data', {})
        creator = get_user(self.request)
        resource = self.registry.create(resource_type,
                                        self.context,
                                        creator=creator,
                                        appstructs=appstructs,
                                        request=self.request)
        return self.build_post_response(resource)

    @view_config(request_method='PUT',
                 permission='edit_sheet',
                 content_type='application/json')
    def put(self) -> dict:
        return super().put()


@view_defaults(
    renderer='simplejson',
    context=IItem,
    http_cache=0,
)
class ItemRESTView(PoolRESTView):

    """View for Items and ItemVersions, overwrites GET and  POST handling."""

    validation_POST = (POSTItemRequestSchema, [validate_post_root_versions])

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """Get resource data."""
        response_if_blocked = self.respond_if_blocked()
        if response_if_blocked is not None:
            return response_if_blocked
        schema = GETItemResponseSchema().bind(request=self.request,
                                              context=self.context)
        appstruct = {}
        first_version = self._get_first_version(self.context)
        if first_version is not None:
            appstruct['first_version_path'] = first_version
        cstruct = schema.serialize(appstruct)
        cstruct['data'] = self._get_sheets_data_cstruct()
        return cstruct

    @view_config(request_method='POST',
                 permission='add_resource',
                 content_type='application/json')
    def post(self):
        """Create new resource and get response data."""
        iresource = self.request.validated['content_type']
        resource_type = iresource.__identifier__
        appstructs = self.request.validated.get('data', {})
        creator = get_user(self.request)
        root_versions = self.request.validated.get('root_versions', [])
        resource = self.registry.create(resource_type,
                                        self.context,
                                        appstructs=appstructs,
                                        creator=creator,
                                        root_versions=root_versions,
                                        request=self.request)
        return self.build_post_response(resource)


@view_defaults(
    renderer='simplejson',
    context=IUsersService,
    http_cache=0,
)
class UsersRESTView(PoolRESTView):

    """View the IUsersService pool overwrites POST handling."""

    @view_config(request_method='POST',
                 permission='add_user',
                 content_type='application/json')
    def post(self):
        return super().post()


@view_defaults(
    renderer='simplejson',
    context=IAssetsService,
    http_cache=0,
)
class AssetsServiceRESTView(PoolRESTView):

    """View allowing multipart requests for asset upload."""

    @view_config(request_method='POST',
                 permission='add_asset',
                 content_type='multipart/form-data')
    def post(self):
        return super().post()


@view_defaults(
    renderer='simplejson',
    context=IAsset,
    http_cache=0,
)
class AssetRESTView(SimpleRESTView):

    """View for assets, allows PUTting new versions via multipart."""

    @view_config(request_method='PUT',
                 permission='add_asset',
                 content_type='multipart/form-data')
    def put(self) -> dict:
        result = super().put()
        validate_and_complete_asset(self.context, self.request.registry)
        return result


@view_defaults(
    renderer='simplejson',
    context=IAssetView,
    http_cache=3600,  # FIXME how long should assets be cached?
)
class AssetViewRESTView(SimpleRESTView):

    """
    View for downloading assets as binary blobs.

    Allows GET, but no POST or PUT.
    """

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """Get asset data (unless deleted or hidden)."""
        response_if_blocked = self.respond_if_blocked()
        if response_if_blocked is not None:
            return response_if_blocked
        file = retrieve_asset_file(self.context, self.request.registry)
        return file.get_response(self.context, self.request.registry)

    def put(self) -> dict:
        raise HTTPMethodNotAllowed()

    def post(self) -> dict:
        raise HTTPMethodNotAllowed()


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
          resources_meta (dict): mapping from iresource interfaces to metadata

        Returns:
          resource_map (dict): a dict (suitable for JSON serialization) that
                               describes all the resources registered in the
                               system.
        """
        resource_map = {}

        for iresource, resource_meta in resources_meta.items():
            prop_map = {}

            # List of sheets
            sheets = []
            sheets.extend(resource_meta.basic_sheets)
            sheets.extend(resource_meta.extended_sheets)
            prop_map['sheets'] = [to_dotted_name(s) for s in sheets]

            # Main element type if this is a pool or item
            if resource_meta.item_type:
                prop_map['item_type'] = to_dotted_name(resource_meta.item_type)

            # Other addable element types
            if resource_meta.element_types:
                element_names = []
                for typ in resource_meta.element_types:
                    element_names.append(to_dotted_name(typ))
                prop_map['element_types'] = element_names

            resource_map[to_dotted_name(iresource)] = prop_map
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
        for isheet, sheet_meta in sheet_metadata.items():
            # readable and create_mandatory flags are currently defined for
            # the whole sheet, but we copy them as attributes into each field
            # definition, since this might change in the future.
            # (The _sheet_field_readable method already allows overwriting the
            # readable flag on a field-by-field basis, but it's somewhat
            # ad-hoc.)
            fields = []

            # Create field definitions
            for node in sheet_meta.schema_class().children:

                fieldname = node.name
                valuetype = type(node)
                valuetyp = type(node.typ)
                typ = to_dotted_name(valuetyp)
                containertype = None
                targetsheet = None
                readonly = getattr(node, 'readonly', False)

                if issubclass(valuetype, References):
                    empty_appstruct = node.default
                    containertype = empty_appstruct.__class__.__name__
                    typ = to_dotted_name(AbsolutePath)
                elif isinstance(node, SequenceSchema):
                    containertype = 'list'
                    typ = to_dotted_name(type(node.children[0]))
                elif valuetype is not SchemaNode:
                    # If the outer type is not a container and it's not
                    # just a generic SchemaNode, we use the outer type
                    # as "valuetype" since it provides most specific
                    # information (e.g. "adhocracy_core.schema.Identifier"
                    # instead of just "SingleLine")
                    typ = to_dotted_name(valuetype)

                if hasattr(node, 'reftype'):
                    # set targetsheet
                    reftype = node.reftype
                    target_isheet = reftype.getTaggedValue('target_isheet')
                    source_isheet = reftype.getTaggedValue('source_isheet')
                    isheet_ = source_isheet if node.backref else target_isheet
                    targetsheet = to_dotted_name(isheet_)

                typ_stripped = strip_optional_prefix(typ, 'colander.')

                fielddesc = {
                    'name': fieldname,
                    'valuetype': typ_stripped,
                    'create_mandatory':
                        False if readonly else sheet_meta.create_mandatory,
                    'editable': False if readonly else sheet_meta.editable,
                    'creatable': False if readonly else sheet_meta.creatable,
                    'readable': sheet_meta.readable,
                }
                if containertype is not None:
                    fielddesc['containertype'] = containertype
                if targetsheet is not None:
                    fielddesc['targetsheet'] = targetsheet

                fields.append(fielddesc)

            # For now, each sheet definition only contains a 'fields' attribute
            # listing the defined fields
            sheet_map[to_dotted_name(isheet)] = {'fields': fields}

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

    If valid and activated, the user object is added as 'user' to
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
    password_sheet = get_sheet(user, IPasswordAuthentication,
                               registry=request.registry)
    password = request.validated['password']
    try:
        valid = password_sheet.check_plaintext_password(password)
    except ValueError:
        valid = False
    if not valid:
        _add_no_such_user_or_wrong_password_error(request)


def validate_account_active(context, request: Request):
    """Ensure that the user account is already active.

    Requires the user object as `user` in `request.validated`.

    No error message is added if there were earlier errors, as that would
    leak information (indicating that a not-yet-activated account already
    exists).
    """
    user = request.validated.get('user', None)
    if user is None or request.errors:
        return
    if not user.active:
        request.errors.add('body', 'name', 'User account not yet activated')


@view_defaults(
    renderer='simplejson',
    context=IRootPool,
    http_cache=0,
    name='login_username',
)
class LoginUsernameView(RESTView):

    """Log in a user via their name."""

    validation_POST = (POSTLoginUsernameRequestSchema,
                       [validate_login_name,
                        validate_login_password,
                        validate_account_active])

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return super().options()

    @view_config(request_method='POST',
                 content_type='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        return _login_user(self.request)


def _login_user(request: Request) -> dict:
    """Log-in a user and return a response indicating success."""
    user = request.validated['user']
    userid = resource_path(user)
    headers = remember(request, userid) or {}
    user_path = headers['X-User-Path']
    user_token = headers['X-User-Token']
    return {'status': 'success',
            'user_path': user_path,
            'user_token': user_token}


@view_defaults(
    renderer='simplejson',
    context=IRootPool,
    http_cache=0,
    name='login_email',
)
class LoginEmailView(RESTView):

    """Log in a user via their email address."""

    validation_POST = (POSTLoginEmailRequestSchema,
                       [validate_login_email,
                        validate_login_password,
                        validate_account_active])

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return super().options()

    @view_config(request_method='POST',
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


def validate_activation_path(context, request: Request):
    """Validate the user name of a login request.

    If valid and activated, the user object is added as 'user' to
    `request.validated`.
    """
    path = request.validated['path']
    locator = request.registry.getMultiAdapter((context, request),
                                               IUserLocator)
    user = locator.get_user_by_activation_path(path)
    registry = request.registry
    if user is None or _activation_time_window_has_expired(user, registry):
        request.errors.add('body', 'path',
                           'Unknown or expired activation path')
    else:
        user.active = True
        request.validated['user'] = user
    if user is not None:
        user.activation_path = None  # activation path can only be used once


def _activation_time_window_has_expired(user: IUser, registry) -> bool:
    """Check that user account was created less than 7 days ago."""
    metadata = get_sheet(user, IMetadata, registry=registry)
    creation_date = metadata.get()['creation_date']
    timedelta = datetime.now(timezone.utc) - creation_date
    return timedelta.days >= 7


@view_defaults(
    renderer='simplejson',
    context=IRootPool,
    http_cache=0,
    name='activate_account',
)
class ActivateAccountView(RESTView):

    """Log in a user via their name."""

    validation_POST = (POSTActivateAccountViewRequestSchema,
                       [validate_activation_path])

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return super().options()

    @view_config(request_method='POST',
                 content_type='application/json')
    def post(self) -> dict:
        """Activate a user account and log the user in."""
        return _login_user(self.request)


@view_defaults(
    renderer='string',
    context=IRootPool,
    http_cache=0,
    name='report_abuse',
)
class ReportAbuseView(RESTView):

    """Receive and process an abuse complaint."""

    validation_POST = (POSTReportAbuseViewRequestSchema, [])

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return super().options()

    @view_config(request_method='POST',
                 content_type='application/json')
    def post(self) -> dict:
        """Receive and process an abuse complaint."""
        messenger = self.request.registry.messenger
        messenger.send_abuse_complaint(url=self.request.validated['url'],
                                       remark=self.request.validated['remark'],
                                       user=get_user(self.request))
        return ''


def includeme(config):
    """Register Views."""
    config.scan('.views')
    config.add_subscriber(add_cors_headers_subscriber, NewResponse)
