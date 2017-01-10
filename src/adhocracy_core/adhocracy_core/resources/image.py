"""image resource type."""
import io

from pyramid.authentication import Everyone
from pyramid.authorization import Allow
from pyramid.response import FileResponse
from pyramid.registry import Registry
from substanced.file import File
from PIL import Image
from ZODB.blob import BlobError
import transaction

from adhocracy_core.authorization import set_acl
from adhocracy_core.interfaces import Dimensions
from adhocracy_core.interfaces import IResource
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.resources.asset import IAssetDownload
from adhocracy_core.resources.asset import AssetDownload
from adhocracy_core.resources.asset import asset_download_meta
from adhocracy_core.resources.asset import asset_meta
from adhocracy_core.utils import get_matching_isheet
import adhocracy_core.sheets.image


def allow_view_eveyone(context: IResource, registry: Registry,
                       options: dict):
    """Add view permission for everyone for `context`."""
    acl = [(Allow, Everyone, 'view')]
    set_acl(context, acl, registry)


class IImageDownload(IAssetDownload):
    """Downloadable binary file for Images."""


class ImageDownload(File, AssetDownload):
    """Allow downloading the first image file in the term:`lineage`."""

    dimensions = None
    """:class:`adhocracy_core.interfaces.Dimension` to resize the image"""

    def get_response(self, registry: Registry=None) -> FileResponse:
        """Return response with resized binary content of the image data.

        The image mimetype is converted to JPEG to decrease the file size.
        """
        if self._is_resized():
            return self._get_response()
        elif self.dimensions:
            original = self._get_asset_file_in_lineage(registry)
            self._upload(original)
            transaction.commit()  # to avoid BlobError: Uncommitted changes
            return self._get_response()
        elif self.name == '0000002':
            original = self._get_asset_file_in_lineage(registry)
            self._upload(original, False)
            transaction.commit()  # to avoid BlobError: Uncommitted changes
            return self._get_response()
        else:
            original = self._get_asset_file_in_lineage(registry)
            return original.get_response()

    def _is_resized(self) -> bool:
        try:
            return bool(self.get_size())
        except BlobError:
            return False

    def _get_response(self) -> FileResponse:
        return File.get_response(self)

    def _upload(self, original: File, crop_and_resize: bool = True):
        with original.blob.open('r') as blobdata:
            image = Image.open(blobdata)
            if crop_and_resize:
                cropped = crop(image, self.dimensions)
                resized = cropped.resize(self.dimensions, Image.ANTIALIAS)
            else:
                if image.size[0] < 10 or image.size[1] < 10:
                    raise ValueError('Image is too slim!')
                elif image.size[0] * image.size[1] > 1000000:
                    ratio = image.size[1] / image.size[0]
                    dimensions = (1000, int(1000 * ratio))
                    resized = image.resize(dimensions, Image.ANTIALIAS)
                else:
                    resized = image
            bytestream = io.BytesIO()
            if image.format == 'PNG':
                reduced_colors = resized.convert('P',
                                                 colors=128,
                                                 palette=Image.ADAPTIVE)
                reduced_colors.save(bytestream,
                                    image.format,
                                    bits=7,
                                    optimize=True)
            elif image.format == 'JPEG':
                resized.save(bytestream,
                             'JPEG',
                             progressive=True,
                             quality=80,
                             optimize=True)
            else:
                resized.save(bytestream,
                             image.format)
            bytestream.seek(0)
        self.upload(bytestream)
        self.mimetype = original.mimetype


def crop(image: Image, dimensions: Dimensions) -> Image:
    """Return a cropped version of `image`.

    The returned version will have the same aspect ratio as the target
    dimensions, but not necessarily the same size, so a further resizing
    step may be needed. If the original image is wider, it is cropped in
    X direction so that only the middle part remains. If it's higher, it's
    cropped in Y direction.

    If original and target aspect ratio are identical, the image is
    returned unchanged.
    """
    original_aspect_ratio = image.size[0] / image.size[1]
    target_aspect_ratio = dimensions.width / dimensions.height
    if target_aspect_ratio > original_aspect_ratio:
        # height must be cropped
        cropped_height = round(image.size[0] / target_aspect_ratio)
        if cropped_height == image.size[1]:
            return image  # No cropping necessary
        upper = round((image.size[1] - cropped_height) / 2)
        #          (left, upper, right,      lower)
        crop_box = (0, upper, image.size[0], upper + cropped_height)
    else:
        # width must be cropped
        cropped_width = round(image.size[1] * target_aspect_ratio)
        if cropped_width == image.size[0]:
            return image  # No cropping necessary
        left = round((image.size[0] - cropped_width) / 2)
        #          (left, upper, right,            lower)
        crop_box = (left, 0, left + cropped_width, image.size[1])
    return image.crop(crop_box)


image_download_meta = asset_download_meta._replace(
    content_name='ImageDownload',
    iresource=IImageDownload,
    use_autonaming=True,
    content_class=ImageDownload,
)._add(after_creation=(allow_view_eveyone,))


class IImage(IAsset):
    """An image asset."""


def add_image_size_downloads(context: IImage, registry: Registry, **kwargs):
    """Add download for every image size of `context`."""
    isheet = get_matching_isheet(context,
                                 adhocracy_core.sheets.image.IImageMetadata)
    sheet = registry.content.get_sheet(context, isheet)
    size_fields = (f for f in sheet.schema if hasattr(f, 'dimensions'))
    appstruct = {}
    for field in size_fields:
        download = registry.content.create(IImageDownload.__identifier__,
                                           parent=context)
        download.dimensions = field.dimensions
        appstruct[field.name] = download
    sheet.set(appstruct, omit_readonly=False)


image_meta = asset_meta._replace(
    content_name='Image',
    iresource=IImage,
    is_implicit_addable=True,
    extended_sheets=(adhocracy_core.sheets.image.IImageMetadata,),
    use_autonaming=False,
    use_autonaming_random=True,
)._add(after_creation=(add_image_size_downloads,))


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(image_meta, config)
    add_resource_type_to_registry(image_download_meta, config)
