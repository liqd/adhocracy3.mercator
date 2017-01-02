"""Test custom catalog index."""
from unittest.mock import Mock
from pyramid import testing
from pytest import fixture
from pytest import raises


class TestField:

    _marker = object()

    @fixture
    def inst(self):
        from hypatia.field import FieldIndex
        from BTrees import family64

        def _discriminator(obj, default):
            if obj is self._marker:
                return default
            return obj
        return FieldIndex(_discriminator, family64)

    def test_sort_integer_strings(self, inst):
        inst.index_doc(0, '-1')
        inst.index_doc(3, '10')
        inst.index_doc(1, '1')
        assert [x for x in inst.sort([0, 3, 1])] == [0, 1, 3]


class TestReference:

    @fixture
    def catalog(self):
        from substanced.interfaces import IService
        catalog = testing.DummyResource(__provides__=IService)
        return catalog

    @fixture
    def context(self, pool_graph, catalog):
        pool_graph['catalogs'] = catalog
        return pool_graph

    def make_one(self):
        from .index import ReferenceIndex
        index = ReferenceIndex()
        return index

    def test_create(self):
        from zope.interface.verify import verifyObject
        from hypatia.interfaces import IIndex
        inst = self.make_one()
        assert IIndex.providedBy(inst)
        assert verifyObject(IIndex, inst)

    def test_reset(self):
        inst = self.make_one()
        inst._not_indexed.add(1)
        inst.reset()
        assert 1 not in inst._not_indexed

    def test_document_repr(self, context, catalog):
        from substanced.util import get_oid
        inst = self.make_one()
        catalog['index'] = inst
        assert inst.document_repr(get_oid(context)) == ('',)

    def test_document_repr_missing(self, context, catalog):
        inst = self.make_one()
        catalog['index'] = inst
        assert inst.document_repr(1) is None

    def test_index_doc(self):
         inst = self.make_one()
         assert inst.index_doc(1, None) is None

    def test_unindex_doc(self):
         inst = self.make_one()
         assert inst.unindex_doc(1) is None

    def test_reindex_doc(self):
        inst = self.make_one()
        assert inst.reindex_doc(1, None) is None

    def test_docids(self, context, catalog):
         inst = self.make_one()
         catalog['index'] = inst
         assert list(inst.docids()) == []

    def test_not_indexed(self):
         inst = self.make_one()
         assert list(inst.not_indexed()) == []

    def test_search_raise_if_source_and_target_is_none(self):
         from adhocracy_core.interfaces import Reference
         from adhocracy_core.interfaces import ISheet
         inst = self.make_one()
         query = {'reference':  Reference(None, ISheet, '', None),
                  'traverse': False}
         with raises(ValueError):
            inst._search(query)

    def test_search_raise_if_source_and_target_is_not_none(self):
         from adhocracy_core.interfaces import Reference
         from adhocracy_core.interfaces import ISheet
         inst = self.make_one()
         query = {'reference': Reference(object(), ISheet, '', object()),
                  'traverse': False}
         with raises(ValueError):
            inst._search(query)

    def test_search_sources(self, mock_graph, mock_objectmap):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from adhocracy_core.interfaces import SheetToSheet
        target = testing.DummyResource()
        inst = self.make_one()
        inst.__graph__ = mock_graph
        mock_graph.get_reftypes.return_value = [(ISheet, '', SheetToSheet)]
        oid1, oid2 = 1, 2
        mock_objectmap.sourceids.return_value = [oid2, oid1]
        inst._objectmap = mock_objectmap
        query = {'reference': Reference(None, ISheet, '', target),
                 'traverse': False}
        result = inst._search(query)
        mock_objectmap.sourceids.assert_called_with(target, SheetToSheet)
        assert list(result) == [oid1, oid2]  # order is not preserved

    def test_search_targets(self, mock_graph, mock_objectmap):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from adhocracy_core.interfaces import SheetToSheet
        source = testing.DummyResource()
        inst = self.make_one()
        inst.__graph__ = mock_graph
        mock_graph.get_reftypes.return_value = [(ISheet, '', SheetToSheet)]
        oid1, oid2 = 1, 2
        mock_objectmap.targetids.return_value = [oid2, oid1]
        inst._objectmap = mock_objectmap
        query = {'reference': Reference(source, ISheet, '', None),
                 'traverse': False}
        result = inst._search(query)
        mock_objectmap.targetids.assert_called_with(source, SheetToSheet)
        assert list(result) == [oid1, oid2]  # order is not preserver

    def test_search_with_order_targets(self, mock_graph, mock_objectmap):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from adhocracy_core.interfaces import SheetToSheet
        source = testing.DummyResource()
        inst = self.make_one()
        inst.__graph__ = mock_graph
        mock_graph.get_reftypes.return_value = [(ISheet, '', SheetToSheet)]
        oid1, oid2 = 1, 2
        mock_objectmap.targetids.return_value = [oid2, oid1]
        inst._objectmap = mock_objectmap
        reference = Reference(source, ISheet, '', None)
        result = inst.search_with_order(reference)
        mock_objectmap.targetids.assert_called_with(source, SheetToSheet)
        assert list(result) == [oid2, oid1]

    def test_search_with_order_sources(self, mock_graph, mock_objectmap):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from adhocracy_core.interfaces import SheetToSheet
        target = testing.DummyResource()
        inst = self.make_one()
        inst.__graph__ = mock_graph
        mock_graph.get_reftypes.return_value = [(ISheet, '', SheetToSheet)]
        oid1, oid2 = 1, 2
        mock_objectmap.sourceids.return_value = [oid2, oid1]
        inst._objectmap = mock_objectmap
        reference = Reference(None, ISheet, '', target)
        result = inst.search_with_order(reference)
        mock_objectmap.sourceids.assert_called_with(target, SheetToSheet)
        assert list(result) == [oid2, oid1]

    def test_apply(self, mock_graph, mock_objectmap):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from adhocracy_core.interfaces import SheetToSheet
        mock_objectmap.sourceids.return_value = set([1])
        inst = self.make_one()
        inst._objectmap = mock_objectmap
        mock_graph.get_reftypes.return_value = [(ISheet, '', SheetToSheet)]
        inst.__graph__ = mock_graph
        target = testing.DummyResource()
        reference = Reference(None, ISheet, '', target)
        query = {'reference': reference}
        result = inst.apply(query)
        assert list(result) == [1]

    def test_apply_without_traverse(self, mock_graph, mock_objectmap):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from adhocracy_core.interfaces import SheetToSheet
        mock_objectmap.sourceids.return_value = set([1])
        inst = self.make_one()
        inst._objectmap = mock_objectmap
        mock_graph.get_reftypes.return_value = [(ISheet, '', SheetToSheet)]
        inst.__graph__ = mock_graph
        target = testing.DummyResource()
        reference = Reference(None, ISheet, '', target)
        query = {'reference': reference,
                 'traverse': False}
        result = inst.apply(query)
        assert list(result) == [1]

    def test_apply_with_traverse(self, mock_graph, mock_objectmap):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from adhocracy_core.interfaces import SheetToSheet
        mock_objectmap.sourceids.side_effect = [{1, 2}, {12}]
        inst = self.make_one()
        inst._objectmap = mock_objectmap
        mock_graph.get_reftypes.return_value = [(ISheet, '', SheetToSheet)]
        inst.__graph__ = mock_graph
        target = testing.DummyResource()
        reference = Reference(None, ISheet, '', target)
        query = {'reference': reference,
                 'traverse': True}
        result = inst.apply(query)
        assert list(result) == [1, 2, 12]

    def test_apply_raise_if_invalid_query(self):
        inst = self.make_one()
        query = {'WRONG': ''}
        with raises(KeyError):
            inst.apply(query)

    def test_apply_intersect_reference_not_exists(self, mock_objectmap, mock_graph):
        # actually we test the default implementation in hypatia.util
        import BTrees
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        mock_objectmap.sourceids.return_value = set()
        inst = self.make_one()
        inst._objectmap = mock_objectmap
        mock_graph.get_reftypes.return_value = []
        inst.__graph__ = mock_graph
        target = testing.DummyResource()
        reference = Reference(None, ISheet, '', target)
        query = {'reference': reference}
        other_result = BTrees.family64.IF.Set([1])
        result = inst.apply_intersect(query, other_result)
        assert list(result) == []

    def test_eq(self):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        from hypatia.query import Eq
        inst = self.make_one()
        target = testing.DummyResource()
        reference = Reference(None, ISheet, '', target)
        query = {'reference': reference}
        result = inst.eq(query)
        assert isinstance(result, Eq)
        assert result._value == query

    def test_apply_all(self):
        from adhocracy_core.interfaces import ISheet
        from adhocracy_core.interfaces import Reference
        import BTrees
        inst = self.make_one()
        query = {'reference': Reference(None, ISheet, '', object())}
        result_query = BTrees.family64.IF.TreeSet((1, 2, 3))
        query2 = {'reference': Reference(object(), ISheet, '',  None)}
        result_query2 = BTrees.family64.IF.TreeSet((2, 3, 4))
        inst._search = Mock(side_effect=[result_query, result_query2])
        result = inst.applyAll([query, query2])
        assert list(result) == [2, 3]
