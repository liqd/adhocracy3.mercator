"""Test custom catalog index."""
from pyramid import testing
from pytest import fixture
from pytest import raises


class TestReference:

    @fixture
    def catalog(self):
        from substanced.interfaces import IFolder
        catalog = testing.DummyResource(__provides__=IFolder,
                                        __is_service__=True)
        return catalog

    @fixture
    def context(self, pool_graph, catalog):
        pool_graph['catalogs'] = catalog
        return pool_graph

    def _make_one(self):
        from .index import ReferenceIndex
        index = ReferenceIndex()
        return index

    def test_create(self):
        from zope.interface.verify import verifyObject
        from hypatia.interfaces import IIndex
        inst = self._make_one()
        assert IIndex.providedBy(inst)
        assert verifyObject(IIndex, inst)

    def test_reset(self):
        inst = self._make_one()
        inst._not_indexed.add(1)
        inst.reset()
        assert 1 not in inst._not_indexed

    def test_document_repr(self, context, catalog):
        from substanced.util import get_oid
        inst = self._make_one()
        catalog['index'] = inst
        assert inst.document_repr(get_oid(context)) == ('',)

    def test_document_repr_missing(self, context, catalog):
        inst = self._make_one()
        catalog['index'] = inst
        assert inst.document_repr(1) is None

    def test_index_doc(self):
         inst = self._make_one()
         assert inst.index_doc(1, None) is None

    def test_unindex_doc(self):
         inst = self._make_one()
         assert inst.unindex_doc(1) is None

    def test_reindex_doc(self):
        inst = self._make_one()
        assert inst.reindex_doc(1, None) is None

    def test_docids(self, context, catalog):
         inst = self._make_one()
         catalog['index'] = inst
         assert list(inst.docids()) == []

    def test_not_indexed(self):
         inst = self._make_one()
         assert list(inst.not_indexed()) == []

    def test_search_reference_exists(self, context, catalog):
         from adhocracy_core.utils import find_graph
         from adhocracy_core.interfaces import SheetToSheet
         from adhocracy_core.interfaces import ISheet
         inst = self._make_one()
         catalog['index'] = inst
         graph = find_graph(context)
         target = testing.DummyResource()
         context.add('target', target)
         graph.set_references(context, [target], SheetToSheet)

         result = inst._search(ISheet, '', target)

         assert list(result) == [context.__oid__]

    def test_search_reference_exits_wrong_field_name(self, context, catalog):
         from adhocracy_core.utils import find_graph
         from adhocracy_core.interfaces import SheetToSheet
         from adhocracy_core.interfaces import ISheet
         inst = self._make_one()
         catalog['index'] = inst
         graph = find_graph(context)
         target = testing.DummyResource()
         context.add('target', target)
         graph.set_references(context, [target], SheetToSheet)

         result = inst._search(ISheet, 'WRONG_FIELD', target)

         assert list(result) == []

    def test_search_reference_nonexists(self, context, catalog):
         from adhocracy_core.interfaces import ISheet
         inst = self._make_one()
         catalog['index'] = inst
         target = testing.DummyResource()
         context.add('target', target)

         result = inst._search(ISheet, '', target)

         assert list(result) == []

    def test_apply_with_valid_query(self, context, catalog):
        from adhocracy_core.interfaces import ISheet
        inst = self._make_one()
        catalog['index'] = inst
        target = testing.DummyResource()
        context.add('target', target)
        query = {'isheet': ISheet,
                 'isheet_field': '',
                 'target': target,
                 }

        result = inst.apply(query)

        assert list(result) == []

    def test_apply_with_invalid_query(self):
        inst = self._make_one()
        query = {'WRONG': ''}
        #FIXME? better error message
        with raises(KeyError):
            inst.apply(query)

    def test_apply_intersect_reference_not_exists(self, context):
        # actually we test the default implementation in hypatia.util
        import BTrees
        from adhocracy_core.interfaces import ISheet
        inst = self._make_one()
        target = testing.DummyResource()
        context.add('target', inst)
        query = {'isheet': ISheet,
                 'isheet_field': '',
                 'target': target,
                 }
        other_result = BTrees.family64.IF.Set([1])
        result = inst.apply_intersect(query, other_result)
        assert list(result) == []

    def test_eq(self):
        from adhocracy_core.interfaces import ISheet
        inst = self._make_one()
        wanted = {'isheet': ISheet,
                  'isheet_field': '',
                  'target': None,
                 }
        result = inst.eq(ISheet, '', None)
        assert result._value == wanted
