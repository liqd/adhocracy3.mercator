"""Scripts to migrate legacy objects in existing databases."""
import logging  # pragma: no cover

from pyramid.threadlocal import get_current_registry
from substanced.util import find_catalog  # pragma: no cover
from substanced.util import find_service
from zope.interface import alsoProvides

from adhocracy_core.evolution import log_migration
from adhocracy_core.evolution import migrate_new_iresource
from adhocracy_core.evolution import migrate_new_sheet
from adhocracy_core.interfaces import search_query
from adhocracy_core.resources.badge import add_badge_assignments_service
from adhocracy_core.resources.badge import add_badges_service
from adhocracy_core.resources.logbook import add_logbook_service
from adhocracy_core.resources.rate import add_likesservice
from adhocracy_core.sheets.badge import IBadgeable
from adhocracy_core.sheets.badge import IHasBadgesPool
from adhocracy_core.sheets.logbook import IHasLogbookPool
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.rate import ILikeable
from adhocracy_core.sheets.rate import IRate
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_sheet_field
from adhocracy_mercator.resources.mercator import IMercatorProposal
from adhocracy_mercator.resources.mercator import IMercatorProposalVersion
from adhocracy_mercator.sheets.mercator import IIntroduction
from adhocracy_mercator.sheets.mercator import IMercatorSubResources
from adhocracy_mercator.sheets.mercator import ITitle
import adhocracy_core.resources.rate

logger = logging.getLogger(__name__)  # pragma: no cover


@log_migration
def evolve1_add_ititle_sheet_to_proposals(root):  # pragma: no cover
    """Migrate title value from ole IIntroduction sheet to ITitle sheet."""
    registry = get_current_registry()
    catalog = find_catalog(root, 'system')
    path = catalog['path']
    interfaces = catalog['interfaces']
    query = path.eq('/mercator') \
        & interfaces.eq(IMercatorProposalVersion) \
        & interfaces.noteq(ITitle)
    proposals = query.execute()
    catalogs = find_service(root, 'catalogs')
    for proposal in proposals:
        logger.info('updating {0}'.format(proposal))
        introduction = get_sheet_field(proposal, IMercatorSubResources,
                                       'introduction')
        if introduction == '' or introduction is None:
            continue
        alsoProvides(proposal, ITitle)
        catalogs.reindex_index(proposal, 'interfaces')
        sheet = registry.content.get_sheet(introduction, IIntroduction)
        if 'title' not in sheet.get().keys():
            continue
        value = sheet.get()['title']
        title = registry.content.get_sheet(proposal, ITitle)
        title.set({'title': value})
        sheet.delete_field_values(['title'])


def evolve2_disable_add_proposal_permission(root):  # pragma: no cover
    """(disabled) Disable add_proposal permissions."""


@log_migration
def evolve3_use_adhocracy_core_title_sheet(root):  # pragma: no cover
    """Migrate mercator title sheet to adhocracy_core title sheet."""
    from adhocracy_core.sheets.title import ITitle
    from adhocracy_mercator.sheets import mercator
    migrate_new_sheet(root, IMercatorProposalVersion, ITitle, mercator.ITitle,
                      remove_isheet_old=True,
                      fields_mapping=[('title', 'title')])


def evolve4_disable_voting_and_commenting(root):  # pragma: no cover
    """(disabled) Disable rate and comment permissions."""


@log_migration
def change_mercator_type_to_iprocess(root):  # pragma: no cover
    """Change mercator type from IBasicPoolWithAssets to IProcess."""
    from adhocracy_mercator.resources.mercator import IProcess
    from adhocracy_core.resources.asset import IPoolWithAssets
    from adhocracy_core.resources.badge import add_badges_service
    migrate_new_iresource(root, IPoolWithAssets, IProcess)
    registry = get_current_registry()
    mercator = root['mercator']
    if find_service(mercator, 'badges') is None:
        add_badges_service(mercator, registry, {})


@log_migration
def add_badge_assignments_services_to_proposal_items(root):  # pragma: no cover
    """Add badge assignments services to proposals."""
    catalogs = find_service(root, 'catalogs')
    query = search_query._replace(interfaces=IMercatorProposal)
    proposals = catalogs.search(query).elements
    registry = get_current_registry(root)
    for proposal in proposals:
        if find_service(proposal, 'badge_assignments') is None:
            logger.info('add badge assignments to {0}'.format(proposal))
            add_badge_assignments_service(proposal, registry, {})


@log_migration
def add_badgeable_sheet_to_proposal_versions(root):  # pragma: no cover
    """Add badgeable sheet to proposals versions."""
    migrate_new_sheet(root, IMercatorProposalVersion, IBadgeable)


@log_migration
def reset_workflow_state_to_result(root):  # pragma: no cover
    """Reset workflow state to 'result'."""
    pass  # set workflow state manually if needed


@log_migration
def add_logbook_service_to_proposal_items(root):  # pragma: no cover
    """Add logbook service to proposals."""
    catalogs = find_service(root, 'catalogs')
    query = search_query._replace(interfaces=IMercatorProposal)
    proposals = catalogs.search(query).elements
    registry = get_current_registry(root)
    for proposal in proposals:
        if find_service(proposal, 'logbook') is None:
            logger.info('add logbook service to {0}'.format(proposal))
            creator = get_sheet_field(proposal, IMetadata, 'creator')
            add_logbook_service(proposal, registry, {'creator': creator})


@log_migration
def add_haslogbookpool_sheet_to_proposal_versions(root):  # pragma: no cover
    """Add IHasLogbookPool sheet to proposals versions."""
    migrate_new_sheet(root, IMercatorProposalVersion, IHasLogbookPool)


@log_migration
def remove_mercator_workflow_assignment_sheet(root):  # pragma: no cover
    """Remove deprecated sheets.mercator.IWorkflowAssignment interface."""
    from adhocracy_core.sheets.workflow import IWorkflowAssignment
    from adhocracy_mercator import resources
    from adhocracy_mercator import sheets
    migrate_new_sheet(root,
                      resources.mercator.IProcess,
                      IWorkflowAssignment,
                      sheets.mercator.IWorkflowAssignment,
                      remove_isheet_old=True,
                      )


@log_migration
def make_mercator_proposals_badgeable(root):  # pragma: no cover
    """Add badge services processes and make mercator proposals badgeable."""
    from adhocracy_core.evolution import _search_for_interfaces
    from adhocracy_mercator.resources.mercator import IProcess
    catalogs = find_service(root, 'catalogs')
    proposals = _search_for_interfaces(catalogs, IMercatorProposal)
    registry = get_current_registry(root)
    for proposal in proposals:
        if not IBadgeable.providedBy(proposal):
            logger.info('add badgeable interface to {0}'.format(proposal))
            alsoProvides(proposal, IBadgeable)
        if 'badge_assignments' not in proposal:
            logger.info('add badge assignments to {0}'.format(proposal))
            add_badge_assignments_service(proposal, registry, {})
    processes = _search_for_interfaces(catalogs, IProcess)
    for process in processes:
        if not IHasBadgesPool.providedBy(process):
            logger.info('Add badges service to {0}'.format(process))
            add_badges_service(process, registry, {})
            alsoProvides(process, IHasBadgesPool)


@log_migration
def reindex_requested_funding(root):  # pragma: no cover
    """Reindex requested funding index for proposals (stores integer now)."""
    from adhocracy_core.evolution import _search_for_interfaces
    from adhocracy_mercator.resources.mercator import IMercatorProposalVersion
    catalogs = find_service(root, 'catalogs')
    index = catalogs['adhocracy']['mercator_requested_funding']
    proposals = _search_for_interfaces(catalogs, IMercatorProposalVersion)
    index.reset()
    for proposal in proposals:
        catalogs.reindex_index(proposal, 'mercator_requested_funding')


def _convert_rate_version(rate_version, likes, registry):   # pragma: no cover
    values = get_sheet(rate_version, IRate).get()
    if values['rate'] > 0:
        appstructs = {'adhocracy_core.sheets.rate.ILike':
                      {'object': values['object'],
                       'subject': values['subject'],
                       'like': 1}}
        like = registry.content.create(
            adhocracy_core.resources.rate.ILike.__identifier__,
            parent=likes)
        registry.content.create(
            adhocracy_core.resources.rate.ILikeVersion.__identifier__,
            parent=like,
            appstructs=appstructs)


def _convert_rates_to_likes(root):   # pragma: no cover
    catalogs = find_service(root, 'catalogs')
    query = search_query._replace(interfaces=IMercatorProposal)
    proposals = catalogs.search(query).elements
    registry = get_current_registry(root)
    for proposal in proposals:
        if find_service(proposal, 'likes') is None:
            logger.info('add likes service to {0}'.format(proposal))
            add_likesservice(proposal, registry, options={})
        likes = find_service(proposal, 'likes')
        rates = find_service(proposal, 'rates')
        if rates:
            query = search_query._replace(interfaces=IRate,
                                          frequency_of='rate',
                                          indexes={'tag': 'LAST'},
                                          root=proposal,)
            result = catalogs.search(query)
            for rate_version in result.elements:
                _convert_rate_version(rate_version, likes, registry)
        proposal.remove(rates.__name__)
        catalogs.reindex_index(proposal, 'rates')
        catalogs.reindex_index(proposal, 'likes')


@log_migration
def convert_rates_to_likes(root):   # pragma: no cover
    """Convert rates to likes."""
    migrate_new_sheet(root,
                      IMercatorProposal,
                      ILikeable,
                      IRateable,
                      remove_isheet_old=True)
    _convert_rates_to_likes(root)


def includeme(config):  # pragma: no cover
    """Register evolution utilities and add evolution steps."""
    config.add_evolution_step(evolve1_add_ititle_sheet_to_proposals)
    config.add_evolution_step(evolve2_disable_add_proposal_permission)
    config.add_evolution_step(evolve3_use_adhocracy_core_title_sheet)
    config.add_evolution_step(evolve4_disable_voting_and_commenting)
    config.add_evolution_step(change_mercator_type_to_iprocess)
    config.add_evolution_step(add_badge_assignments_services_to_proposal_items)
    config.add_evolution_step(add_badgeable_sheet_to_proposal_versions)
    config.add_evolution_step(reset_workflow_state_to_result)
    config.add_evolution_step(add_logbook_service_to_proposal_items)
    config.add_evolution_step(add_haslogbookpool_sheet_to_proposal_versions)
    config.add_evolution_step(remove_mercator_workflow_assignment_sheet)
    config.add_evolution_step(make_mercator_proposals_badgeable)
    config.add_evolution_step(reindex_requested_funding)
    config.add_evolution_step(convert_rates_to_likes)
