from unittest.mock import Mock

from pyramid import testing
from pytest import raises
from pytest import fixture
import colander


@fixture
def sheet_meta(sheet_meta):
    from adhocracy_core.sheets import GenericResourceSheet
    from adhocracy_core.interfaces import ISheet
    class SheetASchema(colander.MappingSchema):
        count = colander.SchemaNode(colander.Int(),
                                    missing=colander.drop,
                                    default=0)
    meta = sheet_meta._replace(isheet=ISheet,
                               schema_class=SheetASchema,
                               sheet_class=GenericResourceSheet,
                               readable=True,
                               editable=True,
                               creatable=True)
    return meta


class TestResourcePropertySheet:

    @fixture
    def mock_node_unique_references(self):
        from adhocracy_core.schema import UniqueReferences
        from adhocracy_core.schema import SheetReference
        mock = Mock(spec=UniqueReferences)
        mock.readonly = False
        mock.name = 'references'
        mock.backref = False
        mock.reftype = SheetReference
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
        return mock

    def make_one(self, sheet_meta, context):
        from adhocracy_core.sheets import GenericResourceSheet
        return GenericResourceSheet(sheet_meta, context)

    def test_create_valid(self, sheet_meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        inst = self.make_one(sheet_meta, context)
        assert inst.context == context
        assert inst.meta == sheet_meta
        assert isinstance(inst.schema, sheet_meta.schema_class)
        assert inst._data_key == sheet_meta.isheet.__identifier__
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)

    def test_get_empty(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        assert inst.get() == {'count': 0}

    def test_get_non_empty(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        inst._data['count'] = 11
        assert inst.get() == {'count': 11}

    def test_set_valid(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        assert inst.set({'count': 11}) is True
        assert inst.get() == {'count': 11}

    def test_set_valid_empty(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        assert inst.set({}) is False
        assert inst.get() == {'count': 0}

    def test_set_valid_omit_str(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        assert inst.set({'count': 11}, omit='count') is False

    def test_set_valid_omit_tuple(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        assert inst.set({'count': 11}, omit=('count',)) is False

    def test_set_valid_omit_wrong_key(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        assert inst.set({'count': 11}, omit=('wrongkey',)) is True

    def test_set_valid_omit_readonly(self, sheet_meta, context):
        inst = self.make_one(sheet_meta, context)
        inst.schema['count'].readonly = True
        inst.set({'count': 11})
        assert inst.get() == {'count': 0}

    def test_set_valid_with_sheet_subtype_and_name_conflicts(self, sheet_meta,
                                                             context):
        sheet_a_meta = sheet_meta

        class ISheetB(sheet_a_meta.isheet):
            pass

        class SheetBSchema(sheet_a_meta.schema_class):
            count = colander.SchemaNode(colander.Int(),
                                        missing=colander.drop,
                                        default=0)

        sheet_b_meta = sheet_a_meta._replace(isheet=ISheetB,
                                             schema_class=SheetBSchema)
        inst_a = self.make_one(sheet_a_meta, context)
        inst_b = self.make_one(sheet_b_meta, context)

        inst_a.set({'count': 1})
        inst_b.set({'count': 2})

        assert inst_a.get() == {'count': 1}
        assert inst_b.get() == {'count': 2}

    def test_set_valid_references(self, sheet_meta, context, mock_graph,
                                  mock_node_unique_references, registry):
        from adhocracy_core.interfaces import ISheet
        inst = self.make_one(sheet_meta, context)
        node = mock_node_unique_references
        inst.schema.children.append(node)
        inst._graph = mock_graph
        target = testing.DummyResource()

        inst.set({'references': [target]})

        mock_graph.set_references_for_isheet.assert_called_with(
            context, ISheet, {'references': [target]}, registry)

    def test_get_valid_back_references(self, sheet_meta, context, mock_graph,
                                       mock_node_unique_references):
        inst = self.make_one(sheet_meta, context)
        node = mock_node_unique_references
        node.backref = True
        inst.schema.children.append(node)
        source = testing.DummyResource()
        mock_graph.get_back_references_for_isheet.return_value = {'': [source]}
        inst._graph = mock_graph

        appstruct = inst.get()

        assert appstruct['references'] == [source]

    def test_set_valid_reference(self, sheet_meta, context, mock_graph,
                                 mock_node_single_reference, registry):
        from adhocracy_core.interfaces import ISheet
        inst = self.make_one(sheet_meta, context)
        node = mock_node_single_reference
        inst.schema.children.append(node)
        inst._graph = mock_graph
        target = testing.DummyResource()
        inst.set({'reference': target})
        graph_set_args = mock_graph.set_references_for_isheet.call_args[0]
        assert graph_set_args == (context, ISheet, {'reference': target}, registry)


    def test_get_valid_reference(self, sheet_meta, context, mock_graph,
                                 mock_node_single_reference):
        inst = self.make_one(sheet_meta, context)
        node = mock_node_single_reference
        inst.schema.children.append(node)
        target = testing.DummyResource()
        mock_graph.get_references_for_isheet.return_value = {'reference':
                                                             [target]}
        inst._graph = mock_graph
        appstruct = inst.get()
        assert appstruct['reference'] == target

    def test_get_valid_back_reference(self, sheet_meta, context, mock_graph,
                                     mock_node_single_reference):
        from adhocracy_core.interfaces import ISheet
        inst = self.make_one(sheet_meta, context)
        node = mock_node_single_reference
        node.backref = True
        inst.schema.children.append(node)
        source = testing.DummyResource()
        mock_graph.get_back_references_for_isheet.return_value = {'': [source]}
        inst._graph = mock_graph
        appstruct = inst.get()
        assert appstruct['reference'] == source
        mock_graph.get_back_references_for_isheet.assert_called_with(context, ISheet)

    def test_notify_resource_sheet_modified(self, sheet_meta, context, config):
        from adhocracy_core.interfaces import IResourceSheetModified
        events = []
        listener = lambda event: events.append(event)
        config.add_subscriber(listener, IResourceSheetModified)
        inst = self.make_one(sheet_meta, context)

        inst.set({'dummy': 'data'})

        assert IResourceSheetModified.providedBy(events[0])
        assert events[0].object == context


class TestAddSheetToRegistry:

    @fixture
    def context(self):
        from adhocracy_core.interfaces import ISheet
        return testing.DummyResource(__provides__=ISheet)

    def _call_fut(self, sheet_meta, registry):
        from adhocracy_core.sheets import add_sheet_to_registry
        return add_sheet_to_registry(sheet_meta, registry)

    def test_register_valid_sheet_sheet_adapter(self, sheet_meta, registry, context):
        from adhocracy_core.utils import get_sheet
        self._call_fut(sheet_meta, registry)
        sheet = get_sheet(context, sheet_meta.isheet)
        assert sheet_meta.isheet == sheet.meta.isheet

    def test_register_valid_sheet_sheet_meta(self, sheet_meta, registry, mock_resource_registry, context):
        registry.content = mock_resource_registry
        self._call_fut(sheet_meta, registry)
        assert registry.content.sheets_meta ==\
            {sheet_meta.isheet.__identifier__: sheet_meta}

    def test_register_valid_sheet_sheet_meta_replace_exiting(self, sheet_meta, registry, context):
        from adhocracy_core.utils import get_sheet
        self._call_fut(sheet_meta, registry)
        meta_b = sheet_meta._replace(permission_view='META_B')
        self._call_fut(meta_b, registry)
        sheet = get_sheet(context, sheet_meta.isheet)
        assert sheet.meta == meta_b

    def test_register_non_valid_readonly_and_createmandatory(self, sheet_meta, registry):
        meta = sheet_meta._replace(editable=False,
                                   creatable=False,
                                   create_mandatory=True)
        with raises(AssertionError):
            self._call_fut(meta, registry)

    def test_register_non_valid_non_isheet(self, sheet_meta, registry):
        from zope.interface import Interface
        meta = sheet_meta._replace(isheet=Interface)
        with raises(AssertionError):
            self._call_fut(meta, registry)

    def test_register_non_valid_schema_without_default_values(self, sheet_meta, registry):
        del sheet_meta.schema_class.__class_schema_nodes__[0].default
        with raises(AssertionError):
            self._call_fut(sheet_meta, registry)

    def test_register_non_valid_schema_with_default_colander_drop(self, sheet_meta, registry):
        sheet_meta.schema_class.__class_schema_nodes__[0].default = colander.drop
        with raises(AssertionError):
            self._call_fut(sheet_meta, registry)

    def test_register_non_valid_non_mapping_schema(self, sheet_meta, registry):
        meta = sheet_meta._replace(schema_class=colander.TupleSchema)
        with raises(AssertionError):
            self._call_fut(meta, registry)

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
            self._call_fut(meta_b, registry)
