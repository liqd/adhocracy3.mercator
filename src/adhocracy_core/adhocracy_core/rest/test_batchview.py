import json

from pyramid.request import Request
from pytest import fixture
from pytest import raises
from unittest.mock import Mock


class DummySubresponse:

    def __init__(self, status_code=200, json: dict={}):
        self.status_code = status_code
        self.json = json


class TestBatchItemResponse:

    def _make_one(self, code=200, body={}):
        from adhocracy_core.rest.batchview import BatchItemResponse
        return BatchItemResponse(code, body)

    def test_was_successful_true(self):
        inst = self._make_one()
        assert inst.was_successful() is True

    def test_was_successful_false(self):
        inst = self._make_one(404)
        assert inst.was_successful() is False

    def test_to_dict(self):
        inst = self._make_one()
        assert inst.to_dict() == {'code': 200, 'body': {}}


class TestBatchView:

    @fixture
    def mock_invoke_subrequest(self):
        mock = Mock()
        mock.return_value = DummySubresponse()
        return mock

    @fixture
    def request(self, cornice_request, changelog, mock_invoke_subrequest):
        cornice_request.registry.changelog = changelog
        cornice_request.invoke_subrequest = mock_invoke_subrequest
        cornice_request.method = 'POST'
        return cornice_request

    def _make_one(self, context, request):
        from adhocracy_core.rest.batchview import BatchView
        return BatchView(context, request)

    def _make_subrequest_cstruct(self, path: str='http://a.org/adhocracy/blah',
                                 result_path: str='@newpath',
                                 method: str='PUT',
                                 body: dict={},
                                 result_first_version_path: str='@newpath/v1',
                                 ) -> dict:
        return {'path': path,
                'result_path': result_path,
                'result_first_version_path': result_first_version_path,
                'method': method,
                'body': body}

    def _make_json_with_subrequest_cstructs(self, **kwargs) -> dict:
        cstruct = self._make_subrequest_cstruct(**kwargs)
        return json.dumps([cstruct])

    def test_post_empty(self, context, request):
        from adhocracy_core.utils import is_batchmode
        inst = self._make_one(context, request)
        assert inst.post() == {'responses': [],
                               'updated_resources': {'changed_descendants': [],
                                                     'created': [],
                                                     'modified': [],
                                                     'removed': []}}
        assert is_batchmode(request)

    def test_post_successful_subrequest(self, context, request, mock_invoke_subrequest):
        request.body = self._make_json_with_subrequest_cstructs()
        inst = self._make_one(context, request)
        paths = {'path': '/pool/item',
                 'first_version_path': '/pool/item/v1'}
        mock_invoke_subrequest.return_value = DummySubresponse(status_code=200,
                                                               json=paths,)
        response = inst.post()
        assert response == {'responses': [{'body': paths, 'code': 200}],
                            'updated_resources': {'changed_descendants': [],
                                                  'created': [],
                                                  'modified': [],
                                                  'removed': []}}

    def test_post_copy_special_request_attributes_headers_to_subrequest(
            self, context, request, mock_invoke_subrequest):
        from pyramid.traversal import resource_path
        from adhocracy_core.utils import is_batchmode
        request.body = self._make_json_with_subrequest_cstructs()
        request.__cached_principals__ = [1]
        date = object()
        request.headers['X-User-Path'] = 2
        request.headers['X-User-Token'] = 3
        # Needed to stop the validator from complaining if these headers are
        # present
        request.authenticated_userid = resource_path(context)
        request.root = context
        request.script_name = '/virtual'
        inst = self._make_one(context, request)
        paths = {'path': '/pool/item',
                 'first_version_path': '/pool/item/v1'}
        mock_invoke_subrequest.return_value = DummySubresponse(status_code=200,
                                                               json=paths,)
        inst.post()
        subrequest  = mock_invoke_subrequest.call_args[0][0]
        assert is_batchmode(subrequest)
        assert subrequest.__cached_principals__ == [1]
        assert subrequest.headers.get('X-User-Path') == 2
        assert subrequest.headers.get('X-User-Token') == 3
        assert subrequest.script_name == '/virtual'
        assert subrequest.path_info == 'cy/blah'


    def test_post_successful_subrequest_with_updated_resources(
            self, context, request, mock_invoke_subrequest):
        request.body = self._make_json_with_subrequest_cstructs()
        inst = self._make_one(context, request)
        response_body = {'path': '/pool/item',
                 'first_version_path': '/pool/item/v1',
                 'updated_resources': {'created': ['/pool/item/v1']}}
        mock_invoke_subrequest.return_value = DummySubresponse(
            status_code=200, json=response_body,)
        response = inst.post()
        assert response == {'responses': [{'body': {'path': '/pool/item',
                                                    'first_version_path':
                                                        '/pool/item/v1'},
                                           'code': 200}],
                            'updated_resources': {'changed_descendants': [],
                                                  'created': [],
                                                  'modified': [],
                                                  'removed': []}}

    def test_post_successful_subrequest_resolve_result_paths(self, context, request, mock_invoke_subrequest):
        cstruct1 = self._make_subrequest_cstruct(result_first_version_path='@item/v1')
        cstruct2 = self._make_subrequest_cstruct(body={'ISheet': {'ref': '@item/v1'}})
        request.body = json.dumps([cstruct1, cstruct2])
        inst = self._make_one(context, request)
        paths = {'path': '/pool/item',
                 'first_version_path': '/pool/item/v1'}
        mock_invoke_subrequest.return_value = DummySubresponse(status_code=200,
                                                               json=paths)

        inst.post()

        subrequest2 = mock_invoke_subrequest.call_args[0][0]
        assert subrequest2.json ==  {'ISheet': {'ref': '/pool/item/v1'}}

    def test_post_failed_subrequest(self, context, request, mock_invoke_subrequest):
        from cornice.util import _JSONError
        request.body = self._make_json_with_subrequest_cstructs()
        mock_invoke_subrequest.return_value = DummySubresponse(status_code=444)
        inst = self._make_one(context, request)
        with raises(_JSONError) as err:
            inst.post()
            assert err.status_code == 444
            assert err.text.startswith('[{')
            assert err.text.endswith('}]')

    def test_post_subrequest_with_http_exception(self, context, request, mock_invoke_subrequest):
        from cornice.util import _JSONError
        from pyramid.httpexceptions import HTTPUnauthorized
        request.body = self._make_json_with_subrequest_cstructs()
        mock_invoke_subrequest.side_effect = HTTPUnauthorized()
        inst = self._make_one(context, request)
        with raises(_JSONError) as err:
            inst.post()
            assert err.status_code == 401
            assert '"code": 401' in err.text

    def test_post_subrequest_with_other_exception(self, context, request, mock_invoke_subrequest):
        from cornice.util import _JSONError
        request.body = self._make_json_with_subrequest_cstructs()
        mock_invoke_subrequest.side_effect = RuntimeError('Bad luck')
        inst = self._make_one(context, request)
        with raises(_JSONError) as err:
            inst.post()
            assert err.status_code == 500
            assert '"internal"' in err.text
            assert 'Bad luck' in err.text

    def _make_batch_response(self, code=200, path=None, first_version_path=None):
        from adhocracy_core.rest.batchview import BatchItemResponse
        body = {}
        if path is not None:
            body['path'] = path
        if first_version_path is not None:
            body['first_version_path'] = first_version_path
        return BatchItemResponse(code, body)

    def test_extend_path_map_just_path(self, context, request):
        inst = self._make_one(context, request)
        path_map = {}
        result_path = '@newpath'
        result_first_version_path = ''
        item_response = self._make_batch_response(path='http://a.org/adhocracy/new_item')
        inst._extend_path_map(path_map, result_path, result_first_version_path, item_response)
        assert path_map == {'@newpath': 'http://a.org/adhocracy/new_item'}

    def test_extend_path_map_just_path_and_missing_response_path(self, context, request):
        inst = self._make_one(context, request)
        path_map = {}
        result_path = '@newpath'
        result_first_version_path = ''
        item_response = self._make_batch_response()
        inst._extend_path_map(path_map, result_path, result_first_version_path, item_response)
        assert path_map == {}

    def test_extend_path_map_path_and_first_version_path(self, context, request):
        inst = self._make_one(context, request)
        path_map = {}
        result_path = '@newpath'
        result_first_version_path = '@newpath/v1'
        item_response = self._make_batch_response(
            path='/adhocracy/new_item',
            first_version_path='/adhocracy/new_item/v0')
        inst._extend_path_map(path_map, result_path, result_first_version_path, item_response)
        assert path_map == {'@newpath': '/adhocracy/new_item',
                            '@newpath/v1': '/adhocracy/new_item/v0'}

    def test_copy_header_if_exists_not_existing(self, context, request):
        from copy import deepcopy
        inst = self._make_one(context, request)
        subrequest = deepcopy(request)
        inst.copy_header_if_exists('non_existing', subrequest)
        assert 'non_existing' not in subrequest.headers

    def test_copy_header_if_exists_existing(self, context, request):
        from copy import deepcopy
        inst = self._make_one(context, request)
        subrequest = deepcopy(request)
        request.headers['existing'] = 'Test'
        inst.copy_header_if_exists('existing', subrequest)
        assert 'existing' in subrequest.headers

    def test_copy_attr_if_exists_not_existing(self, context, request):
        from copy import deepcopy
        inst = self._make_one(context, request)
        subrequest = deepcopy(request)
        inst.copy_attr_if_exists('non_existing', subrequest)
        assert not hasattr(subrequest, 'non_existing')

    def test_copy_attr_if_exists_not_exists(self, context, request):
        from copy import deepcopy
        inst = self._make_one(context, request)
        subrequest = deepcopy(request)
        request.existing = 'Buh'
        inst.copy_attr_if_exists('existing', subrequest)
        assert hasattr(subrequest, 'existing')

    def test_extend_path_map_no_result_path(self, context, request):
        inst = self._make_one(context, request)
        path_map = {}
        result_path = ''
        result_first_version_path = ''
        item_response = self._make_batch_response(path='/adhocracy/new_item')
        inst._extend_path_map(path_map, result_path, result_first_version_path, item_response)
        assert path_map == {}

    def test_extend_path_map_failed_response(self, context, request):
        inst = self._make_one(context, request)
        path_map = {}
        result_path = '@newpath'
        result_first_version_path = ''
        item_response = self._make_batch_response(code=444,
                                                  path='/adhocracy/new_item')
        inst._extend_path_map(path_map, result_path, result_first_version_path, item_response)
        assert path_map == {}

    def test_make_subrequest_post_with_non_empty_body(self, context, request):
        inst = self._make_one(context, request)
        body = {'content_type':
                    'adhocracy_core.resources.sample_paragraph.IParagraph',
                'data': {'adhocracy_core.sheets.name.IName': {'name': 'par1'}}
               }
        subrequest_cstruct = self._make_subrequest_cstruct(method='POST', body=body)
        subrequest = inst._make_subrequest(subrequest_cstruct)
        assert isinstance(subrequest, Request)
        assert subrequest.method == 'POST'
        assert subrequest.content_type == 'application/json'
        assert subrequest.json == body

    def test_make_subrequest_get_with_empty_body(self, context, request):
        inst = self._make_one(context, request)
        subrequest_cstrut = self._make_subrequest_cstruct(method='GET')
        subrequest = inst._make_subrequest(subrequest_cstrut)
        assert subrequest.method == 'GET'
        assert subrequest.content_type != 'application/json'
        assert len(subrequest.body) == 0

    def test_resolve_preliminary_paths_str_with_replacement(self, context, request):
        inst = self._make_one(context, request)
        path_map = {'@newpath': '/adhocracy/new_item'}
        json_value = '@newpath'
        result = inst._resolve_preliminary_paths(json_value, path_map)
        assert result == '/adhocracy/new_item'

    def test_resolve_preliminary_paths_str_without_replacement(self, context, request):
        inst = self._make_one(context, request)
        path_map = {'@newpath': '/adhocracy/new_item'}
        json_value = 'nopath'
        result = inst._resolve_preliminary_paths(json_value, path_map)
        assert result == json_value

    def test_resolve_preliminary_paths_dict_with_replacement(self, context, request):
        inst = self._make_one(context, request)
        path_map = {'@newpath': '/adhocracy/new_item'}
        json_value = {'item1': 'foo', 'item2': '@newpath', 'item3': 'bar'}
        result = inst._resolve_preliminary_paths(json_value, path_map)
        assert result == {'item1': 'foo',
                          'item2': '/adhocracy/new_item',
                          'item3': 'bar'}

    def test_resolve_preliminary_paths_dict_without_replacement(self, context, request):
        inst = self._make_one(context, request)
        path_map = {'@newpath': '/adhocracy/new_item'}
        json_value = {'item1': 'foo', 'item2': 'nopath', 'item3': 'bar'}
        result = inst._resolve_preliminary_paths(json_value, path_map)
        assert result == json_value

    def test_resolve_preliminary_paths_list_with_replacement(self, context, request):
        inst = self._make_one(context, request)
        path_map = {'@newpath': '/adhocracy/new_item'}
        json_value = ['@newpath', 'foo', 'bar']
        result = inst._resolve_preliminary_paths(json_value, path_map)
        assert result == ['/adhocracy/new_item', 'foo', 'bar']

    def test_resolve_preliminary_paths_list_without_replacement(self, context, request):
        inst = self._make_one(context, request)
        path_map = {'@newpath': '/adhocracy/new_item'}
        json_value = ['nopath', 'foo', 'bar']
        result = inst._resolve_preliminary_paths(json_value, path_map)
        assert result == json_value

    def test_resolve_preliminary_paths_other_type(self, context, request):
        inst = self._make_one(context, request)
        path_map = {'@newpath': '/adhocracy/new_item'}
        json_value = 123.456
        result = inst._resolve_preliminary_paths(json_value, path_map)
        assert result == json_value

    def test_try_to_decode_json_empty(self, context, request):
        inst = self._make_one(context, request)
        result = inst._try_to_decode_json(b'')
        assert result == {}

    def test_try_to_decode_json_valid(self, context, request):
        inst = self._make_one(context, request)
        payload = b'{"item2": 2, "item3": null, "item1": "value1"}'
        result = inst._try_to_decode_json(payload)
        assert result == {'item1': 'value1', 'item2': 2, 'item3': None}

    def test_try_to_decode_json_invalid(self, context, request):
        inst = self._make_one(context, request)
        payload = b'{this is not a JSON object}'
        result = inst._try_to_decode_json(payload)
        assert result == {'error': '{this is not a JSON object}'}

    def test_options_empty(self, context, request):
        inst = self._make_one(context, request)
        assert inst.options() == {}
