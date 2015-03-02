import unittest

from pyramid import testing
from pytest import raises
from pytest import mark
from pytest import fixture


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


def test_get_sheet_with_registry(context, mock_sheet, registry_with_content):
    from adhocracy_core.interfaces import ISheet
    from adhocracy_core.utils import get_sheet
    registry_with_content.content.get_sheet.return_value = mock_sheet
    assert get_sheet(context, ISheet, registry_with_content) is mock_sheet


def test_get_sheet_without_registry(context, mock_sheet, registry_with_content):
    from adhocracy_core.interfaces import ISheet
    from adhocracy_core.utils import get_sheet
    registry_with_content.content.get_sheet.return_value = mock_sheet
    assert get_sheet(context, ISheet) is mock_sheet


def test_get_sheet_sheet_not_registered(context, registry_with_content):
    from adhocracy_core.interfaces import ISheet
    from adhocracy_core.exceptions import RuntimeConfigurationError
    from adhocracy_core.utils import get_sheet
    registry_with_content.content.get_sheet.side_effect =\
        RuntimeConfigurationError
    with raises(RuntimeConfigurationError):
        get_sheet(context, ISheet)


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


class TestGetMatchingIsheet:

    def _call_fut(self, context, isheet):
        from adhocracy_core.utils import get_matching_isheet
        return get_matching_isheet(context, isheet)

    def test_provides_no_sheet(self):
        from adhocracy_core.interfaces import ISheet
        context = testing.DummyResource()
        assert self._call_fut(context, ISheet) is None

    def test_provides_sheet(self):
        from adhocracy_core.interfaces import ISheet
        context = testing.DummyResource(__provides__=ISheet)
        assert self._call_fut(context, ISheet) is ISheet

    def test_provides_subclass_of_sheet(self):
        from adhocracy_core.interfaces import IPredicateSheet, ISheet
        context = testing.DummyResource(__provides__=IPredicateSheet)
        assert self._call_fut(context, ISheet) is IPredicateSheet

    def test_provides_wrong_sheet(self):
        from adhocracy_core.interfaces import IPredicateSheet, ISheet
        context = testing.DummyResource(__provides__=ISheet)
        assert self._call_fut(context, IPredicateSheet) is None


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


class TestRaiseColanderStyleError:

    def _call_fut(self, *args):
        from . import raise_colander_style_error
        return raise_colander_style_error(*args)

    @fixture
    def integration(self, config):
        import adhocracy_core.rest
        config.include(adhocracy_core.rest)

    @fixture
    def dummy_view(self):
        from adhocracy_core.interfaces import ISheet

        def dummy_view(request):
            self._call_fut(ISheet, 'fieldname', 'description')
            raise Exception()

        return dummy_view

    @fixture
    def app_user(self, config, dummy_view):
        config.add_view(dummy_view, name='dummy_view', request_method='GET')
        config.add_route('dummy_view', '/dummy_view}')
        from webtest import TestApp
        app = config.make_wsgi_app()
        return TestApp(app)

    @mark.usefixtures('integration')
    def test_raise_in_view(self, app_user):
        # actually we are also testing
        # adhocracy_core.rest.exceptions.handle_error_400_colander_invalid here.
        resp = app_user.get('/dummy_view', status=400)
        assert resp.json == \
               {"status": "error",
                "errors": [{"description": "description",
                            "name": "data.adhocracy_core.interfaces.ISheet.fieldname",
                            "location": "body"}]}


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
