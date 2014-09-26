from pyramid import testing
from pytest import fixture
from pytest import mark
from unittest.mock import Mock

from adhocracy_core.resources.pool import IBasicPool


@fixture
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.registry')
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_core.resources.pool')
    config.include('adhocracy_core.resources.tag')
    config.include('adhocracy_core.resources.item')
    config.include('adhocracy_core.resources.itemversion')
    config.include('adhocracy_core.sheets')


class TestPoolSchema:

    @fixture
    def request(self, cornice_request):
        return cornice_request

    def _make_one(self):
        from .pool import PoolSchema
        return PoolSchema()

    def test_serialize_empty(self):
        inst = self._make_one()
        assert inst.serialize() == {'elements': []}

    def test_serialize_empty_with_count_request_param(self, request):
        request.validated['count'] = True
        inst = self._make_one().bind(request=request)
        assert inst.serialize() == {'elements': [],
                                    'count': '0'}

    def test_serialize_empty_with_aggregateby_request_param(self, request):
        request.validated['aggregateby'] = 'index1'
        inst = self._make_one().bind(request=request)
        assert inst.serialize() == {'elements': [],
                                    'aggregateby': {}}


class TestFilteringPoolSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.pool import pool_metadata
        return pool_metadata

    @fixture
    def inst(self, meta, context):
        from adhocracy_core.sheets.pool import filter_elements_result
        inst = meta.sheet_class(meta, context)
        inst._filter_elements = Mock(spec=inst._filter_elements)
        inst._filter_elements.return_value = filter_elements_result(['Dummy'],
                                                                    1, {})
        return inst

    def test_create(self, inst):
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.sheets.pool import PoolSchema
        from adhocracy_core.sheets.pool import PoolSheet
        from zope.interface.verify import verifyObject
        assert isinstance(inst, PoolSheet)
        assert verifyObject(IResourceSheet, inst)
        assert IResourceSheet.providedBy(inst)
        assert inst.meta.schema_class == PoolSchema
        assert inst.meta.isheet == IPool
        assert inst.meta.editable is False
        assert inst.meta.creatable is False

    def test_get_empty(self, inst):
        assert inst.get() == {'elements': []}

    #FIXME: add check if the schema has a children named 'elements' with tagged
    #Value 'target_isheet'. This isheet is used to filter return data.

    def test_get_not_empty_with_target_isheet(self, inst, context):
        from adhocracy_core.interfaces import ISheet
        child = testing.DummyResource(__provides__=ISheet)
        context['child1'] = child
        assert inst.get() == {'elements': [child]}

    def test_get_not_empty_without_target_isheet(self, inst, context):
        child = testing.DummyResource()
        context['child1'] = child
        assert inst.get() == {'elements': []}

    def test_get_reference_appstruct_without_params(self, inst):
        appstruct = inst._get_reference_appstruct()
        assert inst._filter_elements.called is False
        assert appstruct == {'elements': []}

    def test_get_reference_appstruct_with_depth(self, inst):
        appstruct = inst._get_reference_appstruct(
            {'depth': '3', 'content_type': 'BlahType', 'count': True})
        assert inst._filter_elements.call_args[1] == {'depth': 3,
                                                      'ifaces': ['BlahType'],
                                                      'arbitrary_filters': {},
                                                      'resolve_resources': True,
                                                      'references': {},
                                                      'aggregate_filter': '',
                                                      }
        assert appstruct == {'elements': ['Dummy'], 'count': 1}

    def test_get_reference_appstruct_with_two_ifaces_and_two_arbitraryfilters(self, inst):
        appstruct = inst._get_reference_appstruct(
            {'content_type': 'BlahType', 'sheet': 'BlubSheet',
             'tag': 'BEST', 'rating': 'outstanding'})
        assert inst._filter_elements.call_args[1] == {
            'depth': 1,
            'ifaces': ['BlahType', 'BlubSheet'],
            'arbitrary_filters': {'tag': 'BEST', 'rating': 'outstanding'},
            'resolve_resources': True,
            'references': {},
            'aggregate_filter': '',
            }
        assert appstruct == {'elements': ['Dummy']}

    def test_get_reference_appstruct_with_default_params(self, inst):
        appstruct = inst._get_reference_appstruct(
            {'depth': '1', 'count': False})
        assert inst._filter_elements.called is False
        assert appstruct == {'elements': []}

    def test_get_reference_appstruct_with_depth_all(self, inst):
        appstruct = inst._get_reference_appstruct({'depth': 'all'})
        assert inst._filter_elements.call_args[1] == \
               {'depth': None,
                'ifaces': [],
                'arbitrary_filters': {},
                'resolve_resources': True,
                'references': {},
                'aggregate_filter': '',
                }
        assert appstruct == {'elements': ['Dummy']}

    def test_get_reference_appstruct_with_elements_omit(self, inst):
        appstruct = inst._get_reference_appstruct({'elements': 'omit'})
        assert inst._filter_elements.call_args[1]['resolve_resources'] is False
        assert 'elements' not in appstruct

    def test_get_reference_appstruct_aggregateby(self, inst):
        appstruct = inst._get_reference_appstruct({'aggregateby': 'interfaces'})
        assert inst._filter_elements.call_args[1] == \
               {'depth': 1,
                'ifaces': [],
                'arbitrary_filters': {},
                'resolve_resources': True,
                'references': {},
                'aggregate_filter': 'interfaces',
                }
        assert appstruct == {'elements': ['Dummy'], 'aggregateby': {}}

    def test_get_arbitrary_filters(self, meta, context):
        """remove all standard  and reference filter in get pool requests."""
        from adhocracy_core.rest.schemas import GETPoolRequestSchema
        inst = meta.sheet_class(meta, context)
        filters = GETPoolRequestSchema().serialize({})
        arbitrary_filters = {'index1': None}
        filters.update(arbitrary_filters)
        assert inst._get_arbitrary_filters(filters) == arbitrary_filters

    def test_get_reference_filters(self, meta, context):
        """remove all standard  and arbitrary filter in get pool requests."""
        from adhocracy_core.rest.schemas import GETPoolRequestSchema
        inst = meta.sheet_class(meta, context)
        filters = GETPoolRequestSchema().serialize({})
        reference_filters = {'sheet.ISheet1.reference:field1': None}
        filters.update(reference_filters)
        assert inst._get_reference_filters(filters) == reference_filters


@mark.usefixtures('integration')
class TestIntegrationPoolSheet:

    def _make_resource(self, registry, parent=None, name='pool',
                       content_type=IBasicPool):
        from adhocracy_core.sheets.name import IName
        appstructs = {IName.__identifier__: {'name': name}}
        return registry.content.create(
            content_type.__identifier__, parent, appstructs)

    def test_filter_elements_no_filters_with_direct_children(
            self, registry, pool_graph_catalog):
        """If no filter is specified, all direct children are returned."""
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        child1 = self._make_resource(registry, parent=pool, name='child1')
        child2 = self._make_resource(registry, parent=pool, name='child2')
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements().elements)
        assert result == {child1, child2}

    def test_filter_elements_no_filters_with_grandchildren_depth1(
            self, registry, pool_graph_catalog):
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        child = self._make_resource(registry, parent=pool, name='child')
        self._make_resource(registry, parent=child, name='grandchild')
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements().elements)
        assert result == {child}

    def test_filter_elements_no_filters_with_grandchildren_depth2(
            self, registry, pool_graph_catalog):
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        child = self._make_resource(registry, parent=pool, name='child')
        grandchild = self._make_resource(registry, parent=child,
                                         name='grandchild')
        self._make_resource(registry, parent=grandchild,
                            name='greatgrandchild')
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements(depth=2).elements)
        assert result == {child, grandchild}

    def test_filter_elements_no_filters_with_grandchildren_unlimited_depth(
            self, registry, pool_graph_catalog):
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        child = self._make_resource(registry, parent=pool, name='child')
        grandchild = self._make_resource(registry, parent=child,
                                         name='grandchild')
        greatgrandchild = self._make_resource(registry, parent=grandchild,
                                              name='greatgrandchild')
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements(depth=None).elements)
        assert result == {child, grandchild, greatgrandchild}

    def test_filter_elements_by_interface(
            self, registry, pool_graph_catalog):
        from adhocracy_core.interfaces import ITag
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        self._make_resource(registry, parent=pool, name='wrong_type_child')
        right_type_child = self._make_resource(registry, parent=pool,
                                               name='right_type_child',
                                               content_type=ITag)
        self._make_resource(registry, parent=pool_graph_catalog,
                            name='nonchild', content_type=ITag)
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements(ifaces=[ITag]).elements)
        assert result == {right_type_child}

    def test_filter_elements_by_interface_elements_omit(
            self, registry, pool_graph_catalog):
        from adhocracy_core.interfaces import ITag
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        self._make_resource(registry, parent=pool, name='wrong_type_child')
        right_type_child = self._make_resource(registry, parent=pool,
                                               name='right_type_child',
                                               content_type=ITag)
        self._make_resource(registry, parent=pool_graph_catalog,
                            name='nonchild', content_type=ITag)
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements(resolve_resources=False,
                                                ifaces=[ITag]).elements)
        assert result == {right_type_child.__oid__}

    def test_filter_elements_by_two_interfaces_both_present(
            self, registry, pool_graph_catalog):
        from adhocracy_core.interfaces import ITag
        from adhocracy_core.sheets.name import IName
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        self._make_resource(registry, parent=pool, name='wrong_type_child')
        right_type_child = self._make_resource(registry, parent=pool,
                                               name='right_type_child',
                                               content_type=ITag)
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements(ifaces=[ITag, IName]).elements)
        assert result == {right_type_child}

    def test_filter_elements_by_two_interfaces_just_one_present(
            self, registry, pool_graph_catalog):
        from adhocracy_core.interfaces import IItemVersion
        from adhocracy_core.interfaces import ITag
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        self._make_resource(registry, parent=pool, name='child1')
        self._make_resource(registry, parent=pool, name='child2', content_type=ITag)
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements(ifaces=[ITag, IItemVersion]).elements)
        assert result == set()

    def test_filter_elements_by_arbitraryfilter(
            self, registry, pool_graph_catalog):
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        untagged_child = self._make_resource(registry, parent=pool,
                                             name='untagged_child')
        poolsheet = get_sheet(pool, IPool)
        result = set(poolsheet._filter_elements(arbitrary_filters={'tag': 'LAST'}).elements)
        assert result == set()

    def test_filter_elements_by_referencefilter(self, registry, pool_graph_catalog):
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.interfaces import ITag
        from adhocracy_core.sheets import tags
        from adhocracy_core.utils import get_sheet
        pool = self._make_resource(registry, parent=pool_graph_catalog)
        other_child = self._make_resource(registry, parent=pool,
                                          name='other_child')
        tag_child = self._make_resource(registry, parent=pool, content_type=ITag,
                                        name='tag_child')
        tagsheet = get_sheet(tag_child, tags.ITag)
        tagsheet.set({'elements': [pool]})
        poolsheet = get_sheet(pool, IPool)
        reference_filters = {tags.ITag.__identifier__ + ':' + 'elements': pool}
        result = set(poolsheet._filter_elements(references=reference_filters).elements)
        assert result == set([tag_child])

    def test_filter_elements_with_aggregateby(self, registry, pool_graph_catalog):
        from adhocracy_core.resources.item import IItem
        from adhocracy_core.resources.itemversion import IItemVersion
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        item = self._make_resource(registry, parent=pool_graph_catalog,
                                   content_type=IItem)
        poolsheet = get_sheet(item, IPool)
        result = poolsheet._filter_elements(aggregate_filter='interfaces').aggregateby
        assert result['interfaces'][str(IItemVersion)] == 1
        # Values not matched by the query shouldn't be reported in the
        # aggregate
        assert str(IItem) not in result['interfaces']


@mark.usefixtures('integration')
def test_includeme_register_pool_sheet(config):
    from adhocracy_core.sheets.pool import IPool
    from adhocracy_core.utils import get_sheet
    context = testing.DummyResource(__provides__=IPool)
    assert get_sheet(context, IPool)
