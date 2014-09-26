import unittest

from pyramid import testing
from pytest import fixture
from pytest import mark


def test_create_adhocracy_catalog_factory():
    from substanced.catalog import Keyword
    from . import AdhocracyCatalogFactory
    from . import Reference
    inst = AdhocracyCatalogFactory()
    assert isinstance(inst.tag, Keyword)
    assert isinstance(inst.reference, Reference)

    def setUp(self):
        self.config = testing.setUp()
        self.config.include('adhocracy_core.catalog')

@fixture
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.registry')
    config.include('adhocracy_core.graph')
    config.include('adhocracy_core.catalog')


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


@mark.usefixtures('integration')
def test_add_indexing_adapter():
    from substanced.interfaces import IIndexingActionProcessor
    assert IIndexingActionProcessor(object()) is not None


@mark.usefixtures('integration')
def test_add_directives(registry):
    assert 'add_catalog_factory' in registry._directives
    assert 'add_indexview' in registry._directives


@mark.usefixtures('integration')
def test_index_resource(pool_graph_catalog,):
    from substanced.util import find_service
    pool = pool_graph_catalog
    pool.add('child', testing.DummyResource())
    name_index = find_service(pool, 'catalogs', 'system', 'name')
    assert 'child' in [x for x in name_index.unique_values()]



