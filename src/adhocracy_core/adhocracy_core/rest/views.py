"""GET/POST/PUT requests processing."""
from collections import defaultdict
from copy import deepcopy
from logging import getLogger

from colander import Invalid
from colander import MappingSchema
from colander import SchemaNode
from colander import SequenceSchema
from substanced.interfaces import IUserLocator
from substanced.util import find_service
from substanced.stats import statsd_timer
from pyramid.httpexceptions import HTTPMethodNotAllowed
from pyramid.httpexceptions import HTTPGone
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.request import Request
from pyramid.view import view_config
from pyramid.view import view_defaults
from pyramid.security import remember
from pyramid.traversal import resource_path
from zope.interface.interfaces import IInterface
from zope.interface import Interface

from adhocracy_core.caching import set_cache_header
from adhocracy_core.events import ResourceSheetModified
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ISimple
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import ILocation
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.resources.asset import IAssetDownload
from adhocracy_core.resources.asset import IAssetsService
from adhocracy_core.resources.asset import validate_and_complete_asset
from adhocracy_core.resources.principal import IUsersService
from adhocracy_core.resources.principal import IPasswordReset
from adhocracy_core.resources.proposal import IProposalVersion
from adhocracy_core.resources.rate import IRateVersion
from adhocracy_core.resources.badge import IBadgeAssignmentsService
from adhocracy_core.rest.schemas import ResourceResponseSchema
from adhocracy_core.rest.schemas import ItemResponseSchema
from adhocracy_core.rest.schemas import POSTActivateAccountViewRequestSchema
from adhocracy_core.rest.schemas import POSTItemRequestSchema
from adhocracy_core.rest.schemas import POSTLoginEmailRequestSchema
from adhocracy_core.rest.schemas import POSTLoginUsernameRequestSchema
from adhocracy_core.rest.schemas import POSTMessageUserViewRequestSchema
from adhocracy_core.rest.schemas import POSTCreatePasswordResetRequestSchema
from adhocracy_core.rest.schemas import POSTPasswordResetRequestSchema
from adhocracy_core.rest.schemas import POSTReportAbuseViewRequestSchema
from adhocracy_core.rest.schemas import POSTResourceRequestSchema
from adhocracy_core.rest.schemas import PUTResourceRequestSchema
from adhocracy_core.rest.schemas import GETPoolRequestSchema
from adhocracy_core.rest.schemas import GETItemResponseSchema
from adhocracy_core.rest.schemas import GETResourceResponseSchema
from adhocracy_core.rest.schemas import options_resource_response_data_dict
from adhocracy_core.rest.schemas import add_arbitrary_filter_nodes
from adhocracy_core.rest.exceptions import error_entry
from adhocracy_core.schema import AbsolutePath
from adhocracy_core.schema import References
from adhocracy_core.sheets.asset import retrieve_asset_file
from adhocracy_core.sheets.badge import get_assignable_badges
from adhocracy_core.sheets.badge import IBadgeAssignment
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.metadata import is_older_than
from adhocracy_core.sheets.workflow import IWorkflowAssignment
from adhocracy_core.sheets.principal import IPasswordAuthentication
from adhocracy_core.sheets.pool import IPool as IPoolSheet
from adhocracy_core.sheets.principal import IUserBasic
from adhocracy_core.utils import extract_events_from_changelog_metadata
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_user
from adhocracy_core.utils import is_batchmode
from adhocracy_core.utils import strip_optional_prefix
from adhocracy_core.utils import to_dotted_name
from adhocracy_core.utils import unflatten_multipart_request
from adhocracy_core.resources.root import IRootPool
from adhocracy_core.workflows.schemas import create_workflow_meta_schema


logger = getLogger(__name__)


def respond_if_blocked(context, request):
    """
    Set 410 Gone and construct response if resource is deleted or hidden.

    Otherwise or it request method is 'options' or 'put' return None
    """
    from adhocracy_core.utils import get_reason_if_blocked
    if request.method not in ['HEAD', 'GET', 'POST']:
        return
    block_reason = get_reason_if_blocked(context)
    if block_reason is not None:
        raise HTTPGone(detail=block_reason)


def validate_post_root_versions(context, request: Request):
    """Check and transform the 'root_version' paths to resources."""
    # TODO: make this a colander validator and move to schema.py
    # use the catalog to find IItemversions
    root_versions = request.validated.get('root_versions', [])
    valid_root_versions = []
    for root in root_versions:
        if not IItemVersion.providedBy(root):
            error = 'This resource is not a valid ' \
                    'root version: {}'.format(request.resource_url(root))
            request.errors.append(error_entry('body', 'root_versions', error))
            continue
        valid_root_versions.append(root)

    request.validated['root_versions'] = valid_root_versions


def validate_request_data(context: ILocation, request: Request,
                          schema=MappingSchema(), extra_validators=[]):
    """Validate request data.

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

    :raises HTTPBadRequest: HTTP 400 for bad request data.
    """
    parent = context if request.method == 'POST' else context.__parent__
    workflow = _get_workflow(context, request)
    schema_with_binding = schema.bind(context=context,
                                      request=request,
                                      registry=request.registry,
                                      workflow=workflow,
                                      parent_pool=parent)
    body = {}
    if request.content_type == 'multipart/form-data':
        body = unflatten_multipart_request(request)
    if request.content_type == 'application/json':
        body = _extract_json_body(request)
    validate_user_headers(request)
    qs = _extract_querystring(request)
    validate_body_or_querystring(body, qs, schema_with_binding, context,
                                 request)
    _validate_extra_validators(extra_validators, context, request)
    if request.errors:
        request.validated = {}
        raise HTTPBadRequest()


def _get_workflow(context: IResource, request: Request):
    if request.method == 'POST':
        return
    get_workflow = request.registry.content.get_workflow
    workflow = get_workflow(context)
    return workflow


def _extract_json_body(request: Request) -> object:
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


def _extract_querystring(request: Request) -> dict:
    parameters = {}
    for key, value_encoded in request.GET.items():
        import json
        try:
            value = json.loads(value_encoded)
        except (ValueError, TypeError):
            value = value_encoded
        parameters[key] = value
    return parameters


def validate_user_headers(request: Request):
    """
    Validate the user headers.

    If the request has a 'X-User-Path' and/or 'X-User-Token' header, we
    ensure that the session takes belongs to the user and is not expired.
    """
    headers = request.headers
    if 'X-User-Path' in headers or 'X-User-Token' in headers:
        if get_user(request) is None:
            error = error_entry('header', 'X-User-Token', 'Invalid user token')
            request.errors.append(error)


def validate_body_or_querystring(body, qs: dict, schema: MappingSchema,
                                 context: IResource, request: Request):
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
    try:
        validated = schema.deserialize(cstruct)
    except Invalid as err:
        for child in err.children:
            _add_colander_invalid_error_to_request(child, request, location)
        if not err.children:
            _add_colander_invalid_error_to_request(err, request, location)
    request.validated.update(validated)


def _add_colander_invalid_error_to_request(error: Invalid, request: Request,
                                           location: str):
    for name, msg in error.asdict().items():
        request.errors.append(error_entry(location, name, msg))


def _validate_extra_validators(validators: list, context, request: Request):
    """Run `validators` functions. Assuming schema validation run before."""
    if request.errors:
        return
    for val in validators:
        val(context, request)


class RESTView:
    """Class stub with request data validation support.

    Subclasses must implement the wanted request methods
    and configure the pyramid view::

        @view_defaults(
            renderer='json',
            context=IResource,
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
        """Initialize self."""
        self.context = context
        """Context Resource."""
        self.request = request
        """:class:`pyramid.request.Request`."""
        self.registry = request.registry
        """:class:`pyramid.registry.Registry`."""
        with statsd_timer('validate', rate=.1, registry=self.registry):
            respond_if_blocked(context, request)
            set_cache_header(context, request)
            schema_class, validators = _get_schema_and_validators(self,
                                                                  request)
            validate_request_data(context, request,
                                  schema=schema_class(),
                                  extra_validators=validators)

    def options(self) -> dict:
        """Return options for view.

        Note: This default implementation currently only exist in order to
        satisfy the preflight request, which browsers do in CORS situations
        before doing an actual POST request. Subclasses still have to
        configure the view and delegate to this implementation explicitly if
        they want to use it.
        """
        return {}

    def get(self) -> dict:
        """HTTP GET."""
        raise HTTPMethodNotAllowed()

    def put(self) -> dict:
        """"HTTP PUT."""
        raise HTTPMethodNotAllowed()

    def post(self) -> dict:
        """HTTP POST."""
        raise HTTPMethodNotAllowed()

    def delete(self) -> dict:
        """HTTP delete."""
        raise HTTPMethodNotAllowed()

    def _build_updated_resources_dict(self) -> dict:
        """Utility method used by several subclasses."""
        result = defaultdict(list)
        changelog_meta = self.request.registry.changelog.values()
        for meta in changelog_meta:
            events = extract_events_from_changelog_metadata(meta)
            for event in events:
                result[event].append(meta.resource)
        return result


def _get_schema_and_validators(view_class, request: Request) -> tuple:
    http_method = request.method.upper()
    validation_attr = 'validation_' + http_method
    schema, validators = getattr(view_class, validation_attr, (None, []))
    return schema or MappingSchema, validators


@view_defaults(
    renderer='json',
    context=IResource,
)
class ResourceRESTView(RESTView):
    """Default view for Resources, implements get and options."""

    def __init__(self, context, request):
        """Initialize self."""
        super().__init__(context, request)
        self.content = request.registry.content
        """:class:`adhocracy_core.content.ResourceContentRegistry`."""

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Get possible request/response data structures and http methods."""
        with statsd_timer('process.options', rate=.1, registry=self.registry):
            cstruct = self._options(self.context, self.request)
        return cstruct

    def _options(self, context: IResource, request: Request) -> dict:
        empty = {}  # tiny performance tweak
        cstruct = deepcopy(options_resource_response_data_dict)

        if request.has_permission('edit_some', context):
            edits = self.content.get_sheets_edit(context, request)
            put_sheets = [(s.meta.isheet.__identifier__, empty) for s in edits]
            if put_sheets:
                put_sheets_dict = dict(put_sheets)
                self._add_metadata_edit_permission_info(put_sheets_dict)
                self._add_workflow_edit_permission_info(put_sheets_dict, edits)
                cstruct['PUT']['request_body']['data'] = put_sheets_dict
            else:
                del cstruct['PUT']
        else:
            del cstruct['PUT']

        if request.has_permission('view', context):
            views = self.content.get_sheets_read(context, request)
            get_sheets = [(s.meta.isheet.__identifier__, empty) for s in views]
            if get_sheets:
                cstruct['GET']['response_body']['data'] = dict(get_sheets)
            else:
                del cstruct['GET']
        else:
            del cstruct['GET']

        is_users = IUsersService.providedBy(context) \
            and request.has_permission('create_user', context)
        # TODO move the is_user specific part the UsersRestView
        if request.has_permission('create', self.context) or is_users:
            addables = self.content.get_resources_meta_addable(context,
                                                               request)
            if addables:
                for resource_meta in addables:
                    iresource = resource_meta.iresource
                    resource_typ = iresource.__identifier__
                    creates = self.content.get_sheets_create(context,
                                                             request,
                                                             iresource)
                    sheet_typs = [s.meta.isheet.__identifier__ for s
                                  in creates]
                    sheets_dict = dict.fromkeys(sheet_typs, empty)
                    post_data = {'content_type': resource_typ,
                                 'data': sheets_dict}
                    cstruct['POST']['request_body'].append(post_data)
            else:
                del cstruct['POST']
        else:
            del cstruct['POST']
        return cstruct

    def _add_metadata_edit_permission_info(self, cstruct: dict):
        """Add info if a user may set the deleted/hidden metadata fields."""
        if IMetadata.__identifier__ not in cstruct:
            return
        # everybody who can PUT metadata can delete the resource
        permission_info = {'deleted': [True, False]}
        if self.request.has_permission('hide', self.context):
            permission_info['hidden'] = [True, False]
        cstruct[IMetadata.__identifier__] = permission_info

    def _add_workflow_edit_permission_info(self, cstruct: dict, edit_sheets):
        """Add info if a user may set the workflow_state workflow field."""
        workflow_sheets = [s for s in edit_sheets
                           if s.meta.isheet.isOrExtends(IWorkflowAssignment)]
        for sheet in workflow_sheets:
            workflow = sheet.get()['workflow']
            if workflow is None:
                states = []
            else:
                states = workflow.get_next_states(self.context, self.request)
            isheet = sheet.meta.isheet
            cstruct[isheet.__identifier__] = {'workflow_state': states}

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """Get resource data (unless deleted or hidden)."""
        metric = self._get_get_metric_name()
        with statsd_timer(metric, rate=.1, registry=self.registry):
            schema = GETResourceResponseSchema().bind(request=self.request,
                                                      context=self.context)
            cstruct = schema.serialize()
            cstruct['data'] = self._get_sheets_data_cstruct()
        return cstruct

    def _get_get_metric_name(self) -> str:
        if self.request.validated:
            return 'process.get'
        else:
            return 'process.get.query'

    def _get_sheets_data_cstruct(self):
        queryparams = self.request.validated if self.request.validated else {}
        sheets_view = self.content.get_sheets_read(self.context,
                                                   self.request)
        data_cstruct = {}
        for sheet in sheets_view:
            key = sheet.meta.isheet.__identifier__
            if sheet.meta.isheet is IPoolSheet:
                cstruct = sheet.get_cstruct(self.request, params=queryparams)
            else:
                cstruct = sheet.get_cstruct(self.request)
            data_cstruct[key] = cstruct
        return data_cstruct


@view_defaults(
    renderer='json',
    context=ISimple,
)
class SimpleRESTView(ResourceRESTView):
    """View for simples (non versionable), implements get, options and put."""

    validation_PUT = (PUTResourceRequestSchema, [])

    @view_config(request_method='PUT',
                 permission='edit_some',
                 accept='application/json')
    def put(self) -> dict:
        """Edit resource and get response data."""
        with statsd_timer('process.put', rate=.1, registry=self.registry):
            sheets = self.content.get_sheets_edit(self.context, self.request)
            appstructs = self.request.validated.get('data', {})
            for sheet in sheets:
                name = sheet.meta.isheet.__identifier__
                if name in appstructs:
                    sheet.set(appstructs[name],
                              request=self.request)

            appstruct = {}
            if not is_batchmode(self.request):  # pragma: no branch
                appstruct[
                    'updated_resources'] = self._build_updated_resources_dict()

            schema = ResourceResponseSchema().bind(request=self.request,
                                                   context=self.context)
            cstruct = schema.serialize(appstruct)
        return cstruct


@view_defaults(
    renderer='json',
    context=IPool,
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
        """Build response data structure for a POST request."""
        appstruct = {}
        if IItem.providedBy(resource):
            appstruct['first_version_path'] = self._get_first_version(resource)
            schema = ItemResponseSchema().bind(request=self.request,
                                               context=resource)
        else:
            schema = ResourceResponseSchema().bind(request=self.request,
                                                   context=resource)

        if not is_batchmode(self.request):
            appstruct[
                'updated_resources'] = self._build_updated_resources_dict()
        return schema.serialize(appstruct)

    def _get_first_version(self, item: IItem) -> IItemVersion:
        for child in item.values():
            if IItemVersion.providedBy(child):
                return child

    @view_config(request_method='POST',
                 permission='create',
                 accept='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        iresource = self.request.validated['content_type']
        resource_type = iresource.__identifier__
        appstructs = self.request.validated.get('data', {})
        creator = get_user(self.request)
        metric = self._get_post_metric_name(iresource)
        with statsd_timer(metric, rate=1, registry=self.registry):
            resource = self.content.create(resource_type,
                                           self.context,
                                           creator=creator,
                                           appstructs=appstructs,
                                           request=self.request,
                                           )
        return self.build_post_response(resource)

    def _get_post_metric_name(self, iresource: IInterface) -> str:
        name = 'process.post'
        if iresource.isOrExtends(IProposalVersion):
            name = 'process.post.proposalversion'
        elif iresource.isOrExtends(IRateVersion):
            name = 'process.post.rateversion'
        return name

    @view_config(request_method='PUT',
                 permission='edit_some',
                 accept='application/json')
    def put(self) -> dict:
        """HTTP PUT."""
        return super().put()


@view_defaults(
    renderer='json',
    context=IItem,
)
class ItemRESTView(PoolRESTView):
    """View for Items and ItemVersions, overwrites GET and  POST handling."""

    validation_POST = (POSTItemRequestSchema, [validate_post_root_versions])

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """Get resource data."""
        with statsd_timer('process.get', rate=.1, registry=self.registry):
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
                 permission='create',
                 accept='application/json')
    def post(self):
        """Create new resource and get response data.

        For :class:`adhocracy_core.interfaces.IItemVersion`:

        If a `new version` is already created in this transaction we don't want
        to create a new one. Instead we modify the existing one.

        This is needed to make :class:`adhocray_core.rest.batchview.BatchView`
        work.
        """
        batchmode = is_batchmode(self.request)
        validated = self.request.validated
        iresource = validated['content_type']
        resource_type = iresource.__identifier__
        appstructs = validated.get('data', {})
        creator = get_user(self.request)
        root_versions = validated.get('root_versions', [])
        last_new_version = validated.get('_last_new_version_in_transaction',
                                         None)
        metric = self._get_post_metric_name(iresource)
        with statsd_timer(metric, rate=1, registry=self.registry):
            if last_new_version is not None:  # only happens in batch request
                sheets = self.content.get_sheets_create(last_new_version,
                                                        self.request)
                appstructs = self.request.validated.get('data', {})
                for sheet in sheets:
                    name = sheet.meta.isheet.__identifier__
                    if name in appstructs:  # pragma: no branch
                        sheet.set(appstructs[name],
                                  request=self.request)
                resource = last_new_version
            else:
                resource = self.content.create(resource_type,
                                               self.context,
                                               appstructs=appstructs,
                                               creator=creator,
                                               root_versions=root_versions,
                                               request=self.request,
                                               is_batchmode=batchmode,
                                               )
        return self.build_post_response(resource)


@view_defaults(
    renderer='json',
    context=IBadgeAssignmentsService,
)
class BadgeAssignmentsRESTView(PoolRESTView):
    """REST view for the badge assignment."""

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """HTTP GET."""
        return super().get()

    @view_config(request_method='POST',
                 permission='create',
                 accept='application/json')
    def post(self):
        """HTTP POST."""
        return super().post()

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Get possible request/response data structures and http methods."""
        cstruct = super().options()
        if 'POST' not in cstruct:
            return cstruct
        for info in cstruct['POST']['request_body']:
            if IBadgeAssignment.__identifier__ not in info['data']:
                continue
            assignables = get_assignable_badges(self.context, self.request)
            urls = [self.request.resource_url(x) for x in assignables]
            info['data'][IBadgeAssignment.__identifier__] =\
                {'badge': urls}
        return cstruct


@view_defaults(
    renderer='json',
    context=IUsersService,
)
class UsersRESTView(PoolRESTView):
    """View the IUsersService pool overwrites POST handling."""

    @view_config(request_method='POST',
                 permission='create_user',
                 accept='application/json')
    def post(self):
        """HTTP POST."""
        return super().post()


@view_defaults(
    renderer='json',
    context=IAssetsService,
)
class AssetsServiceRESTView(PoolRESTView):
    """View allowing multipart requests for asset upload."""

    @view_config(request_method='POST',
                 permission='create_asset',
                 accept='multipart/form-data')
    def post(self):
        """HTTP POST."""
        return super().post()


@view_defaults(
    renderer='json',
    context=IAsset,
)
class AssetRESTView(SimpleRESTView):
    """View for assets, allows PUTting new versions via multipart."""

    @view_config(request_method='PUT',
                 permission='create_asset',
                 accept='multipart/form-data')
    def put(self) -> dict:
        """HTTP PUT."""
        result = super().put()
        validate_and_complete_asset(self.context, self.request.registry)
        return result


@view_defaults(
    renderer='json',
    context=IAssetDownload,
)
class AssetDownloadRESTView(SimpleRESTView):
    """
    View for downloading assets as binary blobs.

    Allows GET, but no POST or PUT.
    """

    @view_config(request_method='GET',
                 permission='view')
    def get(self) -> dict:
        """Get asset data (unless deleted or hidden)."""
        file = retrieve_asset_file(self.context, self.request.registry)
        response = file.get_response(self.context, self.request.registry)
        self.ensure_caching_headers(response)
        return response

    def ensure_caching_headers(self, response):
        """Ensure cache headers for custom `response` objects."""
        response.cache_control = self.request.response.cache_control
        response.etag = self.request.response.etag
        response.last_modified = self.request.response.last_modified

    def put(self) -> dict:
        """HTTP PUT."""
        raise HTTPMethodNotAllowed()

    def post(self) -> dict:
        """HTTP POST."""
        raise HTTPMethodNotAllowed()


@view_defaults(
    renderer='json',
    context=IRootPool,
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

            # super types
            prop_map['super_types'] = _get_base_ifaces(iresource,
                                                       root_iface=IResource)
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
                    empty_appstruct = node.bind().default
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

            super_types = _get_base_ifaces(isheet, root_iface=ISheet)

            sheet_map[to_dotted_name(isheet)] = {'fields': fields,
                                                 'super_types': super_types}

        return sheet_map

    def _describe_workflows(self, appstructs: dict) -> dict:
        cstructs = {}
        for name, appstruct in appstructs.items():
            schema = create_workflow_meta_schema(appstruct)
            cstructs[name] = schema.serialize(appstruct)
        return cstructs

    @view_config(request_method='GET')
    def get(self) -> dict:
        """Get the API specification of this installation as JSON."""
        # Collect info about all resources
        with statsd_timer('process.get.metaapi', rate=.1,
                          registry=self.registry):
            resources_meta = self.request.registry.content.resources_meta
            resource_map = self._describe_resources(resources_meta)

            # Collect info about all sheets referenced by any of the resources
            sheet_metadata = self.request.registry.content.sheets_meta
            sheet_map = self._describe_sheets(sheet_metadata)

            workflows_meta = self.request.registry.content.workflows_meta
            workflows_map = self._describe_workflows(workflows_meta)

            struct = {'resources': resource_map,
                      'sheets': sheet_map,
                      'workflows': workflows_map,
                      }
        return struct


def _get_base_ifaces(iface: IInterface, root_iface=Interface) -> [str]:
    bases = []
    current_bases = iface.getBases()
    while current_bases:
        old_bases = deepcopy(current_bases)
        current_bases = ()
        for base in old_bases:
            if base.extends(root_iface):
                bases.append(base.__identifier__)
            current_bases += base.getBases()
    return bases


def _add_no_such_user_or_wrong_password_error(request: Request):
    error = error_entry('body', 'password',
                        'User doesn\'t exist or password is wrong')
    request.errors.append(error)


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
    normalized_email = email.lower()
    user = locator.get_user_by_email(normalized_email)
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
        error = error_entry('body', 'name', 'User account not yet activated')
        request.errors.append(error)


@view_defaults(
    renderer='json',
    context=IRootPool,
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
                 accept='application/json')
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
    renderer='json',
    context=IRootPool,
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
                 accept='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        return _login_user(self.request)


def validate_activation_path(context, request: Request):
    """Validate the user name of a login request.

    If valid and activated, the user object is added as 'user' to
    `request.validated`.
    """
    path = request.validated['path']
    locator = request.registry.getMultiAdapter((context, request),
                                               IUserLocator)
    user = locator.get_user_by_activation_path(path)
    error = error_entry('body', 'path', 'Unknown or expired activation path')
    if user is None:
        request.errors.append(error)
    elif is_older_than(user, days=8):
        request.errors.append(error)
        user.activation_path = None
    else:
        user.activate()
        user.activation_path = None
        request.validated['user'] = user
        event = ResourceSheetModified(user, IUserBasic, request.registry, {},
                                      {}, request)
        request.registry.notify(event)  # trigger reindex activation_path index


@view_defaults(
    renderer='json',
    context=IRootPool,
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
                 accept='application/json')
    def post(self) -> dict:
        """Activate a user account and log the user in."""
        return _login_user(self.request)


@view_defaults(
    renderer='string',
    context=IRootPool,
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
                 accept='application/json')
    def post(self) -> dict:
        """Receive and process an abuse complaint."""
        messenger = self.request.registry.messenger
        messenger.send_abuse_complaint(url=self.request.validated['url'],
                                       remark=self.request.validated['remark'],
                                       user=get_user(self.request))
        return ''


@view_defaults(
    renderer='json',
    context=IRootPool,
    name='message_user',
)
class MessageUserView(RESTView):
    """Send a message to another user."""

    validation_POST = (POSTMessageUserViewRequestSchema, [])

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        result = {}
        if self.request.has_permission('message_to_user', self.context):
            schema = POSTMessageUserViewRequestSchema().bind(
                context=self.context)
            result['POST'] = {'request_body': schema.serialize({}),
                              'response_body': ''}
        return result

    @view_config(request_method='POST',
                 permission='message_to_user',
                 accept='application/json')
    def post(self) -> dict:
        """Send a message to another user."""
        messenger = self.request.registry.messenger
        data = self.request.validated
        messenger.send_message_to_user(recipient=data['recipient'],
                                       title=data['title'],
                                       text=data['text'],
                                       from_user=get_user(self.request))
        return ''


@view_defaults(
    renderer='json',
    context=IRootPool,
    name='create_password_reset',
)
class CreatePasswordResetView(RESTView):
    """Create a password reset resource."""

    validation_POST = (POSTCreatePasswordResetRequestSchema, [])

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {'POST': {}}

    @view_config(request_method='POST',
                 accept='application/json'
                 )
    def post(self) -> dict:
        """Create as password reset resource."""
        resets = find_service(self.context, 'principals', 'resets')
        user = self.request.validated['user']
        self.request.registry.content.create(IPasswordReset.__identifier__,
                                             resets,
                                             creator=user)
        return {'status': 'success'}


@view_defaults(
    renderer='json',
    context=IRootPool,
    name='password_reset',
)
class PasswordResetView(RESTView):
    """Reset a user password."""

    validation_POST = (POSTPasswordResetRequestSchema, [])

    @view_config(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {'POST': {}}

    @view_config(request_method='POST',
                 accept='application/json',
                 )
    def post(self) -> dict:
        """Reset password."""
        reset = self.request.validated['path']
        password = self.request.validated['password']
        reset.reset_password(password)
        return _login_user(self.request)


def includeme(config):
    """Register Views."""
    config.scan('.views')
