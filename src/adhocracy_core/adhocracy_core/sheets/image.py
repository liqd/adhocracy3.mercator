"""image sheet."""
from colander import MappingSchema
from colander import OneOf
from colander import required
from adhocracy_core.interfaces import Dimensions
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.asset import AssetMetadataSchema
from adhocracy_core.sheets.asset import asset_metadata_meta
from adhocracy_core.schema import Reference
from adhocracy_core.schema import Resource
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import URL
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import SheetToSheet


class IImageMetadata(IAssetMetadata):
    """Marker interface for images."""


image_mime_type_validator = OneOf(('image/gif', 'image/jpeg', 'image/png'))


class ImageMetadataSchema(AssetMetadataSchema):
    """Data structure storing image asset metadata."""

    mime_type = SingleLine(missing=required,
                           validator=image_mime_type_validator)
    detail = Resource(dimensions=Dimensions(width=800, height=800))
    thumbnail = Resource(dimensions=Dimensions(width=100, height=100))


image_metadata_meta = asset_metadata_meta._replace(
    isheet=IImageMetadata,
    schema_class=ImageMetadataSchema,
)


class IImageReference(ISheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for an image reference."""


class ImageReference(SheetToSheet):
    """Reference to an image."""

    source_isheet = IImageReference
    source_isheet_field = 'picture'
    target_isheet = IImageMetadata


class ImageReferenceSchema(MappingSchema):
    """Data structure for the image reference sheet."""

    picture = Reference(reftype=ImageReference)
    picture_description = SingleLine()
    external_picture_url = URL()


image_reference_meta = asset_metadata_meta._replace(
    isheet=IImageReference,
    schema_class=ImageReferenceSchema,
)


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(image_metadata_meta, config.registry)
    add_sheet_to_registry(image_reference_meta, config.registry)
