import unittest
from unittest.mock import Mock
from pytest import mark

from pyramid import testing
import colander
from pytest import raises
from pytest import fixture

from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import IResource

from pyramid.security import Allow
from pyramid.security import Deny


@fixture
def registry(registry_with_content):
    return registry_with_content


def _add_post_pool_node(inst: colander.Schema, iresource_or_service_name=IPool):
    from adhocracy_core.schema import PostPool
    post_pool_node = PostPool(name='post_pool',
                              iresource_or_service_name=iresource_or_service_name)
    inst.add(post_pool_node)


def _add_reference_node(schema: colander.Schema, target_isheet=None):
    from adhocracy_core.interfaces import ISheet
    from adhocracy_core.interfaces import SheetToSheet
    from adhocracy_core.schema import Reference
    reference_node = Reference(name='reference')
    isheet = target_isheet or ISheet
    class PostPoolReference(SheetToSheet):
        target_isheet = isheet
    schema.add(reference_node)
    schema['reference'].reftype = PostPoolReference


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

    def make_one(self, *args, **kwargs):
        from adhocracy_core.schema import SchemaNode
        return SchemaNode(*args, **kwargs)

    def test_serialize_non_readonly(self):
        inst = self.make_one(colander.String())
        assert inst.serialize(1) == '1'

    def test_serialize_readonly(self):
        inst = self.make_one(colander.Integer(), readonly=True)
        assert inst.serialize(1) == '1'

    def test_serialize_default_none(self):
        inst = self.make_one(colander.Integer(), default=None)
        assert inst.serialize(None) is None

    def test_deserialize_non_readonly(self):
        inst = self.make_one(colander.Integer())
        assert inst.deserialize('1') == 1

    def test_deserialize_readonly(self):
        inst = self.make_one(colander.Integer(), readonly=True)
        with raises(colander.Invalid):
            inst.deserialize('1')


class TestAdhocracySchemaNode:

    def make_one(self, **kwargs):
        from adhocracy_core.schema import SequenceSchema

        class AdhocracySequenceExample(SequenceSchema):
            child1 = colander.Schema(typ=colander.Int())
        return AdhocracySequenceExample().bind()

    def test_create(self):
        from . import SchemaNode
        inst = self.make_one()
        assert isinstance(inst, colander.SequenceSchema)
        assert isinstance(inst, SchemaNode)
        assert inst.schema_type == colander.Sequence
        assert inst.default == []

    def test_default_value_is_unique(self):
        inst = self.make_one()
        inst2 = self.make_one()
        assert not (inst.default is inst2.default)


class TestInterface():

    @fixture
    def inst(self):
        from adhocracy_core.schema import InterfaceType
        return InterfaceType()

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


class TestName:

    @fixture
    def parent(self, pool):
        from adhocracy_core.resources.pool import Pool
        pool.check_name = Mock(spec=Pool.check_name)
        return pool

    @fixture
    def context(self, parent, context):
        parent['context'] = context
        return context

    def make_one(self):
        from adhocracy_core.schema import Name
        return Name()

    def test_valid(self, context):
        inst = self.make_one().bind(context=context, creating=None)
        assert inst.deserialize('blu.ABC_12-3')

    def test_non_valid_empty(self, context):
        inst = self.make_one().bind(context=context, creating=None)
        with raises(colander.Invalid):
            inst.validator(inst, '')

    def test_non_valid_missing_parent(self, context):
        context.__parent__ = None
        inst = self.make_one().bind(context=context, creating=None)
        with raises(colander.Invalid):
            inst.validator(inst, '')

    def test_non_valid_to_long(self, context):
        inst = self.make_one().bind(context=context, creating=None)
        with raises(colander.Invalid):
            inst.validator(inst, 'x' * 101)

    def test_non_valid_wrong_characters(self, context):
        inst = self.make_one().bind(context=context, creating=None)
        with raises(colander.Invalid):
            inst.validator(inst, 'ä')

    def test_non_valid_not_unique(self, parent, context):
        inst = self.make_one().bind(context=context, creating=None)
        parent.check_name.side_effect = KeyError
        with raises(colander.Invalid):
            inst.validator(inst, 'name')

    def test_non_valid_forbbiden_child_name(self, parent, context):
        inst = self.make_one().bind(context=context, creating=None)
        parent.check_name.side_effect = ValueError
        with raises(colander.Invalid):
            inst.validator(inst, '@@')

    def test_invalid_asdict_output(self, parent, resource_meta):
        """Test case added since we had a bug here."""
        inst = self.make_one().bind(context=parent, creating=resource_meta)
        parent.check_name.side_effect = ValueError
        try:
            inst.validator(inst, 'ä')
            assert False
        except colander.Invalid as err:
            wanted = {'': 'The name has forbidden characters or is not a string'
                          '.; String does not match expected pattern'}
            assert err.asdict() == wanted


class EmailUnitTest(unittest.TestCase):

    def make_one(self):
        from adhocracy_core.schema import Email
        return Email()

    def test_valid(self):
        inst = self.make_one()
        assert inst.validator(inst, 'test@test.de') is None

    def test_non_valid(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'wrong')


class TestURL:

    def make_one(self):
        from adhocracy_core.schema import URL
        return URL()

    def test_valid(self):
        inst = self.make_one()
        assert inst.deserialize('http://www.w3.org/standards/') == \
               'http://www.w3.org/standards/'

    def test_valid_https(self):
        inst = self.make_one()
        assert inst.deserialize('https://www.w3.org/standards/') == \
               'https://www.w3.org/standards/'

    def test_invalid_no_schema(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('www.w3.org/standards/')

    def test_invalid_spaces(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('http://www.w3.org standards')

    def test_invalid_relative_url(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('http:www.w3.org/standards/')

    def test_invalid_chars(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('http://www!w3#org/standards/')


class TimeZoneNameUnitTest(unittest.TestCase):

    def make_one(self):
        from adhocracy_core.schema import TimeZoneName
        return TimeZoneName()

    def test_valid(self):
        inst = self.make_one()
        assert inst.validator(inst, 'Europe/Berlin') is None

    def test_non_valid(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'wrong')

    def test_default(self):
        inst = self.make_one()
        assert inst.default == 'UTC'


class AbsolutePath(unittest.TestCase):

    def make_one(self):
        from adhocracy_core.schema import AbsolutePath
        return AbsolutePath()

    def test_valid(self):
        inst = self.make_one()
        assert inst.validator(inst, '/blu.ABC_12-3/aaa') is None

    def test_non_valid(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.validator(inst, 'blu.ABC_12-3')


def test_deferred_content_type_default_call_with_iresource():
    from adhocracy_core.interfaces import IResource
    class IResourceA(IResource):
        pass
    from adhocracy_core.schema import deferred_content_type_default
    context = testing.DummyResource(__provides__=IResourceA)
    node = None
    kw = {'context': context, 'creating': None}
    assert deferred_content_type_default(node, kw) == IResourceA


def test_deferred_content_type_default_call_without_iresource():
    """If no IResource subtype interface is found, we return IResource to
    have valid default value.
    """
    from adhocracy_core.schema import deferred_content_type_default
    context = testing.DummyResource()
    node = None
    kw = {'context': context, 'creating': None}
    assert deferred_content_type_default(node, kw) == IResource


class TestGetSheetCstructs:

    def call_fut(self, *args):
        from . import get_sheet_cstructs
        return get_sheet_cstructs(*args)

    def test_call_with_context_without_sheets(self, context, registry,
                                              request_):
        assert self.call_fut(context, registry, request_) == {}

    def test_call_with_context_with_sheets(self, context, registry, request_,
                                           mock_sheet):
        mock_sheet.serialize.return_value = {}
        mock_sheet.schema = colander.MappingSchema()
        isheet = mock_sheet.meta.isheet
        registry.content.get_sheets_read.return_value = [mock_sheet]
        assert self.call_fut(context, registry, request_) == \
               {isheet.__identifier__: {}}
        assert registry.content.get_sheets_read.call_args[0] == (context,
                                                                 request_)


class TestResourceObjectUnitTests:

    def make_one(self, **kwargs):
        from adhocracy_core.schema import ResourceObjectType
        return ResourceObjectType(**kwargs)

    def test_serialize_colander_null(self):
        inst = self.make_one()
        result = inst.serialize(None, colander.null)
        assert result == ''

    def test_serialize_value_url_location_aware(self, context, request_, node):
        inst = self.make_one()
        context['child'] = testing.DummyResource()
        node = node.bind(request=request_)
        result = inst.serialize(node, context['child'])
        assert result == request_.application_url + '/child/'

    def test_serialize_value_url_not_location_aware(self, request_, node):
        inst = self.make_one()
        child = testing.DummyResource()
        del child.__name__
        node = node.bind(request=request_)
        with raises(colander.Invalid):
            inst.serialize(node, child)

    def test_serialize_value_url_location_aware_without_parent_and_name(
            self, request_, node):
        inst = self.make_one()
        child = testing.DummyResource()
        node = node.bind(request=request_)
        result = inst.serialize(node, child)
        assert result == request_.application_url + '/'

    def test_serialize_value_url_location_aware_with_serialize_to_content(
            self, context, request_, registry, node):
        from adhocracy_core.interfaces import IResource
        inst = self.make_one(serialization_form='content')
        context['child'] = testing.DummyResource(__provides__=IResource)
        node = node.bind(context=context['child'],
                         request=request_,
                         registry=registry,
                         creating=None)
        result = inst.serialize(node, context['child'])
        assert result == {'content_type': 'adhocracy_core.interfaces.IResource',
                          'data': {},
                          'path': request_.application_url + '/child/'}

    def test_serialize_value_url_location_aware_with_serialize_to_path(
            self, context, node):
        inst = self.make_one(serialization_form='path')
        context['child'] = testing.DummyResource()
        node = node.bind(context=context)
        result = inst.serialize(node, context['child'])
        assert result == '/child'

    def test_deserialize_value_null(self, node):
        inst = self.make_one()
        result = inst.deserialize(node, colander.null)
        assert result == colander.null

    def test_deserialize_value_url_valid_path(self, context, request_, node):
        inst = self.make_one()
        context['child'] = testing.DummyResource()
        node = node.bind(request=request_,
                         context=context)
        result = inst.deserialize(node, request_.application_url + '/child')
        assert result == context['child']

    def test_deserialize_value_url_invalid_path_wrong_child_name(
            self, request_, node, context):
        inst = self.make_one()
        node = node.bind(request_=request_,
                         context=context)
        with raises(colander.Invalid):
            inst.deserialize(node, request_.application_url + '/wrong_child')

    def test_deserialize_value_url_invalid_path_to_short(self, request_, node,
                                                         context):
        inst = self.make_one()
        node = node.bind(request=request_,
                         context=context)
        with raises(colander.Invalid):
            inst.deserialize(node, 'htp://x.x')

    def test_deserialize_value_path_location_aware(self, context, node):
        inst = self.make_one()
        context['child'] = testing.DummyResource()
        node = node.bind(context=context)
        child_url = '/child/'
        result = inst.deserialize(node, child_url)
        assert result == context['child']


class TestResource:

    def make_one(self):
        from adhocracy_core.schema import Resource
        return Resource()

    def test_create(self):
        from adhocracy_core.schema import ResourceObjectType
        inst = self.make_one()
        assert inst.default is None
        assert inst.missing == colander.drop
        assert inst.schema_type == ResourceObjectType


class ReferenceUnitTest(unittest.TestCase):

    def make_one(self, **kwargs):
        from adhocracy_core.schema import Reference
        return Reference(**kwargs)

    def setUp(self):
        self.context = testing.DummyResource()
        self.target = testing.DummyResource()
        self.child = testing.DummyResource()
        request = testing.DummyRequest()
        self.request = request

    def test_create(self):
        from adhocracy_core.interfaces import SheetReference
        from adhocracy_core.schema import validate_reftype
        inst = self.make_one()
        assert inst.backref is False
        assert inst.reftype == SheetReference
        assert inst.validator.validators == (validate_reftype,)

    def test_with_backref(self):
        inst = self.make_one(backref=True)
        assert inst.backref

    def test_valid_interface(self):
        from zope.interface import alsoProvides
        inst = self.make_one()
        isheet = inst.reftype.getTaggedValue('target_isheet')
        alsoProvides(self.target, isheet)
        inst = inst.bind(request=self.request)
        assert inst.validator(inst, self.target) is None

    def test_nonvalid_interface(self):
        inst = self.make_one()
        inst = inst.bind(request=self.request)
        with raises(colander.Invalid):
            inst.validator(inst, self.target)


class TestResources:

    def make_one(self, **kwargs):
        from adhocracy_core.schema import Resources
        return Resources(**kwargs).bind()

    def test_create(self):
        from adhocracy_core.schema import ResourceObjectType
        inst = self.make_one()
        assert isinstance(inst, colander.SequenceSchema)
        assert inst.default == []
        assert inst['resource'].schema_type == ResourceObjectType

    def test_create_with_custom_default(self):
        inst = self.make_one(default=[1])
        assert inst.default == [1]

    def test_serialize(self, request_, context):
        inst = self.make_one().bind(context=context, request=request_)
        child = testing.DummyResource()
        context['child'] = child
        child_url = request_.resource_url(child)
        assert inst.serialize([child]) == [child_url]

    def test_deserialize(self, request_, context):
        inst = self.make_one().bind(context=context, request=request_)
        child = testing.DummyResource()
        context['child'] = child
        child_url = request_.resource_url(child)
        assert inst.deserialize([child_url]) == [child]


class TestReferences:

    @fixture
    def context(self, context):
        context['target'] = testing.DummyResource()
        return context

    def make_one(self, **kwargs):
        from adhocracy_core.schema import References
        return References(**kwargs)

    def test_create(self):
        from adhocracy_core.interfaces import SheetReference
        from adhocracy_core.schema import _validate_reftypes
        from adhocracy_core.schema import Resources
        inst = self.make_one()
        assert inst.backref is False
        assert inst.reftype == SheetReference
        assert inst.validator.validators == (_validate_reftypes,)
        assert isinstance(inst, Resources)

    def test_with_backref(self):
        inst = self.make_one(backref=True)
        assert inst.backref

    def test_valid_interface(self, request_, context):
        from zope.interface import alsoProvides
        inst = self.make_one().bind(request=request_)
        isheet = inst.reftype.getTaggedValue('target_isheet')
        target = context['target']
        alsoProvides(target, isheet)
        assert inst.validator(inst, [target]) is None

    def test_nonvalid_interface(self, request_, context):
        inst = self.make_one().bind(request=request_)
        target = context['target']
        with raises(colander.Invalid):
            inst.validator(inst, [target])


class TestUniqueReferences:

    @fixture
    def context(self, context):
        from adhocracy_core.interfaces import ISheet
        context['target'] = testing.DummyResource(__provides__=ISheet)
        context['target1'] = testing.DummyResource(__provides__=ISheet)
        return context

    def make_one(self, **kwargs):
        from adhocracy_core.schema import UniqueReferences
        return UniqueReferences(**kwargs)

    def test_create(self):
        from adhocracy_core.schema import References
        inst = self.make_one()
        assert isinstance(inst, References)

    def test_valid_deserialize_with_colander_null(self, request_):
        inst = self.make_one().bind(request_=request_)
        assert inst.deserialize(colander.null) == []

    def test_valid_deserialize_with_duplication(self, request_, context):
        inst = self.make_one().bind(request=request_, context=context)
        target = context['target']
        target_url = request_.resource_url(target)
        assert inst.deserialize([target_url, target_url]) == [target]

    def test_valid_deserialize_without_duplication(self, request_, context):
        inst = self.make_one().bind(request=request_, context=context)
        target = context['target']
        target1 = context['target1']
        target_url = request_.resource_url(target)
        target1_url = request_.resource_url(target1)
        assert inst.deserialize([target_url, target1_url]) == [target, target1]


class StringUnitTest(unittest.TestCase):

    def make_one(self):
        from adhocracy_core.schema import SingleLine
        return SingleLine()

    def test_serialize_valid_emtpy(self):
        inst = self.make_one()
        assert inst.deserialize() == colander.drop

    def test_deserialize_valid_emtpy(self):
        inst = self.make_one()
        assert inst.serialize() == ''

    def test_deserialize_valid(self):
        inst = self.make_one()
        assert inst.deserialize('line') == 'line'

    def test_deserialize_non_valid_with_newline(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('line\n')

    def test_deserialize_non_valid_with_carriage_return(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('line\r')


class TextUnitTest(unittest.TestCase):

    def make_one(self):
        from adhocracy_core.schema import Text
        return Text()

    def test_serialize_valid_emtpy(self):
        inst = self.make_one()
        assert inst.deserialize() == colander.drop

    def test_deserialize_valid_emtpy(self):
        inst = self.make_one()
        assert inst.serialize() == ''

    def test_deserialize_valid_with_newlines(self):
        inst = self.make_one()
        assert inst.deserialize('line\n\r') == 'line\n\r'

    def test_deserialize_non_valid_no_str(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize(1)

    def test_bind_and_setup_text_widget(self):
        from deform.widget import TextAreaWidget
        inst = self.make_one().bind()
        widget = inst.widget
        assert isinstance(widget, TextAreaWidget)


class PasswordUnitTest(unittest.TestCase):

    def make_one(self):
        from adhocracy_core.schema import Password
        return Password()

    def test_serialize_valid_emtpy(self):
        inst = self.make_one()
        assert inst.deserialize() == colander.drop

    def test_deserialize_valid_emtpy(self):
        inst = self.make_one()
        assert inst.serialize() == ''

    def test_deserialize_valid_with_newlines(self):
        inst = self.make_one()
        assert inst.deserialize('line\n\r') == 'line\n\r'

    def test_deserialize_non_valid_no_str(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize(1)


class DateTimeUnitTest(unittest.TestCase):

    def make_one(self, **kwargs):
        from adhocracy_core.schema import DateTime
        return DateTime(**kwargs)

    def test_create(self):
        from colander import DateTime
        inst = self.make_one()
        assert inst.schema_type is DateTime
        assert isinstance(inst.default, colander.deferred)
        assert isinstance(inst.missing, colander.deferred)

    def test_deserialize_empty(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize()

    def test_bind_and_deserialize_empty(self):
        from datetime import datetime
        inst = self.make_one().bind()
        result = inst.deserialize()
        assert isinstance(result, datetime)
        assert result.tzname() == 'UTC'

    def test_serialize_empty(self):
        inst = self.make_one()
        assert inst.serialize() is colander.null

    def test_bind_and_serialize_empty(self):
        from datetime import datetime
        inst = self.make_one().bind()
        result = inst.serialize()
        # we want an iso 8601 string with the current datetime
        today = datetime.utcnow().strftime('%Y-%m-%d')
        assert today in result

    def test_bind_and_setup_datetime_widget(self):
        from deform.widget import DateTimeInputWidget
        inst = self.make_one().bind()
        widget = inst.widget
        assert isinstance(widget, DateTimeInputWidget)
        schema = widget._pstruct_schema
        assert schema['date_submit'].missing is colander.null
        assert schema['time_submit'].missing is colander.null


class TestBoolean:

    @fixture
    def inst(self):
        from adhocracy_core.schema import Boolean
        return Boolean()

    def test_deserialize_valid_empty(self, inst):
        assert inst.deserialize() is False

    def test_serialize_valid_empty(self, inst):
        assert inst.serialize() == 'false'

    def test_deserialize_valid_true(self, inst):
        assert inst.deserialize('true') is True

    def test_serialize_valid_true(self, inst):
        assert inst.serialize(True) == 'true'

    def test_deserialize_valid_false(self, inst):
        assert inst.deserialize('false') is False

    def test_serialize_valid_false(self, inst):
        assert inst.serialize(False) == 'false'

    def test_deserialize_valid_one(self, inst):
        assert inst.deserialize('1') is True

    def test_deserialize_invalid(self, inst):
        with raises(colander.Invalid):
            assert inst.deserialize('yes') is False

    def test_serialize_invalid_no_bool(self, inst):
        with raises(colander.Invalid):
            inst.deserialize('not-a-bool')


class TestCurrencyAmount:

    @fixture
    def inst(self):
        from adhocracy_core.schema import CurrencyAmount
        return CurrencyAmount()

    def test_deserialize_valid_empty(self, inst):
        assert inst.deserialize() == colander.drop

    def test_serialize_valid_empty(self, inst):
        assert inst.serialize() == '0.00'

    def test_deserialize_valid(self, inst):
        from decimal import Decimal
        assert inst.deserialize('30.15') == Decimal('30.15')

    def test_serialize_valid(self, inst):
        from decimal import Decimal
        assert inst.serialize(Decimal('30.15')) == '30.15'

    def test_deserialize_valid_no_fractional_digits(self, inst):
        from decimal import Decimal
        assert inst.deserialize('77') == Decimal('77')

    def test_serialize_valid_no_fractional_digits(self, inst):
        from decimal import Decimal
        assert inst.serialize(Decimal('77')) == '77.00'

    def test_deserialize_valid_just_fractional_digits(self, inst):
        from decimal import Decimal
        assert inst.deserialize('.99') == Decimal('0.99')

    def test_serialize_valid_just_fractional_digits(self, inst):
        from decimal import Decimal
        assert inst.serialize(Decimal('0.99')) == '0.99'

    def test_deserialize_valid_too_many_fractional_digits(self, inst):
        from decimal import Decimal
        assert inst.deserialize('12.3456') == Decimal('12.35')

    def test_serialize_valid_too_many_fractional_digits(self, inst):
        from decimal import Decimal
        assert inst.serialize(Decimal('12.3456')) == '12.35'

    def test_serialize_valid_float(self, inst):
        assert inst.serialize(7.77) == '7.77'

    def test_serialize_valid_int(self, inst):
        assert inst.serialize(65) == '65.00'

    def test_deserialize_invalid(self, inst):
        with raises(colander.Invalid):
            inst.deserialize('1.2.3')

    def test_serialize_invalid(self, inst):
        with raises(colander.Invalid):
            inst.serialize('not-a-number')


class TestISOCountryCode:

    @fixture
    def inst(self):
        from adhocracy_core.schema import ISOCountryCode
        return ISOCountryCode()

    def test_deserialize_valid_missing(self, inst):
        assert inst.deserialize() == colander.drop

    def test_serialize_valid_empty(self, inst):
        assert inst.serialize() == ''

    def test_serialize_valid(self, inst):
        assert inst.serialize('US') == 'US'

    def test_deserialize_valid(self, inst):
        assert inst.deserialize('US') == 'US'

    def test_deserialize_valid_empty(self, inst):
        assert inst.deserialize('') == ''

    def test_deserialize_invalid_too_long(self, inst):
        with raises(colander.Invalid):
            inst.deserialize('EUR')

    def test_deserialize_invalid_too_short(self, inst):
        with raises(colander.Invalid):
            inst.deserialize('D')

    def test_deserialize_invalid_lowercase_letters(self, inst):
        with raises(colander.Invalid):
            inst.deserialize('de')

    def test_deserialize_invalid_not_letters(self, inst):
        with raises(colander.Invalid):
            inst.deserialize('1A')


class TestDeferredGetPostPool:

    def call_fut(self, node, kw):
        from . import deferred_get_post_pool
        return deferred_get_post_pool(node, kw)

    def test_post_pool_by_service_name(self, pool, node, service):
        pool['service'] = service
        node.iresource_or_service_name = 'service'
        post_pool = self.call_fut(node, {'context': pool})
        assert post_pool == service

    def test_post_pool_by_interface(self, pool, node):
        from adhocracy_core.interfaces import IPool
        node.iresource_or_service_name = IPool
        post_pool = self.call_fut(node, {'context': pool})
        assert post_pool == pool

    def test_raise_if_no_post_pool_found(self, context, node):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        node.iresource_or_service_name = 'service'
        with raises(RuntimeConfigurationError):
            self.call_fut(node, {'context': context})


class TestCreatePostPoolValidator:

    def call_fut(self, node, kw):
        from . import create_post_pool_validator
        return create_post_pool_validator(node, kw)

    @fixture
    def context(self, pool, service):
        from copy import deepcopy
        wrong_post_pool = service
        wrong_post_pool['child'] = testing.DummyResource()
        pool['wrong'] = wrong_post_pool
        right_post_pool = deepcopy(service)
        right_post_pool['child'] = testing.DummyResource()
        pool['right'] = right_post_pool
        return pool

    @fixture
    def back_reference_sheet(self, mock_sheet):
        schema = colander.MappingSchema()
        _add_post_pool_node(schema, iresource_or_service_name='right')
        mock_sheet.schema = schema
        return mock_sheet

    @fixture
    def node(self, node):
        _add_reference_node(node)
        _add_other_node(node)
        return node

    def test_raise_if_missing_post_pool_reference(
            self, node, back_reference_sheet, context, registry):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        back_reference_sheet.schema.children.clear()
        registry.content.get_sheet.return_value = back_reference_sheet
        kw = {'registry': registry, 'context': context}
        validator = self.call_fut(node['reference'], kw)
        with raises(RuntimeConfigurationError):
            validator(node, {'reference': context['right']['child']})

    def test_raise_if_wrong_post_pool(
            self, node, back_reference_sheet, context, registry):
        registry.content.get_sheet.return_value = back_reference_sheet
        kw = {'registry': registry, 'context': context['wrong']}
        validator = self.call_fut(node['reference'], kw)
        with raises(colander.Invalid) as err:
            validator(node, {'reference': context['right']['child']})
        assert err.value.msg == 'You can only add references inside /right'

    def test_raise_if_missing_post_pool(
            self, node, back_reference_sheet, context, registry):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        registry.content.get_sheet.return_value = back_reference_sheet
        kw = {'registry': registry, 'context': context['wrong']}
        validator = self.call_fut(node['reference'], kw)
        del context['right']
        with raises(RuntimeConfigurationError) as err:
            validator(node, {'reference': context['wrong']['child']})
        assert err.value.details == 'Cannot find post_pool with interface or '\
                                    'service name right for context /wrong/child.'

    def test_valid(
            self, node, back_reference_sheet, context, registry):
        registry.content.get_sheet.return_value = back_reference_sheet
        kw = {'registry': registry, 'context': context['right']}
        validator = self.call_fut(node['reference'], kw)
        result = validator(node, {'reference': context['right']['child']})
        assert result is None


class TestInteger:

    def make_one(self):
        from adhocracy_core.schema import Integer
        return Integer()

    def test_create(self):
        inst = self.make_one()
        assert inst.schema_type == colander.Integer
        assert inst.default == 0
        assert inst.missing == colander.drop


class TestRole:

    @fixture
    def inst(self):
        from adhocracy_core.schema import Role
        return Role()

    def test_create(self, inst):
        assert inst.validator.choices ==['participant',
                                         'moderator',
                                         'creator',
                                         'initiator',
                                         'admin',
                                         'god',
                                         ]
        assert inst.schema_type == colander.String
        assert inst.default == 'creator'

    def test_deserialize_valid(self, inst):
        assert inst.deserialize('moderator') == 'moderator'

    def test_deserialize_notvalid(self, inst):
        with raises(colander.Invalid):
            inst.deserialize(['WRONG'])


class TestRoles:

    @fixture
    def inst(self):
        from adhocracy_core.schema import Roles
        return Roles().bind()

    def test_create(self, inst):
        from adhocracy_core.schema import Role
        assert inst.validator.min == 0
        assert inst.validator.max == 6
        assert inst.schema_type == colander.Sequence
        assert inst.default == []
        assert isinstance(inst['role'], Role)

    def test_deserialize_empty(self, inst):
        assert inst.deserialize() == colander.drop

    def test_deserialize_with_role(self, inst):
        assert inst.deserialize(['moderator']) == ['moderator']

    def test_deserialize_with_duplicates(self, inst):
        assert inst.deserialize(['moderator', 'moderator']) == ['moderator']

    def test_deserialize_empty_list(self, inst):
        assert inst.deserialize([]) == []

    def test_deserialize_wrong(self, inst):
        with raises(colander.Invalid):
            inst.deserialize(['WRONG'])

    def test_serialize_empty(self, inst):
        assert inst.serialize() == []

    def test_serialize_with_role(self, inst):
        assert inst.serialize(['moderator']) == ['moderator']


class TestFileStoreType:

    @fixture
    def inst(self):
        from adhocracy_core.schema import FileStoreType
        return FileStoreType()

    def test_serialize_raises_exception(self, inst):
        with raises(colander.Invalid):
            inst.serialize(None, colander.null)

    def test_deserialize_null(self, inst):
        assert inst.deserialize(None, colander.null) is None

    def test_deserialize_valid(self, inst, monkeypatch):
        from adhocracy_core import schema
        import os
        mock_response = Mock()
        mock_file_constructor = Mock(spec=schema.File,
                                     return_value=mock_response)
        monkeypatch.setattr(schema, 'File', mock_file_constructor)
        mock_fstat_result = Mock()
        mock_fstat_result.st_size = 777
        mock_fstat = Mock(spec=os.fstat, return_value=mock_fstat_result)
        monkeypatch.setattr(os, 'fstat', mock_fstat)
        value = Mock()
        assert inst.deserialize(None, value) == mock_response
        assert mock_response.size == mock_fstat_result.st_size

    def test_deserialize_bytesio(self, inst, monkeypatch):
        from adhocracy_core import schema
        from io import BytesIO
        mock_response = Mock()
        mock_file_constructor = Mock(spec=schema.File,
                                     return_value=mock_response)
        monkeypatch.setattr(schema, 'File', mock_file_constructor)
        value = Mock()
        value.file = BytesIO(b'abcdef')
        assert inst.deserialize(None, value) == mock_response
        assert mock_response.size == 6

    def test_deserialize_exception(self, inst, monkeypatch):
        from adhocracy_core import schema
        mock_file_constructor = Mock(spec=schema.File, side_effect=IOError)
        monkeypatch.setattr(schema, 'File', mock_file_constructor)
        value = Mock()
        with raises(colander.Invalid):
            inst.deserialize(None, value)

    def test_deserialize_too_large(self, inst, monkeypatch):
        from adhocracy_core import schema
        import os
        mock_response = Mock()
        mock_file_constructor = Mock(spec=schema.File,
                                     return_value=mock_response)
        monkeypatch.setattr(schema, 'File', mock_file_constructor)
        mock_fstat_result = Mock()
        mock_fstat_result.st_size = 20000000
        mock_fstat = Mock(spec=os.fstat, return_value=mock_fstat_result)
        monkeypatch.setattr(os, 'fstat', mock_fstat)
        value = Mock()
        with raises(colander.Invalid) as err_info:
            inst.deserialize(None, value)
        assert 'too large' in err_info.value.msg


class TestACLPrincipalType:

    @fixture
    def inst(self):
        from adhocracy_core.schema import ACEPrincipalType
        return ACEPrincipalType()

    def test_create(self, inst):
        from . import ROLE_PRINCIPALS
        from . import SYSTEM_PRINCIPALS
        assert inst.valid_principals == ROLE_PRINCIPALS + SYSTEM_PRINCIPALS

    def test_serialize_empty(self, node, inst):
        assert inst.serialize(node, colander.null) == colander.null

    def test_serialize_system_user(self, node, inst):
        assert inst.serialize(node, 'system.User') == 'user'

    def test_serialize_role(self, node, inst):
        assert inst.serialize(node, 'role:moderator') == 'moderator'

    def test_serialize_str_without_prefix(self, node, inst):
        with raises(ValueError):
            inst.serialize(node, 'User')

    def test_deserialize_empty_str(self, node, inst):
        assert inst.deserialize(node, '') == ''

    def test_deserialize_role(self, node, inst):
        assert inst.deserialize(node, 'moderator') == 'role:moderator'

    def test_deserialize_system_user_everyone(self, node, inst):
        assert inst.deserialize(node, 'everyone') == 'system.Everyone'

    def test_deserialize_raise_if_raise_else(self, node, inst):
        with raises(colander.Invalid):
            inst.deserialize(node, 'WRONG')


class TestACEPrincipal:

    @fixture
    def inst(self):
        from . import ACEPrincipal
        return ACEPrincipal()

    def test_create(self, inst):
        from . import ACEPrincipalType
        inst.schema_type = ACEPrincipalType


@fixture
def mock_registry():
    registry = Mock()
    return registry


class TestACMRow:

    @fixture
    def inst(self):
        from . import ACMRow
        return ACMRow()

    def test_deserialize(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        assert inst.bind(registry=mock_registry) \
        .deserialize(['edit', 'Allow']) == ['edit', Allow]

    def test_deserialize_action_shortcut_A(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        assert inst.bind(registry=mock_registry) \
        .deserialize(['edit', 'A']) == ['edit', Allow]

    def test_deserialize_action_shortcut_D(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        assert inst.bind(registry=mock_registry) \
        .deserialize(['edit', 'D']) == ['edit', Deny]

    def test_deserialize_invalid_permission_name(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        with raises(colander.Invalid):
            inst.bind(registry=mock_registry).deserialize(['modify', 'Allow'])

    def test_deserialize_invalid_action_name(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        with raises(colander.Invalid):
            inst.bind(registry=mock_registry).deserialize(['edit', 'Agree'])


class TestACM:

    @fixture
    def inst(self):
        from . import ACM
        return ACM()

    def test_serialize_empty(self, inst):
       assert inst.serialize() == {'principals': [],
                                   'permissions': []}

    def test_serialize(self, inst):
        appstruct = {'principals': ['system.Everyone'],
                     'permissions': [['edit', Allow]]}
        assert inst.serialize(appstruct) == {'principals': ['everyone'],
                                             'permissions': [['edit', 'Allow']]}

    def test_deserialize(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        assert inst.bind(registry=mock_registry).deserialize(
            {'principals': ['everyone'],
             'permissions': [['edit', 'Allow']]}) == \
            {'principals': ['system.Everyone'],
             'permissions': [['edit', Allow]]}

    def test_deserialize_empty(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        assert inst.bind(registry=mock_registry).deserialize({}) \
            == {'principals': [],
                'permissions': []}

    def test_deserialize_noaction(self, inst, mock_registry):
        mock_registry.content.permissions.return_value = ['edit']
        assert inst.bind(registry=mock_registry).deserialize(
            {'principals': ['everyone'],
             'permissions': [['edit', '']]}) == \
            {'principals': ['system.Everyone'],
             'permissions': [['edit', None]]}
