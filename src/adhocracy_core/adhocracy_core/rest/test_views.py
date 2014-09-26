"""Test rest.views module."""
from unittest.mock import Mock

from pyramid import testing
from pytest import fixture
from pytest import mark
import colander
import pytest

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IResource


class IResourceX(IResource):
    pass


class ISheetB(ISheet):
    pass


class CountSchema(colander.MappingSchema):

    count = colander.SchemaNode(colander.Int(),
                                default=0,
                                missing=colander.drop)


@fixture
def mock_authpolicy(registry):
    from pyramid.interfaces import IAuthenticationPolicy
    from adhocracy_core.authentication import TokenHeaderAuthenticationPolicy
    policy = Mock(spec=TokenHeaderAuthenticationPolicy)
    registry.registerUtility(policy, IAuthenticationPolicy)
    return policy


@fixture
def mock_password_sheet(registry):
    from adhocracy_core.interfaces import IResourceSheet
    from adhocracy_core.sheets.user import IPasswordAuthentication
    from adhocracy_core.sheets.user import PasswordAuthenticationSheet
    isheet = IPasswordAuthentication
    sheet = Mock(spec=PasswordAuthenticationSheet)
    registry.registerAdapter(lambda x: sheet, (isheet,),
                             IResourceSheet,
                             isheet.__identifier__)
    return sheet


class TestValidateRequest:

    @fixture
    def request(self, cornice_request):
        return cornice_request

    def _make_one(self, context, request, **kw):
        from adhocracy_core.rest.views import validate_request_data
        validate_request_data(context, request, **kw)

    def test_valid_wrong_method_with_data(self, context, request):
        request.body = '{"wilddata": "1"}'
        request.method = 'wrong_method'
        self._make_one(context, request)
        assert request.validated == {}

    def test_valid_no_schema_with_data(self, context, request):
        request.body = '{"wilddata": "1"}'
        self._make_one(context, request)
        assert request.validated == {}

    def test_valid_with_schema_no_data(self, context, request):
        request.body = ''
        self._make_one(context, request, schema=CountSchema())
        assert request.validated == {}

    def test_valid_with_schema_no_data_empty_dict(self, context, request):
        request.body = '{}'
        self._make_one(context, request, schema=CountSchema())
        assert request.validated == {}

    def test_valid_with_schema_no_data_and_defaults(self, context, request):
        class DefaultDataSchema(colander.MappingSchema):
            count = colander.SchemaNode(colander.Int(),
                                        missing=1)
        request.body = ''
        self._make_one(context, request, schema=DefaultDataSchema())
        assert request.validated == {'count': 1}

    def test_valid_with_schema_with_data(self, context, request):
        request.body = '{"count": "1"}'
        request.method = 'PUT'
        self._make_one(context, request, schema=CountSchema())
        assert request.validated == {'count': 1}

    def test_valid_with_schema_with_data_in_querystring(self, context,
                                                        request):
        class QueryStringSchema(colander.MappingSchema):
            count = colander.SchemaNode(colander.Int())
        request.GET = {'count': 1}
        self._make_one(context, request, schema=QueryStringSchema())
        assert request.validated == {'count': 1}

    def test_valid_with_schema_with_extra_fields_in_querystring_discarded(
            self, context, request):
        class QueryStringSchema(colander.MappingSchema):
            count = colander.SchemaNode(colander.Int())
        request.GET = {'count': 1, 'extraflag': 'extra value'}
        self._make_one(context, request, schema=QueryStringSchema())
        assert request.validated == {'count': 1}

    def test_valid_with_schema_with_extra_fields_in_querystring_preserved(
            self, context, request):

        class PreservingQueryStringSchema(colander.MappingSchema):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.typ.unknown = 'preserve'
            count = colander.SchemaNode(colander.Int())

        request.GET = {'count': 1, 'extraflag': 'extra value'}
        self._make_one(context, request, schema=PreservingQueryStringSchema())
        assert request.validated == {'count': 1, 'extraflag': 'extra value'}

    def test_non_valid_with_schema_wrong_data(self, context, request):
        from cornice.util import _JSONError
        request.body = '{"count": "wrong_value"}'
        request.method = 'POST'
        with pytest.raises(_JSONError):
            self._make_one(context, request, schema=CountSchema())
        assert request.errors == [{'location': 'body',
                                   'name': 'count',
                                   'description': '"wrong_value" is not a number'}]

    def test_non_valid_with_schema_wrong_data_cleanup(self, context, request):
        from cornice.util import _JSONError
        request.validated = {'secret_data': 'buh'}
        request.body = '{"count": "wrong_value"}'
        request.method = 'POST'
        with pytest.raises(_JSONError):
            self._make_one(context, request, schema=CountSchema())
        assert request.validated == {}

    def test_valid_with_extra_validator(self, context, request):
        def validator1(context, request):
            request.validated = {"validator": "1"}
        self._make_one(context, request, extra_validators=[validator1])
        assert request.validated == {"validator": "1"}

    def test_valid_with_extra_validator_and_wrong_schema_data(self, context, request):
        from cornice.util import _JSONError
        def validator1(context, request):
            request._validator_called = True
        request.body = '{"count": "wrong"}'
        request.method = 'POST'
        with pytest.raises(_JSONError):
            self._make_one(context, request, schema=CountSchema(),
                           extra_validators=[validator1])
        assert hasattr(request, '_validator_called') is False

    def test_valid_with_sequence_schema(self, context, request):
        class TestListSchema(colander.SequenceSchema):
            elements = colander.SchemaNode(colander.String())

        request.body = '["alpha", "beta", "gamma"]'
        request.method = 'POST'
        self._make_one(context, request, schema=TestListSchema())
        assert request.validated == ['alpha', 'beta', 'gamma']

    def test_valid_with_sequence_schema_in_querystring(self, context, request):
        class TestListSchema(colander.SequenceSchema):
            elements = colander.SchemaNode(colander.String())
        self._make_one(context, request, schema=TestListSchema())
        # since this doesn't make much sense, the validator is just a no-op
        assert request.validated == {}

    def test_valid_with_schema_with_data_in_querystring(self, context,
                                                        request):
        class QueryStringSchema(colander.MappingSchema):
            count = colander.SchemaNode(colander.Int())
        request.GET = {'count': 1}
        self._make_one(context, request, schema=QueryStringSchema())
        assert request.validated == {'count': 1}



    def test_with_invalid_sequence_schema(self, context, request):
        class TestListSchema(colander.SequenceSchema):
            elements = colander.SchemaNode(colander.String())
            nonsense_node = colander.SchemaNode(colander.String())

        request.body = '["alpha", "beta", "gamma"]'
        request.method = 'POST'
        with pytest.raises(colander.Invalid):
            self._make_one(context, request, schema=TestListSchema())
        assert request.validated == {}

    def test_invalid_with_sequence_schema(self, context, request):
        class TestListSchema(colander.SequenceSchema):
            elements = colander.SchemaNode(colander.Integer())

        from cornice.util import _JSONError
        request.body = '[1, 2, "three"]'
        request.method = 'POST'
        with pytest.raises(_JSONError):
            self._make_one(context, request, schema=TestListSchema())
        assert request.validated == {}

    def test_invalid_with_not_sequence_and_not_mapping_schema(self, context,
                                                              request):
        schema = colander.SchemaNode(colander.Int())
        with pytest.raises(Exception):
            self._make_one(context, request, schema=schema)


class TestValidatePOSTRootVersions:

    @fixture
    def request(self, cornice_request):
        return cornice_request

    def make_one(self, context, request):
        from adhocracy_core.rest.views import validate_post_root_versions
        validate_post_root_versions(context, request)

    def test_valid_no_value(self, request, context):
        self.make_one(context, request)
        assert request.errors == []

    def test_valid_empty_value(self, request, context):
        self.make_one(context, request)
        request.validated = {'root_versions': []}
        assert request.errors == []

    def test_valid_with_value(self, request, context):
        from adhocracy_core.interfaces import IItemVersion
        from adhocracy_core.interfaces import ISheet
        root = testing.DummyResource(__provides__=(IItemVersion, ISheet))
        request.validated = {'root_versions': [root]}

        self.make_one(context, request)

        assert request.errors == []
        assert request.validated == {'root_versions': [root]}

    def test_non_valid_value_has_wrong_iface(self, request, context):
        from adhocracy_core.interfaces import ISheet
        root = testing.DummyResource(__provides__=(IResourceX, ISheet))
        request.validated = {'root_versions': [root]}

        self.make_one(context, request)

        assert request.errors != []
        assert request.validated == {'root_versions': []}


class TestRESTView:

    @fixture
    def request(self, cornice_request):
        return cornice_request

    def make_one(self, context, request):
        from adhocracy_core.rest.views import RESTView
        return RESTView(context, request)

    def test_create_valid(self, request, context):
        inst = self.make_one(context, request)
        assert inst.validation_GET == (None, [])
        assert inst.validation_HEAD == (None, [])
        assert inst.validation_OPTIONS == (None, [])
        assert inst.validation_PUT == (None, [])
        assert inst.validation_POST == (None, [])
        assert inst.context is context
        assert inst.request is request
        assert inst.request.errors == []
        assert inst.request.validated == {}


class TestResourceRESTView:


    @fixture
    def request(self, cornice_request, mock_resource_registry):
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    def make_one(self, context, request):
        from adhocracy_core.rest.views import ResourceRESTView
        return ResourceRESTView(context, request)

    def test_create_valid(self, request, context):
        from adhocracy_core.rest.views import RESTView
        inst = self.make_one(context, request)
        assert isinstance(inst, RESTView)
        assert inst.registry is request.registry.content

    def test_options_valid_no_sheets_and_addables(self, request, context):
        from adhocracy_core.rest.schemas import OPTIONResourceResponseSchema
        inst = self.make_one(context, request)
        response = inst.options()
        wanted = OPTIONResourceResponseSchema().serialize()
        wanted['POST']['response_body']['content_type'] = ''
        wanted['PUT']['response_body']['content_type'] = ''
        wanted['POST']['response_body']['content_type'] = ''
        assert wanted == response

    def test_options_valid_with_sheets_and_addables(self, request, context):
        registry = request.registry.content
        registry.resource_sheets.return_value = {'ipropertyx': object()}
        registry.resource_addables.return_value = \
            {'iresourcex': {'sheets_mandatory': [],
                            'sheets_optional': ['ipropertyx']}}

        inst = self.make_one(context, request)
        response = inst.options()

        wanted = \
        {'GET': {'request_body': {},
         'request_querystring': {},
         'response_body': {'content_type': '',
                           'data': {'ipropertyx': {}},
                           'path': ''}},
         'HEAD': {},
         'OPTION': {},
         'POST': {'request_body': [{'content_type': 'iresourcex',
                                    'data': {'ipropertyx': {}}}],
                  'response_body': {'content_type': '', 'path': ''}},
         'PUT': {'request_body': {'content_type': '', 'data': {'ipropertyx': {}}},
                 'response_body': {'content_type': '', 'path': ''}}}
        assert wanted == response

    def test_get_valid_no_sheets(self, request, context):
        from adhocracy_core.rest.schemas import GETResourceResponseSchema

        inst = self.make_one(context, request)
        response = inst.get()

        wanted = GETResourceResponseSchema().serialize()
        wanted['path'] = request.application_url + '/'
        wanted['data'] = {}
        wanted['content_type'] = IResource.__identifier__
        assert wanted == response

    def test_get_valid_with_sheets(self, request, context, mock_sheet):
        mock_sheet.meta = mock_sheet.meta._replace(isheet=ISheetB)
        mock_sheet.get.return_value = {'dummy': 'data'}
        schema = colander.SchemaNode(colander.Mapping(unknown='preserve'))
        mock_sheet.schema.bind.return_value = schema
        request.registry.content.resource_sheets.return_value = {ISheetB.__identifier__: mock_sheet}

        inst = self.make_one(context, request)
        response = inst.get()

        wanted = {ISheetB.__identifier__: {'dummy': 'data'}}
        assert wanted == response['data']


class TestSimpleRESTView:

    @fixture
    def request(self, cornice_request, mock_resource_registry):
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    def make_one(self, context, request):
        from adhocracy_core.rest.views import SimpleRESTView
        return SimpleRESTView(context, request)

    def test_create_valid(self, context, request):
        from adhocracy_core.rest.views import ResourceRESTView
        from adhocracy_core.rest.schemas import PUTResourceRequestSchema
        inst = self.make_one(context, request)
        assert issubclass(inst.__class__, ResourceRESTView)
        assert inst.validation_PUT == (PUTResourceRequestSchema, [])
        assert 'options' in dir(inst)
        assert 'get' in dir(inst)
        assert 'put' in dir(inst)

    def test_put_valid_no_sheets(self, request, context):
        request.validated = {"content_type": "X", "data": {}}

        inst = self.make_one(context, request)
        response = inst.put()

        wanted = {'path': request.application_url + '/', 'content_type': IResource.__identifier__}
        assert wanted == response

    def test_put_valid_with_sheets(self, request, context, mock_sheet):
        request.registry.content.resource_sheets.return_value = {ISheetB.__identifier__: mock_sheet}
        data = {'content_type': 'X',
                'data': {ISheetB.__identifier__: {'x': 'y'}}}
        request.validated = data

        inst = self.make_one(context, request)
        response = inst.put()

        wanted = {'path': request.application_url + '/', 'content_type': IResource.__identifier__}
        assert wanted == response
        assert mock_sheet.set.call_args[0][0] == {'x': 'y'}


class TestPoolRESTView:

    @fixture
    def request(self, cornice_request, mock_resource_registry):
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    def make_one(self, context, request):
        from adhocracy_core.rest.views import PoolRESTView
        return PoolRESTView(context, request)

    def test_create(self, request, context):
        from adhocracy_core.rest.views import SimpleRESTView
        from adhocracy_core.rest.schemas import POSTResourceRequestSchema
        inst = self.make_one(context, request)
        assert issubclass(inst.__class__, SimpleRESTView)
        assert inst.validation_POST == (POSTResourceRequestSchema, [])
        assert 'options' in dir(inst)
        assert 'get' in dir(inst)
        assert 'put' in dir(inst)

    def test_get_valid_no_sheets(self, request, context):
        from adhocracy_core.rest.schemas import GETResourceResponseSchema

        inst = self.make_one(context, request)
        response = inst.get()

        wanted = GETResourceResponseSchema().serialize()
        wanted['path'] = request.application_url + '/'
        wanted['data'] = {}
        wanted['content_type'] = IResource.__identifier__
        assert wanted == response

    def test_get_valid_pool_sheet_with_query_params(self, request, context, mock_sheet):
        from adhocracy_core.sheets.pool import IPool
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPool)
        mock_sheet.get.return_value = {}
        mock_sheet.schema = colander.MappingSchema()
        request.registry.content.resource_sheets.return_value = {IPool.__identifier__: mock_sheet}
        request.validated['param1'] = 1

        inst = self.make_one(context, request)
        response = inst.get()

        assert response['data'] == {IPool.__identifier__: {}}
        assert mock_sheet.get.call_args[1] == {'params': {'param1': 1}}

    def test_get_valid_pool_sheet_with_elements_content_param(self, request, context, mock_sheet):
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.sheets.pool import PoolSchema
        child = testing.DummyResource(__provides__=IResource)
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPool)
        mock_sheet.get.return_value = {'elements': [child]}
        mock_sheet.schema = PoolSchema()
        request.registry.content.resource_sheets.return_value = {IPool.__identifier__: mock_sheet}
        request.validated['elements'] = 'content'

        inst = self.make_one(context, request)
        response = inst.get()

        response_elements_child = response['data'][IPool.__identifier__]['elements'][0]
        assert 'path' in response_elements_child
        assert 'content_type' in response_elements_child
        assert 'data' in response_elements_child

    def test_post_valid(self, request, context):
        request.root = context
        child = testing.DummyResource(__provides__=IResourceX)
        child.__parent__ = context
        child.__name__ = 'child'
        request.registry.content.create.return_value = child
        request.validated = {'content_type': IResourceX.__identifier__,
                                  'data': {}}
        inst = self.make_one(context, request)
        response = inst.post()

        wanted = {'path': request.application_url + '/child/', 'content_type': IResourceX.__identifier__}
        assert wanted == response


class TestItemRESTView:

    @fixture
    def request(self, cornice_request, mock_resource_registry):
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    def make_one(self, context, request):
        from adhocracy_core.rest.views import ItemRESTView
        return ItemRESTView(context, request)

    def test_create(self, request, context):
        from adhocracy_core.rest.views import validate_post_root_versions
        from adhocracy_core.rest.views import SimpleRESTView
        from adhocracy_core.rest.schemas import POSTItemRequestSchema
        inst = self.make_one(context, request)
        assert issubclass(inst.__class__, SimpleRESTView)
        assert inst.validation_POST == (POSTItemRequestSchema,
                                        [validate_post_root_versions])
        assert 'options' in dir(inst)
        assert 'get' in dir(inst)
        assert 'put' in dir(inst)

    def test_get_item_with_first_version(self, request, context):
        from zope.interface import directlyProvides
        from adhocracy_core.interfaces import IItem
        from adhocracy_core.interfaces import IItemVersion
        directlyProvides(context, IItem)
        context['first'] = testing.DummyResource(__provides__=IItemVersion)

        inst = self.make_one(context, request)

        wanted = {'path': request.application_url + '/',  'data': {},
                  'content_type': IItem.__identifier__,
                  'first_version_path': request.application_url + '/first/'}
        assert inst.get() == wanted

    def test_get_item_without_first_version(self, request, context):
        from adhocracy_core.interfaces import IItem
        context = testing.DummyResource(__provides__=IItem)
        context['non_first'] = testing.DummyResource()

        inst = self.make_one(context, request)

        wanted = {'path': request.application_url + '/',  'data': {},
                  'content_type': IItem.__identifier__,
                  'first_version_path': ''}
        assert inst.get() == wanted

    def test_post_valid(self, request, context):
        request.root = context
        # Little cheat to prevent the POST validator from kicking in --
        # we're working with already-validated data here
        request.method = 'OPTIONS'
        child = testing.DummyResource(__provides__=IResourceX,
                                      __parent__=context,
                                      __name__='child')
        request.registry.content.create.return_value = child
        request.validated = {'content_type': IResourceX.__identifier__,
                                  'data': {}}
        inst = self.make_one(context, request)
        response = inst.post()

        wanted = {'path': request.application_url + '/child/', 'content_type': IResourceX.__identifier__}
        request.registry.content.create.assert_called_with(IResourceX.__identifier__, context,
                                       creator=None,
                                       appstructs={},
                                       root_versions=[])
        assert wanted == response

    def test_post_valid_item(self, request, context):
        from adhocracy_core.interfaces import IItem
        from adhocracy_core.interfaces import IItemVersion
        request.root = context
        child = testing.DummyResource(__provides__=IItem,
                                      __parent__=context,
                                      __name__='child')
        first = testing.DummyResource(__provides__=IItemVersion)
        child['first'] = first
        request.registry.content.create.return_value = child
        request.validated = {'content_type': IItemVersion.__identifier__,
                                  'data': {}}
        inst = self.make_one(context, request)
        response = inst.post()

        wanted = {'path': request.application_url + '/child/',
                  'content_type': IItem.__identifier__,
                  'first_version_path': request.application_url + '/child/first/'}
        assert wanted == response

    def test_post_valid_itemversion(self, request, context):
        from adhocracy_core.interfaces import IItemVersion
        request.root = context
        child = testing.DummyResource(__provides__=IItemVersion,
                                      __parent__=context,
                                      __name__='child')
        root = testing.DummyResource(__provides__=IItemVersion)
        request.registry.content.create.return_value = child
        request.validated = {'content_type':
                                      IItemVersion.__identifier__,
                                  'data': {},
                                  'root_versions': [root]}
        inst = self.make_one(context, request)
        response = inst.post()

        wanted = {'path': request.application_url + '/child/',
                  'content_type': IItemVersion.__identifier__}
        assert request.registry.content.create.call_args[1]['root_versions'] == [root]
        assert wanted == response


class TestMetaApiView:

    @fixture
    def request(self, cornice_request,  mock_resource_registry):
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    @fixture
    def resource_meta(self):
        from adhocracy_core.interfaces import resource_metadata
        return resource_metadata._replace(iresource=IResource)

    @fixture
    def sheet_meta(self):
        from adhocracy_core.interfaces import sheet_metadata
        return sheet_metadata._replace(isheet=ISheet,
                                       schema_class=colander.MappingSchema)

    def make_one(self, request, context):
        from adhocracy_core.rest.views import MetaApiView
        return MetaApiView(context, request)

    def test_get_empty(self, request, context):
        inst = self.make_one(request, context)
        response = inst.get()
        assert sorted(response.keys()) == ['resources', 'sheets']
        assert response['resources'] == {}
        assert response['sheets'] == {}

    def test_get_resources(self, request, context, resource_meta):
        metas = {IResource.__identifier__: resource_meta}
        request.registry.content.resources_meta = metas
        inst = self.make_one(request, context)
        resp = inst.get()
        assert IResource.__identifier__ in resp['resources']
        assert resp['resources'][IResource.__identifier__] == {'sheets': []}

    def test_get_resources_with_sheets_meta(self, request, context, resource_meta):
        metas = {IResource.__identifier__: resource_meta._replace(
            basic_sheets=[ISheet],
            extended_sheets=[ISheetB])}
        request.registry.content.resources_meta = metas
        inst = self.make_one(request, context)

        resp = inst.get()['resources']

        wanted_sheets = [ISheet.__identifier__, ISheetB.__identifier__]
        assert wanted_sheets == resp[IResource.__identifier__]['sheets']

    def test_get_resources_with_element_types_metadata(self, request, context, resource_meta):
        metas = {IResource.__identifier__: resource_meta._replace(
            element_types=[IResource, IResourceX])}
        request.registry.content.resources_meta = metas
        inst = self.make_one(request, context)

        resp = inst.get()['resources']

        wanted = [IResource.__identifier__, IResourceX.__identifier__]
        assert wanted == resp[IResource.__identifier__]['element_types']

    def test_get_resources_with_item_type_metadata(self, request, context, resource_meta):
        metas = {IResource.__identifier__: resource_meta._replace(
            item_type=IResourceX)}
        request.registry.content.resources_meta = metas
        inst = self.make_one(request, context)

        resp = inst.get()['resources']

        wanted = IResourceX.__identifier__
        assert wanted == resp[IResource.__identifier__]['item_type']

    def test_get_sheets(self, request, context, sheet_meta):
        metas = {ISheet.__identifier__: sheet_meta}
        request.registry.content.sheets_meta = metas
        inst = self.make_one(request, context)
        response = inst.get()
        assert ISheet.__identifier__ in response['sheets']
        assert 'fields' in response['sheets'][ISheet.__identifier__]
        assert response['sheets'][ISheet.__identifier__]['fields'] == []

    def test_get_sheets_with_field(self, request, context, sheet_meta):
        class SchemaF(colander.MappingSchema):
            test = colander.SchemaNode(colander.Int())
        metas = {ISheet.__identifier__: sheet_meta._replace(schema_class=SchemaF)}
        request.registry.content.sheets_meta = metas
        inst = self.make_one(request, context)

        response = inst.get()['sheets'][ISheet.__identifier__]

        assert len(response['fields']) == 1
        field_metadata = response['fields'][0]
        assert field_metadata['create_mandatory'] is False
        assert field_metadata['readable'] is True
        assert field_metadata['editable'] is True
        assert field_metadata['creatable'] is True
        assert field_metadata['name'] == 'test'
        assert 'valuetype' in field_metadata

    def test_get_sheet_with_readonly_field(self, request, context, sheet_meta):
        class SchemaF(colander.MappingSchema):
            test = colander.SchemaNode(colander.Int(), readonly=True)
        metas = {ISheet.__identifier__: sheet_meta._replace(schema_class=SchemaF)}
        request.registry.content.sheets_meta = metas
        inst = self.make_one(request, context)

        response = inst.get()['sheets'][ISheet.__identifier__]

        field_metadata = response['fields'][0]
        assert field_metadata['editable'] is False
        assert field_metadata['creatable'] is False
        assert field_metadata['create_mandatory'] is False

    def test_get_sheets_with_field_colander_noniteratable(self, request, context, sheet_meta):
        class SchemaF(colander.MappingSchema):
            test = colander.SchemaNode(colander.Int())
        metas = {ISheet.__identifier__: sheet_meta._replace(schema_class=SchemaF)}
        request.registry.content.sheets_meta = metas
        inst = self.make_one(request, context)

        response = inst.get()['sheets'][ISheet.__identifier__]

        field_metadata = response['fields'][0]
        assert 'containertype' not in field_metadata
        assert field_metadata['valuetype'] == 'Integer'

    def test_get_sheets_with_field_adhocracy_noniteratable(self, request, context, sheet_meta):
        from adhocracy_core.schema import Name
        class SchemaF(colander.MappingSchema):
            test = colander.SchemaNode(Name())
        metas = {ISheet.__identifier__: sheet_meta._replace(schema_class=SchemaF)}
        request.registry.content.sheets_meta = metas
        inst = self.make_one(request, context)

        response = inst.get()['sheets'][ISheet.__identifier__]

        field_metadata = response['fields'][0]
        assert 'containertype' not in field_metadata
        assert field_metadata['valuetype'] == 'adhocracy_core.schema.Name'

    def test_get_sheets_with_field_adhocracy_referencelist(self, request, context, sheet_meta):
        from adhocracy_core.interfaces import SheetToSheet
        from adhocracy_core.schema import UniqueReferences
        class SchemaF(colander.MappingSchema):
            test = UniqueReferences(reftype=SheetToSheet)
        metas = {ISheet.__identifier__: sheet_meta._replace(schema_class=SchemaF)}
        request.registry.content.sheets_meta = metas
        inst = self.make_one(request, context)

        sheet_metadata = inst.get()['sheets'][ISheet.__identifier__]

        field_metadata = sheet_metadata['fields'][0]
        assert field_metadata['containertype'] == 'list'
        assert field_metadata['valuetype'] == 'adhocracy_core.schema.AbsolutePath'
        assert field_metadata['targetsheet'] == ISheet.__identifier__

    def test_get_sheets_with_field_adhocracy_back_referencelist(self, request, context, sheet_meta):
        from adhocracy_core.interfaces import SheetToSheet
        from adhocracy_core.schema import UniqueReferences
        class BSheetToSheet(SheetToSheet):
            pass
        BSheetToSheet.setTaggedValue('source_isheet', ISheetB)
        class SchemaF(colander.MappingSchema):
            test = UniqueReferences(reftype=BSheetToSheet, backref=True)
        metas = {ISheet.__identifier__: sheet_meta._replace(schema_class=SchemaF)}
        request.registry.content.sheets_meta = metas
        inst = self.make_one(request, context)

        sheet_metadata = inst.get()['sheets'][ISheet.__identifier__]

        field_metadata = sheet_metadata['fields'][0]
        assert field_metadata['targetsheet'] == ISheetB.__identifier__

    # FIXME test for single reference


class TestValidateLoginEmail:

    @fixture
    def request(self, cornice_request, registry):
        cornice_request.registry = registry
        cornice_request.validated['email'] = 'user@example.org'
        return cornice_request

    def _call_fut(self, context, request):
        from adhocracy_core.rest.views import validate_login_email
        return validate_login_email(context, request)

    def test_valid(self, request, context, mock_user_locator):
        user = testing.DummyResource()
        mock_user_locator.get_user_by_email.return_value = user
        self._call_fut(context, request)
        assert request.validated['user'] == user

    def test_invalid(self, request, context, mock_user_locator):
        mock_user_locator.get_user_by_email.return_value = None
        self._call_fut(context, request)
        assert 'user' not in request.validated
        assert 'User doesn\'t exist' in request.errors[0]['description']


class TestValidateLoginNameUnitTest:

    @fixture
    def request(self, cornice_request, registry):
        cornice_request.registry = registry
        cornice_request.validated['name'] = 'user'
        return cornice_request

    def _call_fut(self, context, request):
        from adhocracy_core.rest.views import validate_login_name
        return validate_login_name(context, request)

    def test_invalid(self, request, context, mock_user_locator):
        mock_user_locator.get_user_by_login.return_value = None
        self._call_fut(context, request)
        assert 'User doesn\'t exist' in request.errors[0]['description']

    def test_valid(self, request, context, mock_user_locator):
        user = testing.DummyResource()
        mock_user_locator.get_user_by_login.return_value = user
        self._call_fut(context, request)
        assert request.validated['user'] == user


class TestValidateLoginPasswordUnitTest:

    @fixture
    def request(self, cornice_request, registry):
        from adhocracy_core.sheets.user import IPasswordAuthentication
        cornice_request.registry = registry
        user = testing.DummyResource(__provides__=IPasswordAuthentication)
        cornice_request.validated['user'] = user
        cornice_request.validated['password'] = 'lalala'
        return cornice_request

    def _call_fut(self, context, request):
        from adhocracy_core.rest.views import validate_login_password
        return validate_login_password(context, request)

    def test_valid(self, request, context, mock_password_sheet):
        sheet = mock_password_sheet
        sheet.check_plaintext_password.return_value = True
        self._call_fut(context, request)
        assert request.errors == []

    def test_invalid(self, request, context, mock_password_sheet):
        sheet = mock_password_sheet
        sheet.check_plaintext_password.return_value = False
        self._call_fut(context, request)
        assert 'password is wrong' in request.errors[0]['description']

    def test_invalid_with_ValueError(self, request, context, mock_password_sheet):
        sheet = mock_password_sheet
        sheet.check_plaintext_password.side_effect = ValueError
        self._call_fut(context, request)
        assert 'password is wrong' in request.errors[0]['description']

    def test_user_is_None(self, request, context):
        request.validated['user'] = None
        self._call_fut(context, request)
        assert request.errors == []


class TestLoginUserName:

    @fixture
    def request(self, cornice_request, registry):
        cornice_request.registry = registry
        cornice_request.validated['user'] = testing.DummyResource()
        cornice_request.validated['password'] = 'lalala'
        return cornice_request

    def _make_one(self, request, context):
        from adhocracy_core.rest.views import LoginUsernameView
        return LoginUsernameView(request, context)

    def test_post_without_token_authentication_policy(self, request, context):
        inst = self._make_one(context, request)
        with pytest.raises(KeyError):
            inst.post()

    def test_post_with_token_authentication_policy(self, request, context, mock_authpolicy):
        mock_authpolicy.remember.return_value = {'X-User-Path': '/user',
                                                 'X-User-Token': 'token'}
        inst = self._make_one(context, request)
        assert inst.post() == {'status': 'success',
                               'user_path': '/user',
                               'user_token': 'token'}

    def test_options(self, request, context):
        inst = self._make_one(context, request)
        assert inst.options() == {}


class TestLoginEmailView:

    @fixture
    def request(self, cornice_request, registry):
        cornice_request.registry=registry
        cornice_request.validated['user'] = testing.DummyResource()
        return cornice_request

    def _make_one(self, context, request):
        from adhocracy_core.rest.views import LoginEmailView
        return LoginEmailView(context, request)

    def test_post_without_token_authentication_policy(self, request, context):
        inst = self._make_one(context, request)
        with pytest.raises(KeyError):
            inst.post()

    def test_post_with_token_authentication_policy(self, request, context, mock_authpolicy):
        mock_authpolicy.remember.return_value = {'X-User-Path': '/user',
                                                 'X-User-Token': 'token'}
        inst = self._make_one(context, request)
        assert inst.post() == {'status': 'success',
                               'user_path': '/user',
                               'user_token': 'token'}

    def test_options(self, request, context):
        inst = self._make_one(context, request)
        assert inst.options() == {}


def test_add_cors_headers_subscriber(context):
    from adhocracy_core.rest.views import add_cors_headers_subscriber
    headers = {}
    response = testing.DummyResource(headers=headers)
    event = testing.DummyResource(response=response)

    add_cors_headers_subscriber(event)

    assert headers == \
        {'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Headers':
         'Origin, Content-Type, Accept, X-User-Path, X-User-Token',
         'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS'}


@fixture()
def integration(config):
    config.include('cornice')
    config.include('adhocracy_core.rest.views')


@mark.usefixtures('integration')
class TestIntegrationIncludeme:

    def test_includeme(self):
        """Check that includeme runs without errors."""
        assert True

    def test_register_subscriber(self, registry):
        from adhocracy_core.rest.views import add_cors_headers_subscriber
        handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
        assert add_cors_headers_subscriber.__name__ in handlers
