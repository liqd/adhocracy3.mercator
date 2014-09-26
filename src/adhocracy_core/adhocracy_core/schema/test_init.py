import unittest
from unittest.mock import Mock

from pyramid import testing
import colander
from pytest import raises
from pytest import fixture

from adhocracy_core.interfaces import IPool
from adhocracy_core.testing import add_and_register_sheet


############
#  helper  #
############

def add_node_binding(node, context=None, request=None):
    node.bindings = dict()
    if context is not None:
        node.bindings['context'] = context
    if request is not None:
        node.bindings['request'] = request
    return node


def _add_post_pool_node(inst: colander.Schema, iresource_or_service_name=IPool):
    from adhocracy_core.schema import PostPool
    post_pool_node = PostPool(name='post_pool',
                              iresource_or_service_name=iresource_or_service_name)
    inst.add(post_pool_node)


def _add_reference_node(inst: colander.Schema, target_isheet=None):
    from adhocracy_core.interfaces import ISheet
    from adhocracy_core.interfaces import SheetToSheet
    from adhocracy_core.schema import Reference
    reference_node = Reference(name='reference')
    isheet = target_isheet or ISheet
    class PostPoolReference(SheetToSheet):
        target_isheet = isheet
    inst.add(reference_node)
    inst['reference'].reftype = PostPoolReference


def _add_references_node(inst: colander.Schema):
    from adhocracy_core.schema import UniqueReferences
    reference_node = UniqueReferences(name='references')
    inst.add(reference_node)


def _add_other_node(inst: colander.Schema):
    other_node = colander.MappingSchema(name='other', missing={})
    inst.add(other_node)


###########
#  tests  #
###########

class AdhocracySchemaNodeUnitTest(unittest.TestCase):

    def _make_one(self, *args, **kwargs):
        from adhocracy_core.schema import AdhocracySchemaNode
        return AdhocracySchemaNode(*args, **kwargs)

    def test_serialize_non_readonly(self):
        inst = self._make_one(colander.String())
        assert inst.serialize(1) == '1'

    def test_serialize_readonly(self):
        inst = self._make_one(colander.Integer(), readonly=True)
        assert inst.serialize(1) == '1'

    def test_deserialize_non_readonly(self):
        inst = self._make_one(colander.Integer())
        assert inst.deserialize('1') == 1

    def test_deserialize_readonly(self):
        inst = self._make_one(colander.Integer(), readonly=True)
        with raises(colander.Invalid):
            inst.deserialize('1')


class TestInterface():

    @fixture
    def inst(self):
        from adhocracy_core.schema import Interface
        return Interface()

    def test_serialize_colander_null(self, inst):
        result = inst.serialize(None, colander.null)
        assert result == colander.null

    def test_serialize_valid(self, inst):
        from adhocracy_core.sheets.tags import ITag
        result = inst.serialize(None, ITag)
        assert result == 'adhocracy_core.sheets.tags.ITag'

    def test_deserialize_empty_string(self, inst):
        result = inst.deserialize(None, '')
        assert result == ''

    def test_deserialize_valid(self, inst):
        from adhocracy_core.sheets.tags import ITag
        result = inst.deserialize(None, 'adhocracy_core.sheets.tags.ITag')
        assert result == ITag

    def test_deserialize_valid(self, inst):
        with raises(colander.Invalid):
            inst.deserialize(None, 'adhocracy_core.sheets.tags.NoSuchTag')


class NameUnitTest(unittest.TestCase):

    def setUp(self):
        self.parent = Mock()

    def _make_one(self):
        from adhocracy_core.schema import Name
        inst = Name()
        return inst.bind(parent_pool=self.parent)

    def test_valid(self):
        inst = self._make_one()
        assert inst.deserialize('blu.ABC_12-3')

    def test_non_valid_missing_parent_pool_binding(self):
        inst = self._make_one()
        inst_no_context = inst.bind()
        with raises(colander.Invalid):
            inst_no_context.deserialize('blu.ABC_123')

    def test_non_valid_empty(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.validator(inst, '')

    def test_non_valid_to_long(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'x' * 101)

    def test_non_valid_wrong_characters(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'ä')

    def test_non_valid_not_unique(self):
        inst = self._make_one()
        self.parent.check_name.side_effect = KeyError
        with raises(colander.Invalid):
            inst.validator(inst, 'name')

    def test_non_valid_forbbiden_child_name(self):
        inst = self._make_one()
        self.parent.check_name.side_effect = ValueError
        with raises(colander.Invalid):
            inst.validator(inst, '@@')

    def test_invalid_asdict_output(self):
        """Test case added since we had a bug here."""
        inst = self._make_one()
        try:
            inst.validator(inst, 'ä')
            assert False
        except colander.Invalid as err:
            wanted = {'': 'String does not match expected pattern'}
            assert err.asdict() == wanted


class EmailUnitTest(unittest.TestCase):

    def _make_one(self):
        from adhocracy_core.schema import Email
        return Email()

    def test_valid(self):
        inst = self._make_one()
        assert inst.validator(inst, 'test@test.de') is None

    def test_non_valid(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'wrong')


class TimeZoneNameUnitTest(unittest.TestCase):

    def _make_one(self):
        from adhocracy_core.schema import TimeZoneName
        return TimeZoneName()

    def test_valid(self):
        inst = self._make_one()
        assert inst.validator(inst, 'Europe/Berlin') is None

    def test_non_valid(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'wrong')

    def test_default(self):
        inst = self._make_one()
        assert inst.default == 'UTC'


class AbsolutePath(unittest.TestCase):

    def _make_one(self):
        from adhocracy_core.schema import AbsolutePath
        return AbsolutePath()

    def test_valid(self):
        inst = self._make_one()
        assert inst.validator(inst, '/blu.ABC_12-3/aaa') is None

    def test_non_valid(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'blu.ABC_12-3')


def test_deferred_content_type_default_call_with_iresource():
    from adhocracy_core.interfaces import IResource
    from adhocracy_core.schema import deferred_content_type_default
    context = testing.DummyResource(__provides__=IResource)
    node = None
    bindings = {'context': context}
    assert deferred_content_type_default(node, bindings) == IResource.__identifier__


def test_deferred_content_type_default_call_without_iresource():
    from adhocracy_core.schema import deferred_content_type_default
    context = testing.DummyResource()
    node = None
    bindings = {'context': context}
    assert deferred_content_type_default(node, bindings) == ''


class TestGetSheetCstructs:

    @fixture
    def request(self, mock_resource_registry):
        request = testing.DummyRequest()
        request.registry.content = mock_resource_registry
        return request

    def _call_fut(self, context, request):
        from . import get_sheet_cstructs
        return get_sheet_cstructs(context, request)

    def test_call_with_context_without_sheets(self, context, request):
        assert self._call_fut(context, request) == {}

    def test_call_with_context_with_sheets(self, context, request, mock_resource_registry, mock_sheet):
        mock_sheet.get.return_value = {}
        mock_sheet.schema = colander.MappingSchema()
        isheet = mock_sheet.meta.isheet
        mock_resource_registry.resource_sheets.return_value = {isheet.__identifier__: mock_sheet}
        assert self._call_fut(context, request) == {isheet.__identifier__: {}}
        assert mock_resource_registry.resource_sheets.call_args[0] == (context, request)
        assert mock_resource_registry.resource_sheets.call_args[1] == {'onlyviewable': True}


class TestResourceObjectUnitTests:

    def _make_one(self, **kwargs):
        from adhocracy_core.schema import ResourceObject
        return ResourceObject(**kwargs)

    @fixture
    def request(self, context, mock_resource_registry):
        request = testing.DummyRequest()
        request.registry.content = mock_resource_registry
        request.root = context
        return request

    def test_serialize_colander_null(self):
        inst = self._make_one()
        result = inst.serialize(None, colander.null)
        assert result == ''

    def test_serialize_value_url_location_aware(self, context, request):
        inst = self._make_one()
        context['child'] = testing.DummyResource()
        node = add_node_binding(colander.Mapping(), request=request)
        result = inst.serialize(node, context['child'])
        assert result == request.application_url + '/child/'

    def test_serialize_value_url_location_aware_but_missing_request(self, context):
        inst = self._make_one()
        context['child'] = testing.DummyResource()
        node = add_node_binding(colander.Mapping())
        with raises(AssertionError):
            inst.serialize(node, context['child'])

    def test_serialize_value_url_not_location_aware(self, request):
        inst = self._make_one()
        child = testing.DummyResource()
        del child.__name__
        node = add_node_binding(colander.Mapping(), request=request)
        with raises(colander.Invalid):
            inst.serialize(node, child)

    def test_serialize_value_url_location_aware_without_parent_and_name(self, context, request):
        inst = self._make_one()
        child = testing.DummyResource()
        node = add_node_binding(colander.Mapping(), request=request)
        result = inst.serialize(node, child)
        assert result == request.application_url + '/'

    def test_serialize_value_url_location_aware_with_serialize_to_content(self, context, request):
        from adhocracy_core.interfaces import IResource
        inst = self._make_one(serialization_form='content')
        context['child'] = testing.DummyResource(__provides__=IResource)
        node = add_node_binding(colander.Mapping(),
                                context=context['child'],
                                request=request)
        result = inst.serialize(node, context['child'])
        assert result == {'content_type': 'adhocracy_core.interfaces.IResource',
                          'data': {},
                          'path': request.application_url + '/child/'}

    def test_serialize_value_url_location_aware_with_serialize_to_path(self, context):
        inst = self._make_one(serialization_form='path')
        context['child'] = testing.DummyResource()
        node = add_node_binding(colander.Mapping(), context=context)
        result = inst.serialize(node, context['child'])
        assert result == '/child'

    def test_serialize_value_url_location_aware_with_serialize_to_path_without_context_binding(self, context):
        inst = self._make_one(serialization_form='path')
        context['child'] = testing.DummyResource()
        node = add_node_binding(colander.Mapping())
        with raises(AssertionError):
            inst.serialize(node, context['child'])

    def test_deserialize_value_null(self):
        inst = self._make_one()
        node = colander.Mapping()
        result = inst.deserialize(node, colander.null)
        assert result == colander.null

    def test_deserialize_value_url_valid_path(self, context, request):
        inst = self._make_one()
        context['child'] = testing.DummyResource()
        node = add_node_binding(colander.Mapping(), request=request)
        result = inst.deserialize(node, request.application_url + '/child')
        assert result == context['child']

    def test_deserialize_value_url_invalid_path_wrong_child_name(self, request):
        inst = self._make_one()
        node = add_node_binding(colander.Mapping(), request=request)
        with raises(colander.Invalid):
            inst.deserialize(node, request.application_url + '/wrong_child')

    def test_deserialize_value_url_invalid_path_to_short(self, request):
        inst = self._make_one()
        node = add_node_binding(colander.Mapping(), request=request)
        with raises(colander.Invalid):
            inst.deserialize(node, 'htp://x.x')

    def test_deserialize_value_path_location_aware(self, context):
        inst = self._make_one()
        context['child'] = testing.DummyResource()
        node = add_node_binding(colander.Mapping(), context=context)
        child_url = '/child/'
        result = inst.deserialize(node, child_url)
        assert result == context['child']

    def test_deserialize_value_path_location_aware_without_context_binding(self, context):
        inst = self._make_one()
        context['child'] = testing.DummyResource()
        node = add_node_binding(colander.Mapping())
        child_url = '/child/'
        with raises(AssertionError):
            inst.deserialize(node, child_url)


class TestResource:

    def _make_one(self):
        from adhocracy_core.schema import Resource
        return Resource()

    def test_create(self):
        from adhocracy_core.schema import ResourceObject
        inst = self._make_one()
        assert inst.default == ''
        assert inst.missing == colander.drop
        assert inst.schema_type == ResourceObject


class ReferenceUnitTest(unittest.TestCase):

    def _make_one(self, **kwargs):
        from adhocracy_core.schema import Reference
        return Reference(**kwargs)

    def setUp(self):
        self.context = testing.DummyResource()
        self.target = testing.DummyResource()
        self.child = testing.DummyResource()
        request = testing.DummyRequest()
        request.root = self.context
        self.request = request

    def test_create(self):
        from adhocracy_core.interfaces import SheetReference
        from adhocracy_core.schema import _validate_reftype
        inst = self._make_one()
        assert inst.backref is False
        assert inst.reftype == SheetReference
        assert inst.validator.validators == (_validate_reftype,)

    def test_with_backref(self):
        inst = self._make_one(backref=True)
        assert inst.backref

    def test_valid_interface(self):
        from zope.interface import alsoProvides
        inst = self._make_one()
        isheet = inst.reftype.getTaggedValue('target_isheet')
        alsoProvides(self.target, isheet)
        inst = add_node_binding(node=inst, request=self.request)
        assert inst.validator(inst, self.target) is None

    def test_nonvalid_interface(self):
        inst = self._make_one()
        inst = add_node_binding(node=inst, request=self.request)
        with raises(colander.Invalid):
            inst.validator(inst, self.target)


class TestResources:

    @fixture
    def request(self, context):
        request = testing.DummyRequest()
        request.root = context
        return request

    def _make_one(self):
        from adhocracy_core.schema import Resources
        return Resources()

    def test_create(self):
        from adhocracy_core.schema import ResourceObject
        inst = self._make_one()
        assert isinstance(inst, colander.SequenceSchema)
        assert inst.default == []
        assert inst['resource'].schema_type == ResourceObject

    def test_serialize(self, request):
        inst = self._make_one().bind(request=request)
        child = testing.DummyResource()
        request.root['child'] = child
        child_url = request.resource_url(child)
        assert inst.serialize([child]) == [child_url]

    def test_deserialize(self, request):
        inst = self._make_one().bind(request=request)
        child = testing.DummyResource()
        request.root['child'] = child
        child_url = request.resource_url(child)
        assert inst.deserialize([child_url]) == [child]


class TestReferences:

    @fixture
    def request(self, context):
        context['target'] = testing.DummyResource()
        request = testing.DummyRequest()
        request.root = context
        return request

    def _make_one(self, **kwargs):
        from adhocracy_core.schema import References
        return References(**kwargs)

    def test_create(self):
        from adhocracy_core.interfaces import SheetReference
        from adhocracy_core.schema import _validate_reftypes
        from adhocracy_core.schema import Resources
        inst = self._make_one()
        assert inst.backref is False
        assert inst.reftype == SheetReference
        assert inst.validator.validators == (_validate_reftypes,)
        assert isinstance(inst, Resources)

    def test_with_backref(self):
        inst = self._make_one(backref=True)
        assert inst.backref

    def test_valid_interface(self, request):
        from zope.interface import alsoProvides
        inst = self._make_one().bind(request=request)
        isheet = inst.reftype.getTaggedValue('target_isheet')
        target = request.root['target']
        alsoProvides(target, isheet)
        assert inst.validator(inst, [target]) is None

    def test_nonvalid_interface(self, request):
        inst = self._make_one().bind(request=request)
        target = request.root['target']
        with raises(colander.Invalid):
            inst.validator(inst, [target])


class TestUniqueReferences:

    @fixture
    def request(self, context):
        from adhocracy_core.interfaces import ISheet
        context['target'] = testing.DummyResource(__provides__=ISheet)
        context['target1'] = testing.DummyResource(__provides__=ISheet)
        request = testing.DummyRequest()
        request.root = context
        return request

    def _make_one(self, **kwargs):
        from adhocracy_core.schema import UniqueReferences
        return UniqueReferences(**kwargs)

    def test_create(self):
        from adhocracy_core.schema import References
        inst = self._make_one()
        assert isinstance(inst, References)

    def test_valid_deserialize_with_colander_null(self, request):
        inst = self._make_one().bind(request=request)
        assert inst.deserialize(colander.null) == []

    def test_valid_deserialize_with_duplication(self, request):
        inst = self._make_one().bind(request=request)
        target = request.root['target']
        target_url = request.resource_url(target)
        assert inst.deserialize([target_url, target_url]) == [target]

    def test_valid_deserialize_without_duplication(self, request):
        inst = self._make_one().bind(request=request)
        target = request.root['target']
        target1 = request.root['target1']
        target_url = request.resource_url(target)
        target1_url = request.resource_url(target1)
        assert inst.deserialize([target_url, target1_url]) == [target, target1]


class StringUnitTest(unittest.TestCase):

    def _make_one(self):
        from adhocracy_core.schema import SingleLine
        return SingleLine()

    def test_serialize_valid_emtpy(self):
        inst = self._make_one()
        assert inst.deserialize() == colander.drop

    def test_deserialize_valid_emtpy(self):
        inst = self._make_one()
        assert inst.serialize() == ''

    def test_deserialize_valid(self):
        inst = self._make_one()
        assert inst.deserialize('line') == 'line'

    def test_deserialize_non_valid_with_newline(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.deserialize('line\n')

    def test_deserialize_non_valid_with_carriage_return(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.deserialize('line\r')


class TextUnitTest(unittest.TestCase):

    def _make_one(self):
        from adhocracy_core.schema import Text
        return Text()

    def test_serialize_valid_emtpy(self):
        inst = self._make_one()
        assert inst.deserialize() == colander.drop

    def test_deserialize_valid_emtpy(self):
        inst = self._make_one()
        assert inst.serialize() == ''

    def test_deserialize_valid_with_newlines(self):
        inst = self._make_one()
        assert inst.deserialize('line\n\r') == 'line\n\r'

    def test_deserialize_non_valid_no_str(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.deserialize(1)


class PasswordUnitTest(unittest.TestCase):

    def _make_one(self):
        from adhocracy_core.schema import Password
        return Password()

    def test_serialize_valid_emtpy(self):
        inst = self._make_one()
        assert inst.deserialize() == colander.drop

    def test_deserialize_valid_emtpy(self):
        inst = self._make_one()
        assert inst.serialize() == ''

    def test_deserialize_valid_with_newlines(self):
        inst = self._make_one()
        assert inst.deserialize('line\n\r') == 'line\n\r'

    def test_deserialize_non_valid_no_str(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.deserialize(1)


class DateTimeUnitTest(unittest.TestCase):

    def _make_one(self, **kwargs):
        from adhocracy_core.schema import DateTime
        return DateTime(**kwargs)

    def test_create(self):
        from colander import DateTime
        inst = self._make_one()
        assert inst.schema_type is DateTime
        assert isinstance(inst.default, colander.deferred)
        assert isinstance(inst.missing, colander.deferred)

    def test_deserialize_empty(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.deserialize()

    def test_bind_and_deserialize_empty(self):
        from datetime import datetime
        inst = self._make_one().bind()
        result = inst.deserialize()
        assert isinstance(result, datetime)
        assert result.tzname() == 'UTC'

    def test_serialize_empty(self):
        inst = self._make_one()
        assert inst.serialize() is colander.null

    def test_bind_and_serialize_empty(self):
        from datetime import datetime
        inst = self._make_one().bind()
        result = inst.serialize()
        # we want an iso 8601 string with the current datetime
        today = datetime.utcnow().strftime('%Y-%m-%d')
        assert today in result


class TestPostPool:

    @fixture
    def request(self, context):
        request = testing.DummyRequest()
        request.root = context
        return request

    def _make_one(self, **kwargs):
        from adhocracy_core.schema import PostPool
        return PostPool(**kwargs)

    def test_create(self):
        from adhocracy_core.interfaces import IPool
        from adhocracy_core.schema import ResourceObject
        inst = self._make_one()
        assert inst.schema_type is ResourceObject
        assert inst.iresource_or_service_name is IPool
        assert inst.readonly is True
        assert isinstance(inst.default, colander.deferred)
        assert isinstance(inst.missing, colander.deferred)

    def test_deserialize_empty(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.deserialize()

    def test_bind_context_without_post_pool_and_deserialize_empty(self, context):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        with raises(RuntimeConfigurationError):
            self._make_one().bind(context=context)

    def test_bind_context_with_post_pool_and_deserialize_empty(self, pool):
        from adhocracy_core.interfaces import IPool
        inst = self._make_one(iresource_or_service_name=IPool).bind(context=pool)
        assert inst.deserialize() is pool

    def test_bind_context_with_service_post_pool_and_deserialize_empty(self, pool):
        from adhocracy_core.interfaces import IServicePool
        pool['service'] = testing.DummyResource(__provides__=IServicePool,
                                                __is_service__=True)
        inst = self._make_one(iresource_or_service_name='service').bind(context=pool)
        assert inst.deserialize() is pool['service']

    def test_serialize_empty(self):
        inst = self._make_one()
        assert inst.serialize() == ''

    def test_bind_context_with_post_pool_and_serialize_empty(self, pool, request):
        from adhocracy_core.interfaces import IPool
        inst = self._make_one(iresource_or_service_name=IPool).bind(context=pool,
                                                                    request=request)
        assert inst.serialize() == request.resource_url(pool)

    def test_bind_context_without_post_pool_and_serialize_empty(self, context, request):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        with raises(RuntimeConfigurationError):
            self._make_one().bind(context=context,
                                  request=request)


class TestPostPoolMappingSchema:


    @fixture
    def context(self, pool):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import IPool
        wrong_post_pool = testing.DummyResource()
        wrong_post_pool['child'] = testing.DummyResource(__provides__=ISheet)
        pool['wrong'] = wrong_post_pool
        right_post_pool = testing.DummyResource(__provides__=IPool)
        right_post_pool['child'] = testing.DummyResource(__provides__=ISheet)
        pool['right'] = right_post_pool
        return pool

    @fixture
    def mock_sheet(self, mock_sheet):
        from adhocracy_core.interfaces import IPostPoolSheet
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPostPoolSheet)
        schema = colander.MappingSchema()
        _add_post_pool_node(schema)
        mock_sheet.schema = schema
        return mock_sheet

    @fixture
    def request_(self, context):
        request = testing.DummyRequest()
        request.root = context
        return request

    def _make_one(self, **kwargs):
        from adhocracy_core.schema import PostPoolMappingSchema
        return PostPoolMappingSchema(**kwargs)

    def test_create(self):
        inst = self._make_one()
        assert isinstance(inst.validator, colander.deferred)

    def test_deserialize_empty(self):
        inst = self._make_one()
        assert inst.deserialize() == {}

    def test_deserialize_empty(self):
        inst = self._make_one()
        assert inst.serialize() == {}

    def test_bind_context_without_reference_post_context_and_deserialize(self, context, request_):
        inst = self._make_one()
        _add_reference_node(inst)
        _add_other_node(inst)
        inst = inst.bind(context=context['right'], request=request_)
        assert inst.deserialize({'reference': request_.application_url + '/right/child/'})

    def test_bind_context_with_valid_reference_post_context_and_deserialize(self, context, request_):
        inst = self._make_one()
        _add_post_pool_node(inst)
        _add_reference_node(inst)
        inst = inst.bind(context=context['right'], request=request_)
        assert inst.deserialize({'reference': request_.application_url + '/right/child/'})

    def test_bind_context_with_nonvalid_reference_post_context_and_deserialize(self, context, request_):
        inst = self._make_one()
        _add_post_pool_node(inst)
        _add_reference_node(inst)
        inst = inst.bind(context=context['right'], request=request_)
        with raises(colander.Invalid):
            inst.deserialize({'reference': request_.application_url + '/wrong/child'})

    def test_bind_context_with_valid_references_post_context_and_deserialize(self, context, request_):
        inst = self._make_one()
        _add_post_pool_node(inst)
        _add_references_node(inst)
        inst = inst.bind(context=context['right'], request=request_)
        assert inst.deserialize({'references': [request_.application_url + '/right/child']})

    def test_bind_context_with_valid_backreference_post_context_and_deserialize(self, context, mock_sheet, registry, request_):
        from adhocracy_core.interfaces import IPostPoolSheet
        inst = self._make_one()

        referenced = context['right']['child']
        add_and_register_sheet(referenced, mock_sheet, registry)
        mock_sheet.schema = mock_sheet.schema.bind(context=referenced)

        _add_reference_node(inst, target_isheet=IPostPoolSheet)
        inst = inst.bind(context=context['right'], request=request_)

        assert inst.deserialize({'reference': request_.application_url + '/right/child'})

    def test_bind_context_with_nonvalid_backreference_post_context_and_deserialize(self, context, mock_sheet, registry, request_):
        from adhocracy_core.interfaces import IPostPoolSheet
        inst = self._make_one()

        referenced = context['right']['child']
        add_and_register_sheet(referenced, mock_sheet, registry)
        mock_sheet.schema = mock_sheet.schema.bind(context=referenced)

        _add_reference_node(inst, target_isheet=IPostPoolSheet)
        inst = inst.bind(context=context['right'], request=request_)

        with raises(colander.Invalid):
            inst.deserialize({'reference': request_.application_url + '/wrong/child'})


class TestInteger:

    def _make_one(self):
        from adhocracy_core.schema import Integer
        return Integer()

    def test_create(self):
        inst = self._make_one()
        assert inst.schema_type == colander.Integer
        assert inst.default == 0
        assert inst.missing == colander.drop


class TestRate:

    def _make_one(self):
        from adhocracy_core.schema import Rate
        return Rate()

    def test_create(self):
        inst = self._make_one()
        assert inst.schema_type == colander.Integer
        assert inst.default == 0
        assert inst.missing == colander.drop
        assert inst.validator.choices == (1, 0, -1)

    def test_deserialize_valid(self):
        inst = self._make_one()
        assert inst.deserialize('-1') == -1

    def test_deserialize_invalid(self):
        inst = self._make_one()
        with raises(colander.Invalid):
            inst.deserialize('-12')

