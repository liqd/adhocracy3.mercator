"""Create resources, get sheets/metadata, permission checks."""
from functools import lru_cache

from pyramid.request import Request
from pyramid.traversal import resource_path
from pyramid.util import DottedNameResolver
from pyramid.decorator import reify
from substanced.content import ContentRegistry
from substanced.content import add_content_type
from substanced.content import add_service_type
from substanced.workflow import IWorkflow
from zope.interface.interfaces import IInterface

from adhocracy_core.exceptions import RuntimeConfigurationError
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import ResourceMetadata
from adhocracy_core.interfaces import SheetMetadata
from adhocracy_core.interfaces import IResourceSheet
from adhocracy_core.utils import get_iresource


resolver = DottedNameResolver()


class ResourceContentRegistry(ContentRegistry):
    """Extend substanced content registry to work with resources."""

    def __init__(self, registry):
        """Initialize self."""
        super().__init__(registry)
        self.resources_meta = {}
        """Resources meta mapping.

        Dictionary with key iresource (`resource type` interface) and value
        :class:`adhocracy_core.interfaces.ResourceMetadata`.
        """
        self.sheets_meta = {}
        """Sheets meta mapping.

        Dictionary with key isheet (`sheet type` interface) and value
        :class:`adhocracy_core.interfaces.SheetMetadata`.
        """
        self.workflows_meta = {}
        """Dictionary with key workflow name and value data.

        The value data structure is defined in
        :class:`adhocracy_core.workflows.schemas.Workflow`
        """
        self.workflows = {}
        """Dictionary with key workflow name and value
        :class:`substanced.workflow.IWorkflow`.
        """

    def get_resources_meta_addable(self, context: object,
                                   request: Request) -> [ResourceMetadata]:
        """Get addable resource meta for context, mind permissions."""
        iresource = get_iresource(context)
        addables = self.resources_meta_addable[iresource]
        addables_allowed = []
        for resource_meta in addables:
            if self.can_add_resource(request, resource_meta, context):
                addables_allowed.append(resource_meta)
        return addables_allowed

    def can_add_resource(self, request: Request, meta: ResourceMetadata,
                         context: IPool) -> bool:
        """Check that the resource type in `meta` is addable to `context`."""
        permission = meta.permission_create
        allowed = request.has_permission(permission, context)
        return allowed

    @reify
    def resources_meta_addable(self) -> {}:
        """Addable resources metadata mapping.

        Dictionary with key iresource (`resource type` interface)` and value
        list of :class:`adhocracy_core.interfaces.ResourceMetadata`.
        The value includes only addables for a context with `resource type`.
        """
        resources_addables = {}
        for iresource, resource_meta in self.resources_meta.items():
            addables = resource_meta.element_types
            all_addables = []
            for iresource_, resource_meta_ in self.resources_meta.items():
                is_implicit = resource_meta_.is_implicit_addable
                for iresource_addable in addables:
                    is_subtype = is_implicit\
                        and iresource_.extends(iresource_addable)
                    is_is = iresource_ is iresource_addable
                    if is_subtype or is_is:
                        all_addables.append(resource_meta_)
            resources_addables[iresource] = all_addables
        return resources_addables

    @property
    def permissions(self) -> [str]:
        """Set of all permissions defined in the system."""
        perms = self._builtin_permissions
        for resource_meta in self.resources_meta.values():
            perms.update(self._get_resource_permissions(resource_meta))
        for sheet_meta in self.sheets_meta.values():
            perms.update(self._get_sheet_permissions(sheet_meta, perms))
        for workflow_meta in self.workflows_meta.values():
            perms.update(self._get_workflow_permissions(workflow_meta))
        perms.update(self._get_views_permissions())
        return perms

    @property
    def _builtin_permissions(self):
        return {'hide', 'edit_group', 'do_transition'}

    def _get_resource_permissions(self, resource_meta):
        return [p for p in [resource_meta.permission_create]
                if p != '']

    def _get_sheet_permissions(self, sheet_meta, perms):
        return [p for p in [sheet_meta.permission_view,
                            sheet_meta.permission_edit,
                            sheet_meta.permission_create]
                if p != '']

    def _get_views_permissions(self):
        permissions = self.registry.introspector.get_category('permissions')
        if permissions is None:
            return []
        return [v['introspectable'].title for v in permissions]

    def _get_workflow_permissions(self, workflow_meta):
        return [t['permission'] for t in workflow_meta['transitions'].values()]

    def get_sheet(self, context: object,
                  isheet: IInterface,
                  request: Request=None,
                  creating: ResourceMetadata=None) -> IResourceSheet:
        """Get sheet for `context` and set the 'context' attribute.

        :raise adhocracy_core.exceptions.RuntimeConfigurationError:
           if there is no `isheet` sheet registered for context.
        """
        if not creating and not isheet.providedBy(context):
            msg = 'Sheet {0} is not provided by resource {1}'\
                .format(isheet.__identifier__, resource_path(context))
            raise RuntimeConfigurationError(msg)
        meta = self.sheets_meta[isheet]
        sheet = self._create_sheet(meta, context, request=request)
        sheet.context = context
        sheet.request = request
        sheet.registry = self.registry
        sheet.creating = creating
        return sheet

    @lru_cache(maxsize=256)
    def _create_sheet(self, meta: SheetMetadata,
                      context: object,
                      request: Request,
                      creating: ResourceMetadata=None) -> IResourceSheet:
        sheet = meta.sheet_class(meta, context, self.registry,
                                 request=request,
                                 creating=creating,
                                 )
        return sheet

    def get_sheet_field(self, context: object,
                        isheet: IInterface,
                        field: str,
                        request: Request=None) -> object:
        """Get sheet for `context` and return the value for field `name`.

        :raise adhocracy_core.exceptions.RuntimeConfigurationError:
           if there is no `isheet` sheet registered for context.
        :raise KeyError: if `field` does not exists for sheet `isheet`.
        """
        sheet = self.get_sheet(context, isheet, request=request)
        appstruct = sheet.get()
        value = appstruct[field]
        return value

    def get_sheets_all(self, context: object,
                       request: Request=None) -> [IResourceSheet]:
        """Get all sheets for `context`."""
        iresource = get_iresource(context)
        metas = self._get_sheets_meta(iresource)
        sheets = [self.get_sheet(context, m.isheet, request) for m in metas]
        return sheets

    def get_sheets_create(self, context: object,
                          request: Request=None,
                          iresource: IInterface=None) -> [IResourceSheet]:
        """Get creatable sheets for `context` or `iresource`.

        :param request: If not None filter by sheet create permission.
        :param iresource: If not None return sheets for this resource type.
            The `creating` sheet attribute is set to the resource metadata
            of this type. The returned sheets should only be used to
            deserialize data to create a new resource.
        """
        if iresource:
            creating = self.resources_meta[iresource]
        else:
            creating = None
            iresource = get_iresource(context)
        metas = self._get_sheets_meta(iresource, filter_attr='creatable')
        if request:
            metas = self._filter_permission(metas, context, request,
                                            permission_attr='permission_create'
                                            )
        sheets = [self.get_sheet(context, m.isheet, request=request,
                                 creating=creating) for m in metas]
        return sheets

    def get_sheets_edit(self, context: object,
                        request: Request=None) -> [IResourceSheet]:
        """Get editable sheets for `context`.

        :param request: If not None filter by sheet edit permission.
        """
        iresource = get_iresource(context)
        metas = self._get_sheets_meta(iresource, filter_attr='editable')
        if request:
            metas = self._filter_permission(metas, context, request,
                                            permission_attr='permission_edit')
        sheets = [self.get_sheet(context, m.isheet, request=request)
                  for m in metas]
        return sheets

    def get_sheets_read(self, context: object,
                        request: Request=None) -> [IResourceSheet]:
        """Get readable sheets for `context`.

        :param request: If not None filter by sheet edit permission.
        """
        iresource = get_iresource(context)
        metas = self._get_sheets_meta(iresource, filter_attr='readable')
        if request:
            metas = self._filter_permission(metas, context, request,
                                            permission_attr='permission_view')
        sheets = [self.get_sheet(context, m.isheet, request=request)
                  for m in metas]
        return sheets

    def _get_sheets_meta(self, iresource: IInterface,
                         filter_attr='') -> [SheetMetadata]:
        resource_meta = self.resources_meta[iresource]
        isheets = resource_meta.basic_sheets + resource_meta.extended_sheets
        for isheet in isheets:
            meta = self.sheets_meta[isheet]
            enabled = True
            if filter_attr:
                enabled = getattr(meta, filter_attr)
            if enabled:
                yield meta

    @staticmethod
    def _filter_permission(metas: [ResourceMetadata],
                           context: object,
                           request: Request,
                           permission_attr: str) -> [ResourceMetadata]:
        for meta in metas:
            permission = getattr(meta, permission_attr)
            if request.has_permission(permission, context):
                yield(meta)

    def resolve_isheet_field_from_dotted_string(self, dotted: str) -> tuple:
        """Resolve `dotted` string to isheet and field name and schema node.

        :dotted: isheet.__identifier__ and field_name separated by ':'
        :return: tuple with isheet (ISheet), field_name (str), field schema
                 node (colander.SchemaNode).
        :raise ValueError: If the string is not dotted or it cannot be
            resolved to isheet and field name.
        """
        if ':' not in dotted:
            raise ValueError(
                'Not a colon-separated dotted string: {}'.format(dotted))
        name = ''.join(dotted.split(':')[:-1])
        field = dotted.split(':')[-1]
        try:
            isheet = resolver.resolve(name)
        except ImportError:
            raise ValueError('No such sheet: {}'.format(name))
        if not (IInterface.providedBy(isheet) and isheet.isOrExtends(ISheet)):
            raise ValueError('Not a sheet: {}'.format(name))
        schema = self.sheets_meta[isheet].schema_class()
        node = schema.get(field, None)
        if not node:
            raise ValueError('No such field: {}'.format(dotted))
        return isheet, field, node

    def get_workflow(self, context: object) -> IWorkflow:
        """Get workflow of `context` or None.

        :raises RuntimeConfigurationError: if workflow is not registered
        """
        iresource = get_iresource(context)
        try:
            name = self.resources_meta[iresource].workflow_name
        except KeyError:  # ease testing
            return None
        if name == '':
            return None
        try:
            workflow = self.workflows[name]
        except KeyError:
            msg = 'Workflow name is not registered: {0}'.format(name)
            raise RuntimeConfigurationError(msg)
        return workflow


def includeme(config):  # pragma: no cover
    """Add content registry, register substanced content_type decorators."""
    config.registry.content = ResourceContentRegistry(config.registry)
    config.add_directive('add_content_type', add_content_type)
    config.add_directive('add_service_type', add_service_type)
