from unittest.mock import Mock

from pyramid import testing
from pytest import fixture
from pytest import raises
from pytest import mark
import colander


@fixture
def registry(registry_with_content):
    return registry_with_content


class TestRateableSheet:

    @fixture
    def meta(self):
        from .rate import rateable_meta
        return rateable_meta

    @fixture
    def inst(self, pool, service, meta):
        pool['rates'] = service
        return meta.sheet_class(meta, pool)

    def test_meta(self, meta):
        from adhocracy_core.sheets import AnnotationRessourceSheet
        from . import rate
        assert meta.sheet_class == AnnotationRessourceSheet
        assert meta.isheet == rate.IRateable
        assert meta.schema_class == rate.RateableSchema
        assert meta.create_mandatory is False

    def test_create(self, meta, pool):
        inst = meta.sheet_class(meta, pool)
        assert inst

    def test_get_empty(self, inst):
        post_pool = inst.context['rates']
        assert inst.get() == {'post_pool': post_pool}


class TestRateSheet:

    @fixture
    def meta(self):
        from .rate import rate_meta
        return rate_meta

    def test_meta(self, meta, context):
        from adhocracy_core.sheets import AttributeResourceSheet
        from . import rate
        assert issubclass(meta.sheet_class, AttributeResourceSheet)
        assert meta.isheet == rate.IRate
        assert meta.schema_class == rate.RateSchema
        assert meta.create_mandatory

    def test_create(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'subject': None,
                              'object': None,
                              'rate': 0,
                              }

    def test_validators(self, mocker, meta, context, request_):
        from . import rate
        inst = meta.sheet_class(meta, context)
        validate_subject = mocker.patch.object(rate, 'create_validate_subject')
        validate_unique = mocker.patch.object(rate,
                                              'create_validate_rate_is_unique')
        bindings = {'context': context, 'request': request_}

        validators = inst.schema.validator(inst.schema, bindings)

        validate_subject.assert_called_with(request_)
        validate_unique.assert_called_with(meta.isheet, context,
                                           request_.registry)
        assert inst.schema['rate'].validator.max == 1
        assert inst.schema['rate'].validator.min == -1

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestCreateValidateSubject:

    def call_fut(self, *args):
        from .rate import create_validate_subject
        return create_validate_subject(*args)

    @fixture
    def mock_get_user(self, mocker):
        from . import rate
        mock_get_user = mocker.patch.object(rate, 'get_user')
        return mock_get_user

    def test_ignore_if_subject_is_loggedin_user(self, node, request_, mock_get_user):
        user = testing.DummyResource()
        mock_get_user.return_value = user
        validator = self.call_fut(request_)
        assert validator(node, {'subject': user}) is None

    def test_raise_if_subject_is_not_loggedin_user(self, node, request_,
                                                   mock_get_user):
        user = testing.DummyResource()
        mock_get_user.return_value = None
        validator = self.call_fut(request_)
        with raises(colander.Invalid):
            node['subject'] = Mock()
            validator(node,  {'subject': user})


class TestCreateValidateRateIsUnique:

    def call_fut(self, *args):
        from .rate import create_validate_rate_is_unique
        return create_validate_rate_is_unique(*args)

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
                 }
        validator = self.call_fut(IRate, context, registry)
        assert validator(node, value) is None
        assert mock_catalogs.search.call_args[0][0] == query._replace(
                references=(Reference(None, IRate, 'subject', subject),
                            Reference(None, IRate, 'object', object_)),
                resolve=True)

    def test_ignore_if_some_but_older_versions(
            self, node, context, registry, search_result, mock_catalogs,
            mock_versions_sheet):
        from .rate import IRate
        value = {'subject': testing.DummyResource(),
                 'object': testing.DummyResource(),
                 }
        old_version = testing.DummyResource()
        mock_catalogs.search.return_value = search_result._replace(
                elements=[old_version])
        mock_versions_sheet.get.return_value = \
            {'elements': [old_version]}
        validator = self.call_fut(IRate, context, registry)
        assert validator(node, value) is None

    def test_raise_if_other_rates(
            self, node, context, registry, search_result, mock_catalogs,
            mock_versions_sheet):
        from .rate import IRate
        value = {'subject': testing.DummyResource(),
                 'object': testing.DummyResource(),
                 }
        old_version = testing.DummyResource()
        other_version = testing.DummyResource()
        mock_catalogs.search.return_value = search_result._replace(
                elements=[old_version, other_version])
        mock_versions_sheet.get.return_value = \
            {'elements': [old_version]}
        validator = self.call_fut(IRate, context, registry)
        with raises(colander.Invalid):
            node['object'] = Mock()
            validator(node, value)


class TestLikeableSheet:

    @fixture
    def meta(self):
        from .rate import likeable_meta
        return likeable_meta

    @fixture
    def inst(self, pool, service):
        pool['likes'] = service
        from adhocracy_core.sheets.rate import likeable_meta
        return likeable_meta.sheet_class(likeable_meta, pool)

    def test_create(self, inst):
        from adhocracy_core.sheets import AnnotationRessourceSheet
        from adhocracy_core.sheets.rate import ILikeable
        from adhocracy_core.sheets.rate import LikeableSchema
        assert isinstance(inst, AnnotationRessourceSheet)
        assert inst.meta.isheet == ILikeable
        assert inst.meta.schema_class == LikeableSchema
        assert inst.meta.create_mandatory is False

    def test_get_empty(self, inst):
        post_pool = inst.context['likes']
        assert inst.get() == {'post_pool': post_pool,
                              }

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestLikeSheet:

    @fixture
    def meta(self):
        from .rate import like_meta
        return like_meta

    def test_meta(self, meta, context):
        from adhocracy_core.sheets import AttributeResourceSheet
        from . import rate
        assert issubclass(meta.sheet_class, AttributeResourceSheet)
        assert meta.isheet == rate.ILike
        assert meta.schema_class == rate.LikeSchema
        assert meta.create_mandatory

    def test_create(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'subject': None,
                              'object': None,
                              'like': 0,
                              }

    def test_validators(self, mocker, meta, context, request_):
        from . import rate
        inst = meta.sheet_class(meta, context)
        validate_subject = mocker.patch.object(rate, 'create_validate_subject')
        validate_unique = mocker.patch.object(rate,
                                              'create_validate_rate_is_unique')
        bindings = {'context': context, 'request': request_}

        validators = inst.schema.validator(inst.schema, bindings)

        validate_subject.assert_called_with(request_)
        validate_unique.assert_called_with(meta.isheet, context,
                                           request_.registry)
        assert inst.schema['like'].validator.max == 1
        assert inst.schema['like'].validator.min == 0

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


