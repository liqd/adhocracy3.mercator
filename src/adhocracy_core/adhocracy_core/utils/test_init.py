import unittest

from pyramid import testing
from pytest import raises
from pytest import mark


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


def test_get_sheet_adapter_exists(config, context):
    from adhocracy_core.interfaces import IResourceSheet
    from adhocracy_core.interfaces import ISheet
    from adhocracy_core.utils import get_sheet
    adapter = testing.DummyResource(__provides__=IResourceSheet)
    context = testing.DummyResource(__provides__=ISheet)
    config.registry.registerAdapter(lambda x: adapter,
                                    (ISheet,), IResourceSheet,
                                    ISheet.__identifier__)
    assert get_sheet(context, ISheet) is adapter


def test_get_sheet_adapter_does_not_exists(config, context):
    from adhocracy_core.interfaces import ISheet
    from zope.component import ComponentLookupError
    from adhocracy_core.utils import get_sheet
    with raises(ComponentLookupError):
        get_sheet(context, ISheet)


def test_get_all_sheets_adapter_exists(config):
    from adhocracy_core.interfaces import IResourceSheet
    from adhocracy_core.interfaces import ISheet
    from . import get_all_sheets
    adapter = testing.DummyResource(__provides__=IResourceSheet)
    context = testing.DummyResource(__provides__=ISheet)
    config.registry.registerAdapter(lambda x: adapter,
                                    (ISheet,), IResourceSheet,
                                    ISheet.__identifier__)
    assert adapter in get_all_sheets(context)


class GetUserUnitTest(unittest.TestCase):

    def _make_one(self, request):
        from adhocracy_core.utils import get_user
        return get_user(request)

    def setUp(self):
        user = testing.DummyResource()
        context = testing.DummyResource()
        context['user'] = user
        self.context = context

        class DummyRequest(testing.DummyRequest):
            @property
            def authenticated_userid(self):
                return self._dummy_userid
        self.request = DummyRequest(root=context,
                                    _dummy_userid=None)

    def test_with_user_id_is_None(self):
        assert self._make_one(self.request) is None

    def test_with_user_id_is_not_resource_path(self):
        assert self._make_one(self.request) is None

    def test_with_user_id(self):
        user = self.context['user']
        self.request._dummy_userid = '/user'
        assert self._make_one(self.request) == user


class TestNormalizeToTuple:

    def _call_fut(self, value):
        from adhocracy_core.utils import normalize_to_tuple
        return normalize_to_tuple(value)

    def test_with_tuple(self):
        assert self._call_fut((1,)) == (1,)

    def test_with_string(self):
        assert self._call_fut("ab") == ("ab",)

    def test_with_non_string_sequence(self):
        assert self._call_fut([1]) == (1,)

    def test_with_dict(self):
        assert self._call_fut({1: 2}) == ({1: 2},)
