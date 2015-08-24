"""Proposal resource type."""
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ITag
from adhocracy_core.interfaces import IItem
from adhocracy_core.resources.badge import add_badge_assignments_service
from adhocracy_core.resources.comment import add_commentsservice
from adhocracy_core.resources.itemversion import itemversion_meta
from adhocracy_core.resources.item import item_meta
from adhocracy_core.resources.paragraph import IParagraph
from adhocracy_core.resources.rate import add_ratesservice
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.sheets.geo import IPoint

import adhocracy_core.sheets.comment
import adhocracy_core.sheets.badge
import adhocracy_core.sheets.document
import adhocracy_core.sheets.image
import adhocracy_core.sheets.workflow


class IDocumentVersion(IItemVersion):

    """Versionable item with Document propertysheet."""


document_version_meta = itemversion_meta._replace(
    iresource=IDocumentVersion,
    extended_sheets=(adhocracy_core.sheets.document.IDocument,
                     adhocracy_core.sheets.comment.ICommentable,
                     adhocracy_core.sheets.badge.IBadgeable,
                     adhocracy_core.sheets.rate.IRateable,
                     adhocracy_core.sheets.image.IImageReference,
                     adhocracy_core.sheets.title.ITitle,
                     ),
    permission_create='edit_document',
)


class IDocument(IItem):

    """All versions of a Proposal."""


document_meta = item_meta._replace(
    iresource=IDocument,
    element_types=(ITag,
                   IParagraph,
                   IDocumentVersion,
                   ),
    extended_sheets=(adhocracy_core.sheets.badge.IBadgeable,
                     ),
    item_type=IDocumentVersion,
    permission_create='create_document',
    is_implicit_addable=True,
    autonaming_prefix='document_',
)._add(after_creation=(
    add_commentsservice,
    add_ratesservice,
    add_badge_assignments_service,
))


class IGeoDocumentVersion(IDocumentVersion):

    """Versionable document with geo-location."""


geo_document_version_meta = document_version_meta._replace(
    iresource=IGeoDocumentVersion,
)._add(
    extended_sheets=(IPoint,)
)


class IGeoDocument(IDocument):

    """Geolocalisable document."""


geo_document_meta = document_meta._replace(
    iresource=IGeoDocument,
    element_types=(ITag,
                   IParagraph,
                   IGeoDocumentVersion)
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(document_version_meta, config)
    add_resource_type_to_registry(document_meta, config)
    add_resource_type_to_registry(geo_document_version_meta, config)
    add_resource_type_to_registry(geo_document_meta, config)
