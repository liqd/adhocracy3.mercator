from pyramid import testing
from pytest import fixture
import colander


@fixture
def request():
    return testing.DummyRequest()


class TestHandleError400ColanderInvalid:

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_400_colander_invalid
        return handle_error_400_colander_invalid(error, request)

    def test_render_exception_error(self, request):
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

        inst = self.make_one(error0, request)

        assert isinstance(inst, _JSONError)
        assert inst.status == '400 Bad Request'
        wanted = {'status': 'error',
                  'errors': [{'location': 'body',
                              'name': 'parent0.child1.child2',
                              'description': ''}]}
        assert json.loads(inst.body.decode()) == wanted


class TestHandleError500Exception:

    def make_one(self, error, request):
        from adhocracy_core.rest.exceptions import handle_error_500_exception
        return handle_error_500_exception(error, request)

    def test_render_exception_error(self, request):
        from cornice.util import _JSONError
        import json
        error = Exception('arg1')

        inst = self.make_one(error, request)

        assert isinstance(inst, _JSONError)
        assert inst.status == '500 Internal Server Error'
        message = json.loads(inst.body.decode())
        assert message['status'] == 'error'
        assert len(message['errors']) == 1
        assert message['errors'][0]['description'].startswith(
            'Exception: arg1; time: ')
        assert message['errors'][0]['location'] == 'internal'
        assert message['errors'][0]['name'] == ''
