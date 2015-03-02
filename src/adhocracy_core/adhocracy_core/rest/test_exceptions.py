from pyramid import testing
from pytest import fixture
import colander


@fixture
def request_():
    return testing.DummyRequest()


class TestHandleError400ColanderInvalid:

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_400_colander_invalid
        return handle_error_400_colander_invalid(error, request)

    def test_render_exception_error(self, request_):
        from cornice.util import _JSONError
        import json
        invalid0 = colander.SchemaNode(typ=colander.String(), name='parent0',
                                       msg='msg_parent')
        invalid1 = colander.SchemaNode(typ=colander.String(), name='child1')
        invalid2 = colander.SchemaNode(typ=colander.String(), name='child2')
        error0 = colander.Invalid(invalid0)
        error1 = colander.Invalid(invalid1)
        error2 = colander.Invalid(invalid2)
        error0.add(error1, 1)
        error1.add(error2, 0)

        inst = self.make_one(error0, request_)

        assert isinstance(inst, _JSONError)
        assert inst.status == '400 Bad Request'
        wanted = {'status': 'error',
                  'errors': [{'location': 'body',
                              'name': 'parent0.child1.child2',
                              'description': ''}]}
        assert json.loads(inst.body.decode()) == wanted


class TestHandleError400URLDecodeError:

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_400_url_decode_error
        return handle_error_400_url_decode_error(error, request)

    def test_render_exception_error(self, request_):
        from cornice.util import _JSONError
        from pyramid.exceptions import URLDecodeError
        import json
        try:
            b'\222'.decode()
            assert False
        except UnicodeDecodeError as err:
            error = URLDecodeError(err.encoding, err.object,
                                   err.start,err.end, err.reason)
            inst = self.make_one(error, request_)

            assert isinstance(inst, _JSONError)
            assert inst.status == '400 Bad Request'
            wanted = {'status': 'error',
                      'errors': [{'location': 'url',
                                  'name': '',
                                  'description': "'utf-8' codec can't decode byte 0x92 in position 0: invalid start byte"}]}
            assert json.loads(inst.body.decode()) == wanted


class TestHandleError500Exception:

    def make_one(self, error, request_):
        from adhocracy_core.rest.exceptions import handle_error_500_exception
        return handle_error_500_exception(error, request_)

    def test_render_exception_error(self, request_):
        from cornice.util import _JSONError
        import json
        error = Exception('arg1')

        inst = self.make_one(error, request_)

        assert isinstance(inst, _JSONError)
        assert inst.status == '500 Internal Server Error'
        message = json.loads(inst.body.decode())
        assert message['status'] == 'error'
        assert len(message['errors']) == 1
        assert message['errors'][0]['description'].startswith(
            'Exception: arg1; time: ')
        assert message['errors'][0]['location'] == 'internal'
        assert message['errors'][0]['name'] == ''


class TestHandleAutoUpdateNoForkAllowed400Exception:

    def make_one(self, error, request_):
        from adhocracy_core.rest.exceptions import \
            handle_error_400_auto_update_no_fork_allowed
        return handle_error_400_auto_update_no_fork_allowed(error, request_)

    def test_render_exception_error(self, request_):
        from cornice.util import _JSONError
        from adhocracy_core.interfaces import ISheet
        resource = testing.DummyResource(__name__='resource')
        event = testing.DummyResource(object=resource,
                                      isheet=ISheet,
                                      isheet_field='elements',
                                      new_version=testing.DummyResource(__name__='referenced_new_version'),
                                      old_version=testing.DummyResource(__name__='referenced_old_version'))
        error = testing.DummyResource(resource=resource,
                                      event=event)
        inst = self.make_one(error, request_)
        assert isinstance(inst, _JSONError)
        assert inst.status == '400 Bad Request'
        wanted = \
            {'errors': [{'description': 'No fork allowed - The auto update tried to '
                                        'create a fork for: resource caused by isheet: '
                                        'adhocracy_core.interfaces.ISheet field: '
                                        'elements with old_reference: '
                                        'referenced_old_version and new reference: '
                                        'referenced_new_version. Try another root_version.',
                         'location': 'body',
                         'name': 'root_versions'}],
             'status': 'error'}
        assert inst.json == wanted


class TestHandleError410:

    @fixture
    def error(self):
        from pyramid.httpexceptions import HTTPGone
        return HTTPGone()

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_410_exception
        return handle_error_410_exception(error, request)

    def test_no_detail_no_imetadata(self, error, request_):
        inst = self.make_one(error, request_)
        assert inst.content_type == 'application/json'
        assert inst.json_body['modification_date'] == ''
        assert inst.json_body['modified_by'] == ''
        assert inst.json_body['reason'] == ''

    def test_with_detail_no_imetadata(self, error, request_):
        error.detail = 'hidden'
        inst = self.make_one(error, request_)
        assert inst.json_body['reason'] == 'hidden'

    def test_with_detail_and_imetadata(self, error, request_, mock_sheet,
                                       registry_with_content):
        from datetime import datetime
        from adhocracy_core.testing import register_sheet
        from adhocracy_core.sheets.metadata import IMetadata
        resource = testing.DummyResource(__provides__=[IMetadata])
        user = testing.DummyResource(__name__='/user')
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IMetadata)
        mock_sheet.get.return_value = {'modification_date': datetime.today(),
                                       'modified_by': user}
        register_sheet(resource, mock_sheet, registry_with_content)
        error.detail = 'hidden'
        request_.context = resource
        inst = self.make_one(error, request_)
        assert inst.json_body['modification_date'].endswith('00:00')
        assert inst.json_body['modified_by'].endswith('user/')
