"""Proposal resource type."""
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ITag
from adhocracy_core.interfaces import IItem
from adhocracy_core.resources.comment import IComment
from adhocracy_core.resources.sample_section import ISection
from adhocracy_core.resources.sample_paragraph import IParagraph
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.itemversion import itemversion_metadata
from adhocracy_core.resources.item import item_metadata

import adhocracy_core.sheets.document
import adhocracy_core.sheets.comment


class IProposalVersion(IItemVersion):

    """Versionable item with Document propertysheet."""


proposalversion_meta = itemversion_metadata._replace(
    content_name='ProposalVersion',
    iresource=IProposalVersion,
    extended_sheets=[adhocracy_core.sheets.document.IDocument,
                     adhocracy_core.sheets.comment.ICommentable
                     ],
)


class IProposal(IItem):

    """All versions of a Proposal."""


proposal_meta = item_metadata._replace(
    content_name='Proposal',
    iresource=IProposal,
    element_types=[ITag,
                   ISection,
                   IParagraph,
                   IComment,
                   IProposalVersion,
                   ],
    item_type=IProposalVersion,
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(proposalversion_meta, config)
    add_resource_type_to_registry(proposal_meta, config)
