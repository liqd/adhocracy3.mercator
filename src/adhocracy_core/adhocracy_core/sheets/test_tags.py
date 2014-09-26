from collections import Iterable

from pyramid import testing
from pytest import fixture

from adhocracy_core.sheets.tags import TagSheet


class TestTagsSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.tags import tags_metadata
        return tags_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.tags import ITags
        from adhocracy_core.sheets.tags import TagsSchema
        from adhocracy_core.sheets.pool import PoolSheet
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == ITags
        assert inst.meta.sheet_class == PoolSheet
        assert inst.meta.schema_class == TagsSchema
        assert inst.meta.editable is False
        assert inst.meta.creatable is False

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': []}

    def test_get_not_empty_with_target_isheet(self, meta, context):
        from adhocracy_core.sheets.tags import ITag
        child = testing.DummyResource(__provides__=ITag)
        context['child1'] = child
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': [child]}

    def test_get_not_empty_without_target_isheet(self, meta, context):
        child = testing.DummyResource()
        context['child1'] = child
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': []}


def test_includeme_register_tags_sheet(config):
    from adhocracy_core.sheets.tags import ITags
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.registry')
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.graph')
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_core.sheets.tags')
    context = testing.DummyResource(__provides__=ITags)
    assert get_sheet(context, ITags)


class MockTagSheet(TagSheet):

    """Replace _reindex_resources with dummy implementation."""

    def __init__(self, meta, context):
        super().__init__(meta, context)
        self._reindex_resources_called = False
        self.resources = None

    def _reindex_resources(self, resources: Iterable):
        self._reindex_resources_called = True
        self.resources = resources


class TestTagSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.tags import tag_metadata
        return tag_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.tags import ITag
        from adhocracy_core.sheets.tags import TagSchema
        from adhocracy_core.sheets.tags import TagSheet
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == ITag
        assert inst.meta.sheet_class == TagSheet
        assert inst.meta.schema_class == TagSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': []}

    def test_set_add_tag(self, meta, context):
        from adhocracy_core.sheets.tags import ITag
        inst = MockTagSheet(meta, context)
        child = testing.DummyResource(__provides__=ITag)
        inst.set(appstruct={'elements': [child]})
        assert inst._reindex_resources_called is True
        assert inst.resources == {child}

    def test_set_no_change(self, meta, context):
        from adhocracy_core.sheets.tags import ITag
        inst = MockTagSheet(meta, context)
        inst.set(appstruct={'elements': []})
        assert inst._reindex_resources_called is False


def test_includeme_register_tag_sheet(config):
    from adhocracy_core.sheets.tags import ITag
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.registry')
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.graph')
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_core.sheets.tags')
    context = testing.DummyResource(__provides__=ITag)
    assert get_sheet(context, ITag)
