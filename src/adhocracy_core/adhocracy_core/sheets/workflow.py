"""Sheets to assign workflows to resources and change states."""
from colander import deferred
from colander import null
from colander import OneOf
from colander import drop
from deform.widget import SelectWidget
from deform.widget import Widget
from pyramid.testing import DummyRequest
from zope.deprecation import deprecated
from zope.interface import implementer

from adhocracy_core.interfaces import ISheet
from adhocracy_core.schema import MappingSchema
from adhocracy_core.schema import SchemaNode
from adhocracy_core.schema import DateTime
from adhocracy_core.schema import Text
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import SequenceSchema
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_meta
from adhocracy_core.sheets import AnnotationRessourceSheet
from adhocracy_core.interfaces import IResourceSheet
from adhocracy_core.utils import create_schema


class ISample(ISheet):
    """Sheet with the sample workflow."""


deprecated('ISample', 'Backward compatible code, dont use')


class Workflow(SchemaNode):
    """Workflow :class:`adhocracy_core.interfaces.IWorkflow`."""

    schema_type = SingleLine.schema_type
    readonly = True
    default = None

    def serialize(self, workflow=null):
        """Serialize the :term:`appstruct` to a :term:`cstruct`."""
        if workflow:
            return workflow.type


@deferred
def deferred_state_validator(node, kw: dict) -> OneOf:
    """Validate workflow state."""
    context = kw['context']
    workflow = kw['workflow']
    request = kw['request']
    if workflow is None:
        allowed = []
    else:
        nexts = workflow.get_next_states(context, request)
        current = workflow.state_of(context)
        allowed = [current] + nexts
    return OneOf(allowed)


@deferred
def deferred_state_widget(node, kw: dict) -> Widget:
    """Workflow state widget."""
    validator = deferred_state_validator(node, kw)
    states = [(x, x) for x in validator.choices]
    return SelectWidget(values=states)


class StateName(SingleLine):
    """Workflow state name.

    Possible values are set by the given `workflow` binding.
    """

    @deferred
    def validator(self, kw: dict):
        """Validator."""
        workflow = kw['workflow']
        if workflow is None:
            states = []
        else:
            states = workflow._states.keys()  # TODO don't use private attr
        return OneOf(states)

    @deferred
    def widget(self, kw: dict) -> Widget:
        states = [(x, x) for x in self.validator.choices]
        return SelectWidget(values=states)


class StateData(MappingSchema):
    """Resource specific data for a workflow state."""

    missing = drop

    @deferred
    def default(self, kw):
        return {}

    name = StateName()
    description = Text(missing='',
                       default='')
    start_date = DateTime(missing=None,
                          default=None)
    end_date = DateTime(missing=None,
                        default=None)


class StateDataList(SequenceSchema):
    """List of StateData."""

    data = StateData()


class WorkflowAssignmentSchema(MappingSchema):
    """Workflow assignment sheet data structure."""

    workflow = Workflow(missing=drop)
    """Workflow assigned to the sheet context resource.

    Available workflows are defined in :mod:`adhocracy_core.workflows`.
    """

    workflow_state = SingleLine(missing=drop,
                                validator=deferred_state_validator,
                                widget=deferred_state_widget,
                                )
    """Workflow state of the sheet context resource.

    Setting this executes a transition to the new state value.
    """

    state_data = StateDataList(missing=drop)
    """Optional List of :class:`StateData`.

    example:

        {'name': 'state1', 'description': 'text', 'start_date': <DateTime>,
         'end_date: <DateTime>}
    """


class IWorkflowAssignment(ISheet):
    """Market interface for the workflow assignment sheet."""


@implementer(IResourceSheet)
class WorkflowAssignmentSheet(AnnotationRessourceSheet):
    """Sheet class for workflow assignment sheets.

    It allows to view and modify the workflow state of `context`.
    If the you set a new workflow state a transition to this state is executed.

    The workflow of `context` is only found, if the :term:`resource_type`
    metadata of `context` has a valid 'workflow` entry.
    """

    def get_schema_with_bindings(self):
        schema = create_schema(self.meta.schema_class,
                               self.context,
                               self.request,
                               registry=self.registry,
                               creating=self.creating,
                               workflow=self._get_workflow()
                               )
        return schema

    def _get_workflow(self):
        if self.creating:
            name = self.creating.workflow_name
            workflow = self.registry.content.workflows.get(name, None)
        else:
            workflow = self.registry.content.get_workflow(self.context)
        return workflow

    def _store_data(self, appstruct: dict):
        if 'workflow_state' in appstruct:
            self._do_transition_to(appstruct['workflow_state'])
            del appstruct['workflow_state']
        super()._store_data(appstruct)

    def _get_data_appstruct(self) -> dict:
        """Get data appstruct."""
        appstruct = super()._get_data_appstruct()
        workflow = self.registry.content.get_workflow(self.context)
        if workflow:
            appstruct['workflow'] = workflow
            appstruct['workflow_state'] = workflow.state_of(self.context)
        return appstruct

    def _do_transition_to(self, name: str):
        """Do transition to state `name`, don`t check user permissions."""
        workflow = self.get()['workflow']
        request = self.request or DummyRequest()  # ease testing
        workflow.transition_to_state(self.context, request, to_state=name)


workflow_meta = sheet_meta._replace(
    isheet=IWorkflowAssignment,
    schema_class=WorkflowAssignmentSchema,
    sheet_class=WorkflowAssignmentSheet,
    permission_edit='do_transition'
)


def includeme(config):
    """Add sheet."""
    add_sheet_to_registry(workflow_meta, config.registry)
