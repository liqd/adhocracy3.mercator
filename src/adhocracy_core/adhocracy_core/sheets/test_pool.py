from unittest.mock import Mock

from pyramid import testing
from pytest import fixture
from pytest import mark
from pytest import raises

from adhocracy_core.resources.pool import IBasicPool


class TestPoolSchema:

    def make_one(self):
        from .pool import PoolSchema
        return PoolSchema().bind()

    def test_serialize_empty(self):
        inst = self.make_one()
        assert inst.serialize() == {'elements': []}


class TestFilteringPoolSheet:

    @fixture
    def request_(self, request_, registry_with_content):
        request_.registry = registry_with_content
        return request_

    @fixture
    def meta(self):
        from adhocracy_core.sheets.pool import pool_meta
        return pool_meta

    @fixture
    def inst(self, meta, context, registry_with_content):
        inst = meta.sheet_class(meta, context)
        return inst

    def test_create(self, context, meta):
        from adhocracy_core.sheets.pool import pool_meta
        inst = pool_meta.sheet_class(pool_meta, context)
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

    def test_get_no_children(self, inst,  sheet_catalogs):
        appstruct = inst.get()
        assert sheet_catalogs.search.called is False
        assert appstruct == {'elements': [],
                             'frequency_of': {},
                             'group_by': {},
                             'count': 0,
                             }

    def test_get_with_children(self, inst, context,  sheet_catalogs):
        from adhocracy_core.interfaces import ISheet
        with_target_isheet = testing.DummyResource(__provides__=ISheet)
        context['child1'] = with_target_isheet
        without_target_isheet = testing.DummyResource()
        context['child2'] = without_target_isheet
        appstruct = inst.get()
        assert appstruct['elements'] == [with_target_isheet]
        assert appstruct['count'] == 1

    def test_get_custom_search(self, inst, sheet_catalogs, search_result):
        from adhocracy_core.interfaces import ISheet
        child = testing.DummyResource()
        sheet_catalogs.search.return_value = search_result._replace(
            elements=[child],
            count=1,
            frequency_of={'y': 1},
            group_by={'y': [child]})
        appstruct = inst.get({'indexes': {'tag': 'LAST'}})
        query = sheet_catalogs.search.call_args[0][0]
        assert query.root is inst.context
        assert query.depth == 1
        assert query.interfaces == ISheet  # default elements target isheet
        assert query.indexes == {'tag': 'LAST'}
        assert appstruct == {'elements': [child],
                             'frequency_of': {'y': 1},
                             'group_by': {'y': [child]},
                             'count': 1,
                             }

    def test_get_cstruct(self, inst, request_):
        inst.get = Mock()
        child = testing.DummyResource()
        inst.get.return_value = {'elements': [child]}
        cstruct = inst.get_cstruct(request_)
        assert cstruct == {'elements': ['http://example.com/']}

    def test_get_cstruct_with_params(self, inst, request_):
        inst.get = Mock()
        inst.get.return_value = {'elements': []}
        cstruct = inst.get_cstruct(request_, params={'name': 'child'})
        assert 'name' in inst.get.call_args[1]['params']

    def test_get_cstruct_of_service_pool_with_default_params(
            self, inst, request_, service):
        inst.get = Mock()
        child = testing.DummyResource()
        inst.get.return_value = {'elements': [child],
                                 'count': 1}
        inst.context = service
        cstruct = inst.get_cstruct(request_, params={'root': inst.context,
                                                     'depth': 1})
        assert cstruct == {'elements': [],
                           'count': '1'}

    def test_get_cstruct_of_service_pool_with_params(self, inst, request_,
                                                     service):
        inst.get = Mock()
        child = testing.DummyResource()
        inst.get.return_value = {'elements': [child],
                                 'count': 1}
        inst.context = service
        cstruct = inst.get_cstruct(request_, params={'name': 'child'})
        assert cstruct == {'elements': ['http://example.com/']}

    def test_get_cstruct_filter_by_view_permission(self, inst, request_):
        inst.get = Mock()
        inst.get.return_value = {'elements': []}
        cstruct = inst.get_cstruct(request_)
        assert inst.get.call_args[1]['params']['allows'] == \
            (request_.effective_principals, 'view')

    def test_get_cstruct_filter_by_view_permission_disabled(self, inst,
                                                            request_):
        inst.registry.settings['adhocracy.filter_by_view_permission'] = 'False'
        inst.get = Mock()
        inst.get.return_value = {}
        cstruct = inst.get_cstruct(request_)
        assert 'allows' not in inst.get.call_args[1]['params']

    def test_get_cstruct_filter_by_only_visible(self, inst, request_):
        inst.get = Mock()
        inst.get.return_value = {'elements': []}
        cstruct = inst.get_cstruct(request_)
        assert inst.get.call_args[1]['params']['only_visible']

    def test_get_cstruct_filter_by_only_visible_disabled(self, inst, request_):
        inst.registry.settings['adhocracy.filter_by_visible'] = 'False'
        inst.get = Mock()
        inst.get.return_value = {}
        cstruct = inst.get_cstruct(request_)
        assert 'only_visible' not in inst.get.call_args[1]['params']

    def test_get_cstruct_with_serialization_content(self, inst, request_):
        inst.get = Mock()
        child = testing.DummyResource()
        inst.get.return_value = {'elements': [child]}
        cstruct = inst.get_cstruct(request_,
                                   params={'serialization_form': 'content'})
        assert cstruct['elements'] == \
            [{'content_type': 'adhocracy_core.interfaces.IResource',
              'data': {},
              'path': 'http://example.com/'}]

    def test_get_cstruct_with_serialization_omit(self, inst, request_):
        inst.get = Mock()
        child = testing.DummyResource()
        inst.get.return_value = {'elements': [child]}
        cstruct = inst.get_cstruct(request_,
                                   params={'serialization_form': 'omit'})
        assert cstruct['elements'] == []

    def test_get_cstruct_with_show_count(self, inst, request_):
        inst.get = Mock()
        child = testing.DummyResource()
        inst.get.return_value = {'count': 1}
        cstruct = inst.get_cstruct(request_,
                                   params={'show_count': True})
        assert cstruct['count'] == '1'

    def test_get_cstruct_with_show_aggregate(self, inst, request_):
        inst.get = Mock()
        child = testing.DummyResource()
        inst.get.return_value = {'frequency_of': {'y': 1}}
        cstruct = inst.get_cstruct(request_,
                                   params={'show_frequency': True,
                                           'frequency_of': 'index'})
        assert cstruct['aggregateby']['index'] == {'y': 1}


@mark.usefixtures('integration')
class TestIntegrationPoolSheet:

    @fixture
    def pool(self, pool_with_catalogs, registry):
        pool = self._make_resource(registry, parent=pool_with_catalogs,
                                   name='child')
        return pool

    def _make_resource(self, registry, parent=None, name='',
                       content_type=IBasicPool):
        from datetime import datetime
        from adhocracy_core.sheets.name import IName
        if name == '':
            name = datetime.now().isoformat()
        appstructs = {IName.__identifier__: {'name': name}}
        return registry.content.create(
            content_type.__identifier__, parent, appstructs)

    def _get_pool_sheet(self, pool):
        from adhocracy_core.sheets.pool import IPool
        from adhocracy_core.utils import get_sheet
        return get_sheet(pool, IPool)

    def test_get_empty(self, pool):
        inst = self._get_pool_sheet(pool)
        assert inst.get() == {'elements': [],
                              'frequency_of': {},
                              'group_by': {},
                              'count': 0,
                              }

    def test_get_custom_search_empty(self, registry, pool):
        child = self._make_resource(registry, parent=pool, name='child')
        inst = self._get_pool_sheet(pool)
        assert inst.get({'indexes': {'name':'WRONG'}})['elements'] == []

    def test_get_custom_search_not_empty(self, registry, pool):
        child = self._make_resource(registry, parent=pool, name='child')
        inst = self._get_pool_sheet(pool)
        assert inst.get({'indexes': {'name':'child'}})['elements'] == [child]


@mark.usefixtures('integration')
def test_includeme_register_pool_sheet(config):
    from adhocracy_core.sheets.pool import IPool
    from adhocracy_core.utils import get_sheet
    context = testing.DummyResource(__provides__=IPool)
    assert get_sheet(context, IPool)
