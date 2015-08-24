from pytest import fixture
from pytest import mark


class TestS1Process:

    @fixture
    def meta(self):
        from .s1 import process_meta
        return process_meta

    def test_meta(self, meta):
        import adhocracy_core.resources
        from adhocracy_s1 import resources
        assert meta.iresource == resources.s1.IProcess
        assert meta.iresource.isOrExtends(
            adhocracy_core.resources.process.IProcess)
        assert meta.workflow_name== 's1'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)


class TestProposal:

    @fixture
    def meta(self):
        from .s1 import proposal_meta
        return proposal_meta

    def test_meta(self, meta):
        import adhocracy_core.resources
        import adhocracy_core.sheets
        from adhocracy_s1 import resources
        assert meta.iresource == resources.s1.IProposal
        assert meta.iresource.isOrExtends(
            adhocracy_core.resources.proposal.IProposal)
        assert meta.workflow_name == 's1_content'
        assert meta.element_types == (resources.s1.IProposalVersion,)
        assert meta.item_type == resources.s1.IProposalVersion
        assert meta.permission_create == 'create_proposal'
        assert adhocracy_core.resources.logbook.add_logbook_service \
               in meta.after_creation
        assert meta.use_autonaming
        assert meta.autonaming_prefix == 'proposal_'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)


class TestProposalVersion:

    @fixture
    def meta(self):
        from .s1 import proposal_version_meta
        return proposal_version_meta

    def test_meta(self, meta):
        import adhocracy_core.resources
        from adhocracy_s1 import resources
        from adhocracy_s1 import sheets
        assert meta.iresource == resources.s1.IProposalVersion
        assert meta.iresource.isOrExtends(
            adhocracy_core.resources.proposal.IProposalVersion)
        assert adhocracy_core.sheets.logbook.IHasLogbookPool in\
            meta.extended_sheets
        assert meta.permission_create == 'edit_proposal'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)

