from pyramid import testing
from pytest import fixture
from pytest import raises
from pytest import mark


@fixture
def integration(config):
    config.include('adhocracy_core.content')
    config.include('adhocracy_core.sheets.workflow')


@fixture
def registry(registry_with_content):
    return registry_with_content


class TestWorkflow:

    @fixture
    def inst(self):
        from .workflow import Workflow
        return Workflow()

    def test_create(self, inst):
        from adhocracy_core.schema import SchemaNode
        assert isinstance(inst, SchemaNode)
        assert inst.readonly

    def test_serialize_empty(self, inst):
        assert inst.serialize() == None

    def test_serialize_workflow(self, inst, mock_workflow):
        mock_workflow.type = 'w'
        assert inst.serialize(mock_workflow) == 'w'


class TestStateName:

    @fixture
    def inst(self):
        from .workflow import StateName
        return StateName()

    def test_create(self, inst):
        from adhocracy_core.schema import SingleLine
        assert isinstance(inst, SingleLine)

    def test_serialize(self, inst, node):
        assert inst.serialize('state') == 'state'

    def test_deserialize(self, inst, context, mock_workflow):
        mock_workflow._states = {'draft': {}}
        inst = inst.bind(workflow=mock_workflow, context=context)
        assert inst.deserialize('draft') == 'draft'


def test_state_data_create():
    from adhocracy_core import schema
    from . import workflow
    inst = workflow.StateData()
    assert isinstance(inst['name'], workflow.StateName)
    assert isinstance(inst['start_date'], schema.DateTime)
    assert isinstance(inst['end_date'], schema.DateTime)
    assert isinstance(inst['description'], schema.Text)
    assert inst.bind(workflow=None).default == {}


def test_state_data_list():
    from . import workflow
    inst = workflow.StateDataList()
    assert isinstance(inst['data'], workflow.StateData)


def test_workflow_assignment_schema_create():
    import colander
    from adhocracy_core.schema import SingleLine
    from . import workflow
    inst = workflow.WorkflowAssignmentSchema()
    assert isinstance(inst['workflow'], workflow.Workflow)
    assert isinstance(inst['workflow_state'], SingleLine)
    assert inst['workflow_state'].validator == workflow.deferred_state_validator
    assert inst['workflow_state'].missing == colander.drop
    assert isinstance(inst['state_data'], workflow.StateDataList)


class TestDeferredStateValidator:

    @fixture
    def kw(self, context, request_, mock_workflow):
        return {'context': context,
                'request': request_,
                'workflow': mock_workflow,
                }

    def call_fut(self, *args):
        from .workflow import deferred_state_validator
        return deferred_state_validator(*args)

    def test_return_empty_list_if_no_workflow(self, node, kw):
        kw['workflow'] = None
        validator = self.call_fut(node, kw)
        assert validator.choices == []

    def test_return_next_states_list_if_workflow(self, node, kw):
        kw['workflow'].get_next_states.return_value = ['state2']
        kw['workflow'].state_of.return_value = 'state1'
        validator = self.call_fut(node, kw)
        assert validator.choices == ['state1', 'state2']
        kw['workflow'].get_next_states.assert_called_with(kw['context'],
                                                          kw['request'])


class TestWorkflowAssignmentSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.workflow import workflow_meta
        return workflow_meta

    def test_meta(self, meta):
        from . import workflow
        assert meta.isheet == workflow.IWorkflowAssignment
        assert meta.schema_class == workflow.WorkflowAssignmentSchema
        assert meta.permission_edit == 'do_transition'

    def test_create(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from . import workflow
        inst = meta.sheet_class(meta, context, None)
        assert isinstance(inst, workflow.WorkflowAssignmentSheet)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)

    def test_get_empty_without_workflow(self, meta, context, registry):
        registry.content.get_workflow.return_value = None
        inst = meta.sheet_class(meta, context, registry)
        assert inst.get() == {'workflow': None,
                              'workflow_state': '',
                              'state_data': []}

    def test_get_empty_with_workflow(self, meta, context, registry,
                                    mock_workflow):
        registry.content.get_workflow.return_value = mock_workflow
        mock_workflow.type = 'w'
        mock_workflow.state_of.return_value = 'draft'
        inst = meta.sheet_class(meta, context, registry)
        assert inst.get() == {'workflow': mock_workflow,
                              'workflow_state': 'draft',
                              'state_data': []}

    def test_serialize_empty_without_workflow(self, meta, context, registry,
                                                request_):
        registry.content.get_workflow.return_value = None
        inst = meta.sheet_class(meta, context, registry, request=request_)
        assert inst.serialize() == {'workflow': None,
                                    'workflow_state': '',
                                    'state_data': []}

    def test_deserialize_empty_with_workflow(self, meta, context, registry,
                                             mock_workflow, request_):
        registry.content.get_workflow.return_value = mock_workflow
        mock_workflow.type = 'w'
        mock_workflow.state_of.return_value = 'draft'
        inst = meta.sheet_class(meta, context, registry, request=request_)
        assert inst.serialize() == {'workflow': 'w',
                                    'workflow_state': 'draft',
                                    'state_data': []}

    def test_get_schema_with_bindings(
        self, meta, context, registry, mock_workflow, request_):
        registry.content.get_workflow.return_value = mock_workflow
        inst = meta.sheet_class(meta, context, registry, request=request_)
        schema = inst.get_schema_with_bindings()
        assert schema.bindings['workflow'] is mock_workflow
        assert schema.bindings['context'] is context
        assert schema.bindings['request'] is request_
        assert schema.bindings['registry'] is registry

    def test_get_schema_with_bindings_with_creating(
        self, meta, context, registry, mock_workflow, request_, resource_meta):
        resource_meta = resource_meta._replace(workflow_name='w')
        registry.content.workflows['w'] = mock_workflow
        inst = meta.sheet_class(meta, context, registry, request=request_,
                                creating=resource_meta)
        schema = inst.get_schema_with_bindings()
        assert schema.bindings['workflow'] is mock_workflow

    def test_set_workflow_state(self, meta, context, registry, mock_workflow):
        registry.content.get_workflow.return_value = mock_workflow
        mock_workflow._states = {'announced': {}}
        inst = meta.sheet_class(meta, context, registry)
        inst.set({'workflow_state': 'announced'})
        call_args = mock_workflow.transition_to_state.call_args
        assert call_args[0][0] is inst.context
        assert isinstance(call_args[0][1], testing.DummyRequest)
        assert call_args[1] == {'to_state': 'announced'}

    def test_set_other(self, meta, context, registry, mock_workflow):
        from colander import MappingSchema
        registry.content.get_workflow.return_value = mock_workflow
        inst = meta.sheet_class(meta, context, registry)
        inst.schema = inst.schema.clone()
        inst.schema.add(MappingSchema(name='other'))
        inst.set({'other': {}})
        appstruct = getattr(context, inst._annotation_key)
        assert 'other' in appstruct

    def tet_get_next_states(self, meta, context, registry, mock_workflow):
        registry.content.get_workflow.return_value = mock_workflow
        mock_workflow.get_next_states.return_value = ['announced']
        inst = meta.sheet_class(meta, context, registry)
        request = testing.DummyRequest()
        assert inst.get_next_states(request) == ['announced']
        mock_workflow.get_next_states.assert_called_with(inst.context, request)

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta, config):
        context = testing.DummyResource(__provides__=meta.isheet)
        assert config.registry.content.get_sheet(context, meta.isheet)
