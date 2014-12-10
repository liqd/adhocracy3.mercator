"""Sample image sheet."""

from adhocracy_core.interfaces import Dimensions
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.asset import asset_metadata_meta


class ISampleImageMetadata(IAssetMetadata):

    """Marker interface for sample images."""


def _sample_image_mime_type_validator(mime_type: str) -> bool:
    return mime_type in ('image/gif', 'image/jpeg', 'image/png')


sample_image_metadata_meta = asset_metadata_meta._replace(
    isheet=ISampleImageMetadata,
    mime_type_validator=_sample_image_mime_type_validator,
    image_sizes={'thumbnail': Dimensions(width=100, height=50),
                 'detail': Dimensions(width=500, height=250)},
)


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(sample_image_metadata_meta, config.registry)
