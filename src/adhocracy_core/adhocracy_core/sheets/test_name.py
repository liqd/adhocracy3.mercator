from pyramid import testing
from pytest import fixture


class TestNameSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.name import name_metadata
        return name_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.name import IName
        from adhocracy_core.sheets.name import NameSchema
        from adhocracy_core.sheets import GenericResourceSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, GenericResourceSheet)
        assert inst.meta.isheet == IName
        assert inst.meta.schema_class == NameSchema
        assert inst.meta.editable is False
        assert inst.meta.create_mandatory is True

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'name': ''}


def test_includeme_register_name_sheet(config):
    from adhocracy_core.sheets.name import IName
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.name')
    context = testing.DummyResource(__provides__=IName)
    inst = get_sheet(context, IName)
    assert inst.meta.isheet is IName
