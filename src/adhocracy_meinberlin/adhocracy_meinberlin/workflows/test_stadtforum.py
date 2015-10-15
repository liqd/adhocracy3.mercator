from pyramid import testing
from pytest import fixture
from pytest import mark
from webtest import TestResponse

from adhocracy_core.utils.testing import add_resources
from adhocracy_core.utils.testing import do_transition_to


@mark.functional
class TestStadtforumWorkflow:

    @fixture
    def process_url(self):
        return '/organisation/stadtforum'

    def test_create_resources(self,
                              registry,
                              datadir,
                              process_url,
                              app,
                              app_admin):
        json_file = str(datadir.join('resources.json'))
        add_resources(app, json_file)
        resp = app_admin.get(process_url)
        assert resp.status_code == 200

    def test_set_participate_state(self, registry, app, process_url, app_admin):
        resp = app_admin.get(process_url)
        assert resp.status_code == 200

        resp = do_transition_to(app_admin,
                                process_url,
                                'announce')
        assert resp.status_code == 200

        resp = do_transition_to(app_admin,
                                process_url,
                                'participate')
        assert resp.status_code == 200

    def test_participate_initiator_can_create_proposal(
            self,
            # if 'registry' is removed the content is not present
            registry,
            app_initiator,
            process_url):
        from adhocracy_core.resources.proposal import IProposal
        assert IProposal in app_initiator.get_postable_types(process_url)

    def test_participate_participant_cannot_create_proposal(
            self,
            # if 'registry' is removed the content is not present
            registry,
            app_participant,
            process_url):
        from adhocracy_core.resources.proposal import IProposal
        assert IProposal not in app_participant.get_postable_types(process_url)
