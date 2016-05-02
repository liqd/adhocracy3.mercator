import unittest

from pyramid import testing
from pytest import raises
from pytest import mark
from pytest import fixture
from unittest.mock import Mock

def test_find_graph_graph_exists():
    from adhocracy_core.utils import find_graph
    dummy_graph = object()
    parent = testing.DummyResource(__graph__=dummy_graph)
    child = testing.DummyResource(__parent__=parent)
    assert find_graph(child) is dummy_graph


def test_find_graph_graph_does_not_exists():
    from adhocracy_core.utils import find_graph
    child = testing.DummyResource()
    assert find_graph(child) is None


def test_diff_dict():
    from . import diff_dict
    old = {'foo': 5, 'bar': 6, 'kaz': 8}
    new = {'bar': 6, 'baz': 7, 'kaz': 9, 'faz': 10}
    diff = diff_dict(old, new)
    assert diff == ({'baz', 'faz'}, {'kaz'}, {'foo'})


def test_diff_dict_omit():
    from . import diff_dict
    old = {'foo': 5, 'bar': 6, 'kaz': 8}
    new = {'bar': 6, 'baz': 7, 'kaz': 9, 'faz': 10}
    diff = diff_dict(old, new, omit=('foo',))
    assert diff == ({'baz', 'faz'}, {'kaz'}, set())


def test_log_compatible_datetime():
    from datetime import datetime
    from . import log_compatible_datetime
    # Should have 3 places less than the standard format
    # 4th position from right should be a comma
    # Other positions should look like the standard format
    date = datetime(2013, 2, 3, 1, 2, 3, 123456)
    str_date_compatible = '2013-02-03 01:02:03,123'
    assert log_compatible_datetime(date) == str_date_compatible


@mark.parametrize('string,prefix,expected_output', [
    ('footile', 'foo', 'tile'),
    ('futile', 'foo' , 'futile'),
    ('footile', 'oot' , 'footile'),
    ('footile', 'ile' , 'footile'),
    ('', 'foo' , ''),
    ('footile', '' , 'footile'),
    (' footile ', 'foo' , ' footile '),
    ('foo', 'foo' , ''),
    ('foo', 'foot' , 'foo'),
])
def test_strip_optional_prefix(string, prefix, expected_output):
    from . import strip_optional_prefix
    assert strip_optional_prefix(string, prefix) == expected_output


def test_get_resource_interface_multiple_provided():
    from . import get_iresource
    from adhocracy_core.interfaces import IResource
    from zope.interface import directlyProvides
    from pyramid.testing import DummyResource
    context = DummyResource()

    class IA(IResource):
        pass

    class IB(IResource):
        pass

    directlyProvides(context, IA, IB)
    assert get_iresource(context) == IA


def test_get_resource_interface_none_provided():
    from . import get_iresource
    from pyramid.testing import DummyResource
    context = DummyResource()
    result = get_iresource(context)
    assert result is None


def test_get_sheet_interfaces_multiple_provided():
    from . import get_isheets
    from adhocracy_core.interfaces import ISheet
    from adhocracy_core.interfaces import IResource
    from pyramid.testing import DummyResource

    class IA(ISheet):
        pass

    class IB(ISheet):
        pass

    context = DummyResource(__provides__=(IResource, IA, IB))
    assert get_isheets(context) == [IA, IB]


def test_get_sheet_interfaces_none_provided():
    from . import get_isheets
    from adhocracy_core.interfaces import IResource
    from pyramid.testing import DummyResource
    context = DummyResource(__provides__=IResource)
    assert get_isheets(context) == []


def test_get_all_taggedvalues_inheritance():
    from zope.interface import taggedValue
    from zope.interface import Interface
    from . import get_all_taggedvalues

    class IA(Interface):
        taggedValue('a', 'a')

    class IB(IA):
        pass

    metadata_ib = get_all_taggedvalues(IB)
    assert 'a' in metadata_ib


def test_to_dotted_name_module():
    from . import to_dotted_name
    import os
    assert to_dotted_name(os.walk) == 'os.walk'


def test_to_dotted_name_dotted_string():
    from . import to_dotted_name
    assert to_dotted_name('os.walk') == 'os.walk'


def test_remove_keys_from_dict_with_keys_to_remove():
    from adhocracy_core.utils import remove_keys_from_dict
    dictionary = {'key': 'value',
                  'other_key': 'value'}
    assert remove_keys_from_dict(dictionary, keys_to_remove=('key',))\
        == {'other_key': 'value'}


def test_remove_keys_from_dict_with_single_key_to_remove():
    from adhocracy_core.utils import remove_keys_from_dict
    dictionary = {'key': 'value',
                  'other_key': 'value'}
    assert remove_keys_from_dict(dictionary, keys_to_remove='key')\
        == {'other_key': 'value'}


def test_exception_to_str_index_error():
    from adhocracy_core.utils import exception_to_str
    try:
        l = []
        l[1]
        assert False
    except IndexError as err:
        err_string = exception_to_str(err)
        assert err_string == 'IndexError: list index out of range'


def test_exception_to_str_key_error():
    from adhocracy_core.utils import exception_to_str
    try:
        d = {}
        d['key']
        assert False
    except KeyError as err:
        err_string = exception_to_str(err)
        assert err_string == "KeyError: 'key'"


def test_exception_to_str_runtime_error():
    from adhocracy_core.utils import exception_to_str
    err_string = exception_to_str(RuntimeError())
    assert err_string == 'RuntimeError'


class TestNormalizeToTuple:

    def call_fut(self, value):
        from adhocracy_core.utils import normalize_to_tuple
        return normalize_to_tuple(value)

    def test_with_tuple(self):
        assert self.call_fut((1,)) == (1,)

    def test_with_string(self):
        assert self.call_fut("ab") == ("ab",)

    def test_with_non_string_sequence(self):
        assert self.call_fut([1]) == (1,)

    def test_with_dict(self):
        assert self.call_fut({1: 2}) == ({1: 2},)


class TestGetMatchingIsheet:

    def call_fut(self, context, isheet):
        from adhocracy_core.utils import get_matching_isheet
        return get_matching_isheet(context, isheet)

    def test_provides_no_sheet(self):
        from adhocracy_core.interfaces import ISheet
        context = testing.DummyResource()
        assert self.call_fut(context, ISheet) is None

    def test_provides_sheet(self):
        from adhocracy_core.interfaces import ISheet
        context = testing.DummyResource(__provides__=ISheet)
        assert self.call_fut(context, ISheet) is ISheet

    def test_provides_subclass_of_sheet(self):
        from adhocracy_core.interfaces import IPredicateSheet, ISheet
        context = testing.DummyResource(__provides__=IPredicateSheet)
        assert self.call_fut(context, ISheet) is IPredicateSheet

    def test_provides_wrong_sheet(self):
        from adhocracy_core.interfaces import IPredicateSheet, ISheet
        context = testing.DummyResource(__provides__=ISheet)
        assert self.call_fut(context, IPredicateSheet) is None


def test_get_reason_blocked_not_deleted_not_hidden(context):
    from . import get_reason_if_blocked
    context.deleted = False
    context.hidden = False
    assert get_reason_if_blocked(context) == None


def test_get_reason_blocked_is_deleted_not_hidden(context):
    from . import get_reason_if_blocked
    context.deleted = True
    context.hidden = False
    assert get_reason_if_blocked(context) == 'deleted'


def test_get_reason_blocked_not_hidden_is_hidden(context):
    from . import get_reason_if_blocked
    context.deleted = False
    context.hidden = True
    assert get_reason_if_blocked(context) == 'hidden'


def test_get_reason_blocked_is_hidden_is_hidden(context):
    from . import get_reason_if_blocked
    context.deleted = True
    context.hidden = True
    assert get_reason_if_blocked(context) == 'both'


class TestGetVisibilityChange:

    @fixture
    def event(self, context):
        from adhocracy_core.events import ResourceSheetModified
        from adhocracy_core.sheets.metadata import IMetadata
        event = ResourceSheetModified(object=context,
                                      isheet=IMetadata,
                                      registry=None,
                                      old_appstruct={},
                                      new_appstruct={},
                                      request=None)
        return event

    def call_fut(self, event):
        from . import get_visibility_change
        return get_visibility_change(event)

    def test_newly_hidden(self, event):
        from adhocracy_core.interfaces import VisibilityChange
        event.old_appstruct = {'deleted': False, 'hidden': False}
        event.new_appstruct = {'deleted': False, 'hidden': True}
        assert self.call_fut(event) == VisibilityChange.concealed

    def test_newly_undeleted(self, event):
        from adhocracy_core.interfaces import VisibilityChange
        event.old_appstruct = {'deleted': True, 'hidden': False}
        event.new_appstruct = {'deleted': False, 'hidden': False}
        assert self.call_fut(event) == VisibilityChange.revealed

    def test_no_change_invisible(self, event):
        from adhocracy_core.interfaces import VisibilityChange
        event.old_appstruct = {'deleted': False, 'hidden': True}
        event.new_appstruct = {'deleted': False, 'hidden': True}
        assert self.call_fut(event) == VisibilityChange.invisible

    def test_no_change_visible(self, event):
        from adhocracy_core.interfaces import VisibilityChange
        event.old_appstruct = {'deleted': False, 'hidden': False}
        event.new_appstruct = {'deleted': False, 'hidden': False}
        assert self.call_fut(event) == VisibilityChange.visible


def test_get_modification_date_not_cached():
    """The shared modification date is cached."""
    from . import get_modification_date
    registry = testing.DummyResource()
    result = get_modification_date(registry)
    assert registry.__modification_date__ is result


def test_get_modification_date_cached():
    """If the registry has the cached date, return it."""
    from . import get_modification_date
    from datetime import datetime
    now = datetime.now()
    registry = testing.DummyResource(__date__=now)
    result = get_modification_date(registry)
    assert result is registry.__modification_date__


def test_is_deleted_attribute_is_true(context):
    from . import is_deleted
    context.deleted = True
    assert is_deleted(context) is True


def test_is_deleted_attribute_is_false(context):
    from . import is_deleted
    context.deleted = False
    assert is_deleted(context) is False


def test_is_deleted_attribute_not_set(context):
    from . import is_deleted
    assert is_deleted(context) is False


def test_is_deleted_parent_attribute_is_true(context):
    from . import is_deleted
    child = testing.DummyResource()
    context['child'] = child
    context.deleted = True
    assert is_deleted(child) is True


def test_is_deleted_parent_attribute_is_false(context):
    from . import is_deleted
    child = testing.DummyResource()
    context['child'] = child
    context.deleted = False
    assert is_deleted(child) is False


def test_is_deleted_parent_attribute_not_set(context):
    from . import is_deleted
    child = testing.DummyResource()
    context['child'] = child
    assert is_deleted(child) is False


def test_is_deleted_parent_attrib_true_child_attrib_false(context):
    from . import is_deleted
    child = testing.DummyResource()
    context['child'] = child
    context.deleted = True
    child.deleted = False
    assert is_deleted(child) is True


def test_is_hidden_attribute_is_true(context):
    from . import is_hidden
    context.hidden = True
    assert is_hidden(context) is True


def test_is_hidden_attribute_is_false(context):
    from . import is_hidden
    context.hidden = False
    assert is_hidden(context) is False


def test_is_hidden_attribute_not_set(context):
    from . import is_hidden
    assert is_hidden(context) is False


def test_is_hidden_parent_attribute_is_true(context):
    from . import is_hidden
    child = testing.DummyResource()
    context['child'] = child
    context.hidden = True
    assert is_hidden(child) is True


def test_is_hidden_parent_attribute_is_false(context):
    from . import is_hidden
    child = testing.DummyResource()
    context['child'] = child
    context.hidden = False
    assert is_hidden(child) is False


def test_is_hidden_parent_attribute_not_set(context):
    from . import is_hidden
    child = testing.DummyResource()
    context['child'] = child
    assert is_hidden(child) is False


def test_is_hidden_parent_attrib_true_child_attrib_false(context):
    from . import is_hidden
    child = testing.DummyResource()
    context['child'] = child
    context.hidden = True
    child.hidden = False
    assert is_hidden(child) is True


def test_now():
    from datetime import datetime
    from pytz import UTC
    from . import now
    date = now()
    assert isinstance(date, datetime)
    assert date.tzinfo == UTC


def test_create_filename():
    from datetime import datetime
    from . import create_filename
    name = create_filename()
    now = datetime.now()
    assert str(now.year) in name
    assert name.startswith('./')
    assert name.endswith('.csv')


def test_create_filename_with_kwargs():
    from datetime import datetime
    from . import create_filename
    name = create_filename(directory='.', prefix='pre', suffix='.suf')
    now = datetime.now()
    assert str(now.year) in name
    assert name.startswith('./')
    assert name.endswith('.suf')


def test_create_filename_create_directory_if_not_exists():
    import random
    from os import path
    from . import create_filename
    subdir = str(random.random())
    create_filename(directory='/tmp/' + subdir + '/x')
    path.exists('/tmp/' + subdir + '/x')



class TestLoadJson:

    def call_fut(self, filename):
        from . import load_json
        return load_json(filename)

    def test_loadjson(self):
        from tempfile import mkstemp
        import json

        (self._tempfd, filename) = mkstemp()
        value = [{'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods']}]
        with open(filename, 'w') as f:
            f.write(json.dumps(value))

        result = self.call_fut(filename)
        assert result == value

    def teardown_method(self, method):
        if hasattr(self, 'tempfd'):
            os.close(self._tempfd)


def test_has_annotation_sheet_data_resource_without_data(context):
    from . import has_annotation_sheet_data
    assert has_annotation_sheet_data(context) is False


def test_has_annotation_sheet_data_resource_with_data(context):
    from . import has_annotation_sheet_data
    context._sheet_xcv = {}
    assert has_annotation_sheet_data(context) is True
