from pyramid import testing
from pytest import fixture
from pytest import mark

class TestProposal:

    @fixture
    def meta(self):
        from .proposal import proposal_meta
        return proposal_meta

    def test_meta(self, meta):
        from adhocracy_core import sheets
        from .proposal import IProposalVersion
        assert meta.element_types == (IProposalVersion,)
        assert meta.item_type == IProposalVersion
        assert meta.extended_sheets == (sheets.badge.IBadgeable,
                                        )
        assert meta.permission_create == 'create_proposal'
        assert meta.autonaming_prefix == 'proposal_'
        assert meta.use_autonaming
        assert meta.is_implicit_addable

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
               (adhocracy_core.sheets.badge.IBadgeable,
                adhocracy_core.sheets.title.ITitle,
                adhocracy_core.sheets.description.IDescription,
                adhocracy_core.sheets.comment.ICommentable,
                adhocracy_core.sheets.rate.IRateable,
                )
        assert meta.permission_create == 'edit_proposal'

    @mark.usefixtures('integration')
    def test_create(self, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)

class TestGeoProposal:

    @fixture
    def meta(self):
        from .proposal import geo_proposal_meta
        return geo_proposal_meta

    def test_meta(self, meta):
        from .proposal import IGeoProposalVersion
        assert meta.element_types == (IGeoProposalVersion,)
        assert meta.permission_create == 'create_proposal'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta, context):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)


class TestGeoProposalVersion:

    @fixture
    def meta(self):
        from .proposal import geo_proposal_version_meta
        return geo_proposal_version_meta

    def test_meta(self, meta):
        import adhocracy_core.sheets
        assert meta.extended_sheets == \
               (adhocracy_core.sheets.badge.IBadgeable,
                adhocracy_core.sheets.title.ITitle,
                adhocracy_core.sheets.description.IDescription,
                adhocracy_core.sheets.comment.ICommentable,
                adhocracy_core.sheets.rate.IRateable,
                adhocracy_core.sheets.geo.IPoint,
                )
        assert meta.permission_create == 'edit_proposal'

    @mark.usefixtures('integration')
    def test_create(self, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)
