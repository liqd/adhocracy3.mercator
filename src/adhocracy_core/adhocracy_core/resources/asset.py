"""Resources for managing assets."""

from pyramid.registry import Registry
from substanced.file import File
from zope.deprecation import deprecated

from adhocracy_core.interfaces import Dimensions
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import IServicePool
from adhocracy_core.interfaces import ISimple
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.pool import pool_meta
from adhocracy_core.resources.service import service_meta
from adhocracy_core.resources.simple import simple_meta
from adhocracy_core.sheets.asset import AssetFileDownload
from adhocracy_core.sheets.asset import IAssetData
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.name import IName
from adhocracy_core.utils import get_matching_isheet
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import raise_colander_style_error
import adhocracy_core.sheets.metadata
import adhocracy_core.sheets.asset
import adhocracy_core.sheets.title


class IAssetDownload(ISimple):

    """Downloadable binary file for Assets."""


asset_download_meta = simple_meta._replace(
    content_name='AssetDownload',
    iresource=IAssetDownload,
    basic_sheets=[IName, IAssetData],
)


class IAsset(ISimple):

    """A generic asset (binary file)."""


def validate_and_complete_asset(context: IAsset,
                                registry: Registry,
                                options: dict={}):
    """Complete the initialization of an asset and ensure that it's valid."""
    data_sheet = get_sheet(context, IAssetData, registry=registry)
    data_appstruct = data_sheet.get()
    metadata_isheet = get_matching_isheet(context, IAssetMetadata)
    metadata_sheet = get_sheet(context, metadata_isheet, registry=registry)
    metadata_appstruct = metadata_sheet.get()
    file = data_appstruct['data']
    if not file:
        return  # to facilitate testing
    _validate_mime_type(file, metadata_appstruct, metadata_sheet)
    _store_size_and_filename_as_metadata(file,
                                         metadata_appstruct,
                                         metadata_sheet,
                                         registry=registry)
    _add_downloads_as_children(context, metadata_sheet, registry)


def _validate_mime_type(file: File,
                        metadata_appstruct: dict,
                        metadata_sheet: IAssetMetadata):
    detected_mime_type = file.mimetype
    claimed_mime_type = metadata_appstruct['mime_type']
    if detected_mime_type != claimed_mime_type:
        _raise_mime_type_error(
            metadata_sheet,
            'Claimed MIME type is {} but file content seems to be {}'.format(
                claimed_mime_type, detected_mime_type))
    mime_type_validator = metadata_sheet.meta.mime_type_validator
    if mime_type_validator is None:
        _raise_mime_type_error(
            metadata_sheet,
            'Sheet is abstract and does\'t allow storing data')
    if not mime_type_validator(detected_mime_type):
        _raise_mime_type_error(
            metadata_sheet,
            'Invalid MIME type for this sheet: {}'.format(detected_mime_type))


def _raise_mime_type_error(metadata_sheet: IAssetMetadata, msg: str):
        raise_colander_style_error(metadata_sheet.meta.isheet,
                                   'mime_type',
                                   msg)


def _store_size_and_filename_as_metadata(file: File,
                                         metadata_appstruct: dict,
                                         metadata_sheet: IAssetMetadata,
                                         registry: Registry):
    metadata_appstruct['size'] = file.size
    metadata_appstruct['filename'] = file.title
    metadata_sheet.set(metadata_appstruct,
                       omit_readonly=False)


def _add_downloads_as_children(context: IAsset,
                               metadata_sheet: IAssetMetadata,
                               registry: Registry):
    """
    Add raw and possible resized download objects as children of an asset.

    If a child with the same name already exists, it will be deleted and
    replaced.
    """
    _create_asset_download(context=context, name='raw', registry=registry)
    if metadata_sheet.meta.image_sizes:  # pragma: no branch
        for name, dimensions in metadata_sheet.meta.image_sizes.items():
            _create_asset_download(context=context, name=name,
                                   registry=registry, dimensions=dimensions)


def _create_asset_download(context: IAsset, name: str, registry: Registry,
                           dimensions: Dimensions=None) -> dict:
    file_download = AssetFileDownload(dimensions)
    if name in context:
        del context[name]
    appstructs = {IName.__identifier__: {'name': name},
                  IAssetData.__identifier__: {'data': file_download}}
    registry.content.create(IAssetDownload.__identifier__,
                            parent=context,
                            appstructs=appstructs,
                            registry=registry)


asset_meta = pool_meta._replace(
    content_name='Asset',
    iresource=IAsset,
    basic_sheets=[
        adhocracy_core.sheets.metadata.IMetadata,
        adhocracy_core.sheets.asset.IAssetData,
        adhocracy_core.sheets.title.ITitle,
    ],
    extended_sheets=[
        # all subtypes need to provide an IAssetMetadata sheet
        adhocracy_core.sheets.asset.IAssetMetadata,
    ],
    use_autonaming=True,
    permission_create='create_asset',
    after_creation=[validate_and_complete_asset],
)


class IAssetsService(IServicePool):

    """The 'assets' ServicePool."""


assets_service_meta = service_meta._replace(
    iresource=IAssetsService,
    content_name='assets',
    element_types=[IAsset],
)


class IPoolWithAssets(IPool):

    """A pool with an auto-created asset service pool."""


deprecated('IPoolWithAssets', 'Backward compatible code, use process instead')


def add_assets_service(context: IPool, registry: Registry, options: dict):
    """Add `assets` service to context."""
    registry.content.create(IAssetsService.__identifier__, parent=context)


pool_with_assets_meta = pool_meta._replace(
    iresource=IPoolWithAssets,
    after_creation=[add_assets_service],
    is_implicit_addable=True,
)._add(basic_sheets=[adhocracy_core.sheets.asset.IHasAssetPool])


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(asset_download_meta, config)
    add_resource_type_to_registry(asset_meta, config)
    add_resource_type_to_registry(assets_service_meta, config)
    add_resource_type_to_registry(pool_with_assets_meta, config)
