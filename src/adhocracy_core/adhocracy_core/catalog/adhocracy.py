"""Adhocracy catalog and index views."""
from pyramid.traversal import resource_path
from pyramid.traversal import find_interface
from substanced import catalog
from substanced.catalog import IndexFactory
from substanced.util import find_service
from adhocracy_core.catalog.index import ReferenceIndex
from adhocracy_core.utils import is_deleted
from adhocracy_core.utils import is_hidden
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.rate import IRate
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.sheets.tags import TagElementsReference
from adhocracy_core.sheets.title import ITitle
from adhocracy_core.sheets.badge import IBadgeAssignment
from adhocracy_core.sheets.badge import IBadgeable
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.utils import get_sheet_field
from adhocracy_core.utils import find_graph
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import search_query


class Reference(IndexFactory):

    """TODO: comment."""

    index_type = ReferenceIndex


class AdhocracyCatalogIndexes:

    """Default indexes for the adhocracy catalog.

    Indexes starting with `private_` are private (not queryable from the
    frontend).
    """

    tag = catalog.Keyword()
    private_visibility = catalog.Keyword()  # visible / deleted / hidden
    badge = catalog.Keyword()
    item_badge = catalog.Keyword()
    title = catalog.Field()
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


def index_title(resource, default) -> str:
    """Return the value of field name ` title`."""
    title = get_sheet_field(resource, ITitle, 'title')
    return title


def index_rate(resource, default) -> int:
    """Return the value of field name `rate` for :class:`IRate` resources."""
    rate = get_sheet_field(resource, IRate, 'rate')
    return rate


def index_rates(resource, default) -> int:
    """
    Return aggregated values of referenceing :class:`IRate` resources.

    Only the LAST version of each rate is counted.
    """
    catalogs = find_service(resource, 'catalogs')
    query = search_query._replace(interfaces=IRate,
                                  frequency_of='rate',
                                  indexes={'tag': 'LAST'},
                                  references=[(None, IRate, 'object', resource)
                                              ],
                                  )
    result = catalogs.search(query)
    rate_sum = 0
    for value, count in result.frequency_of.items():
        rate_sum += value * count
    return rate_sum


def index_tag(resource, default) -> [str]:
    """Return value for the tag index."""
    graph = find_graph(resource)
    tags = graph.get_back_reference_sources(resource, TagElementsReference)
    tagnames = [tag.__name__ for tag in tags]
    return tagnames if tagnames else default


def index_badge(resource, default) -> [str]:
    """Return value for the badge index."""
    catalogs = find_service(resource, 'catalogs')
    reference = (None, IBadgeAssignment, 'object', resource)
    query = search_query._replace(references=[reference],
                                  only_visible=True,
                                  )
    assignments = catalogs.search(query).elements
    badge_names = []
    for assignment in assignments:
        reference = (assignment, IBadgeAssignment, 'badge', None)
        query = search_query._replace(references=[reference],
                                      only_visible=True,
                                      )
        badges = catalogs.search(query).elements
        badge_names += [b.__name__ for b in badges]
    return badge_names


def index_item_badge(resource, default) -> [str]:
    """Find item and return its badge names for the item_badge index."""
    item = find_interface(resource, IItem)
    if item is None:
        return default
    badge_names = index_badge(item, default)
    return badge_names


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
    config.add_indexview(index_title,
                         catalog_name='adhocracy',
                         index_name='title',
                         context=ITitle,
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
    config.add_indexview(index_badge,
                         catalog_name='adhocracy',
                         index_name='badge',
                         context=IBadgeable,
                         )
    config.add_indexview(index_item_badge,
                         catalog_name='adhocracy',
                         index_name='item_badge',
                         context=IVersionable,
                         )
