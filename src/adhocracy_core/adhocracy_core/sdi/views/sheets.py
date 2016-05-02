"""Sheets tab and add view for resources."""
from collections import OrderedDict

from colander import null
from deform import Form
from pyramid.interfaces import IRequest
from pyramid.httpexceptions import HTTPNotFound
from pyramid.httpexceptions import HTTPFound
from substanced.form import FormView as SDFormView
from substanced.sdi import mgmt_view
from substanced.schema import Schema as CSRFSchema
from substanced.util import _

from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IResourceSheet
from adhocracy_core.schema import MappingSchema
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.workflow import IWorkflowAssignment
from adhocracy_core.sheets.embed import IEmbed
from adhocracy_core.utils import create_schema


class FormView(SDFormView):
    """View class that autogenerates forms based on :term:`schema` .

    I uses :mod:`colander` schema to define the data structure and
    validator and :mod:`deform` to render html forms.
    """

    def _build_form(self) -> tuple:
        """Build html form for :term:`schema`.

        Changed behavior:

        - expected self.schema to have all needed bindings

        - add CSRF protection to self.schema

        - make deform widgets work with readonly schema fields
        """
        self._add_csrf_token_to_schema()
        config = {'use_ajax': getattr(self, 'use_ajax', False),
                  'ajax_options ': getattr(self, 'ajax_options', '{}'),
                  'action': getattr(self, 'action', ''),
                  'method': getattr(self, 'method', 'POST'),
                  'formid': getattr(self, 'formid', 'deform'),
                  'autocomplete': getattr(self, 'autocomplete', None),
                  'buttons': self.buttons,
                  }
        form = self.form_class(self.schema, **config)
        self.before(form)
        self._setup_readonly_form_widgets(form)
        resources = form.get_widget_resources()
        return (form, resources)

    def _add_csrf_token_to_schema(self):
        csrf_schema = CSRFSchema()
        for child in self.schema:
            csrf_schema.add(child)
        csrf_schema.validator = self.schema.validator
        bindings = self.schema.bindings
        bindings['_csrf_token_'] = self.request.session.get_csrf_token()
        self.schema = csrf_schema.bind(**bindings)

    def _setup_readonly_form_widgets(self, form: Form) -> Form:
        """Setup widgets for readonly fields.

        * Set readonly template for widgets if schema field is readonly.
          (See for example the IMetadata sheet schema)

        * Fix readonly template for list widget is not working
          (See for example the IPermission sheet schema)
        """
        for field in form.children:
            is_readonly = getattr(field.schema, 'readonly', False)
            if is_readonly:
                field.widget.readonly = True  # set readonly template
                if field.name in form.cstruct:  # workaround list widget bug
                    del form.cstruct[field.name]
                    field.widget.deserialize = lambda x, y: null


@mgmt_view(
    name='properties',
    renderer='substanced.property:templates/propertysheets.pt',
    tab_title=_('Sheets'),
    permission='sdi.view',
)
class EditResourceSheets(FormView):
    """Edit resource sheets form tab."""

    buttons = (_('save'),)

    def __init__(self, context: IResource, request: IRequest):
        """Setup active sheet schema."""
        super().__init__(context, request)
        self.registry = self.request.registry
        self.sheets = self._get_editable_sheets()
        self.sheet_names = list(self.sheets.keys())
        if not self.sheets:
            raise HTTPNotFound('No editable resource sheets')
        self.active_sheet_name = self._get_active_sheet_name()
        self.active_sheet = self._get_active_sheet()
        self.schema = self.active_sheet.get_schema_with_bindings()

    def _get_active_sheet_name(self) -> str:
        subpath = self.request.subpath
        if subpath:
            name = subpath[0]
        else:
            name = self.sheet_names[0]
        return name

    def _get_active_sheet(self) -> IResourceSheet:
        name = self._get_active_sheet_name()
        return self.sheets[name]

    def _get_editable_sheets(self) -> {}:
        sheets = self.registry.content.get_sheets_edit(self.context,
                                                       self.request)
        return OrderedDict([(s.meta.isheet.__identifier__, s) for s in sheets])

    def save_success(self, appstruct: dict):
        self.active_sheet.set(appstruct)
        self.request.sdiapi.flash('Updated sheets', 'success')
        return HTTPFound(self.request.sdiapi.mgmt_path(
            self.context, '@@properties', self.active_sheet_name))

    def show(self, form):
        appstruct = self.active_sheet.get()
        return {'form': form.render(appstruct=appstruct,
                                    readonly=False)}


class AddResourceSheetsBase(FormView):
    """Add resource form, subclass and set content_type attribute."""

    buttons = (_('add'),)
    iresource = None
    _disabled = (IMetadata, IWorkflowAssignment, IEmbed)
    """Sheets not working with this add view yet, use sheets tabs instead."""

    def __init__(self, context: IResource, request: IRequest):
        """Setup active sheet schema."""
        super().__init__(context, request)
        self.registry = self.request.registry
        self.sheets = self._get_creatable_sheets()
        self.schema = self._get_schema_with_bindings()
        self.title = _('Add {0}'.format(self.iresource.__identifier__))

    def _get_creatable_sheets(self) -> {}:
        sheets = self.registry.content.get_sheets_create(
            self.context,
            self.request,
            iresource=self.iresource)
        sheets = [x for x in sheets if x.meta.isheet not in self._disabled]
        return OrderedDict([(s.meta.isheet.__identifier__, s) for s in sheets])

    def _get_schema_with_bindings(self) -> MappingSchema:
        schema = create_schema(MappingSchema, self.context, self.request,
                               creating=True)
        for name, sheet in self.sheets.items():
            sheet_schema = sheet.get_schema_with_bindings()
            schema.add(sheet_schema)
        return schema

    def add_success(self, appstructs):
        self.registry.content.create(self.iresource.__identifier__,
                                     parent=self.context,
                                     appstructs=appstructs,
                                     request=self.request,
                                     registry=self.registry,
                                     )
        return HTTPFound(location=self.request.sdiapi.mgmt_path(self.context))
