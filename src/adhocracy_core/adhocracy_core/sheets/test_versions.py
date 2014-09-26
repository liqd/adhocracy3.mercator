from pyramid import testing
from pytest import fixture


class TestVersionsSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.versions import versions_metadata
        return versions_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.versions import IVersions
        from adhocracy_core.sheets.versions import VersionsSchema
        from adhocracy_core.sheets.pool import PoolSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, PoolSheet)
        assert inst.meta.isheet == IVersions
        assert inst.meta.schema_class == VersionsSchema
        assert inst.meta.editable is False
        assert inst.meta.creatable is False

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': []}

    def test_get_not_empty(self, meta, context):
        context['child'] = testing.DummyResource()
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': []}

    def test_get_not_empty_with_versionable(self, meta, context):
        from adhocracy_core.sheets.versions import IVersionable
        versionable = testing.DummyResource(__provides__=IVersionable)
        context['child'] = versionable
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': [versionable]}


def test_includeme_register_version_sheet(config):
    from adhocracy_core.utils import get_sheet
    from adhocracy_core.sheets.versions import IVersions
    config.include('adhocracy_core.sheets.versions')
    context = testing.DummyResource(__provides__=IVersions)
    assert get_sheet(context, IVersions)


class TestVersionableSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.versions import versionable_metadata
        return versionable_metadata

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_core.sheets.versions import IVersionable
        from adhocracy_core.sheets.versions import VersionableSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IVersionable
        assert inst.meta.schema_class == VersionableSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        data = inst.get()
        assert list(data['follows']) == []
        assert list(data['followed_by']) == []

    def test_get_with_followed_by(self, meta, context, mock_graph):
        successor = testing.DummyResource()
        inst = meta.sheet_class(meta, context)
        inst._graph = mock_graph
        mock_graph.get_back_references_for_isheet.return_value = {'follows': iter([successor])}
        data = inst.get()
        assert list(data['followed_by']) == [successor]

    def test_get_with_follows(self, meta, context, mock_graph):
        precessor = testing.DummyResource()
        inst = meta.sheet_class(meta, context)
        inst._graph = mock_graph
        mock_graph.get_references_for_isheet.return_value = {'follows': iter([precessor])}
        data = inst.get()
        assert list(data['follows']) == [precessor]

    def test_set_with_followed_by(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.set({'followed_by': iter([])})
        assert not 'followed_by' in inst._data


def test_includeme_register_versionable_sheet(config):
    from adhocracy_core.utils import get_sheet
    from adhocracy_core.sheets.versions import IVersionable
    config.include('adhocracy_core.sheets.versions')
    context = testing.DummyResource(__provides__=IVersionable)
    assert get_sheet(context, IVersionable)
