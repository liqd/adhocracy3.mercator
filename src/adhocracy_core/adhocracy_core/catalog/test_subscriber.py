from unittest.mock import call
from unittest.mock import Mock
from pytest import fixture
from pytest import mark
from pyramid import testing


@fixture
def catalog():
    from substanced.interfaces import IService
    from substanced.interfaces import IFolder
    catalog = testing.DummyResource(__provides__=(IFolder, IService))
    catalog['adhocracy'] = testing.DummyResource(__provides__=(IFolder,
                                                               IService))
    catalog.reindex_index = Mock()
    return catalog


@fixture
def context(pool, catalog):
    pool['catalogs'] = catalog
    return pool


@fixture
def event(context):
    return testing.DummyResource(object=context)


def test_reindex_tagged_with_removed_and_added_elements(event, catalog):
    from .subscriber import reindex_tag
    reindex_tag(event)
    catalog.reindex_index.assert_called_with(event.object, 'tag')


def test_reindex_rate_index(event, catalog):
    from .subscriber import reindex_rates
    reindex_rates(event)
    catalog.reindex_index.assert_called_with(event.object, 'rates')


def test_reindex_badge_index(event, catalog, mock_sheet, registry_with_content):
    from .subscriber import reindex_badge
    badgeable = testing.DummyResource()
    mock_sheet.get.return_value = {'object': badgeable}
    registry_with_content.content.get_sheet.return_value = mock_sheet
    event.registry = registry_with_content
    reindex_badge(event)
    catalog.reindex_index.assert_called_with(badgeable, 'badge')


def test_reindex_item_badge(event, catalog):
    from unittest.mock import call
    from .subscriber import reindex_item_badge
    from adhocracy_core.sheets.versions import IVersionable
    event.object['version'] = testing.DummyResource(__provides__=IVersionable)
    event.object['other'] = testing.DummyResource()
    reindex_item_badge(event)

    index_calls = catalog.reindex_index.call_args_list
    assert call(event.object['version'], 'item_badge') in index_calls
    assert call(event.object['other'], 'item_badge') not in index_calls


@fixture
def mock_reindex(monkeypatch):
    from . import subscriber
    mock_reindex = Mock(spec=subscriber._reindex_resource_and_descendants)
    monkeypatch.setattr(subscriber,
                        '_reindex_resource_and_descendants',
                        mock_reindex)
    return mock_reindex


@fixture
def mock_visibility(monkeypatch):
    from . import subscriber
    mock_visibility = Mock(spec=subscriber.get_visibility_change)
    monkeypatch.setattr(subscriber,
                        'get_visibility_change',
                        mock_visibility)
    return mock_visibility


def test_reindex_visibility_concealed(event, mock_reindex, mock_visibility):
    from adhocracy_core.interfaces import VisibilityChange
    from .subscriber import reindex_visibility
    mock_visibility.return_value = VisibilityChange.concealed
    reindex_visibility(event)
    assert mock_reindex.called


def test_reindex_visibility_revealed(event, mock_reindex, mock_visibility):
    from adhocracy_core.interfaces import VisibilityChange
    from .subscriber import reindex_visibility
    mock_visibility.return_value = VisibilityChange.revealed
    reindex_visibility(event)
    assert mock_reindex.called


def test_reindex_visibility_invisible(event, mock_reindex, mock_visibility):
    from adhocracy_core.interfaces import VisibilityChange
    from .subscriber import reindex_visibility
    mock_visibility.return_value = VisibilityChange.invisible
    reindex_visibility(event)
    assert not mock_reindex.called


def test_reindex_visibility_visible(event, mock_reindex, mock_visibility):
    from adhocracy_core.interfaces import VisibilityChange
    from .subscriber import reindex_visibility
    mock_visibility.return_value = VisibilityChange.visible
    reindex_visibility(event)
    assert not mock_reindex.called


class TestReindexResourceAndDescendants:

    @fixture
    def mock_path_query(self):
        mock_query = Mock()
        return mock_query

    @fixture
    def catalog(self, catalog, mock_path_query):
        from substanced.interfaces import IService
        from substanced.interfaces import IFolder
        from substanced.catalog.indexes import PathIndex
        catalog['system'] = testing.DummyResource(__provides__=(IFolder,
                                                                IService))
        mock_path_index = Mock(spec=PathIndex)
        mock_path_index.eq.return_value = mock_path_query
        catalog['system']['path'] = mock_path_index
        return catalog

    def call_fut(self, context):
        from .subscriber import _reindex_resource_and_descendants
        return _reindex_resource_and_descendants(context)

    def test_resource_and_descentdants_reindexed(self, context, catalog,
                                                 mock_path_query):
        from pyramid.traversal import resource_path
        child = testing.DummyResource()
        mock_path_query.execute.return_value = [context, child]
        self.call_fut(context)
        assert catalog['system']['path'].eq.call_args == \
               call(resource_path(context), include_origin=True)
        mock_reindex = catalog.reindex_index
        assert call(child, 'private_visibility') in mock_reindex.call_args_list
        assert mock_reindex.call_count == 2


@mark.usefixtures('integration')
def test_register_subscriber(registry):
    from adhocracy_core.catalog import subscriber
    handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
    assert subscriber.reindex_tag.__name__ in handlers
    assert subscriber.reindex_visibility.__name__ in handlers
    assert subscriber.reindex_rates.__name__ in handlers
    assert subscriber.reindex_badge.__name__ in handlers
    assert subscriber.reindex_item_badge.__name__ in handlers


