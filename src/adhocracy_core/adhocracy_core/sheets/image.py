"""image sheet."""
from colander import OneOf
from colander import All
from colander import Invalid
from pyramid.traversal import resource_path
from requests.exceptions import ConnectionError
from substanced.util import find_service
import requests

from adhocracy_core.interfaces import Dimensions
from adhocracy_core.interfaces import API_ROUTE_NAME
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.asset import AssetMetadataSchema
from adhocracy_core.sheets.asset import asset_metadata_meta
from adhocracy_core.schema import FileStoreType
from adhocracy_core.schema import MappingSchema
from adhocracy_core.schema import Reference
from adhocracy_core.schema import Resource
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import URL
from adhocracy_core.schema import SchemaNode
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import SheetToSheet


class IImageMetadata(IAssetMetadata):
    """Marker interface for images."""


image_mime_type_validator = OneOf(('image/gif', 'image/jpeg', 'image/png'))


def validate_image_data_mimetype(node: SchemaNode, value):
    """Validate image mime type of `value`."""
    mimetype = value.mimetype
    image_mime_type_validator(node, mimetype)


class ImageMetadataSchema(AssetMetadataSchema):
    """Data structure storing image asset metadata."""

    detail = Resource(dimensions=Dimensions(width=800, height=800),
                      readonly=True)
    thumbnail = Resource(dimensions=Dimensions(width=100, height=100),
                         readonly=True)
    original = Resource(dimensions=None,
                        readonly=True)


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


def picture_url_validator(node, value):
    """Validate picture url."""
    try:
        resp = requests.head(value, timeout=2)
    except ConnectionError:
        msg = 'Connection failed'.format(value)
        raise Invalid(node, msg)

    if resp.status_code != 200:
        msg = 'Connection failed, status is {} instead of 200'
        raise Invalid(node, msg.format(resp.status_code))

    mimetype = resp.headers.get('Content-Type', '')
    image_mime_type_validator(node, mimetype)

    size = int(resp.headers.get('Content-Length', '0'))
    if size > FileStoreType.SIZE_LIMIT:
        msg = 'Asset too large: {} bytes'.format(size)
        raise Invalid(node, msg)


def get_asset_choices(context, request) -> []:
    """Return asset choices based on the available `assets` service."""
    assets = find_service(context, 'assets')
    if assets is None:
        return []
    target_isheet = ImageReference.getTaggedValue('target_isheet')
    choices = [(request.resource_url(asset,
                                     route_name=API_ROUTE_NAME),
                resource_path(asset))
               for asset in assets.values()
               if target_isheet.providedBy(asset)]
    return choices


class ImageReferenceSchema(MappingSchema):
    """Data structure for the image reference sheet."""

    picture = Reference(reftype=ImageReference,
                        choices_getter=get_asset_choices)
    picture_description = SingleLine()
    external_picture_url = URL(validator=All(URL.validator,
                                             picture_url_validator,
                                             ))


image_reference_meta = asset_metadata_meta._replace(
    isheet=IImageReference,
    schema_class=ImageReferenceSchema,
)


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(image_metadata_meta, config.registry)
    add_sheet_to_registry(image_reference_meta, config.registry)
