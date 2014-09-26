"""Custom catalog index."""
from hypatia.interfaces import IIndex
from hypatia.util import BaseIndexMixin
from persistent import Persistent
from substanced.catalog.indexes import SDIndex
from substanced.content import content
from substanced.util import find_objectmap
from substanced.util import get_oid
from zope.interface import implementer
import BTrees
import hypatia.query

from adhocracy_core.utils import find_graph


@content('Reference Index',
         is_index=True,
         )
@implementer(IIndex)
class ReferenceIndex(SDIndex, BaseIndexMixin, Persistent):

    """Uses the graph query isheet references."""

    family = BTrees.family64
    __parent__ = None
    __name__ = None

    def __init__(self, discriminator=None):
        self._not_indexed = self.family.IF.TreeSet()

    def document_repr(self, docid: int, default=None) -> str:
        """Read interface."""
        objectmap = find_objectmap(self.__parent__)
        path = objectmap.path_for(docid)
        if path is None:
            return default
        return path

    def reset(self):
        """Read interface."""
        self._not_indexed.clear()

    def index_doc(self, docid: int, context):
        """Read interface."""
        pass

    def unindex_doc(self, docid):
        """Read interface."""
        pass

    def reindex_doc(self, docid, obj):
        """Read interface."""
        pass

    def docids(self):
        """Read interface."""
        graph = find_graph(self.__parent__)
        return graph._objectmap.referencemap.refmap.items()

    indexed = docids
    """Read docids docstring."""

    def not_indexed(self):
        """Read interface."""
        return self._not_indexed

    def eq(self, isheet, isheet_field, target) -> hypatia.query.Eq:
        """Eq operator to concatenate queries.."""
        query = {'isheet': isheet,
                 'isheet_field': isheet_field,
                 'target': target,
                 }
        return hypatia.query.Eq(self, query)

    def apply(self, query: dict) -> BTrees.family64.IF.TreeSet:
        """Apply query parameters and return search result."""
        query_args = [query['isheet'],
                      query['isheet_field'],
                      query['target'],
                      ]
        return self._search(*query_args)

    applyEq = apply
    """Read apply docsting."""

    def _search(self, isheet, isheet_field, target=None):
        graph = find_graph(self.__parent__)
        # FIXME? unneeded objectid -> object -> objectid transformation
        backreferences = graph.get_back_references(target, base_isheet=isheet)
        result = self.family.IF.TreeSet()
        for source, isheet, field, target in backreferences:
            if field == isheet_field:
                docid = get_oid(source)
                result.add(docid)
        return result
