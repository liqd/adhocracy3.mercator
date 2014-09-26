import json

from pyramid import testing
from pytest import fixture
from pytest import raises
import colander

from adhocracy_core.interfaces import ISheet


class ISheetA(ISheet):
    pass


@fixture
def sheet_metas():
    from adhocracy_core.interfaces import sheet_metadata
    meta = sheet_metadata._replace(schema_class=colander.MappingSchema)
    metas = {ISheet.__identifier__: meta._replace(isheet=ISheet),
             ISheetA.__identifier__: meta._replace(isheet=ISheet)}
    return metas


class TestResourceResponseSchema:

    @fixture
    def request(self, context):
        request = testing.DummyRequest()
        request.root = context
        return request

    def make_one(self):
        from adhocracy_core.rest.schemas import ResourceResponseSchema
        return ResourceResponseSchema()

    def test_serialize_no_appstruct(self):
        inst = self.make_one()
        wanted = {'content_type': colander.null, 'path': ''}
        assert inst.serialize() == wanted

    def test_serialize_with_appstruct(self, request, context):
        from adhocracy_core.interfaces import IResource
        inst = self.make_one().bind(request=request, context=context)
        wanted = {'content_type': IResource.__identifier__, 'path': request.application_url + '/'}
        assert inst.serialize({'path': request.root}) == wanted


class TestItemResponseSchema:

    @fixture
    def request(self, context):
        request = testing.DummyRequest()
        request.root = context
        return request

    def make_one(self):
        from adhocracy_core.rest.schemas import ItemResponseSchema
        return ItemResponseSchema()

    def test_serialize_no_appstruct(self):
        inst = self.make_one()
        wanted = {'content_type': colander.null, 'path': '', 'first_version_path': ''}
        assert inst.serialize() == wanted

    def test_serialize_with_appstruct(self, request, context):
        inst = self.make_one().bind(request=request, context=context)
        wanted = {'content_type': 'x', 'path': request.application_url + '/',
                  'first_version_path': request.application_url + '/'}
        assert inst.serialize({'content_type': 'x', 'path': request.root,
                               'first_version_path': request.root}) == wanted


class TestPOSTResourceRequestSchema:

    def make_one(self):
        from adhocracy_core.rest.schemas import POSTResourceRequestSchema
        return POSTResourceRequestSchema()

    def test_deserialize_missing_all(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({})

    def test_deserialize_missing_contenttype(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({'data': {}})

    def test_deserialize_with_data_and_contenttype(self):
        inst = self.make_one()
        data = {'content_type': 'VALID', 'data': {}}
        assert inst.deserialize(data) == data

    def test_deserialize_with_data_unknown(self):
        inst = self.make_one()
        data = {'content_type': 'VALID', 'data': {'unknown': 1}}
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_missing_data(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({'content_type': 'VALID'})

    def test_deserialize_wrong_data_type(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({'content_type': 'VALID', 'data': ""})

    def test_data_has_after_bind(self):
        from adhocracy_core.rest.schemas import add_post_data_subschemas
        inst = self.make_one()
        assert inst['data'].after_bind is add_post_data_subschemas

    def test_content_type_has_deferred_validator(self):
        from adhocracy_core.rest.schemas import deferred_validate_post_content_type
        inst = self.make_one()
        assert inst['content_type'].validator is deferred_validate_post_content_type


class TestDeferredValidatePostContentType:

    @fixture
    def request(self, mock_resource_registry, cornice_request):
        cornice_request.body = '{}'
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    def _call_fut(self, node, kw):
        from adhocracy_core.rest.schemas import deferred_validate_post_content_type
        return deferred_validate_post_content_type(node, kw)

    def test_without_content_types(self, node, request, context):
        validator = self._call_fut(node, {'context': context, 'request': request})
        assert list(validator.choices) == []

    def test_with_content_types(self, node, request, context):
        request.registry.content.resource_addables.return_value = {'type': {}}
        validator = self._call_fut(node, {'context': context, 'request': request})
        assert list(validator.choices) == ['type']


class TestAddPostRequestSubSchemas:

    @fixture
    def request(self, mock_resource_registry, cornice_request):
        cornice_request.body = '{}'
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    def _call_fut(self, node, kw):
        from adhocracy_core.rest.schemas import add_post_data_subschemas
        return add_post_data_subschemas(node, kw)

    def test_no_data_and_no_sheets(self, node, request, context):
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_no_data_and_optional_sheets(self, node, request, context, sheet_metas):
        request.registry.content.sheets_meta = sheet_metas
        request.registry.content.resource_addables.return_value =\
            {'VALID': {'sheets_mandatory': [],
                       'sheets_optional': [ISheet.__identifier__]}}
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_data_and_optional_sheets(self, node, request, context, sheet_metas):
        request.registry.content.sheets_meta = sheet_metas
        request.registry.content.resource_addables.return_value =\
            {'VALID': {'sheets_mandatory': [],
                       'sheets_optional': [ISheet.__identifier__]}}
        data = {'content_type': 'VALID', 'data': {ISheet.__identifier__: {}}}
        request.body = json.dumps(data)
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheet.__identifier__

    def test_data_and_mandatory_but_no_optional_sheets(self, node, request, context, sheet_metas):
        request.registry.content.sheets_meta = sheet_metas
        request.registry.content.resource_addables.return_value =\
            {'VALID': {'sheets_mandatory': [ISheetA.__identifier__],
                       'sheets_optional': [ISheet.__identifier__]}}
        data = {'content_type': 'VALID', 'data': {ISheetA.__identifier__: {}}}
        request.body = json.dumps(data)
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheetA.__identifier__
        assert node.children[0].bindings == {'context': context, 'request': request}


class TestPOSTItemRequestSchemaUnitTest:

    @fixture
    def request(self, mock_resource_registry, cornice_request, context):
        cornice_request.body = '{}'
        mock_resource_registry.resource_addables.return_value = {'VALID': {}}
        cornice_request.registry.content = mock_resource_registry
        cornice_request.root = context
        return cornice_request

    def make_one(self):
        from adhocracy_core.rest.schemas import POSTItemRequestSchema
        return POSTItemRequestSchema()

    def test_deserialize_without_binding_and_root_versions(self):
        inst = self.make_one()
        result = inst.deserialize({'content_type': 'VALID', 'data': {}})
        assert result == {'content_type': 'VALID', 'data': {},
                          'root_versions': []}

    def test_deserialize_with_binding_and_root_versions(self, request, context):
        inst = self.make_one().bind(request=request, context=context)
        root_version_path = request.resource_url(request.root)
        result = inst.deserialize({'content_type': "VALID", 'data': {},
                                   'root_versions': [root_version_path]})
        assert result == {'content_type': 'VALID', 'data': {},
                          'root_versions': [request.root]}


class TestPUTResourceRequestSchema:

    def make_one(self):
        from adhocracy_core.rest.schemas import PUTResourceRequestSchema
        return PUTResourceRequestSchema()

    def test_deserialize_with_data(self):
        inst = self.make_one()
        data = {'data': {}}
        assert inst.deserialize(data) == data

    def test_deserialize_with_data_unknown(self):
        inst = self.make_one()
        data = {'data': {'unknown': 1}}
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_missing_data(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({})

    def test_data_has_after_bind(self):
        from adhocracy_core.rest.schemas import add_put_data_subschemas
        inst = self.make_one()
        assert inst['data'].after_bind is add_put_data_subschemas


class TestAddPutRequestSubSchemasUnitTest:

    @fixture
    def request(self, mock_resource_registry, cornice_request):
        cornice_request.body = '{}'
        cornice_request.registry.content = mock_resource_registry
        return cornice_request

    def _call_fut(self, node, kw):
        from adhocracy_core.rest.schemas import add_put_data_subschemas
        return add_put_data_subschemas(node, kw)

    def test_no_data_and_no_sheets(self, node, context, request):
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_no_data_and_optional_sheets(self, node, context, request):
        request.registry.content.resource_sheets.return_value = {ISheet.__identifier__: None}
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_data_and_optional_sheets(self, node, context, request, sheet_metas):
        request.registry.content.sheets_meta = sheet_metas
        request.registry.content.resource_sheets.return_value = {ISheet.__identifier__: None}
        request.body = json.dumps({'data': {ISheet.__identifier__: {}}})
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheet.__identifier__
        assert node.children[0].bindings == {'context': context, 'request': request}


class TestOPTIONResourceResponseSchema:

    def make_one(self):
        from adhocracy_core.rest.schemas import OPTIONResourceResponseSchema
        return OPTIONResourceResponseSchema()

    def test_serialize_no_sheets_and_no_addables(self):
        inst = self.make_one()
        wanted =\
            {'GET': {'request_body': {},
                     'request_querystring': {},
                     'response_body': {'content_type': colander.null, 'data': {},
                                       'path': ''}},
             'HEAD': {},
             'OPTION': {},
             'POST': {'request_body': [],
                      'response_body': {'content_type': colander.null, 'path': ''}},
             'PUT': {'request_body': {'data': {}},
                     'response_body': {'content_type': colander.null, 'path': ''}}}
        assert inst.serialize() == wanted


class TestBatchRequestPath:

    def make_one(self):
        from adhocracy_core.rest.schemas import BatchRequestPath
        return BatchRequestPath()

    def test_deserialize_valid_preliminary_path(self):
        inst = self.make_one()
        assert inst.deserialize('@item/v1') == '@item/v1'

    def test_deserialize_valid_absolute_path(self):
        inst = self.make_one()
        assert inst.deserialize('/item/v1') == '/item/v1'

    def test_deserialize_nonvalid_long_absolute_path(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            assert inst.deserialize('/a' * 200)

    def test_deserialize_nonvalid_relativ_path_depth2(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('item/v1')

    def test_deserialize_nonvalid_relativ_path_depth1(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('item')

    def test_deserialize_valid_url(self):
        inst = self.make_one()
        assert inst.deserialize('http://a.org/a') == 'http://a.org/a'

    def test_deserialize_nonvalid_special_characters(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('@item/ö')


class TestPOSTBatchRequestItem:

    def make_one(self):
        from adhocracy_core.rest.schemas import POSTBatchRequestItem
        return POSTBatchRequestItem()

    def test_deserialize_valid(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': 'http://a.org/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_path': '@part1_item',
            'result_first_version_path': '@part1_item'
        }
        assert inst.deserialize(data) == data

    def test_deserialize_at_path(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': '@par1_item',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_path': '@par1_item/v1'
        }
        assert inst.deserialize(data)['path'] == '@par1_item'

    def test_deserialize_invalid_relative_path(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': 'par1_item',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_path': '@par1_item'
        }
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_invalid_method(self):
        inst = self.make_one()
        data = {
            'method': 'BRIEF',
            'path': 'http://a.org/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_path': '@par1_item'
        }
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_invalid_body(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': 'http://a.org/adhocracy/Proposal/kommunismus',
            'body': 'This is not a JSON dict',
            'result_path': '@par1_item'
        }
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_empty_result_path(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': 'http://a.org/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_path': ''
        }
        assert inst.deserialize(data)['result_path'] == ''

    def test_deserialize_no_result_path(self):
        """result_path defaults to an empty string."""
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': 'http://a.org/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'}
        }
        deserialized = inst.deserialize(data)
        assert deserialized['result_path'] == ''

    def test_deserialize_invalid_result_path(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': '/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_path': 'not an identifier'
        }
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_with_missing_result_frist_version_path(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': 'http://a.org/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_path': '@par1_item',
        }
        assert inst.deserialize(data)['result_first_version_path'] == ''

    def test_deserialize_with_empty_result_frist_version_path(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': 'http://a.org/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
            'result_first_version_path': '',
        }
        assert inst.deserialize(data)['result_first_version_path'] == ''


class TestPOSTBatchRequestSchema:

    def make_one(self):
        from adhocracy_core.rest.schemas import POSTBatchRequestSchema
        return POSTBatchRequestSchema()

    def test_deserialize_valid(self):
        inst = self.make_one()
        data = [{
                'method': 'POST',
                'path': 'http://a.org/adhocracy/Proposal/kommunismus',
                'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
                'result_first_version_path': '@par1_item',
                'result_path': '@par1_item'
            },
            {
                'method': 'GET',
                'path': '@par1_item'
            }
        ]
        data_with_defaults = data.copy()
        data_with_defaults[1]['body'] = {}
        data_with_defaults[1]['result_path'] = ''
        data_with_defaults[1]['result_first_version_path'] = ''
        assert inst.deserialize(data) == data_with_defaults

    def test_deserialize_invalid_inner_field(self):
        inst = self.make_one()
        data = [{
                'method': 'POST',
                'path': '/adhocracy/Proposal/kommunismus',
                'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
                'result_path': 'par1_item'
            },
            {
                'method': 'HOT',
                'path': '@@par1_item'
            }
        ]
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_invalid_inner_type(self):
        inst = self.make_one()
        data = [{
                'method': 'POST',
                'path': '/adhocracy/Proposal/kommunismus',
                'body': {'content_type': 'adhocracy_core.resources.IParagraph'},
                'result_path': 'par1_item'
            },
            ['this', 'is not', 'a dictionary']
        ]
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_invalid_outer_type(self):
        inst = self.make_one()
        data = {
            'method': 'POST',
            'path': '/adhocracy/Proposal/kommunismus',
            'body': {'content_type': 'adhocracy_core.resources.IParagraph'}
        }
        with raises(colander.Invalid):
            inst.deserialize(data)


class TestGETPoolRequestSchema():

    @fixture
    def context(self, pool):
        from substanced.interfaces import IFolder
        pool['catalogs'] = testing.DummyResource(__is_service__=True,
                                                 __provides__=IFolder)
        pool['catalogs']['adhocracy'] = testing.DummyResource(__is_service__=True,
                                                              __provides__=IFolder)
        pool['catalogs']['system'] = testing.DummyResource(__is_service__=True,
                                                           __provides__=IFolder)
        return pool

    @fixture
    def inst(self):
        from adhocracy_core.rest.schemas import GETPoolRequestSchema
        return GETPoolRequestSchema()

    def test_deserialize_empty(self, inst):
        assert inst.deserialize({}) == {}

    def test_deserialize_valid(self, inst, context):
        from adhocracy_core.sheets.name import IName
        catalog = context['catalogs']['adhocracy']
        catalog['index1'] = testing.DummyResource(unique_values=lambda x: x)
        inst = inst.bind(context=context)
        data = {'content_type': 'adhocracy_core.sheets.name.IName',
                'sheet': 'adhocracy_core.sheets.name.IName',
                'depth': '100',
                'elements': 'content',
                'count': 'true',
                'aggregateby': 'index1',
                }
        expected = {'content_type': IName,
                    'sheet': IName,
                    'depth': '100',
                    'elements': 'content',
                    'count': True,
                    'aggregateby': 'index1',
                    }
        assert inst.deserialize(data) == expected

    def test_deserialize_valid_aggregateby_system_index(self, inst, context):
        catalog = context['catalogs']['system']
        catalog['index1'] = testing.DummyResource(unique_values=lambda x: x)
        inst = inst.bind(context=context)
        data = {'aggregateby': 'index1'}
        assert inst.deserialize(data)['aggregateby'] == 'index1'

    def test_deserialize_aggregateby_invalid_wrong_index_name(self, inst, context):
        inst = inst.bind(context=context)
        data = {'aggregateby': 'index1'}
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_aggregateby_invalid_index_without_unique_values(
            self, inst, context):
        catalog = context['catalogs']['adhocracy']
        catalog['index1'] = testing.DummyResource()
        inst = inst.bind(context=context)
        data = {'aggregateby': 'index1'}
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_content_type_invalid(self, inst):
        data = {'content_type': 'adhocracy_core.sheets.name.NoName'}
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_depth_all(self, inst):
        data = {'depth': 'all'}
        assert inst.deserialize(data) == {'depth': 'all'}

    def test_deserialize_depth_invalid(self, inst):
        data = {'depth': '-7'}
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_count_explicit_false(self, inst):
        data = {'count': 'false'}
        assert inst.deserialize(data) == {'count': False}

    def test_deserialize_extra_values_are_preserved(self, inst):
        data = {'extra1': 'blah',
                'another_extra': 'blub'}
        assert inst.typ.unknown == 'raise'
        with raises(colander.Invalid):
            inst.deserialize(data)


class TestAddGetPoolRequestExtraFields:

    @fixture
    def schema(self, context):
        from adhocracy_core.rest.schemas import GETPoolRequestSchema
        schema = GETPoolRequestSchema()
        return schema.bind(context=context)

    @fixture
    def context(self, pool_graph_catalog):
        return pool_graph_catalog

    @fixture
    def registry(self, mock_resource_registry):
        return testing.DummyResource(content=mock_resource_registry)

    def _call_fut(self, *args):
        from adhocracy_core.rest.schemas import add_get_pool_request_extra_fields
        return add_get_pool_request_extra_fields(*args)

    def test_call_without_extra_fields(self, schema):
        cstruct = {}
        assert self._call_fut(cstruct, schema, None, None) == schema

    def test_call_with_missing_catalog(self, schema):
        index_name = 'index1'
        cstruct = {index_name: 'keyword'}
        schema_extended = self._call_fut(cstruct, schema, None, None)
        assert index_name not in schema_extended

    def test_call_with_extra_filter_wrong(self, schema, context):
        index_name = 'index1'
        cstruct = {index_name: 'keyword'}
        schema_extended = self._call_fut(cstruct, schema, context, None)
        assert index_name not in schema_extended

    def test_call_with_extra_filter(self, schema, context):
        from adhocracy_core.schema import SingleLine
        index_name = 'index1'
        index = testing.DummyResource()
        context['catalogs']['adhocracy'].add(index_name, index, send_events=False)
        cstruct = {index_name: 'keyword'}
        schema_extended = self._call_fut(cstruct, schema, context, None)
        assert isinstance(schema_extended[index_name], SingleLine)

    def test_call_with_extra_reference_name(self, schema, registry):
        from adhocracy_core.schema import Resource
        from adhocracy_core.schema import Reference
        isheet = ISheet.__identifier__
        field = 'reference'
        reference_name = isheet + ':' + field
        cstruct = {reference_name: '/referenced'}
        registry.content.resolve_isheet_field_from_dotted_string.return_value = (ISheet, 'reference', Reference())
        schema_extended = self._call_fut(cstruct, schema, None, registry)
        assert isinstance(schema_extended[reference_name], Resource)

    def test_call_with_extra_reference_name_wrong_type(self, schema, registry):
        from adhocracy_core.schema import SingleLine
        isheet = ISheet.__identifier__
        field = 'reference'
        reference_name = isheet + ':' + field
        cstruct = {reference_name: '/referenced'}
        registry.content.resolve_isheet_field_from_dotted_string.return_value = (ISheet, 'reference', SingleLine())
        schema_extended = self._call_fut(cstruct, schema, None, registry)
        assert reference_name not in schema_extended

    def test_call_with_extra_reference_name_wrong(self, schema, registry):
        isheet = ISheet.__identifier__
        field = 'reference'
        reference_name = isheet + ':' + field
        cstruct = {reference_name: '/referenced'}
        registry.content.resolve_isheet_field_from_dotted_string.side_effect = ValueError
        schema_extended = self._call_fut(cstruct, schema, None, registry)
        assert reference_name not in schema_extended
