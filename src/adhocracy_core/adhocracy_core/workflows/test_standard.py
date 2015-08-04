from pyramid import testing
from pytest import fixture
from pytest import mark

from adhocracy_core.resources import process

@fixture
def integration(integration):
    integration.include('adhocracy_core.workflows')
    return integration

@mark.usefixtures('integration')
def test_includeme_add_standard_workflow(registry):
    from . import AdhocracyACLWorkflow
    workflow = registry.content.workflows['standard']
    assert isinstance(workflow, AdhocracyACLWorkflow)

@mark.usefixtures('integration')
def test_initiate_and_transition_to_result(registry, context):
    workflow = registry.content.workflows['standard']
    request = testing.DummyRequest()
    assert workflow.state_of(context) is None
    workflow.initialize(context)
    assert workflow.state_of(context) is 'draft'
    workflow.transition_to_state(context, request, 'announce')
    assert workflow.state_of(context) is 'announce'
    workflow.transition_to_state(context, request, 'participate')
    assert workflow.state_of(context) is 'participate'
    workflow.transition_to_state(context, request, 'evaluate')
    assert workflow.state_of(context) is 'evaluate'
    workflow.transition_to_state(context, request, 'result')
    assert workflow.state_of(context) is 'result'
    workflow.transition_to_state(context, request, 'closed')
    assert workflow.state_of(context) is 'closed'


class TestStandardWorkflow:

    @fixture
    def meta(self):
        from .standard import standard_meta
        return standard_meta

    @fixture
    def acl(self, meta, registry):
        from adhocracy_core.resources.root import root_acm
        from adhocracy_core.authorization import acm_to_acl
        acm = meta['states']['draft']['acm']
        acl = acm_to_acl(acm, registry) + acm_to_acl(root_acm, registry)
        return acl

    def test_draft_initiator_can_view_proposal(self, acl):
        index_initiator = acl.index(('Allow', 'initiator', 'view'))
        index_participant = acl.index(('Deny', 'participant', 'view'))
        assert index_initiator < index_participant
