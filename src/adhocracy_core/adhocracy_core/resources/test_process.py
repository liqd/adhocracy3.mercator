from pytest import mark
from pytest import fixture


class TestProcess:

    @fixture
    def meta(self):
        from .process import process_meta
        return process_meta

    def test_meta(self, meta):
        from .process import IProcess
        from .asset import add_assets_service
        from .badge import add_badges_service
        from adhocracy_core.interfaces import IPool
        from adhocracy_core import sheets
        assert meta.iresource is IProcess
        assert meta.is_sdi_addable
        assert IProcess.isOrExtends(IPool)
        assert meta.is_implicit_addable is False
        assert meta.permission_create == 'create_process'
        assert sheets.asset.IHasAssetPool in meta.basic_sheets
        assert sheets.badge.IHasBadgesPool in meta.basic_sheets
        assert sheets.description.IDescription in meta.basic_sheets
        assert sheets.workflow.IWorkflowAssignment in meta.basic_sheets
        assert add_assets_service in meta.after_creation
        assert add_badges_service in meta.after_creation
        assert meta.workflow_name == 'sample'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        res = registry.content.create(meta.iresource.__identifier__)
        assert meta.iresource.providedBy(res)
