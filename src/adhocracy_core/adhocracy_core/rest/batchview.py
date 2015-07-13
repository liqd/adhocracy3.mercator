"""POST batch requests processing."""
from json import dumps
from json import loads
from logging import getLogger

from cornice.util import _JSONError
from pyramid.httpexceptions import HTTPException
from pyramid.request import Request
from pyramid.view import view_config
from pyramid.view import view_defaults

from adhocracy_core.resources.root import IRootPool
from adhocracy_core.rest.schemas import POSTBatchRequestSchema
from adhocracy_core.rest.schemas import UpdatedResourcesSchema
from adhocracy_core.rest.views import RESTView
from adhocracy_core.utils import set_batchmode


logger = getLogger(__name__)


class BatchItemResponse:

    """Wrap the response to a nested request in a batch request.

    Attributes:

    :code: the status code (int)
    :body: the response body as a JSOn object (dict)
    """

    def __init__(self, code: int, body: dict={}):
        self.code = code
        self.body = body

    def was_successful(self):
        return self.code == 200

    def to_dict(self):
        return {'code': self.code, 'body': self.body}


@view_defaults(
    renderer='simplejson',
    context=IRootPool,
    http_cache=0,
)
class BatchView(RESTView):

    """Process batch requests."""

    validation_POST = (POSTBatchRequestSchema, [])

    @view_config(name='batch',
                 request_method='POST',
                 content_type='application/json')
    def post(self) -> dict:
        """Create new resource and get response data."""
        response_list = []
        path_map = {}
        set_batchmode(self.request)
        for item in self.request.validated:
            item_response = self._process_nested_request(item, path_map)
            response_list.append(item_response)
            if not item_response.was_successful():
                err_msg = 'Exception in sub request {0} {1}: {2}'
                logger.error(err_msg.format(item['method'],
                                            item['path'],
                                            item_response.body))
                err = _JSONError([], status=item_response.code)
                err.text = dumps(self._response_list_to_json(response_list))
                raise err
        response = self._response_list_to_json(response_list)
        return response

    @view_config(name='batch',
                 request_method='OPTIONS')
    def options(self) -> dict:
        """Return options for batch view.

        This currently only exist in order to satisfy the preflight request,
        which browsers do in CORS situations before doing the actual POST.

        """
        return {}

    def _process_nested_request(self, nested_request: dict,
                                path_map: dict) -> BatchItemResponse:
        result_path = nested_request['result_path']
        result_first_version_path = nested_request['result_first_version_path']
        nested_request['path'] = self._resolve_preliminary_paths(
            nested_request['path'], path_map)
        nested_request['body'] = self._resolve_preliminary_paths(
            nested_request['body'], path_map)
        subrequest = self._make_subrequest(nested_request)
        item_response = self._invoke_subrequest_and_handle_errors(subrequest)
        self._extend_path_map(path_map, result_path, result_first_version_path,
                              item_response)
        return item_response

    def _response_list_to_json(self, response_list: list) -> list:
        """
        Convert the list of batch responses into a JSON dict.

        The dict has two fields:

        * responses: the list of batch responses, but without their
          "updated_resources" child element
        * updated_resources: the listing of resources affected by the
          transaction
        """
        responses = []
        for response in response_list:
            if 'updated_resources' in response.body:
                del response.body['updated_resources']
            responses.append(response.to_dict())
        updated_resources = self._build_updated_resources_dict()
        schema = UpdatedResourcesSchema().bind(request=self.request,
                                               context=self.context)
        return {'responses': responses,
                'updated_resources': schema.serialize(updated_resources)}

    def _resolve_preliminary_paths(self, json_value: object,
                                   path_map: dict) -> object:
        """Create a copy of `json_value` with preliminary paths resolved.

        This method accepts arbitrary JSON values and calls itself
        recursively, as needed. In trivial cases (no change necessary),
        the original `json_value` may be returned instead of a copy.
        """
        if not (path_map and json_value):
            return json_value
        if isinstance(json_value, str):
            result = path_map.get(json_value, json_value)
        elif isinstance(json_value, dict):
            result = {}
            for key, value in json_value.items():
                result[key] = self._resolve_preliminary_paths(value, path_map)
        elif isinstance(json_value, list):
            result = []
            for value in json_value:
                result.append(self._resolve_preliminary_paths(value, path_map))
        else:
            result = json_value
        return result

    def _make_subrequest(self, nested_request: dict) -> Request:
        path = nested_request['path']
        method = nested_request['method']
        json_body = nested_request['body']
        keywords_args = {'method': method,
                         'base_url': self.request.host_url}

        if json_body:
            keywords_args['body'] = dumps(json_body).encode()
        if method not in ['GET', 'OPTIONS', 'HEAD']:
            keywords_args['content_type'] = 'application/json'

        request = Request.blank(path, **keywords_args)
        set_batchmode(request)
        self.copy_attr_if_exists('root', request)
        self.copy_attr_if_exists('__cached_principals__', request)
        self.copy_header_if_exists('X-User-Path', request)
        self.copy_header_if_exists('X-User-Token', request)

        # properly setup subrequest in case script_name env is set,
        # see https://github.com/Pylons/pyramid/issues/1434
        request.script_name = self.request.script_name
        request.path_info = request.path_info[len(self.request.script_name):]

        return request

    def _invoke_subrequest_and_handle_errors(
            self, subrequest: Request) -> BatchItemResponse:
        try:
            subresponse = self.request.invoke_subrequest(subrequest)
            code = subresponse.status_code
            body = subresponse.json
        except HTTPException as err:
            code = err.status_code
            body = self._try_to_decode_json(err.body)
        return BatchItemResponse(code, body)

    def _extend_path_map(self, path_map: dict, result_path: str,
                         result_first_version_path: str,
                         item_response: BatchItemResponse):
        if not (result_path and item_response.was_successful()):
            return
        path = item_response.body.get('path', '')
        first_version_path = item_response.body.get('first_version_path', '')
        if path:
            path_map[result_path] = path
        if first_version_path:
            path_map[result_first_version_path] = first_version_path

    def copy_header_if_exists(self, header: str, request: Request):
        value = self.request.headers.get(header, None)
        if value is not None:
            request.headers[header] = value

    def copy_attr_if_exists(self, attributename: str, request: Request):
        value = getattr(self.request, attributename, None)
        if value is not None:
            setattr(request, attributename, value)

    def _try_to_decode_json(self, body: bytes) -> dict:
        """Try to decode `body` as a JSON object.

        If that fails, we just wrap the textual content of the body in an
        `{"error": ...}` dict. If body is empty, we just return an empty dict.
        """
        if not body:
            return {}
        text = body.decode(errors='replace')
        try:
            return loads(text)
        except ValueError:
            return {'error': text}


def includeme(config):  # pragma: no cover
    """Register batch view."""
    config.scan('.batchview')
