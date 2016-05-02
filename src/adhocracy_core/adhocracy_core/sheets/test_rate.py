from unittest.mock import Mock

from pyramid import testing
from pytest import fixture
from pytest import raises
from pytest import mark
import colander

from adhocracy_core.sheets.rate import IRateable


@fixture
def integration(config):
    config.include('adhocracy_core.content')
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_core.sheets.rate')


def _make_rateable(provides=IRateable):
    return testing.DummyResource(__provides__=provides)


class TestRateableSheet:

    @fixture
    def meta(self):
        from .rate import rateable_meta
        return rateable_meta

    @fixture
    def inst(self, pool, meta, service):
        pool['rates'] = service
        return meta.sheet_class(meta, pool, None)

    def test_create(self, inst):
        from adhocracy_core.sheets import AnnotationRessourceSheet
        from adhocracy_core.sheets.rate import IRateable
        from adhocracy_core.sheets.rate import RateableSchema
        assert isinstance(inst, AnnotationRessourceSheet)
        assert inst.meta.isheet == IRateable
        assert inst.meta.schema_class == RateableSchema
        assert inst.meta.create_mandatory is False

    def test_get_empty(self, inst):
        post_pool = inst.context['rates']
        assert inst.get() == {'post_pool': post_pool}


class TestRateSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.rate import rate_meta
        return rate_meta

    @fixture
    def inst(self, meta, context, registry):
        return meta.sheet_class(meta, context, registry)

    def test_meta(self, meta):
        from adhocracy_core.sheets.rate import IRate
        from adhocracy_core.sheets.rate import RateSchema
        from adhocracy_core.sheets import AttributeResourceSheet
        assert issubclass(meta.sheet_class, AttributeResourceSheet)
        assert meta.isheet == IRate
        assert meta.schema_class == RateSchema
        assert meta.create_mandatory

    def test_crete(self, meta, context):
        inst = meta.sheet_class(meta, context, None)
        assert inst

    def test_get_empty(self, inst):
        assert inst.get() == {'subject': None,
                              'object': None,
                              'rate': 0,
                              }

    def test_validators(self, mocker, inst, kw):
        from . import rate
        validate_value = mocker.patch.object(rate, 'create_validate_rate_value')
        validate_subject = mocker.patch.object(rate, 'create_validate_subject')
        validate_unique = mocker.patch.object(rate,
                                              'create_validate_is_unique')
        validators = inst.schema.validator(inst.schema, kw)

        validate_value.assert_called_with(kw['registry'])
        validate_subject.assert_called_with(kw['request'])
        validate_unique.assert_called_with(kw['context'], kw['registry'])

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta, registry):
        context = testing.DummyResource(__provides__=meta.isheet)
        assert registry.content.get_sheet(context, meta.isheet)


class TestCreateValidateRateValue:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    def call_fut(self, *args):
        from .rate import create_validate_rate_value
        return create_validate_rate_value(*args)

    def test_ignore_if_validation_passes(self, node, registry):
        from pyramid.registry import Registry
        from .rate import IRateValidator
        mock_validator = Mock()
        mock_validator.validate.return_value = True
        registry.getAdapter = Mock(spec=Registry.getAdapter,
                                   return_value=mock_validator)
        object_ = testing.DummyResource()
        validator = self.call_fut(registry)

        validator(node, {'object': object_,
                         'rate': 1})

        mock_validator.validate.assert_called_with(1)
        assert registry.getAdapter.call_args[0] == (object_, IRateValidator)

    def test_raise_if_validation_not_passes(self, node, registry):
        from pyramid.registry import Registry
        mock_validator = Mock()
        mock_validator.validate.return_value = False
        registry.getAdapter = Mock(spec=Registry.getAdapter,
                                   return_value=mock_validator)
        object_ = testing.DummyResource()
        validator = self.call_fut(registry)
        with raises(colander.Invalid):
            node['rate'] = Mock()  # needed create the Error
            validator(node,
                      {'object': object_,
                       'rate': 'WRONG'})


class TestCreateValidateSubject:

    def call_fut(self, *args):
        from .rate import create_validate_subject
        return create_validate_subject(*args)

    def test_ignore_if_subject_is_loggedin_user(self, node, request_):
        user = testing.DummyResource()
        request_.user = user
        validator = self.call_fut(request_)
        assert validator(node, {'subject': user}) is None

    def test_ignore_if_subject_is_not_loggedin_user(self, node, request_):
        user = testing.DummyResource()
        request_.user = None
        validator = self.call_fut(request_)
        with raises(colander.Invalid):
            node['subject'] = Mock()
            validator(node,  {'subject': user})


class TestCreateValidateIsUnique:

    def call_fut(self, *args):
        from .rate import create_validate_is_unique
        return create_validate_is_unique(*args)

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def mock_versions_sheet(self, registry, mock_sheet):
        mock_sheet.get.return_value = {'elements': []}
        registry.content.get_sheet = Mock(return_value=mock_sheet)
        return mock_sheet

    @fixture
    def mock_catalogs(self, mock_catalogs, monkeypatch):
        from . import rate
        monkeypatch.setattr(rate, 'find_service', lambda x, y: mock_catalogs)
        return mock_catalogs

    def test_ignore_if_no_other_rates(self, node, context, registry, query,
                                      mock_catalogs):
        from adhocracy_core.interfaces import Reference
        from .rate import IRate
        subject = testing.DummyResource()
        object_ = testing.DummyResource()
        value = {'subject': subject,
                 'object': object_,
                 'rate': '1'}
        validator = self.call_fut(context, registry)
        assert validator(node, value) is None
        assert mock_catalogs.search.call_args[0][0] == query._replace(
                references=(Reference(None, IRate, 'subject', subject),
                            Reference(None, IRate, 'object', object_)),
                resolve=True)

    def test_ignore_if_some_but_older_versions(
            self, node, context, registry, search_result, mock_catalogs,
            mock_versions_sheet):
        value = {'subject': testing.DummyResource(),
                 'object': testing.DummyResource(),
                 'rate': '1'}
        old_version = testing.DummyResource()
        mock_catalogs.search.return_value = search_result._replace(
                elements=[old_version])
        mock_versions_sheet.get.return_value = \
            {'elements': [old_version]}
        validator = self.call_fut(context, registry)
        assert validator(node, value) is None

    def test_raise_if_other_rates(
            self, node, context, registry, search_result, mock_catalogs,
            mock_versions_sheet):
        value = {'subject': testing.DummyResource(),
                 'object': testing.DummyResource(),
                 'rate': '1'}
        old_version = testing.DummyResource()
        other_version = testing.DummyResource()
        mock_catalogs.search.return_value = search_result._replace(
                elements=[old_version, other_version])
        mock_versions_sheet.get.return_value = \
            {'elements': [old_version]}
        validator = self.call_fut(context, registry)
        with raises(colander.Invalid):
            node['object'] = Mock()
            validator(node, value)


@mark.usefixtures('integration')
class TestRateValidators:

    def test_validate_rateable_rate_validator(self, registry):
        from adhocracy_core.interfaces import IRateValidator
        rateable = _make_rateable()
        validator = registry.getAdapter(rateable, IRateValidator)
        assert validator.validate(1) is True
        assert validator.validate(0) is True
        assert validator.validate(-1) is True
        assert validator.validate(2) is False
        assert validator.validate(-2) is False

    def test_validate_likeable_rate_validator(self, registry):
        from adhocracy_core.interfaces import IRateValidator
        from adhocracy_core.sheets.rate import ILikeable
        rateable = _make_rateable(ILikeable)
        validator = registry.getAdapter(rateable, IRateValidator)
        assert validator.validate(1) is True
        assert validator.validate(0) is True
        assert validator.validate(-1) is False
        assert validator.validate(2) is False

    def test_helpfull_error_message(self, registry):
        from adhocracy_core.interfaces import IRateValidator
        from adhocracy_core.sheets.rate import ILikeable
        rateable = _make_rateable(ILikeable)
        validator = registry.getAdapter(rateable, IRateValidator)
        assert validator.helpful_error_message() == \
               "rate must be one of (1, 0)"
