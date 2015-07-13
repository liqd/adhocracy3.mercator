from pytest import mark
from pytest import fixture


class TestProposal:

    @fixture
    def meta(self):
        from .kiezkassen import proposal_meta
        return proposal_meta

    def test_meta(self, meta):
        from .kiezkassen import IProposalVersion
        assert meta.element_types == [IProposalVersion]
        assert meta.item_type == IProposalVersion
        assert meta.permission_create == 'create_proposal'

    @mark.usefixtures('integration')
    def test_create_kiezkassen(self, registry, meta, context):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)


class TestProposalVersion:

    @fixture
    def meta(self):
        from .kiezkassen import proposal_version_meta
        return proposal_version_meta

    def test_meta(self, meta):
        import adhocracy_core.sheets
        from adhocracy_meinberlin.sheets import kiezkassen
        assert meta.extended_sheets == \
               [adhocracy_core.sheets.badge.IBadgeable,
                adhocracy_core.sheets.title.ITitle,
                adhocracy_core.sheets.description.IDescription,
                adhocracy_core.sheets.comment.ICommentable,
                adhocracy_core.sheets.rate.IRateable,
                kiezkassen.IProposal,
                adhocracy_core.sheets.geo.IPoint,
                ]
        assert meta.permission_create == 'edit_proposal'

    @mark.usefixtures('integration')
    def test_create(self, meta, registry):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)


class TestProcess:

    @fixture
    def meta(self):
        from .kiezkassen import process_meta
        return process_meta

    def test_meta(self, meta):
        import adhocracy_core.resources.process
        import adhocracy_core.sheets.image
        import adhocracy_core.sheets.description
        import adhocracy_meinberlin.sheets.kiezkassen
        from adhocracy_core.resources.asset import add_assets_service
        from .kiezkassen import IProcess
        assert meta.iresource is IProcess
        assert IProcess.isOrExtends(adhocracy_core.resources.process.IProcess)
        assert meta.is_implicit_addable is True
        assert meta.permission_create == 'create_process'
        assert meta.extended_sheets == [
            adhocracy_core.sheets.description.IDescription,
            adhocracy_meinberlin.sheets.kiezkassen.IWorkflowAssignment,
            adhocracy_core.sheets.geo.ILocationReference,
            adhocracy_core.sheets.image.IImageReference,
        ]
        assert add_assets_service in meta.after_creation
        assert meta.permission_create == 'create_process'


    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)
