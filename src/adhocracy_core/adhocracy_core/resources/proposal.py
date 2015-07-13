"""Proposal resource types."""
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.badge import add_badge_assignments_service
from adhocracy_core.resources.comment import add_commentsservice
from adhocracy_core.resources.item import item_meta
from adhocracy_core.resources.itemversion import itemversion_meta
from adhocracy_core.resources.rate import add_ratesservice
from adhocracy_core.sheets.badge import IBadgeable
from adhocracy_core.sheets.comment import ICommentable
from adhocracy_core.sheets.description import IDescription
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.sheets.title import ITitle


class IProposalVersion(IItemVersion):

    """Proposal version."""

proposal_version_meta = itemversion_meta._replace(
    content_name='ProposalVersion',
    iresource=IProposalVersion,
    extended_sheets=[IBadgeable,
                     ITitle,
                     IDescription,
                     ICommentable,
                     IRateable],
    permission_create='edit_proposal',
)


class IProposal(IItem):

    """Proposal versions pool."""

proposal_meta = item_meta._replace(
    content_name='Proposal',
    iresource=IProposal,
    element_types=[IProposalVersion],
    item_type=IProposalVersion,
    is_implicit_addable=True,
    permission_create='create_proposal',
)._add(after_creation=[
    add_commentsservice,
    add_ratesservice,
    add_badge_assignments_service,
])


def includeme(config):
    """Add resources type to content."""
    add_resource_type_to_registry(proposal_meta, config)
    add_resource_type_to_registry(proposal_version_meta, config)
