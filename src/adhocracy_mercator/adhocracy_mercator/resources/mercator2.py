"""Proposal forms for the 2016 advocate europe participation process.

Proposals are not versionable anymore.
"""

from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources import process
from adhocracy_core.resources import proposal
from adhocracy_core.interfaces import ISimple
from adhocracy_core.resources.logbook import add_logbook_service
from adhocracy_core.resources.proposal import IProposal
from adhocracy_core.resources.simple import simple_meta
from adhocracy_core.sheets.comment import ICommentable
from adhocracy_core.sheets.description import IDescription
from adhocracy_core.sheets.rate import ILikeable
from adhocracy_core.sheets.title import ITitle
from adhocracy_core.sheets.image import IImageReference
from adhocracy_core.resources.comment import add_commentsservice
from adhocracy_core.resources.rate import add_likesservice
from adhocracy_core.resources.badge import add_badge_assignments_service

import adhocracy_mercator.sheets.mercator2
import adhocracy_core.sheets


class IPitch(ISimple):
    """Proposal's pitch."""


pitch_meta = simple_meta._replace(
    content_name='Pitch',
    iresource=IPitch,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='pitch',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IPitch,
        adhocracy_core.sheets.description.IDescription,
        adhocracy_core.sheets.comment.ICommentable),
)


class IPartners(ISimple):
    """Proposal's partners."""


partners_meta = simple_meta._replace(
    content_name='Partners',
    iresource=IPartners,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='partners',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IPartners,
        adhocracy_core.sheets.comment.ICommentable),
)


class IDuration(ISimple):
    """Duration."""

duration_meta = simple_meta._replace(
    content_name='duration',
    iresource=IDuration,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='duration',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IDuration,
        adhocracy_core.sheets.comment.ICommentable),
)


class IChallenge(ISimple):
    """Challenge."""

challenge_meta = simple_meta._replace(
    content_name='challenge',
    iresource=IChallenge,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='challenge',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IChallenge,
        adhocracy_core.sheets.comment.ICommentable),
)


class IGoal(ISimple):
    """Goal."""

goal_meta = simple_meta._replace(
    content_name='goal',
    iresource=IGoal,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='goal',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IGoal,
        adhocracy_core.sheets.comment.ICommentable),
)


class IPlan(ISimple):
    """Plan."""

plan_meta = simple_meta._replace(
    content_name='plan',
    iresource=IPlan,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='plan',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IPlan,
        adhocracy_core.sheets.comment.ICommentable),
)


class ITarget(ISimple):
    """Target."""

target_meta = simple_meta._replace(
    content_name='target',
    iresource=ITarget,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='target',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.ITarget,
        adhocracy_core.sheets.comment.ICommentable),
)


class ITeam(ISimple):
    """Team."""

team_meta = simple_meta._replace(
    content_name='team',
    iresource=ITeam,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='team',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.ITeam,
        adhocracy_core.sheets.comment.ICommentable),
)


class IExtraInfo(ISimple):
    """Extrainfo."""

extrainfo_meta = simple_meta._replace(
    content_name='extrainfo',
    iresource=IExtraInfo,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='extrainfo',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IExtraInfo,
        adhocracy_core.sheets.comment.ICommentable),
)


class IConnectionCohesion(ISimple):
    """Connectioncohesion."""

connectioncohesion_meta = simple_meta._replace(
    content_name='connectioncohesion',
    iresource=IConnectionCohesion,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='connectioncohesion',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IConnectionCohesion,
        adhocracy_core.sheets.comment.ICommentable),
)


class IDifference(ISimple):
    """Difference."""

difference_meta = simple_meta._replace(
    content_name='difference',
    iresource=IDifference,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='difference',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IDifference,
        adhocracy_core.sheets.comment.ICommentable),
)


class IPracticalRelevance(ISimple):
    """Practicalrelevance."""

practicalrelevance_meta = simple_meta._replace(
    content_name='practicalrelevance',
    iresource=IPracticalRelevance,
    permission_create='edit_proposal',
    use_autonaming=True,
    autonaming_prefix='practicalrelevance',
    extended_sheets=(
        adhocracy_mercator.sheets.mercator2.IPracticalRelevance,
        adhocracy_core.sheets.comment.ICommentable),
)


class IMercatorProposal(IProposal):
    """Mercator 2 proposal. Not versionable."""


proposal_meta = proposal.proposal_meta._replace(
    content_name='MercatorProposal2',
    iresource=IMercatorProposal,
    element_types=(IPitch,
                   IPartners,
                   IDuration,
                   IChallenge,
                   IGoal,
                   IPlan,
                   ITarget,
                   ITeam,
                   IExtraInfo,
                   IConnectionCohesion,
                   IDifference,
                   IPracticalRelevance,),
    after_creation=(
        add_commentsservice,
        add_likesservice,
        add_badge_assignments_service,
        add_logbook_service,)
)._add(extended_sheets=
       (ITitle,
        IDescription,
        ICommentable,
        ILikeable,
        IImageReference,
        adhocracy_mercator.sheets.mercator2.IMercatorSubResources,
        adhocracy_mercator.sheets.mercator2.IUserInfo,
        adhocracy_mercator.sheets.mercator2.IOrganizationInfo,
        adhocracy_mercator.sheets.mercator2.ITopic,
        adhocracy_mercator.sheets.mercator2.ILocation,
        adhocracy_mercator.sheets.mercator2.IStatus,
        adhocracy_mercator.sheets.mercator2.IFinancialPlanning,
        adhocracy_mercator.sheets.mercator2.IExtraFunding,
        adhocracy_mercator.sheets.mercator2.ICommunity,
        adhocracy_mercator.sheets.mercator2.IWinnerInfo))


class IProcess(process.IProcess):
    """Mercator 2 participation process."""


process_meta = process.process_meta._replace(
    iresource=IProcess,
    element_types=(IMercatorProposal,
                   ),
    workflow_name='mercator2'
)


def includeme(config):
    """Add resource type to content."""
    add_resource_type_to_registry(process_meta, config)
    add_resource_type_to_registry(proposal_meta, config)
    add_resource_type_to_registry(pitch_meta, config)
    add_resource_type_to_registry(partners_meta, config)
    add_resource_type_to_registry(duration_meta, config)
    add_resource_type_to_registry(challenge_meta, config)
    add_resource_type_to_registry(goal_meta, config)
    add_resource_type_to_registry(plan_meta, config)
    add_resource_type_to_registry(target_meta, config)
    add_resource_type_to_registry(team_meta, config)
    add_resource_type_to_registry(extrainfo_meta, config)
    add_resource_type_to_registry(connectioncohesion_meta, config)
    add_resource_type_to_registry(difference_meta, config)
    add_resource_type_to_registry(practicalrelevance_meta, config)
