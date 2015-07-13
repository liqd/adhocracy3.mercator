from pyramid import testing
from pytest import fixture
from pytest import mark

class TestProposal:

    @fixture
    def meta(self):
        from .proposal import proposal_meta
        return proposal_meta

    def test_meta(self, meta):
        from .proposal import IProposalVersion
        assert meta.element_types == [IProposalVersion]
        assert meta.item_type == IProposalVersion
        assert meta.permission_create == 'create_proposal'

    @mark.usefixtures('integration')
    def test_create(self, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)

class TestProposalVersion:

    @fixture
    def meta(self):
        from .proposal import proposal_version_meta
        return proposal_version_meta

    def test_meta(self, meta):
        import adhocracy_core.sheets
        assert meta.extended_sheets == \
               [adhocracy_core.sheets.badge.IBadgeable,
                adhocracy_core.sheets.title.ITitle,
                adhocracy_core.sheets.description.IDescription,
                adhocracy_core.sheets.comment.ICommentable,
                adhocracy_core.sheets.rate.IRateable,
                ]
        assert meta.permission_create == 'edit_proposal'

    @mark.usefixtures('integration')
    def test_create(self, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)
