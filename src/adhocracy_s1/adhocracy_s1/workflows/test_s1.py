from pyramid import testing
from pytest import fixture
from pytest import mark
from unittest.mock import Mock
from webtest import TestResponse


class TestChangeChildrenToVotable:

    @fixture
    def registry(self, registry_with_content, mock_sheet):
        mock_sheet.get.return_value = {'workflow_state': ''}
        registry_with_content.content.get_sheet.return_value = mock_sheet
        return registry_with_content

    def call_fut(self, *args, **kwargs):
        from .s1 import change_children_to_voteable
        return change_children_to_voteable(*args, **kwargs)

    def test_ignore_if_no_workflow(self, context, request_, registry):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        context['child'] = testing.DummyResource()
        registry.content.get_sheet.side_effect = RuntimeConfigurationError
        self.call_fut(context, request_)

    def test_ignore_if_state_is_not_propose(self, context, request_, registry,
                                            mock_sheet):
        context['child'] = testing.DummyResource()
        self.call_fut(context, request_)
        assert not mock_sheet.set.called

    def test_change_children_to_votable(self, context, request_, registry,
                                        mock_sheet):
        context['child'] = testing.DummyResource()
        mock_sheet.get.return_value = {'workflow_state': 'proposed'}
        self.call_fut(context, request_)
        mock_sheet.set.assert_called_with({'workflow_state': 'voteable'}, request=request_)


class TestChangeChildrenToRejected:

    @fixture
    def registry(self, registry_with_content, mock_sheet):
        mock_sheet.get.return_value = {'workflow_state': ''}
        registry_with_content.content.get_sheet.return_value = mock_sheet
        return registry_with_content

    @fixture
    def mock_catalogs(self, monkeypatch, mock_catalogs) -> Mock:
        """Monkeypatch find_service to return mock_catalogs."""
        from . import s1
        monkeypatch.setattr(s1, 'find_service', lambda x, y: mock_catalogs)
        return mock_catalogs

    def call_fut(self, *args, **kwargs):
        from .s1 import change_children_to_rejected_or_selected
        return change_children_to_rejected_or_selected(*args, **kwargs)

    def test_ignore_if_no_rated_children(
            self, context, request_, mock_sheet, mock_catalogs):
        from adhocracy_core.interfaces import search_query
        from adhocracy_core.sheets.rate import IRateable
        from adhocracy_core.sheets.versions import IVersionable
        self.call_fut(context, request_)

        wanted_query = search_query._replace(interfaces=(IRateable, IVersionable),
                                             root=context,
                                             depth=2,
                                             only_visible=True,
                                             sort_by='rates',
                                             indexes = {'tag': 'LAST'},
                                             )
        assert not mock_sheet.set.called
        assert mock_catalogs.search.call_args[0][0] == wanted_query

    def test_ignore_if_no_workflow(
            self, context, item, request_, mock_sheet, registry, mock_catalogs):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        version = testing.DummyResource()
        item['version'] = version
        mock_catalogs.search.return_value = mock_catalogs.search.return_value._replace(elements=[version])
        registry.content.get_sheet.side_effect = RuntimeConfigurationError
        self.call_fut(context, request_)
        assert not mock_sheet.set.called

    def test_ignore_if_state_is_not_voteable(
            self, context, item, request_, registry, mock_sheet, mock_catalogs):
        version = testing.DummyResource()
        item['version'] = version
        mock_catalogs.search.return_value = mock_catalogs.search.return_value._replace(elements=[version])
        self.call_fut(context, request_)
        assert not mock_sheet.set.called

    def test_change_most_rated_child_to_selected_and_other_to_rejected(
            self, context, item, request_, registry, mock_sheet, mock_catalogs):
        from unittest.mock import call
        version_most_rated = testing.DummyResource()
        item['version'] = version_most_rated
        item2 = item.clone()
        version = testing.DummyResource()
        item2['version'] = version
        mock_catalogs.search.return_value = mock_catalogs.search.return_value._replace(elements=[version_most_rated, version])
        mock_sheet.get.return_value = {'workflow_state': 'voteable'}
        self.call_fut(context, request_)
        # this is a ugly test assertion, it depends on call order
        call({'workflow_state': 'selected'}, request=request_) in mock_sheet.set.call_args_list
        call({'workflow_state': 'rejected'}, request=request_) in mock_sheet.set.call_args_list


@mark.usefixtures('integration')
def test_s1_includeme_add_workflow(registry):
    from adhocracy_core.workflows import AdhocracyACLWorkflow
    workflow = registry.content.workflows['s1']
    assert isinstance(workflow, AdhocracyACLWorkflow)


@mark.usefixtures('integration')
def test_s1_initiate_and_transition_to_result(registry, context, request_):
    workflow = registry.content.workflows['s1']
    request = testing.DummyRequest()
    workflow.initialize(context)
    assert workflow.state_of(context) is 'propose'
    workflow.transition_to_state(context, request, 'select')
    workflow.transition_to_state(context, request, 'result')
    workflow.transition_to_state(context, request, 'propose')


def _post_proposal_item(app_user, path='') -> TestResponse:
    from adhocracy_s1.resources.s1 import IProposal
    resp = app_user.post_resource(path, IProposal, {})
    return resp


def _do_transition_to(app_user, path, state) -> TestResponse:
    from adhocracy_core.sheets.workflow import IWorkflowAssignment
    data = {'data': {IWorkflowAssignment.__identifier__:\
                         {'workflow_state': state}}}
    resp = app_user.put(path, data)
    return resp


@mark.functional
class TestS1Workflow:

    def test_propose_participant_can_create_proposals(self, app_participant):
        resp = _post_proposal_item(app_participant, path='/s1')
        assert 'proposal_0000000' in resp.json['path']
        resp = _post_proposal_item(app_participant, path='/s1')
        assert 'proposal_0000001' in resp.json['path']

    def test_propose_proposal_has_state_propose(self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        resp = app_participant.get('/s1/proposal_0000000')
        assert resp.json['data'][IWorkflowAssignment.__identifier__]['workflow_state'] == 'proposed'

    def test_propose_participant_can_comment_proposal(self, app_participant2):
        from adhocracy_core.resources.comment import IComment
        assert IComment in app_participant2.get_postable_types(
            '/s1/proposal_0000000/comments')

    def test_propose_participant_can_rate_proposal(self, app_participant2):
        from adhocracy_core.resources.rate import IRate
        assert IRate in app_participant2.get_postable_types(
            '/s1/proposal_0000000/rates')

    def test_change_state_to_select(self, app_initiator):
        resp = _do_transition_to(app_initiator, '/s1', 'select')
        assert resp.status_code == 200

    def test_select_proposal_has_state_votable(self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        resp = app_participant.get('/s1/proposal_0000000')
        assert resp.json['data'][IWorkflowAssignment.__identifier__]['workflow_state'] == 'voteable'

    def test_select_participant_can_comment_proposal(self, app_participant2):
        from adhocracy_core.resources.comment import IComment
        assert IComment in app_participant2.get_postable_types(
            '/s1/proposal_0000000/comments')

    def test_select_participant_can_rate_proposal(self, app_participant2):
        from adhocracy_core.resources.rate import IRate
        assert IRate in app_participant2.get_postable_types(
            '/s1/proposal_0000000/rates')

    def test_change_state_to_result(self, app_initiator):
        resp = _do_transition_to(app_initiator, '/s1', 'result')
        assert resp.status_code == 200

    def test_result_old_proposal_most_rated_has_state_selected(self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        resp = app_participant.get('/s1/proposal_0000000')
        assert resp.json['data'][IWorkflowAssignment.__identifier__]['workflow_state'] == 'selected'

    def test_result_old_proposal_not_most_rated_has_state_rejected(self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        resp = app_participant.get('/s1/proposal_0000001')
        assert resp.json['data'][IWorkflowAssignment.__identifier__]['workflow_state'] == 'rejected'

    def test_result_participant_cannot_comment_old_proposal(self, app_participant2):
        from adhocracy_core.resources.comment import IComment
        assert IComment not in app_participant2.get_postable_types(
            '/s1/proposal_0000001/comments')

    def test_result_participant_cannot_rate_old_proposal(self, app_participant2):
        from adhocracy_core.resources.rate import IRate
        assert IRate not in app_participant2.get_postable_types(
            '/s1/proposal_0000001/rates')

    def test_result_participant_can_create_proposal(self, app_participant):
        resp = _post_proposal_item(app_participant, path='/s1')
        assert 'proposal_0000002' in resp.json['path']

    def test_result_participant_can_comment_proposal(self, app_participant2):
        from adhocracy_core.resources.comment import IComment
        assert IComment in app_participant2.get_postable_types(
            '/s1/proposal_0000002/comments')

    def test_result_participant_can_rate_proposal(self, app_participant2):
        from adhocracy_core.resources.rate import IRate
        assert IRate in app_participant2.get_postable_types(
            '/s1/proposal_0000002/rates')


@mark.usefixtures('integration')
def test_s1_content_includeme_add_workflow(registry):
    from adhocracy_core.workflows import AdhocracyACLWorkflow
    workflow = registry.content.workflows['s1_content']
    assert isinstance(workflow, AdhocracyACLWorkflow)


@mark.usefixtures('integration')
def test_s1_content_initiate_and_transition_to_selected(registry, context,
                                                        request_):
    workflow = registry.content.workflows['s1_content']
    workflow.initialize(context)
    assert workflow.state_of(context) is 'proposed'
    workflow.transition_to_state(context, request_, 'voteable')
    workflow.transition_to_state(context, request_, 'selected')


