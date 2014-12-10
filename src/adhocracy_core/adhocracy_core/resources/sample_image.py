"""Sample image resource type."""

from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.asset import asset_meta
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.sample_image import ISampleImageMetadata


class ISampleImage(IAsset):

    """An image asset, provided as example."""


sample_image_meta = asset_meta._replace(
    content_name='SampleImage',
    iresource=ISampleImage,
    is_implicit_addable=True,
    # replace IAssetMetadata sheet by ISampleImageMetadata
    basic_sheets=list(set(asset_meta.basic_sheets) - {IAssetMetadata, }
                      | {ISampleImageMetadata, }),
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(sample_image_meta, config)
