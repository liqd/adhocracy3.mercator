from pyramid import testing
from pytest import fixture
from pytest import mark
from unittest.mock import Mock
from webtest import TestResponse

from adhocracy_core.utils.testing import do_transition_to


class TestDoTransitionToPropose:

    @fixture
    def registry(self, registry_with_content, mock_sheet):
        mock_sheet.get.return_value = {'state_data': []}
        registry_with_content.content.get_sheet.return_value = mock_sheet
        return registry_with_content

    def call_fut(self, *args, **kwargs):
        from .s1 import do_transition_to_propose
        return do_transition_to_propose(*args, **kwargs)

    def test_ignore_if_no_result_state_data(self, context, request_, registry,
                                            mock_sheet):
        self.call_fut(context, request_)
        assert not mock_sheet.set.called

    def test_remove_result_state_data_start_date(
            self, context, request_, registry, mock_sheet):
        mock_sheet.get.return_value = {'state_data': [{'name': 'result',
                                                       'start_date': '2015'}]}
        self.call_fut(context, request_)
        mock_sheet.set.assert_called_with({'state_data': [{'name': 'result'}]},
                                          request=request_)


class TestDoTransitionToVotable:

    @fixture
    def registry(self, registry_with_content, mock_sheet):
        mock_sheet.get.return_value = {'workflow_state': ''}
        registry_with_content.content.get_sheet.return_value = mock_sheet
        return registry_with_content

    def call_fut(self, *args, **kwargs):
        from .s1 import do_transition_to_voteable
        return do_transition_to_voteable(*args, **kwargs)

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

    def test_change_children_to_voteable(self, context, request_, registry,
                                        mock_sheet):
        context['child'] = testing.DummyResource()
        mock_sheet.get.return_value = {'workflow_state': 'proposed'}
        self.call_fut(context, request_, )
        mock_sheet.set.assert_called_with({'workflow_state': 'voteable'},
                                          request=request_)


class TestChangeChildrenToSelectedRejected:

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
        from .s1 import _change_children_to_rejected_or_selected
        return _change_children_to_rejected_or_selected(*args, **kwargs)

    def test_ignore_if_no_rated_children(
            self, context, request_, mock_sheet, mock_catalogs):
        from adhocracy_core.interfaces import search_query
        from adhocracy_core.sheets.rate import IRateable
        from adhocracy_core.sheets.versions import IVersionable
        self.call_fut(context, request_)

        wanted_query = search_query._replace(\
            interfaces=(IRateable, IVersionable),
            root=context,
            depth=2,
            only_visible=True,
            sort_by='rates',
            reverse=True,
            indexes = {'tag': 'LAST',
                       'workflow_state': 'voteable'},
            )
        assert not mock_sheet.set.called
        assert mock_catalogs.search.call_args[0][0] == wanted_query

    def test_ignore_if_no_workflow(
            self, context, item, request_, mock_sheet, registry, mock_catalogs):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        version = testing.DummyResource()
        item['version'] = version
        mock_catalogs.search.return_value =\
            mock_catalogs.search.return_value._replace(elements=[version])
        registry.content.get_sheet.side_effect = RuntimeConfigurationError
        self.call_fut(context, request_)
        assert not mock_sheet.set.called

    def test_ignore_if_state_is_not_voteable(
            self, context, item, request_, registry, mock_sheet, mock_catalogs):
        version = testing.DummyResource()
        item['version'] = version
        mock_catalogs.search.return_value =\
            mock_catalogs.search.return_value._replace(elements=[version])
        self.call_fut(context, request_)
        assert not mock_sheet.set.called

    def test_change_most_rated_child_to_selected_and_other_to_rejected(
            self, context, item, request_, registry, mock_sheet, mock_catalogs):
        from copy import copy
        from datetime import datetime
        version_most_rated = testing.DummyResource()
        item['version'] = version_most_rated
        item2 = item.clone()
        version = testing.DummyResource()
        item2['version'] = version
        mock_catalogs.search.return_value =\
            mock_catalogs.search.return_value._replace(elements=[version_most_rated, version])

        mock2_sheet = copy(mock_sheet)
        mock_sheet.get.return_value = {'workflow_state': 'voteable',
                                       'state_data': []}
        mock2_sheet.get.return_value = {'workflow_state': 'voteable',
                                       'state_data': []}
        registry.content.get_sheet.side_effect = [mock_sheet, mock_sheet,
                                                  mock2_sheet, mock2_sheet]
        decision_date = datetime.now()
        self.call_fut(context, request_, start_date=decision_date)
        # this is a ugly test assertion, it depends on call order
        #assert mock_sheet.set.call_args_list ==\
        #    [call({'workflow_state': 'selected',
        #           'state_data': [{'start_date': decision_date,
        #                           'name': 'selected'}]},
        #             request=request_),
        #     call({'workflow_state': 'rejected',
        #           'state_data': [{'start_date': decision_date,
        #                           'name': 'rejected'}]},
        #              request=request_)]


@mark.usefixtures('integration')
def test_s1_includeme_add_workflow(registry):
    from adhocracy_core.workflows import AdhocracyACLWorkflow
    workflow = registry.content.workflows['s1']
    assert isinstance(workflow, AdhocracyACLWorkflow)


@mark.usefixtures('integration')
def test_s1_initiate_and_transition_to_result(registry, pool_with_catalogs,
                                              request_):
    from adhocracy_core.sheets.workflow import IWorkflowAssignment
    from adhocracy_s1.resources.s1 import IProcess
    process = testing.DummyResource(__provides__=(IProcess,
                                                  IWorkflowAssignment))
    pool_with_catalogs["process"] = process
    workflow = registry.content.workflows['s1']
    workflow.initialize(process)
    assert workflow.state_of(process) is 'propose'
    workflow.transition_to_state(process, request_, 'select')
    workflow.transition_to_state(process, request_, 'result')
    workflow.transition_to_state(process, request_, 'propose')


def _post_proposal_item(app_user, path='') -> TestResponse:
    from adhocracy_s1.resources.s1 import IProposal
    resp = app_user.post_resource(path, IProposal, {})
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
        assert resp.json['data'][IWorkflowAssignment.__identifier__]\
                   ['workflow_state'] == 'proposed'

    def test_propose_participant_can_comment_proposal(self, app_participant2):
        from adhocracy_core.resources.comment import IComment
        assert IComment in app_participant2.get_postable_types(
            '/s1/proposal_0000000/comments')

    def test_propose_participant_can_rate_proposal(self, app_participant2):
        from adhocracy_core.resources.rate import IRate
        assert IRate in app_participant2.get_postable_types(
            '/s1/proposal_0000000/rates')

    def test_change_state_to_select(self, app_initiator):
        resp = do_transition_to(app_initiator, '/s1', 'select')
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

    def test_select_everybody_can_list_votable_proposals(self, app_participant):
        from adhocracy_core.sheets.pool import IPool
        resp = app_participant.get('/s1', {'workflow_state': 'voteable'})
        assert resp.json['data'][IPool.__identifier__]['elements'] == \
             ['http://localhost/s1/proposal_0000000/',
              'http://localhost/s1/proposal_0000001/']

    def test_change_state_to_result(self, app_initiator):
        resp = do_transition_to(app_initiator, '/s1', 'result')
        assert resp.status_code == 200

    def test_result_old_proposal_most_rated_has_state_selected(self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        resp = app_participant.get('/s1/proposal_0000000')
        assert resp.json['data'][IWorkflowAssignment.__identifier__]['workflow_state'] == 'selected'

    def test_result_old_proposal_has_stored_decision_date(self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        resp = app_participant.get('/s1/proposal_0000000')
        decision_date = resp.json['data'][IWorkflowAssignment.__identifier__]\
            ['state_data'][0]['start_date']
        assert decision_date.endswith('+00:00')

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

    def test_result_everybody_can_list_proposals_used_for_this_meeting(
            self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        from adhocracy_core.sheets.pool import IPool
        resp = app_participant.get('/s1')
        state_data = resp.json['data'][IWorkflowAssignment.__identifier__]['state_data']
        datas = [x for x in state_data if x['name'] == 'result']
        decision_date = datas[0]['start_date']
        resp = app_participant.get('/s1', {'decision_date': decision_date})
        assert resp.json['data'][IPool.__identifier__]['elements'] == \
             ['http://localhost/s1/proposal_0000000/',
              'http://localhost/s1/proposal_0000001/']

    def test_change_state_to_propose_again(self, app_initiator):
        resp = do_transition_to(app_initiator, '/s1', 'propose')
        assert resp.status_code == 200

    def test_propose_again_old_decision_date_is_removed(self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        resp = app_participant.get('/s1')
        state_data = resp.json['data'][IWorkflowAssignment.__identifier__]['state_data']
        datas = [x for x in state_data if x['name'] == 'result']
        decision_date = datas[0]['start_date']
        assert decision_date is None

    def test_propose_participant_can_create_proposals_again(self, app_participant):
        resp = _post_proposal_item(app_participant, path='/s1')
        assert 'proposal_0000003' in resp.json['path']

    def test_change_state_to_select_again(self, app_initiator):
        resp = do_transition_to(app_initiator, '/s1', 'select')
        assert resp.status_code == 200

    def test_change_state_to_result_again(self, app_initiator):
        resp = do_transition_to(app_initiator, '/s1', 'result')
        assert resp.status_code == 200

    def test_result_everybody_can_list_proposals_used_for_this_meeting_again(
            self, app_participant):
        from adhocracy_core.sheets.workflow import IWorkflowAssignment
        from adhocracy_core.sheets.pool import IPool
        resp = app_participant.get('/s1')
        state_data = resp.json['data'][IWorkflowAssignment.__identifier__]['state_data']
        datas = [x for x in state_data if x['name'] == 'result']
        decision_date = datas[0]['start_date']
        resp = app_participant.get('/s1', {'decision_date': decision_date})
        assert resp.json['data'][IPool.__identifier__]['elements'] == \
             ['http://localhost/s1/proposal_0000002/',
              'http://localhost/s1/proposal_0000003/']


@mark.usefixtures('integration')
def test_s1_content_includeme_add_workflow(registry):
    from adhocracy_core.workflows import AdhocracyACLWorkflow
    workflow = registry.content.workflows['s1_content']
    assert isinstance(workflow, AdhocracyACLWorkflow)


@mark.usefixtures('integration')
def test_s1_content_initiate_and_transition_to_selected(registry, request_):
    from adhocracy_s1.resources.s1 import IProcess
    process = testing.DummyResource(__provides__=IProcess)
    workflow = registry.content.workflows['s1_content']
    workflow.initialize(process)
    assert workflow.state_of(process) is 'proposed'
    workflow.transition_to_state(process, request_, 'voteable')
    workflow.transition_to_state(process, request_, 'selected')


