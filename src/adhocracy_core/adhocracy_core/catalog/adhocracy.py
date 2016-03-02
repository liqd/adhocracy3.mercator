"""Adhocracy catalog and index views."""
from pyramid.traversal import resource_path
from pyramid.traversal import find_interface
from substanced import catalog
from substanced.catalog import IndexFactory
from substanced.util import find_service
from adhocracy_core.catalog.index import ReferenceIndex
from adhocracy_core.exceptions import RuntimeConfigurationError
from adhocracy_core.utils import is_deleted
from adhocracy_core.utils import is_hidden
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import search_query
from adhocracy_core.resources.comment import ICommentVersion
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.rate import IRate
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.sheets.tags import ITags
from adhocracy_core.sheets.rate import ILike
from adhocracy_core.sheets.rate import ILikeable
from adhocracy_core.sheets.title import ITitle
from adhocracy_core.sheets.badge import IBadgeAssignment
from adhocracy_core.sheets.badge import IBadgeable
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.sheets.workflow import IWorkflowAssignment
from adhocracy_core.sheets.principal import IUserBasic
from adhocracy_core.sheets.principal import IUserExtended
from adhocracy_core.utils import get_sheet_field
from adhocracy_core.utils import get_sheet


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
    like = catalog.Field()
    likes = catalog.Field()
    creator = catalog.Field()
    item_creation_date = catalog.Field()
    workflow_state = catalog.Field()
    reference = Reference()
    user_name = catalog.Field()
    private_user_email = catalog.Field()
    private_user_activation_path = catalog.Field()


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


def index_like(resource, default) -> int:
    """Return the value of field name `like` for :class:`ILike` resources."""
    like = get_sheet_field(resource, ILike, 'like')
    return like


def _sum_items(result) -> int:
    items_sum = 0
    for value, count in result.frequency_of.items():
        items_sum += value * count
    return items_sum


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
    return _sum_items(result)


def index_likes(resource, default) -> int:
    """
    Return aggregated values of referenceing :class:`ILike` resources.

    Only the LAST version of each like is counted.
    """
    catalogs = find_service(resource, 'catalogs')
    query = search_query._replace(interfaces=ILike,
                                  frequency_of='like',
                                  indexes={'tag': 'LAST'},
                                  references=[(None, ILike, 'object', resource)
                                              ],
                                  )
    result = catalogs.search(query)
    return _sum_items(result)


def index_comments(resource, default) -> int:
    """
    Return aggregated values of comments below the `item` parent of `resource`.

    Only the LAST version of each like is counted.
    """
    item = find_interface(resource, IItem)
    catalogs = find_service(resource, 'catalogs')
    query = search_query._replace(root=item,
                                  interfaces=ICommentVersion,
                                  indexes={'tag': 'LAST'},
                                  )
    result = catalogs.search(query)
    return result.count


def index_tag(resource, default) -> [str]:
    """Return value for the tag index."""
    item = find_interface(resource, IItem)
    if item is None:  # ease testing
        return
    tags_sheet = get_sheet(item, ITags)
    tagnames = [f for f, v in tags_sheet.get().items() if v is resource]
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


def index_workflow_state(resource, default) -> [str]:
    """Return value for the workflow_state index."""
    state = get_sheet_field(resource, IWorkflowAssignment, 'workflow_state')
    return state


def index_workflow_state_of_item(resource, default) -> [str]:
    """Find item and return it`s value for the workflow_state index."""
    item = find_interface(resource, IItem)
    try:
        state = get_sheet_field(item, IWorkflowAssignment, 'workflow_state')
    except (RuntimeConfigurationError, AttributeError):
        return default
    else:
        return state


def index_user_name(resource, default) -> str:
    """Return value for the user_name index."""
    name = get_sheet_field(resource, IUserBasic, 'name')
    return name


def index_user_email(resource, default) -> str:
    """Return value for the private_user_email index."""
    name = get_sheet_field(resource, IUserExtended, 'email')
    return name


def index_user_activation_path(resource, default) -> str:
    """Return value for the private_user_activationpath index."""
    path = getattr(resource, 'activation_path', None)
    if path is None:
        return default
    return path


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
    config.add_indexview(index_like,
                         catalog_name='adhocracy',
                         index_name='like',
                         context=ILike)
    config.add_indexview(index_likes,
                         catalog_name='adhocracy',
                         index_name='likes',
                         context=ILikeable)
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
    config.add_indexview(index_workflow_state,
                         catalog_name='adhocracy',
                         index_name='workflow_state',
                         context=IWorkflowAssignment,
                         )
    config.add_indexview(index_workflow_state_of_item,
                         catalog_name='adhocracy',
                         index_name='workflow_state',
                         context=IVersionable,
                         )
    config.add_indexview(index_user_name,
                         catalog_name='adhocracy',
                         index_name='user_name',
                         context=IUserBasic,
                         )
    config.add_indexview(index_user_email,
                         catalog_name='adhocracy',
                         index_name='private_user_email',
                         context=IUserExtended,
                         )
    config.add_indexview(index_user_activation_path,
                         catalog_name='adhocracy',
                         index_name='private_user_activation_path',
                         context=IUserBasic,
                         )
