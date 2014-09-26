from pytest import fixture
from pytest import mark

from pyramid import testing


@fixture
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.sheets.metadata')
    config.include('adhocracy_sample.sheets.sample_sheets')


@mark.usefixtures('integration')
def test_create_namedummy_sheet(config):
    from adhocracy_core.utils import get_sheet
    from adhocracy_core.sheets.name import IName
    from adhocracy_sample.sheets.sample_sheets import DummyNameSheet
    context = testing.DummyResource(__provides__=IName)
    inst = get_sheet(context, IName)
    assert isinstance(inst, DummyNameSheet)


@mark.usefixtures('integration')
def test_create_extendendname_sheet(config):
    from adhocracy_core.utils import get_sheet
    from adhocracy_sample.sheets.sample_sheets import IExtendedName
    context = testing.DummyResource(__provides__=IExtendedName)
    inst = get_sheet(context, IExtendedName)
    appstruct = inst.get()
    assert 'description_x' in appstruct
