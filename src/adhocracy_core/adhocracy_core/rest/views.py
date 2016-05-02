"""GET/POST/PUT requests processing."""
from collections import defaultdict
from copy import deepcopy
from logging import getLogger

from substanced.util import find_service
from substanced.stats import statsd_timer
from pyramid.interfaces import IRequest
from pyramid.view import view_defaults
from pyramid.security import remember
from pyramid.traversal import resource_path
from pyramid.registry import Registry
from zope.interface.interfaces import IInterface
from zope.interface import Interface
import colander

from adhocracy_core.authentication import UserTokenHeader
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ISimple
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IPool
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.resources.asset import IAssetDownload
from adhocracy_core.resources.asset import IAssetsService
from adhocracy_core.resources.principal import IUsersService
from adhocracy_core.resources.principal import IPasswordReset
from adhocracy_core.resources.proposal import IProposalVersion
from adhocracy_core.resources.rate import IRateVersion
from adhocracy_core.resources.badge import IBadgeAssignmentsService
from adhocracy_core.rest import api_view
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
from adhocracy_core.rest.schemas import POSTAssetRequestSchema
from adhocracy_core.rest.schemas import PUTResourceRequestSchema
from adhocracy_core.rest.schemas import PUTAssetRequestSchema
from adhocracy_core.rest.schemas import GETPoolRequestSchema
from adhocracy_core.rest.schemas import GETItemResponseSchema
from adhocracy_core.rest.schemas import GETResourceResponseSchema
from adhocracy_core.rest.schemas import options_resource_response_data_dict
from adhocracy_core.schema import SchemaNode
from adhocracy_core.schema import AbsolutePath
from adhocracy_core.schema import References
from adhocracy_core.sheets.badge import get_assignable_badges
from adhocracy_core.sheets.badge import IBadgeAssignment
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.workflow import IWorkflowAssignment
from adhocracy_core.sheets.pool import IPool as IPoolSheet
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.sheets.tags import ITags
from adhocracy_core.utils import extract_events_from_changelog_metadata
from adhocracy_core.utils import is_batchmode
from adhocracy_core.utils import strip_optional_prefix
from adhocracy_core.utils import to_dotted_name
from adhocracy_core.utils import is_created_in_current_transaction
from adhocracy_core.utils import create_schema
from adhocracy_core.resources.root import IRootPool
from adhocracy_core.workflows.schemas import create_workflow_meta_schema


logger = getLogger(__name__)


@view_defaults(
    context=IResource,
)
class ResourceRESTView:
    """Default view for Resources, implements get and options."""

    def __init__(self, context, request):
        """Initialize self."""
        self.context = context
        """Context Resource."""
        self.request = request
        """:class:`pyramid.request.Request`."""
        self.registry = request.registry
        """:class:`pyramid.registry.Registry`."""
        self.content = request.registry.content
        """:class:`adhocracy_core.content.ResourceContentRegistry`."""

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Get possible request/response data structures and http methods."""
        with statsd_timer('process.options', rate=.1, registry=self.registry):
            cstruct = self._options(self.context, self.request)
        return cstruct

    def _options(self, context: IResource, request: IRequest) -> dict:
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

    @api_view(
        request_method='GET',
        permission='view',
    )
    def get(self) -> dict:
        """Get resource data (unless deleted or hidden)."""
        metric = self._get_get_metric_name()
        with statsd_timer(metric, rate=.1, registry=self.registry):
            schema = create_schema(GETResourceResponseSchema,
                                   self.context,
                                   self.request)
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
                cstruct = sheet.serialize(params=queryparams)
            else:
                cstruct = sheet.serialize()
            data_cstruct[key] = cstruct
        return data_cstruct


def _build_updated_resources_dict(registry: Registry) -> dict:
    result = defaultdict(list)
    for meta in registry.changelog.values():
        events = extract_events_from_changelog_metadata(meta)
        for event in events:
            result[event].append(meta.resource)
    return result


@view_defaults(
    context=ISimple,
)
class SimpleRESTView(ResourceRESTView):
    """View for simples (non versionable), implements get, options and put."""

    @api_view(
        request_method='PUT',
        permission='edit_some',
        schema=PUTResourceRequestSchema,
        accept='application/json',
    )
    def put(self) -> dict:
        """Edit resource and get response data."""
        with statsd_timer('process.put', rate=.1, registry=self.registry):
            sheets = self.content.get_sheets_edit(self.context, self.request)
            appstructs = self.request.validated.get('data', {})
            for sheet in sheets:
                name = sheet.meta.isheet.__identifier__
                if name in appstructs:
                    sheet.set(appstructs[name])
            appstruct = {}
            if not is_batchmode(self.request):  # pragma: no branch
                updated = _build_updated_resources_dict(self.registry)
                appstruct['updated_resources'] = updated
            schema = create_schema(ResourceResponseSchema,
                                   self.context,
                                   self.request)
            cstruct = schema.serialize(appstruct)
        return cstruct


@view_defaults(
    context=IPool,
)
class PoolRESTView(SimpleRESTView):
    """View for Pools, implements get, options, put and post."""

    @api_view(
        request_method='GET',
        schema=GETPoolRequestSchema,
        permission='view',
    )
    def get(self) -> dict:
        """Get resource data."""
        # This delegation method is necessary since otherwise validation_GET
        # won't be found.
        return super().get()

    def build_post_response(self, resource) -> dict:
        """Build response data structure for a POST request."""
        appstruct = {}
        if IItem.providedBy(resource):
            first = self.registry.content.get_sheet_field(resource,
                                                          ITags,
                                                          'FIRST')
            appstruct['first_version_path'] = first
            schema = create_schema(ItemResponseSchema, resource, self.request)
        else:
            schema = create_schema(ResourceResponseSchema,
                                   resource,
                                   self.request)

        if not is_batchmode(self.request):
            updated = _build_updated_resources_dict(self.registry)
            appstruct['updated_resources'] = updated
        return schema.serialize(appstruct)

    @api_view(
        request_method='POST',
        permission='create',
        schema=POSTResourceRequestSchema,
        accept='application/json',
    )
    def post(self) -> dict:
        """Create new resource and get response data."""
        metric = self._get_post_metric_name()
        with statsd_timer(metric, rate=1, registry=self.registry):
            resource = self._create()
        cstruct = self.build_post_response(resource)
        return cstruct

    def _get_post_metric_name(self) -> str:
        iresource = self.request.validated['content_type']
        name = 'process.post'
        if iresource.isOrExtends(IProposalVersion):
            name = 'process.post.proposalversion'
        elif iresource.isOrExtends(IRateVersion):
            name = 'process.post.rateversion'
        return name

    def _create(self) -> IResource:
        validated = self.request.validated
        kwargs = dict(parent=self.context,
                      appstructs=validated.get('data', {}),
                      creator=self.request.user,
                      root_versions=validated.get('root_versions', []),
                      request=self.request,
                      is_batchmode=is_batchmode(self.request),
                      )
        iresource = validated['content_type']
        return self.content.create(iresource.__identifier__, **kwargs)

    @api_view(
        request_method='PUT',
        permission='edit_some',
        schema=PUTResourceRequestSchema,
        accept='application/json',
    )
    def put(self) -> dict:
        """HTTP PUT."""
        return super().put()


@view_defaults(
    context=IItem,
)
class ItemRESTView(PoolRESTView):
    """View for Items and ItemVersions, overwrites GET and  POST handling."""

    @api_view(
        request_method='GET',
        schema=GETPoolRequestSchema,
        permission='view',
    )
    def get(self) -> dict:
        """Get resource data."""
        with statsd_timer('process.get', rate=.1, registry=self.registry):
            first_version = self.registry.content.get_sheet_field(self.context,
                                                                  ITags,
                                                                  'FIRST')
            appstruct = {}
            if first_version is not None:
                appstruct['first_version_path'] = first_version
            schema = create_schema(GETItemResponseSchema,
                                   self.context,
                                   self.request)
            cstruct = schema.serialize(appstruct)
            cstruct['data'] = self._get_sheets_data_cstruct()
        return cstruct

    @api_view(
        request_method='POST',
        permission='create',
        schema=POSTItemRequestSchema,
        accept='application/json',
    )
    def post(self):
        """Create new resource and get response data.

        For :class:`adhocracy_core.interfaces.IItemVersion`:

        If a `new version` is already created in this transaction we don't want
        to create a new one. Instead we modify the existing one.

        This is needed to make :class:`adhocray_core.rest.batchview.BatchView`
        work.
        """
        metric = self._get_post_metric_name()
        with statsd_timer(metric, rate=1, registry=self.registry):
            if is_batchmode(self.request) and self._creating_new_version():
                last = self.registry.content.get_sheet_field(self.context,
                                                             ITags,
                                                             'LAST')
                if is_created_in_current_transaction(last, self.registry):
                    self._update_version(last)
                    resource = last
                else:
                    resource = self._create()
            else:
                resource = self._create()
            cstruct = self.build_post_response(resource)
        return cstruct

    def _creating_new_version(self) -> bool:
        iresource = self.request.validated['content_type']
        return IItemVersion.isEqualOrExtendedBy(iresource)

    def _update_version(self, resource: IVersionable):
        create_sheets = self.content.get_sheets_create(resource, self.request)
        is_first = self.registry.content.get_sheet_field(self.context,
                                                         ITags,
                                                         'FIRST') == resource
        appstructs = self.request.validated.get('data', {})
        for sheet in create_sheets:
            isheet = sheet.meta.isheet
            is_version_sheet = IVersionable.isEqualOrExtendedBy(isheet)
            if is_version_sheet and is_first:
                continue
            isheet_name = isheet.__identifier__
            if isheet_name in appstructs:  # pragma: no branch
                sheet.set(appstructs[isheet.__identifier__])


@view_defaults(
    context=IBadgeAssignmentsService,
)
class BadgeAssignmentsRESTView(PoolRESTView):
    """REST view for the badge assignment."""

    @api_view(
        request_method='GET',
        permission='view',
    )
    def get(self) -> dict:
        """HTTP GET."""
        return super().get()

    @api_view(
        request_method='POST',
        permission='create',
        schema=POSTResourceRequestSchema,
        accept='application/json',
    )
    def post(self):
        """HTTP POST."""
        return super().post()

    @api_view(request_method='OPTIONS')
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
    context=IUsersService,
)
class UsersRESTView(PoolRESTView):
    """View the IUsersService pool overwrites POST handling."""

    @api_view(
        request_method='POST',
        permission='create_user',
        schema=POSTResourceRequestSchema,
        accept='application/json',
    )
    def post(self):
        """HTTP POST."""
        return super().post()


@view_defaults(
    context=IAssetsService,
)
class AssetsServiceRESTView(PoolRESTView):
    """View allowing multipart requests for asset upload."""

    @api_view(
        request_method='POST',
        permission='create_asset',
        schema=POSTAssetRequestSchema,
        accept='multipart/form-data',
    )
    def post(self):
        """HTTP POST."""
        return super().post()


@view_defaults(
    renderer='json',
    context=IAsset,
)
class AssetRESTView(SimpleRESTView):
    """View for assets, allows PUTting new versions via multipart."""

    @api_view(
        request_method='PUT',
        permission='create_asset',
        schema=PUTAssetRequestSchema,
        accept='multipart/form-data',
    )
    def put(self) -> dict:
        """HTTP PUT."""
        return super().put()


@view_defaults(
    context=IAssetDownload,
)
class AssetDownloadRESTView(ResourceRESTView):
    """View for downloading assets as binary blobs."""

    @api_view(
        request_method='GET',
        permission='view',
    )
    def get(self) -> dict:
        """Get asset data."""
        response = self.context.get_response(self.request.registry)
        self.ensure_caching_headers(response)
        return response

    def ensure_caching_headers(self, response):
        """Ensure cache headers for custom `response` objects."""
        response.cache_control = self.request.response.cache_control
        response.etag = self.request.response.etag
        response.last_modified = self.request.response.last_modified


@view_defaults(
    context=IRootPool,
    name='meta_api',
)
class MetaApiView:
    """Access to metadata about the API specification of this installation.

    Returns a JSON document describing the existing resources and sheets.
    """

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request
        self.registry = request.registry

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

                if isinstance(node, References):
                    containertype = 'list'
                    typ = to_dotted_name(AbsolutePath)
                elif isinstance(node, colander.SequenceSchema):
                    containertype = 'list'
                    typ = to_dotted_name(type(node.children[0]))
                elif valuetype not in (colander.SchemaNode, SchemaNode):
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

    @api_view(request_method='GET')
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


@view_defaults(
    context=IRootPool,
    name='login_username',
)
class LoginUsernameView:
    """Log in a user via their name."""

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {}

    @api_view(
        request_method='POST',
        schema=POSTLoginUsernameRequestSchema,
        accept='application/json',
    )
    def post(self) -> dict:
        """Create new resource and get response data."""
        return _login_user(self.request)


def _login_user(request: IRequest) -> dict:
    """Set cookies and return a data for token header authentication."""
    user = request.validated['user']
    userid = resource_path(user)
    headers = remember(request, userid)
    _set_sdi_auth_cookies(headers, request)
    cstruct = _get_api_auth_data(headers, request, user)
    return cstruct


def _set_sdi_auth_cookies(headers: [tuple], request: IRequest):
    cookie_headers = []
    force_secure = request.scheme.startswith('https')
    for name, value in headers:
        if name != 'Set-Cookie':
            continue
        header = (name, value)
        has_secure_flag = 'Secure;' in value
        if force_secure and not has_secure_flag:  # pragma: no branch
            header = (name, value + 'Secure;')
        cookie_headers.append(header)
    request.response.headers.extend(cookie_headers)


def _get_api_auth_data(headers: [tuple], request: IRequest, user: IResource)\
        -> dict:
    token_headers = dict([(x, y) for x, y in headers if x == UserTokenHeader])
    token = token_headers[UserTokenHeader]
    user_url = request.resource_url(user)
    # TODO: use colander schema to create cstruct
    return {'status': 'success',
            'user_path': user_url,
            'user_token': token,
            }


@view_defaults(
    context=IRootPool,
    name='login_email',
)
class LoginEmailView:
    """Log in a user via their email address."""

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {}

    @api_view(request_method='POST',
              schema=POSTLoginEmailRequestSchema,
              accept='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        return _login_user(self.request)


@view_defaults(
    context=IRootPool,
    name='activate_account',
)
class ActivateAccountView:
    """Log in a user via their name."""

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {}

    @api_view(
        request_method='POST',
        schema=POSTActivateAccountViewRequestSchema,
        accept='application/json',
    )
    def post(self) -> dict:
        """Activate a user account and log the user in."""
        return _login_user(self.request)


@view_defaults(
    context=IRootPool,
    name='report_abuse',
)
class ReportAbuseView:
    """Receive and process an abuse complaint."""

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {}

    @api_view(
        request_method='POST',
        schema=POSTReportAbuseViewRequestSchema,
        accept='application/json',
    )
    def post(self) -> dict:
        """Receive and process an abuse complaint."""
        messenger = self.request.registry.messenger
        messenger.send_abuse_complaint(url=self.request.validated['url'],
                                       remark=self.request.validated['remark'],
                                       user=self.request.user)
        return ''


@view_defaults(
    context=IRootPool,
    name='message_user',
)
class MessageUserView:
    """Send a message to another user."""

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        result = {}
        if self.request.has_permission('message_to_user', self.context):
            schema = create_schema(POSTMessageUserViewRequestSchema,
                                   self.context,
                                   self.request)
            result['POST'] = {'request_body': schema.serialize({}),
                              'response_body': ''}
        return result

    @api_view(
        request_method='POST',
        permission='message_to_user',
        schema=POSTMessageUserViewRequestSchema,
        accept='application/json',
    )
    def post(self) -> dict:
        """Send a message to another user."""
        messenger = self.request.registry.messenger
        data = self.request.validated
        user = self.request.user
        messenger.send_message_to_user(recipient=data['recipient'],
                                       title=data['title'],
                                       text=data['text'],
                                       from_user=user)
        return ''


@view_defaults(
    context=IRootPool,
    name='create_password_reset',
)
class CreatePasswordResetView:
    """Create a password reset resource."""

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {'POST': {}}

    @api_view(
        request_method='POST',
        schema=POSTCreatePasswordResetRequestSchema,
        accept='application/json',
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
    context=IRootPool,
    name='password_reset',
)
class PasswordResetView:
    """Reset a user password."""

    def __init__(self, context: IRootPool, request: IRequest):
        self.context = context
        self.request = request

    @api_view(request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for view."""
        return {'POST': {}}

    @api_view(
        request_method='POST',
        schema=POSTPasswordResetRequestSchema,
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
