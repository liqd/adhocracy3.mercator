from unittest.mock import Mock
from pyramid import testing
from pytest import fixture
from pytest import mark


def test_create_adhocracy_catalog_indexes():
    from substanced.catalog import Keyword
    from .adhocracy import AdhocracyCatalogIndexes
    from .adhocracy import Reference
    inst = AdhocracyCatalogIndexes()
    assert isinstance(inst.tag, Keyword)
    assert isinstance(inst.reference, Reference)


@mark.usefixtures('integration')
def test_create_adhocracy_catalog(pool_graph, registry):
    from substanced.catalog import Catalog
    context = pool_graph
    catalogs = registry.content.create('Catalogs')
    context.add_service('catalogs', catalogs, registry=registry)
    catalogs.add_catalog('adhocracy')

    assert isinstance(catalogs['adhocracy'], Catalog)
    assert 'tag' in catalogs['adhocracy']
    assert 'reference' in catalogs['adhocracy']
    assert 'rate' in catalogs['adhocracy']
    assert 'rates' in catalogs['adhocracy']
    assert 'creator' in catalogs['adhocracy']
    assert 'item_creation_date' in catalogs['adhocracy']
    assert 'item_badge' in catalogs['adhocracy']
    assert 'private_visibility' in catalogs['adhocracy']
    assert 'badge' in catalogs['adhocracy']
    assert 'title' in catalogs['adhocracy']


class TestIndexMetadata:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def mock_sheet(self, mock_sheet, registry):
        from adhocracy_core.sheets.metadata import IMetadata
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IMetadata)
        registry.content.get_sheet.return_value = mock_sheet
        return mock_sheet

    def test_creator_exists(self, context, mock_sheet):
        from .adhocracy import index_creator
        context['user1'] = testing.DummyResource()
        mock_sheet.get.return_value = {'creator': context['user1']}
        assert index_creator(context, 'default') == '/user1'

    def test_creator_does_not_exists(self, context, mock_sheet):
        from .adhocracy import index_creator
        context['user1'] = testing.DummyResource()
        mock_sheet.get.return_value = {'creator': ''}
        assert index_creator(context, 'default') == ''

    def test_item_creation_date(self, context, mock_sheet):
        import datetime
        from .adhocracy import index_item_creation_date
        context['user1'] = testing.DummyResource()
        some_date = datetime.datetime(2009, 7, 12)
        mock_sheet.get.return_value = {'item_creation_date': some_date}
        assert index_item_creation_date(context, 'default') == some_date


@mark.usefixtures('integration')
def test_includeme_register_index_creator(registry):
    from adhocracy_core.sheets.metadata import IMetadata
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IMetadata,), IIndexView,
                                    name='adhocracy|creator')


def test_index_visibility_visible(context):
    from .adhocracy import index_visibility
    assert index_visibility(context, 'default') == ['visible']


def test_index_visibility_deleted(context):
    from .adhocracy import index_visibility
    assert index_visibility(context, 'default') == ['visible']
    context.deleted = True
    assert index_visibility(context, 'default') == ['deleted']


def test_index_visibility_hidden(context):
    from .adhocracy import index_visibility
    context.hidden = True
    assert index_visibility(context, 'default') == ['hidden']


def test_index_visibility_both(context):
    from .adhocracy import index_visibility
    context.deleted = True
    context.hidden = True
    assert sorted(index_visibility(context, 'default')) == ['deleted', 'hidden']


@mark.usefixtures('integration')
def test_includeme_register_index_visibilityreator(registry):
    from adhocracy_core.sheets.metadata import IMetadata
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IMetadata,), IIndexView,
                                    name='adhocracy|private_visibility')


class TestIndexRate:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def item(self, pool, service):
        pool['rates'] = service
        return pool

    @fixture
    def mock_rate_sheet(self, mock_sheet):
        from copy import deepcopy
        from adhocracy_core.sheets.rate import IRate
        mock_sheet = deepcopy(mock_sheet)
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IRate)
        return mock_sheet

    @fixture
    def mock_catalogs(self, monkeypatch, mock_catalogs) -> Mock:
        from . import adhocracy
        monkeypatch.setattr(adhocracy, 'find_service',
                            lambda x, y: mock_catalogs)
        return mock_catalogs

    @fixture
    def mock_rateable_sheet(self, mock_sheet):
        from copy import deepcopy
        from adhocracy_core.sheets.rate import IRateable
        mock_sheet = deepcopy(mock_sheet)
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IRateable)
        return mock_sheet

    def test_index_rate(self, context, mock_rate_sheet, registry):
        from .adhocracy import index_rate
        context['rateable'] = testing.DummyResource()
        registry.content.get_sheet.return_value = mock_rate_sheet
        mock_rate_sheet.get.return_value = {'rate': 1}
        assert index_rate(context['rateable'], None) == 1

    def test_index_rates_with_last_tag(self, item, mock_catalogs, search_result):
        from .adhocracy import index_rates
        dummy_rateable = testing.DummyResource()
        search_result = search_result._replace(frequency_of={1: 5})
        mock_catalogs.search.return_value = search_result
        item['rates']['rate'] = testing.DummyResource()
        item['rateable'] = dummy_rateable
        assert index_rates(item['rateable'], None) == 5

    def test_index_rates_with_another_tag(self, item, mock_catalogs,
                                          search_result):
        dummy_rateable = testing.DummyResource()
        search_result = search_result._replace(frequency_of={})
        mock_catalogs.search.return_value = search_result
        item['rates']['rate'] = testing.DummyResource()
        from .adhocracy import index_rates
        item['rateable'] = dummy_rateable
        assert index_rates(item['rateable'], None) == 0


@mark.usefixtures('integration')
def test_includeme_register_index_rate(registry):
    from adhocracy_core.sheets.rate import IRate
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IRate,), IIndexView,
                                    name='adhocracy|rate')


@mark.usefixtures('integration')
def test_includeme_register_index_rates(registry):
    from adhocracy_core.sheets.rate import IRateable
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IRateable,), IIndexView,
                                    name='adhocracy|rates')


def test_index_tag_with_tags(context, mock_graph):
    from .adhocracy import index_tag
    context.__graph__ = mock_graph
    tag = testing.DummyResource(__name__='tag')
    mock_graph.get_back_reference_sources.return_value = [tag]
    assert index_tag(context, 'default') == ['tag']


def test_index_tag_without_tags(context, mock_graph):
    from .adhocracy import index_tag
    context.__graph__ = mock_graph
    mock_graph.get_back_reference_sources.return_value = []
    assert index_tag(context, 'default') == 'default'


@mark.usefixtures('integration')
def test_includeme_register_index_rates(registry):
    from adhocracy_core.sheets.versions import IVersionable
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IVersionable,), IIndexView,
                                    name='adhocracy|tag')


class TestIndexBadge:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def mock_catalogs(self, monkeypatch, mock_catalogs) -> Mock:
        from . import adhocracy
        monkeypatch.setattr(adhocracy, 'find_service',
                            lambda x, y: mock_catalogs)
        return mock_catalogs

    def test_index_badge(self, context, mock_catalogs, search_result, query):
        from adhocracy_core.sheets.badge import IBadgeAssignment
        from .adhocracy import index_badge

        badge = testing.DummyResource(__name__='badge')
        assignment = testing.DummyResource(__name__='assignement')
        result_assignments = search_result._replace(elements=[assignment])
        result_badges = search_result._replace(elements=[badge])
        mock_catalogs.search.side_effect = [result_assignments, result_badges]

        assert index_badge(context, None) == ['badge']
        search_calls = mock_catalogs.search.call_args_list
        query_assignments = query._replace(references = [(None, IBadgeAssignment,
                                                          'object', context)],
                                           only_visible=True)
        assert search_calls[0][0][0] == query_assignments
        query_badges = query._replace(references = [(assignment, IBadgeAssignment,
                                                     'badge', None)],
                                            only_visible=True)
        assert search_calls[1][0][0] == query_badges


@mark.usefixtures('integration')
def test_includeme_register_index_badge(registry):
    from adhocracy_core.sheets.badge import IBadgeable
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IBadgeable,), IIndexView,
                                    name='adhocracy|badge')


class TestIndexItemBadge:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def mock_catalogs(self, monkeypatch, mock_catalogs) -> Mock:
        from . import adhocracy
        monkeypatch.setattr(adhocracy, 'find_service',
                            lambda x, y: mock_catalogs)
        return mock_catalogs

    def test_return_default_if_no_item_in_lineage(self, context):
        from .adhocracy import index_item_badge
        assert index_item_badge(context, 'default') == 'default'

    def test_return_badge_name_of_item(
            self, item, context, mock_catalogs, search_result, query):
        from adhocracy_core.sheets.badge import IBadgeAssignment
        from .adhocracy import index_item_badge

        badge = testing.DummyResource(__name__='badge')
        assignment = testing.DummyResource(__name__='assignement')
        result_assignments = search_result._replace(elements=[assignment])
        result_badges = search_result._replace(elements=[badge])
        mock_catalogs.search.side_effect = [result_assignments, result_badges]
        item['version'] = context

        assert index_item_badge(item['version'], None) == ['badge']
        search_calls = mock_catalogs.search.call_args_list
        query_assignments = query._replace(references = [(None, IBadgeAssignment,
                                                          'object', item)],
                                           only_visible=True)
        assert search_calls[0][0][0] == query_assignments
        query_badges = query._replace(references = [(assignment, IBadgeAssignment,
                                                     'badge', None)],
                                            only_visible=True)
        assert search_calls[1][0][0] == query_badges

    @mark.usefixtures('integration')
    def test_includeme_register_index_item_badge(self, registry):
        from adhocracy_core.sheets.versions import IVersionable
        from substanced.interfaces import IIndexView
        assert registry.adapters.lookup((IVersionable,), IIndexView,
                                        name='adhocracy|item_badge')


class TestIndexTitle:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def mock_sheet(self, mock_sheet, registry):
        from adhocracy_core.sheets.title import ITitle
        mock_sheet.meta = mock_sheet.meta._replace(isheet=ITitle)
        registry.content.get_sheet.return_value = mock_sheet
        return mock_sheet

    def test_return_title(self, context, mock_sheet):
        from .adhocracy import index_title
        mock_sheet.get.return_value = {'title': 'Title'}
        assert index_title(context, 'default') == 'Title'

    @mark.usefixtures('integration')
    def test_register(self, registry):
        from adhocracy_core.sheets.title import ITitle
        from substanced.interfaces import IIndexView
        assert registry.adapters.lookup((ITitle,), IIndexView,
                                        name='adhocracy|title')

