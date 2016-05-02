from unittest.mock import Mock

from pyramid import testing
from pytest import raises
from pytest import fixture
import colander


@fixture
def sheet_meta(sheet_meta):
    from adhocracy_core.sheets import AnnotationRessourceSheet
    from adhocracy_core.interfaces import ISheet

    class SheetASchema(colander.MappingSchema):
        count = colander.SchemaNode(colander.Int(),
                                    missing=colander.drop,
                                    default=0)
    meta = sheet_meta._replace(isheet=ISheet,
                               schema_class=SheetASchema,
                               sheet_class=AnnotationRessourceSheet,
                               readable=True,
                               editable=True,
                               creatable=True)
    return meta


class TestBaseResourceSheet:

    @fixture
    def mock_node_unique_references(self):
        from adhocracy_core.schema import UniqueReferences
        from adhocracy_core.schema import SheetReference
        mock = Mock(spec=UniqueReferences)
        mock.readonly = False
        mock.name = 'references'
        mock.backref = False
        mock.reftype = SheetReference
        mock.default = []
        mock.clone.return_value = mock
        return mock

    @fixture
    def mock_node_single_reference(self):
        from adhocracy_core.schema import Reference
        from adhocracy_core.schema import SheetReference
        mock = Mock(spec=Reference)
        mock.readonly = False
        mock.name = 'reference'
        mock.backref = False
        mock.reftype = SheetReference
        mock.default = []
        mock.clone.return_value = mock
        return mock

    @fixture
    def context(self, context, mock_graph):
        context.__graph__ = mock_graph
        return context

    @fixture
    def inst(self, sheet_meta, context, registry):
        inst = self.get_class()(sheet_meta, context, registry)
        inst._get_data_appstruct = Mock(spec=inst._get_data_appstruct)
        inst._get_data_appstruct.return_value = {}
        inst._store_data = Mock(spec=inst._store_data)
        return inst

    def get_class(self):
        from adhocracy_core.sheets import BaseResourceSheet
        return BaseResourceSheet

    def test_create_valid(self, registry, sheet_meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        inst = self.get_class()(sheet_meta, context, registry)
        assert inst.context == context
        assert inst.meta == sheet_meta
        assert inst.registry == registry
        assert inst.request is None
        assert inst.creating is None
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)

    def test_create_valid_with_request(self, registry, sheet_meta, context,
                                       request_):
        inst = self.get_class()(sheet_meta, context, registry,
                                request=request_)
        assert inst.request == request_

    def test_create_valid_with_creating(self, registry, sheet_meta, context,
                                        resource_meta):
        inst = self.get_class()(sheet_meta, context, registry,
                                creating=resource_meta)
        assert inst.creating == resource_meta

    def test_get_schema_with_bindings(self, inst):
        schema = inst.get_schema_with_bindings()
        assert schema.bindings == {'context': inst.context,
                                   'request': inst.request,
                                   'registry': inst.registry,
                                   'creating': inst.creating,
                                   }

    def test_get_schema_with_bindings_add_name(self, inst):
        schema = inst.get_schema_with_bindings()
        assert schema.name == inst.meta.isheet.__identifier__

    def test_get_schema_with_bindings_add_required_if_create_mandatory(
        self, inst):
        from adhocracy_core.interfaces import IResource
        inst.creating = IResource
        inst.meta = inst.meta._replace(create_mandatory=True)
        schema = inst.get_schema_with_bindings()
        assert schema.missing is colander.required

    def test_get_schema_with_bindings_add_dropt_if_not_create_mandatory(
        self, inst):
        schema = inst.get_schema_with_bindings()
        assert schema.missing is colander.drop

    def test_get_with_default(self, inst):
        assert inst.get() == {'count': 0}

    def test_get_with_deferred_default(self, inst):
        """A dictionary with 'registry' and 'context' is passed to deferred
        default functions.
        """
        schema = inst.schema.bind()
        @colander.deferred
        def default(node, kw):
            return len(kw)
        schema['count'].default = default
        inst.schema = schema
        assert inst.get() == {'count': 2}

    def test_get_with_omit_defaults(self, inst):
        assert inst.get(omit_defaults=True) == {}

    def test_get_non_empty(self, inst):
        inst._get_data_appstruct.return_value = {'count': 11}
        assert inst.get() == {'count': 11}

    def test_get_with_custom_query(self, inst, sheet_catalogs,
                                   mock_node_unique_references):
        from adhocracy_core.interfaces import search_result
        node = mock_node_unique_references
        inst.schema.children.append(node)
        sheet_catalogs.search.return_value = search_result
        appstruct = inst.get({'depth': 100})
        query = sheet_catalogs.search.call_args[0][0]
        assert query.depth == 100

    def test_get_raise_if_query_key_is_no_search_query_key(self, inst):
        with raises(ValueError):
            inst.get({'WRONG': 100})

    def test_set(self, inst):
        assert inst.set({'count': 11}) is True
        inst._store_data.assert_called_with({'count': 11})

    def test_set_ignore_not_changed_valued(self, inst):
        inst._get_data_appstruct.return_value = {'count': 11,
                                                 'count2': None}
        inst.set({'count': 11,
                  'count2': 2})
        inst._store_data.assert_called_with({'count2': 2})

    def test_set_empty(self, inst):
        assert inst.set({}) is False
        assert inst.get() == {'count': 0}

    def test_set_omit_str(self, inst):
        assert inst.set({'count': 11}, omit='count') is False

    def test_set_omit_tuple(self, inst):
        assert inst.set({'count': 11}, omit=('count',)) is False

    def test_set_omit_wrong_key(self, inst):
        assert inst.set({'count': 11}, omit=('wrongkey',)) is True

    def test_set_omit_readonly(self, inst):
        inst.schema['count'].readonly = True
        inst.set({'count': 11})
        assert inst.get() == {'count': 0}

    def test_set_references(self, inst, context, mock_graph,
                            mock_node_unique_references, registry):
        from adhocracy_core.interfaces import ISheet
        node = mock_node_unique_references
        inst.schema.children.append(node)
        inst.context._graph = mock_graph
        target = testing.DummyResource()

        inst.set({'references': [target]})

        mock_graph.set_references_for_isheet.assert_called_with(
            context, ISheet, {'references': [target]}, registry,
            send_event=True)

    def test_get_valid_back_references(self, inst, context, sheet_catalogs,
                                       mock_node_unique_references):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import search_result
        from adhocracy_core.interfaces import search_query
        from adhocracy_core.interfaces import Reference
        node = mock_node_unique_references
        node.backref = True
        inst.schema.children.append(node)
        source = testing.DummyResource()
        result = search_result._replace(elements=[source])
        sheet_catalogs.search.return_value = result

        appstruct = inst.get()

        reference = Reference(None, ISheet, '', context)
        query = search_query._replace(references=[reference],
                                      resolve=True,
                                      )
        sheet_catalogs.search.call_args[0] == query
        assert appstruct['references'] == [source]

    def test_get_omit_valid_back_references(self, inst, context, sheet_catalogs,
                                            mock_node_unique_references):
        from adhocracy_core.interfaces import search_result
        node = mock_node_unique_references
        node.backref = True
        inst.schema.children.append(node)
        source = testing.DummyResource()
        result = search_result._replace(elements=[source])
        sheet_catalogs.search.return_value = result
        appstruct = inst.get(add_back_references=False)

        assert not sheet_catalogs.search.called
        assert appstruct['references'] == []

    def test_set_reference(self, inst, context, mock_graph,
                           mock_node_single_reference, registry):
        from adhocracy_core.interfaces import ISheet
        node = mock_node_single_reference
        inst.schema.children.append(node)
        target = testing.DummyResource()
        inst.set({'reference': target})
        graph_set_args = mock_graph.set_references_for_isheet.call_args[0]
        assert graph_set_args == (context, ISheet, {'reference': target}, registry)

    def test_set_reference_without_send_events(
            self, inst, context, mock_graph, mock_node_single_reference,
            registry):
        node = mock_node_single_reference
        inst.schema.children.append(node)
        target = testing.DummyResource()
        inst.set({'reference': target})
        graph_set_kwargs = mock_graph.set_references_for_isheet.call_args[1]
        assert graph_set_kwargs == {'send_event': True}

    def test_get_reference(self, inst, context, sheet_catalogs,
                           mock_node_single_reference):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import search_result
        from adhocracy_core.interfaces import search_query
        from adhocracy_core.interfaces import Reference
        node = mock_node_single_reference
        inst.schema.children.append(node)
        target = testing.DummyResource()
        result = search_result._replace(elements=[target])
        sheet_catalogs.search.return_value = result

        appstruct = inst.get()

        reference = Reference(context, ISheet, 'reference', None)
        query = search_query._replace(references=[reference],
                                      resolve=True,
                                      )
        assert sheet_catalogs.search.call_args[0][0] == query
        assert appstruct['reference'] == target

    def test_get_references(self, inst, context, sheet_catalogs,
                            mock_node_unique_references):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import search_result
        from adhocracy_core.interfaces import search_query
        from adhocracy_core.interfaces import Reference
        node = mock_node_unique_references
        inst.schema.children.append(node)
        target = testing.DummyResource()
        result = search_result._replace(elements=[target])
        sheet_catalogs.search.return_value = result

        appstruct = inst.get()

        reference = Reference(context, ISheet, 'references', None)
        query = search_query._replace(references=[reference],
                                      resolve=True,
                                      sort_by='reference'
                                      )
        assert sheet_catalogs.search.call_args[0][0] == query

    def test_get_back_reference(self, inst, context, sheet_catalogs,
                                mock_node_single_reference):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import search_result
        from adhocracy_core.interfaces import Reference
        node = mock_node_single_reference
        node.backref = True
        inst.schema.children.append(node)
        source = testing.DummyResource()
        result = search_result._replace(elements=[source])
        sheet_catalogs.search.return_value = result
        appstruct = inst.get()

        reference = Reference(None, ISheet, '', context)
        assert sheet_catalogs.search.call_args[0][0].references == [reference]
        assert appstruct['reference'] == source

    def test_notify_resource_sheet_modified(self, inst, context, config):
        from adhocracy_core.interfaces import IResourceSheetModified
        from adhocracy_core.testing import create_event_listener
        events = create_event_listener(config, IResourceSheetModified)
        inst.set({'count': 2})

        assert IResourceSheetModified.providedBy(events[0])
        assert events[0].object == context
        assert events[0].registry == config.registry
        assert events[0].old_appstruct == {'count': 0}
        assert events[0].new_appstruct == {'count': 2}

    def test_serialize(self, inst, request_):
        from . import BaseResourceSheet
        inst.request = request_
        inst.get = Mock(spec=BaseResourceSheet.get)
        inst.get.return_value = {'elements': [],
                                 'count': 2}
        assert inst.serialize() == {'count': '2'}
        default_params = {'only_visible': True,
                          'allows': (request_.effective_principals, 'view'),
                          }
        assert inst.get.call_args[1]['params'] == default_params
        assert inst.get.call_args[1]['omit_defaults'] is True

    def test_serialize_with_params(self, inst, request_):
        inst.request = request_
        inst.get = Mock()
        inst.get.return_value = {'elements': []}
        cstruct = inst.serialize(params={'name': 'child'})
        assert 'name' in inst.get.call_args[1]['params']

    def test_serialize_filter_by_view_permission(self, inst, request_):
        inst.request = request_
        inst.get = Mock()
        inst.get.return_value = {}
        cstruct = inst.serialize()
        assert inst.get.call_args[1]['params']['allows'] == \
                (request_.effective_principals, 'view')

    def test_serialize_filter_by_view_permission_disabled(self, inst,
                                                            request_):
        inst.request = request_
        inst.registry.settings['adhocracy.filter_by_view_permission'] = "False"
        inst.get = Mock()
        inst.get.return_value = {}
        cstruct = inst.serialize()
        assert 'allows' not in inst.get.call_args[1]['params']

    def test_serialize_filter_by_only_visible(self, inst, request_):
        inst.request = request_
        inst.get = Mock()
        inst.get.return_value = {}
        cstruct = inst.serialize()
        assert inst.get.call_args[1]['params']['only_visible']

    def test_serialize_filter_by_only_visible_disabled(self, inst, request_):
        inst.request = request_
        inst.registry.settings['adhocracy.filter_by_visible'] = "False"
        inst.get = Mock()
        inst.get.return_value = {}
        cstruct = inst.serialize()
        assert 'only_visible' not in inst.get.call_args[1]['params']


class TestAnnotationRessourceSheet:

    @fixture
    def sheet_meta(self, sheet_meta):
        from . import AnnotationRessourceSheet
        class SheetASchema(colander.MappingSchema):
            count = colander.SchemaNode(colander.Int(),
                                        missing=colander.drop,
                                        default=0)
            other = colander.SchemaNode(colander.Int(),
                                        missing=colander.drop,
                                        default=0)
        return sheet_meta._replace(sheet_class=AnnotationRessourceSheet,
                                   schema_class=SheetASchema)

    @fixture
    def inst(self, sheet_meta, context, registry):
        from . import AnnotationRessourceSheet
        return AnnotationRessourceSheet(sheet_meta, context, registry)

    def test_create(self, inst, context, sheet_meta):
        from . import BaseResourceSheet
        from adhocracy_core.interfaces import IResourceSheet
        from zope.interface.verify import verifyObject
        assert isinstance(inst, BaseResourceSheet)
        assert inst.context == context
        assert inst.meta == sheet_meta
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)

    def test_delete_field_values(self, inst):
        appstruct = {'count': 2, 'other': 3}
        setattr(inst.context, inst._annotation_key, appstruct)
        inst.delete_field_values(['count'])
        assert 'other' in appstruct
        assert 'count' not in appstruct

    def test_delete_field_values_ignore_if_wrong_field(self, inst):
        appstruct = {'count': 2}
        setattr(inst.context, inst._annotation_key, appstruct)
        inst.delete_field_values(['wrong'])
        assert 'count' in appstruct

    def test_delete_field_values_remove_data_dict_if_empty(self, inst):
        appstruct = {'count': 2}
        setattr(inst.context, inst._annotation_key, appstruct)
        inst.delete_field_values(['count'])
        assert not hasattr(inst.context, inst._annotation_key)

    def test_delete_field_values_no_delete_key_if_key_absent(self, inst):
        assert inst.delete_field_values(['count']) is None

    def test_set_with_other_sheet_name_conflicts(self, inst, sheet_meta,
                                                 context, registry):
        from adhocracy_core.interfaces import ISheet

        class ISheetB(ISheet):
            pass

        class SheetBSchema(sheet_meta.schema_class):
            count = colander.SchemaNode(colander.Int(),
                                        missing=colander.drop,
                                        default=0)

        sheet_b_meta = sheet_meta._replace(isheet=ISheetB,
                                           schema_class=SheetBSchema)
        inst_b = sheet_meta.sheet_class(sheet_b_meta, context, registry)

        inst.set({'count': 1})
        inst_b.set({'count': 2})

        assert inst.get() == {'count': 1, 'other': 0}
        assert inst_b.get() == {'count': 2, 'other': 0}

    def test_set_with_subtype_and_name_conflicts(self, inst,  sheet_meta,
                                                 context, registry):
        class ISheetB(sheet_meta.isheet):
            pass

        class SheetBSchema(sheet_meta.schema_class):
            count = colander.SchemaNode(colander.Int(),
                missing=colander.drop,
                default=0)

        sheet_b_meta = sheet_meta._replace(isheet=ISheetB,
                                           schema_class=SheetBSchema)
        inst_b = sheet_meta.sheet_class(sheet_b_meta, context, registry)

        inst.set({'count': 1, 'other': 0})
        inst_b.set({'count': 2})

        assert inst.get() == {'count': 1, 'other': 0}
        assert inst_b.get() == {'count': 2, 'other': 0}


class TestAttributeResourceSheet:

    @fixture
    def sheet_meta(self, sheet_meta):
        from . import AttributeResourceSheet
        return sheet_meta._replace(sheet_class=AttributeResourceSheet)

    @fixture
    def inst(self, sheet_meta, context, registry):
        from . import AttributeResourceSheet
        return AttributeResourceSheet(sheet_meta, context, registry)

    def test_create(self, inst, context, sheet_meta):
        from . import BaseResourceSheet
        from adhocracy_core.interfaces import IResourceSheet
        from zope.interface.verify import verifyObject
        assert isinstance(inst, BaseResourceSheet)
        assert inst.context == context
        assert inst.meta == sheet_meta
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)

    def test_set(self, inst, context):
        inst.set({'count': 1})
        assert inst.get() == {'count': 1}
        assert context.count == 1

    def test_set_and_add_dirty_flag_for_persistent_context(self, inst):
        from persistent.mapping import PersistentMapping
        inst.context = PersistentMapping()
        inst.context._p_jar = Mock()
        inst.set({'count': 2})
        assert inst.context._p_changed is True

    def test_set_with_other_sheet_name_conflicts(self, inst, sheet_meta,
                                                 context, registry):
        """Different sheets with equalt field names override each other.
           This should never happen.
        """
        from adhocracy_core.interfaces import ISheet

        class ISheetB(ISheet):
            pass

        class SheetBSchema(sheet_meta.schema_class):
            count = colander.SchemaNode(colander.Int(),
                missing=colander.drop,
                default=0)

        sheet_b_meta = sheet_meta._replace(isheet=ISheetB,
                                           schema_class=SheetBSchema)
        inst_b = sheet_meta.sheet_class(sheet_b_meta, context, registry)
        inst.set({'count': 1})
        inst_b.set({'count': 2})

        assert inst.get() == {'count': 2}
        assert inst_b.get() == {'count': 2}

    def test_delete_field_values_ignore_if_wrong_field(self, inst, context):
        context.count = 2
        inst.delete_field_values(['wrong'])
        assert hasattr(context, 'count')

    def test_delete_field_values(self, inst, context):
        context.count = 2
        inst.delete_field_values(['count'])
        assert not hasattr(context, 'count')

    def test_delete_field_and_add_dirty_flag_for_persistent_context(self, inst):
        from persistent.mapping import PersistentMapping
        inst.context = PersistentMapping()
        inst.context._p_jar = Mock()
        inst.context.count = 2
        inst.delete_field_values(['count'])
        assert inst.context._p_changed


class TestAddSheetToRegistry:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    def call_fut(self, sheet_meta, registry):
        from adhocracy_core.sheets import add_sheet_to_registry
        return add_sheet_to_registry(sheet_meta, registry)

    def test_register_valid_sheet_sheet_meta(self, sheet_meta, registry):
        self.call_fut(sheet_meta, registry)
        assert registry.content.sheets_meta == {sheet_meta.isheet: sheet_meta}

    def test_register_valid_sheet_sheet_meta_replace_exiting(self, sheet_meta,
                                                             registry):
        self.call_fut(sheet_meta, registry)
        meta_b = sheet_meta._replace(permission_view='META_B')
        self.call_fut(meta_b, registry)
        assert registry.content.sheets_meta == {sheet_meta.isheet: meta_b}

    def test_register_non_valid_readonly_and_createmandatory(self, sheet_meta, registry):
        meta = sheet_meta._replace(editable=False,
                                   creatable=False,
                                   create_mandatory=True)
        with raises(AssertionError):
            self.call_fut(meta, registry)

    def test_register_non_valid_non_isheet(self, sheet_meta, registry):
        from zope.interface import Interface
        meta = sheet_meta._replace(isheet=Interface)
        with raises(AssertionError):
            self.call_fut(meta, registry)

    def test_register_non_valid_schema_without_default_values(self, sheet_meta, registry):
        del sheet_meta.schema_class.__class_schema_nodes__[0].default
        with raises(AssertionError):
            self.call_fut(sheet_meta, registry)

    def test_register_non_valid_schema_with_default_colander_drop(self, sheet_meta, registry):
        sheet_meta.schema_class.__class_schema_nodes__[0].default = colander.drop
        with raises(AssertionError):
            self.call_fut(sheet_meta, registry)

    def test_register_non_valid_non_mapping_schema(self, sheet_meta, registry):
        meta = sheet_meta._replace(schema_class=colander.TupleSchema)
        with raises(AssertionError):
            self.call_fut(meta, registry)

    def test_register_non_valid_schema_subclass_has_changed_field_type(self, sheet_meta, registry):
        class SheetABSchema(sheet_meta.schema_class):
            count = colander.SchemaNode(colander.String(),
                missing=colander.drop,
                default='D')
        class ISheetAB(sheet_meta.isheet):
            pass
        meta_b = sheet_meta._replace(isheet=ISheetAB,
                                     schema_class=SheetABSchema)
        with raises(AssertionError):
            self.call_fut(meta_b, registry)
