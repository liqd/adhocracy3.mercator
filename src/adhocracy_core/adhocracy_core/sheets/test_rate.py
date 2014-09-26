from pyramid import testing
from pytest import fixture
from pytest import mark


class TestRateSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.rate import rate_meta
        return rate_meta

    def test_create(self, meta, context):
        from adhocracy_core.sheets.rate import IRate
        from adhocracy_core.sheets.rate import RateSchema
        from adhocracy_core.sheets import GenericResourceSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, GenericResourceSheet)
        assert inst.meta.isheet == IRate
        assert inst.meta.schema_class == RateSchema
        assert inst.meta.create_mandatory

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'subject': '',
                              'object': '',
                              'rate': 0,
                              }


@fixture
def mock_sheet(context, mock_sheet, registry):
    from adhocracy_core.testing import add_and_register_sheet
    from .rate import IRate
    mock_sheet.meta = mock_sheet.meta._replace(isheet=IRate)
    add_and_register_sheet(context, mock_sheet, registry)
    return mock_sheet


def test_index_rate(context, mock_sheet):
    from .rate import index_rate
    context['referenced'] = testing.DummyResource()
    mock_sheet.get.return_value = {'rate': 1}
    assert index_rate(context, None) == 1


@fixture
def integration(config):
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_core.sheets.rate')


@mark.usefixtures('integration')
def test_includeme_register_rate_sheet(config):
    from adhocracy_core.sheets.rate import IRate
    from adhocracy_core.utils import get_sheet
    context = testing.DummyResource(__provides__=IRate)
    inst = get_sheet(context, IRate)
    assert inst.meta.isheet is IRate


@mark.usefixtures('integration')
def test_includeme_register_index_rate(registry):
    from .rate import IRate
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IRate,), IIndexView, name='adhocracy|rate')
