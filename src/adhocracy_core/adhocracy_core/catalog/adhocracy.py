"""Adhocracy catalog and index views."""
from pyramid.traversal import resource_path
from substanced import catalog
from substanced.catalog import IndexFactory
from adhocracy_core.catalog.index import ReferenceIndex
from adhocracy_core.utils import is_deleted
from adhocracy_core.utils import is_hidden
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.rate import IRate
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.sheets.tags import filter_by_tag
from adhocracy_core.sheets.tags import TagElementsReference
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.utils import get_sheet_field
from adhocracy_core.utils import find_graph


class Reference(IndexFactory):
    index_type = ReferenceIndex


class AdhocracyCatalogIndexes:

    """Default indexes for the adhocracy catalog.

    Indexes starting with `private_` are private (not queryable from the
    frontend).
    """

    tag = catalog.Keyword()
    private_visibility = catalog.Keyword()  # visible / deleted / hidden
    rate = catalog.Field()
    rates = catalog.Field()
    creator = catalog.Field()
    item_creation_date = catalog.Field()
    reference = Reference()


def index_creator(resource, default) -> str:
    """Return creator userid value for the creator index."""
    creator = get_sheet_field(resource, IMetadata, 'creator')
    if creator == '':  # FIXME the default value should be None
        return creator
    userid = resource_path(creator)
    return userid


def index_item_creation_date(resource, default) -> str:
    """Return creator userid value for the creator index."""
    date = get_sheet_field(resource, IMetadata, 'item_creation_date')
    return date


def index_visibility(resource, default) -> [str]:
    """Return value for the private_visibility index.

    The return value will be one of [visible], [deleted], [hidden], or
    [deleted, hidden].
    """
    # FIXME: be more dry, this almost the same like what
    # utils.get_reason_if_blocked is doing
    result = []
    if is_deleted(resource):
        result.append('deleted')
    if is_hidden(resource):
        result.append('hidden')
    if not result:
        result.append('visible')
    return result


def index_rate(resource, default) -> int:
    """Return the value of field name `rate` for :class:`IRate` resources."""
    rate = get_sheet_field(resource, IRate, 'rate')
    return rate


def index_rates(resource, default) -> int:
    """
    Return aggregated values of referenceing :class:`IRate` resources.

    Only the LAST version of each rate is counted.
    """
    rates = get_sheet_field(resource, IRateable, 'rates')
    last_rates = filter_by_tag(rates, 'LAST')
    rate_sum = 0
    for rate in last_rates:
        value = get_sheet_field(rate, IRate, 'rate')
        rate_sum += value
    return rate_sum


def index_tag(resource, default) -> [str]:
    """Return value for the tag index."""
    graph = find_graph(resource)
    tags = graph.get_back_reference_sources(resource, TagElementsReference)
    tagnames = [tag.__name__ for tag in tags]
    return tagnames if tagnames else default


def includeme(config):
    """Register adhocracy catalog factory."""
    config.add_catalog_factory('adhocracy', AdhocracyCatalogIndexes)
    config.add_indexview(index_visibility,
                         catalog_name='adhocracy',
                         index_name='private_visibility',
                         context=IMetadata,
                         )
    config.add_indexview(index_creator,
                         catalog_name='adhocracy',
                         index_name='creator',
                         context=IMetadata,
                         )
    config.add_indexview(index_item_creation_date,
                         catalog_name='adhocracy',
                         index_name='item_creation_date',
                         context=IMetadata,
                         )
    config.add_indexview(index_rate,
                         catalog_name='adhocracy',
                         index_name='rate',
                         context=IRate)
    config.add_indexview(index_rates,
                         catalog_name='adhocracy',
                         index_name='rates',
                         context=IRateable)
    config.add_indexview(index_tag,
                         catalog_name='adhocracy',
                         index_name='tag',
                         context=IVersionable,
                         )
