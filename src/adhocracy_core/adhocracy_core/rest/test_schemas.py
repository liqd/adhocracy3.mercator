from unittest.mock import Mock
import json

from pyramid import testing
from pytest import fixture
from pytest import raises
from pytest import mark
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IResource


class ISheetA(ISheet):
    pass


@fixture
def sheet_metas():
    from adhocracy_core.interfaces import sheet_metadata
    meta = sheet_metadata._replace(schema_class=colander.MappingSchema)
    metas = [meta._replace(isheet=ISheet),
             meta._replace(isheet=ISheetA)]
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

    def test_serialize_no_appstruct(self, request, context):
        inst = self.make_one().bind(request=request, context=context)
        wanted = {'content_type': IResource.__identifier__,
                  'path': request.application_url + '/',
                  'updated_resources': {'changed_descendants': [],
                          'created': [],
                          'modified': [],
                          'removed': []}}
        assert inst.serialize() == wanted

    def test_serialize_with_appstruct(self, request, context):
        inst = self.make_one().bind(request=request, context=context)
        context['child'] = testing.DummyResource()
        wanted = {'content_type': ISheet.__identifier__,
                  'path': request.application_url + '/child/',
                  'updated_resources': {'changed_descendants': [],
                          'created': [request.application_url + '/child/'],
                          'modified': [],
                          'removed': []}}
        assert inst.serialize({'content_type': ISheet,
                               'path': context['child'],
                               'updated_resources':
                                   {'created': [context['child']]}}) == wanted


class TestItemResponseSchema:

    @fixture
    def request(self, context):
        request = testing.DummyRequest()
        request.root = context
        return request

    def make_one(self):
        from adhocracy_core.rest.schemas import ItemResponseSchema
        return ItemResponseSchema()

    def test_create_is_subclass(self):
        from adhocracy_core.rest.schemas import ResourceResponseSchema
        inst = self.make_one()
        assert isinstance(inst, ResourceResponseSchema)

    def test_serialize_no_appstruct(self, request, context):
        inst = self.make_one().bind(request=request, context=context)
        assert inst.serialize()['first_version_path'] == ''

    def test_serialize_with_appstruct(self, request, context):
        inst = self.make_one().bind(request=request, context=context)
        context['child'] = testing.DummyResource()
        result = inst.serialize({'first_version_path': context['child']})
        assert result['first_version_path'] == request.application_url + '/child/'


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
        data = {'content_type': IResource.__identifier__, 'data': {}}
        assert inst.deserialize(data) == {'content_type': IResource,
                                          'data': {}}

    def test_deserialize_with_data_unknown(self):
        inst = self.make_one()
        data = {'content_type': IResource.__identifier__,
                'data': {'unknown': 1}}
        with raises(colander.Invalid):
            inst.deserialize(data)

    def test_deserialize_missing_data(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({'content_type': IResource.__identifier__})

    def test_deserialize_wrong_data_type(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({'content_type': IResource.__identifier__,
                              'data': ""})

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
    def request(self, mock_content_registry, cornice_request):
        cornice_request.body = '{}'
        cornice_request.registry.content = mock_content_registry
        return cornice_request

    def _call_fut(self, node, kw):
        from adhocracy_core.rest.schemas import deferred_validate_post_content_type
        return deferred_validate_post_content_type(node, kw)

    def test_without_content_types(self, node, request, context):
        validator = self._call_fut(node, {'context': context, 'request': request})
        assert list(validator.choices) == []

    def test_with_content_types(self, node, request, context, resource_meta):
        request.registry.content.get_resources_meta_addable.return_value = \
            [resource_meta]
        validator = self._call_fut(node, {'context': context, 'request': request})
        assert list(validator.choices) == [IResource]


class TestAddPostRequestSubSchemas:

    @fixture
    def request(self, mock_content_registry, cornice_request):
        cornice_request.body = '{}'
        cornice_request.registry.content = mock_content_registry
        return cornice_request

    def _call_fut(self, node, kw):
        from adhocracy_core.rest.schemas import add_post_data_subschemas
        return add_post_data_subschemas(node, kw)

    def test_no_data_and_no_sheets(self, node, request, context):
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_no_data_and_optional_sheets(self, node, request, context, sheet_meta):
        sheet_meta = sheet_meta._replace(create_mandatory=False)
        request.registry.content.get_sheets_create.return_value = [sheet_meta]
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_data_and_optional_sheets(self, node, request, context, mock_sheet):
        mock_sheet.meta = mock_sheet.meta._replace(create_mandatory=True)
        request.registry.content.get_sheets_create.return_value = [mock_sheet]
        data = {'content_type': IResource.__identifier__,
                'data': {ISheet.__identifier__: {}}}
        request.body = json.dumps(data)
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheet.__identifier__

    def test_data_and_mandatory_but_no_optional_sheets(self, node, request,
                                                       context, mock_sheet):
        mock_sheet.meta = mock_sheet.meta._replace(create_mandatory=True)
        request.registry.content.get_sheets_create.return_value = [mock_sheet]
        data = {'content_type': IResource.__identifier__,
                'data': {ISheet.__identifier__: {}}}
        request.body = json.dumps(data)
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheet.__identifier__
        assert node.children[0].bindings == {'context': context, 'request': request}

    def test_multipart_formdata_request(self, node, request, context,
                                        mock_sheet):
        request.content_type = 'multipart/form-data'
        mock_sheet.meta = mock_sheet.meta._replace(create_mandatory=True)
        request.registry.content.get_sheets_create.return_value = [mock_sheet]
        request.POST['content_type'] = IResource.__identifier__
        request.POST['data:' + ISheet.__identifier__] = {}
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheet.__identifier__

    def test_invalid_request_content_type(self, node, request, context,):
        request.content_type = 'text/plain'
        with raises(RuntimeError):
            self._call_fut(node, {'context': context, 'request': request})


class TestPOSTItemRequestSchemaUnitTest:

    @fixture
    def request(self, mock_content_registry, cornice_request, context, resource_meta):
        cornice_request.body = '{}'
        mock_content_registry.get_resources_meta_addable.return_value = \
            [resource_meta]
        cornice_request.registry.content = mock_content_registry
        cornice_request.root = context
        return cornice_request

    def make_one(self):
        from adhocracy_core.rest.schemas import POSTItemRequestSchema
        return POSTItemRequestSchema()

    def test_deserialize_without_binding_and_root_versions(self):
        inst = self.make_one()
        result = inst.deserialize({'content_type': IResource.__identifier__,
                                   'data': {}})
        assert result == {'content_type': IResource,
                          'data': {},
                          'root_versions': []}

    def test_deserialize_with_binding_and_root_versions(self, request, context):
        inst = self.make_one().bind(request=request, context=context)
        root_version_path = request.resource_url(request.root)
        result = inst.deserialize({'content_type': IResource.__identifier__,
                                   'data': {},
                                   'root_versions': [root_version_path]})
        assert result == {'content_type': IResource, 'data': {},
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
    def request(self, mock_content_registry, cornice_request):
        cornice_request.body = '{}'
        cornice_request.registry.content = mock_content_registry
        return cornice_request

    def _call_fut(self, node, kw):
        from adhocracy_core.rest.schemas import add_put_data_subschemas
        return add_put_data_subschemas(node, kw)

    def test_no_data_and_no_sheets(self, node, context, request):
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_no_data_and_optional_sheets(self, node, context, request, mock_sheet):
        request.registry.content.get_sheets_edit.return_value = [mock_sheet]
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children == []

    def test_data_and_optional_sheets(self, node, context, request, mock_sheet):
        request.registry.content.get_sheets_edit.return_value = [mock_sheet]
        request.body = json.dumps({'data': {ISheet.__identifier__: {}}})
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheet.__identifier__
        assert node.children[0].bindings == {'context': context, 'request': request}

    def test_multipart_formdata_request(self, node, context, request,
                                        mock_sheet):
        request.content_type = 'multipart/form-data'
        request.registry.content.get_sheets_edit.return_value = [mock_sheet]
        request.POST['data:' + ISheet.__identifier__] = {}
        self._call_fut(node, {'context': context, 'request': request})
        assert node.children[0].name == ISheet.__identifier__
        assert node.children[0].bindings == {'context': context,
                                             'request': request}


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

    def test_deserialize_nonvalid_garbage_after_url(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize('http://a.org/ah!hä?')

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
        from substanced.interfaces import IService
        pool['catalogs'] = testing.DummyResource(__is_service__=True,
                                                 __provides__=IService)
        pool['catalogs']['adhocracy'] = testing.DummyResource(__is_service__=True,
                                                              __provides__=IService)
        pool['catalogs']['system'] = testing.DummyResource(__is_service__=True,
                                                           __provides__=IService)
        return pool

    @fixture
    def inst(self):
        from adhocracy_core.rest.schemas import GETPoolRequestSchema
        return GETPoolRequestSchema()

    def test_deserialize_empty(self, inst):
        assert inst.deserialize({}) == {}

    def test_deserialize_valid(self, inst, context):
        from adhocracy_core.sheets.name import IName
        from hypatia.interfaces import IIndexSort
        catalog = context['catalogs']['adhocracy']
        catalog['index1'] = testing.DummyResource(unique_values=lambda x: x,
                                                  __provides__=IIndexSort)
        inst = inst.bind(context=context)
        data = {'content_type': 'adhocracy_core.sheets.name.IName',
                'sheet': 'adhocracy_core.sheets.name.IName',
                'depth': '100',
                'elements': 'content',
                'count': 'true',
                'sort': 'index1',
                'aggregateby': 'index1',
                }
        expected = {'content_type': IName,
                    'sheet': IName,
                    'depth': '100',
                    'elements': 'content',
                    'count': True,
                    'sort': 'index1',
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

    @mark.parametrize('value', ['-7', '1.5', 'fall', 'alle'])
    def test_deserialize_depth_invalid(self, inst, value):
        data = {'depth': value}
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

    def test_deserialize_sort_valid_system_index(self, inst, context):
        from hypatia.interfaces import IIndexSort
        catalog = context['catalogs']['system']
        catalog['index1'] = testing.DummyResource(__provides__=IIndexSort)
        inst = inst.bind(context=context)
        data = {'sort': 'index1'}
        assert inst.deserialize(data)['sort'] == 'index1'

    def test_deserialize_sort_valid_adhocarcy_index(self, inst, context):
        from hypatia.interfaces import IIndexSort
        catalog = context['catalogs']['adhocracy']
        catalog['index1'] = testing.DummyResource(__provides__=IIndexSort)
        inst = inst.bind(context=context)
        data = {'sort': 'index1'}
        assert inst.deserialize(data)['sort'] == 'index1'

    def test_deserialize_sort_valid_but_index_is_missing_IIndexSortable(self, inst, context):
        # workaround bug: hypation.field.FieldIndex is missing IIndexSortable
        catalog = context['catalogs']['adhocracy']
        catalog['index1'] = testing.DummyResource(sort=lambda x: x)
        inst = inst.bind(context=context)
        data = {'sort': 'index1'}
        assert inst.deserialize(data)['sort'] == 'index1'

    def test_deserialize_sort_invalid_non_sortable_index(self, inst, context):
        catalog = context['catalogs']['adhocracy']
        catalog['index1'] = testing.DummyResource()
        inst = inst.bind(context=context)
        data = {'sort': 'index1'}
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
    def registry(self, mock_content_registry):
        return testing.DummyResource(content=mock_content_registry)

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
        with raises(colander.Invalid):
            self._call_fut(cstruct, schema, context, None)

    def test_call_with_extra_filter(self, schema, context):
        from adhocracy_core.schema import SingleLine
        index_name = 'index1'
        index = testing.DummyResource()
        context['catalogs']['adhocracy'].add(index_name, index, send_events=False)
        cstruct = {index_name: 'keyword'}
        schema_extended = self._call_fut(cstruct, schema, context, None)
        assert isinstance(schema_extended[index_name], SingleLine)

    def test_call_with_extra_filter_with_empty_unique_values(self, schema,
                                                             context):
        from adhocracy_core.schema import SingleLine
        index_name = 'index1'
        index = testing.DummyResource()
        index.unique_values = Mock(return_value=[])
        context['catalogs']['adhocracy'].add(index_name, index, send_events=False)
        cstruct = {index_name: 'keyword'}
        schema_extended = self._call_fut(cstruct, schema, context, None)
        assert isinstance(schema_extended[index_name], SingleLine)

    def test_call_with_extra_integer_filter(self, schema, context):
        from adhocracy_core.schema import Integer
        index_name = 'int_index'
        index = testing.DummyResource()
        index.unique_values = Mock(return_value=[1, 2, 3])
        context['catalogs']['adhocracy'].add(index_name, index, send_events=False)
        cstruct = {index_name: '7'}
        schema_extended = self._call_fut(cstruct, schema, context, None)
        assert isinstance(schema_extended[index_name], Integer)

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
        with raises(colander.Invalid):
            self._call_fut(cstruct, schema, None, registry)

    def test_call_with_extra_reference_name_wrong(self, schema, registry):
        isheet = ISheet.__identifier__
        field = 'reference'
        reference_name = isheet + ':' + field
        cstruct = {reference_name: '/referenced'}
        registry.content.resolve_isheet_field_from_dotted_string.side_effect = ValueError
        with raises(colander.Invalid):
            self._call_fut(cstruct, schema, None, registry)


class TestPostMessageUserViewRequestSchema:

    @fixture
    def request(self, context):
        request = testing.DummyRequest()
        request.root = context
        return request

    def make_one(self):
        from .schemas import POSTMessageUserViewRequestSchema
        return POSTMessageUserViewRequestSchema()

    def test_deserialize_valid(self, request, context):
        from pyramid.traversal import resource_path
        from adhocracy_core.sheets.principal import IUserExtended
        inst = self.make_one().bind(request=request, context=context)
        context['user'] = testing.DummyResource(__provides__=IUserExtended)
        cstrut = {'recipient': resource_path(context['user']),
                  'title': 'title',
                  'text': 'text'}
        assert inst.deserialize(cstrut) == {'recipient': context['user'],
                                            'title': 'title',
                                            'text': 'text'}

    def test_deserialize_recipient_is_no_user(self, request, context):
        from pyramid.traversal import resource_path
        inst = self.make_one().bind(request=request, context=context)
        context['user'] = testing.DummyResource()
        cstrut = {'recipient': resource_path(context['user']),
                  'title': 'title',
                  'text': 'text'}
        with raises(colander.Invalid):
            inst.deserialize(cstrut)


class TestPOSTCreateResetPasswordRequestSchema:

    def make_one(self):
        from adhocracy_core.rest.schemas import\
            POSTCreatePasswordResetRequestSchema
        return POSTCreatePasswordResetRequestSchema()

    def test_deserialize_without_email(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({})

    def test_deserialize_with_email(self):
        inst = self.make_one()
        data = {'email': 'test@email.de'}
        assert inst.deserialize(data) == {'email': 'test@email.de'}

    def test_email_has_deferred_validator(self):
        from adhocracy_core.rest.schemas import \
            deferred_validate_password_reset_email
        inst = self.make_one()
        assert inst['email'].validator is deferred_validate_password_reset_email


class TestDeferredValidateResetPasswordEmail:

    @fixture
    def request(self, cornice_request, registry):
        cornice_request.registry = registry
        return cornice_request

    def _call_fut(self, node, kw):
        from . schemas import deferred_validate_password_reset_email
        return deferred_validate_password_reset_email(node, kw)

    def test_email_has_no_user(self, node, request, context, mock_user_locator):
        validator = self._call_fut(node, {'context': context, 'request': request})
        with raises(colander.Invalid) as exception_info:
            validator(node, 'test@email.de')
        assert 'No user' in exception_info.value.msg

    def test_email_has_user_with_password_authentication(
            self, node, request, context, mock_user_locator):
        from adhocracy_core.sheets.principal import IPasswordAuthentication
        validator = self._call_fut(node, {'context': context,
                                          'request': request})
        user = testing.DummyResource(active=True,
                                     __provides__=IPasswordAuthentication)
        mock_user_locator.get_user_by_email.return_value = user
        validator(node, 'test@email.de')
        assert request.validated['user'] is user

    def test_email_has_user_without_password_authentication(
            self, node, request, context, mock_user_locator):
        validator = self._call_fut(node, {'context': context,
                                          'request': request})
        user = testing.DummyResource(active=True)
        mock_user_locator.get_user_by_email.return_value = user
        with raises(colander.Invalid):
            validator(node, 'test@email.de')

    def test_email_has_user_not_activated(self, node, request, context,
                                          mock_user_locator):
        from adhocracy_core.sheets.principal import IPasswordAuthentication
        validator = self._call_fut(node, {'context': context,
                                          'request': request})
        user = testing.DummyResource(active=False,
                                     __provides__=IPasswordAuthentication,
                                     activate=Mock())
        mock_user_locator.get_user_by_email.return_value = user
        validator(node, 'test@email.de')
        user.activate.assert_called
        assert request.validated['user'] is user



class TestPOSTResetPasswordRequestSchema:

    def make_one(self):
        from .schemas import POSTPasswordResetRequestSchema
        return POSTPasswordResetRequestSchema()

    def test_create(self):
        from adhocracy_core.schema import Password
        from adhocracy_core.schema import Resource
        from .schemas import validate_password_reset_path
        inst = self.make_one()
        assert isinstance(inst['password'], Password)
        assert inst['password'].required
        assert isinstance(inst['path'], Resource)
        assert inst['path'].required
        assert inst['path'].validator is validate_password_reset_path


class TestValidatePasswordResetPath:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def request(self, cornice_request, context, registry):
        request = cornice_request
        request.registry = registry
        request.root = context
        return request

    def call_fut(self, node, kw):
        from .schemas import validate_password_reset_path
        return validate_password_reset_path(node, kw)

    def test_path_is_none(self, node, request, context):
        validator = self.call_fut(node, {'context': context, 'request': request})
        assert validator(node, None) is None

    def test_path_is_reset_password(self, node,  request, context, registry,
                                    mock_sheet):
        from datetime import datetime
        from pytz import UTC
        from adhocracy_core.resources.principal import IPasswordReset
        user = testing.DummyResource()
        creation_date = datetime.utcnow().replace(tzinfo=UTC)
        mock_sheet.get.return_value = {'creator': user,
                                       'creation_date': creation_date}
        registry.content.get_sheet.return_value = mock_sheet
        validator = self.call_fut(node, {'request': request, 'context': context})

        context['reset'] = testing.DummyResource(__provides__=IPasswordReset)
        validator(node, context['reset'])

        assert request.validated['user'] is user

    def test_path_is_not_reset_password(self, node,  request, context, registry,
                                        mock_sheet):
        from datetime import datetime
        from pytz import UTC
        user = testing.DummyResource()
        creation_date = datetime.utcnow().replace(tzinfo=UTC)
        mock_sheet.get.return_value = {'creator': user,
                                       'creation_date': creation_date}
        registry.content.get_sheet.return_value = mock_sheet
        validator = self.call_fut(node, {'request': request, 'context': context})

        context['reset'] = testing.DummyResource()
        with raises(colander.Invalid):
            validator(node, context['reset'])

    def test_path_is_reset_password_but_8_days_old(
            self, node,  request, context, registry, mock_sheet):
        import datetime
        from pytz import UTC
        from adhocracy_core.resources.principal import IPasswordReset
        user = testing.DummyResource()
        creation_date = datetime.datetime.utcnow().replace(tzinfo=UTC) -\
                        datetime.timedelta(days=7)
        mock_sheet.get.return_value = {'creator': user,
                                       'creation_date': creation_date}
        registry.content.get_sheet.return_value = mock_sheet
        validator = self.call_fut(node, {'request': request, 'context': context})

        context['reset'] = testing.DummyResource(__provides__=IPasswordReset)
        with raises(colander.Invalid):
            validator(node, context['reset'])
