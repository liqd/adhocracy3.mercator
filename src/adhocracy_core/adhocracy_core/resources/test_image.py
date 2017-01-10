from copy import copy
from unittest.mock import Mock

from pyramid import testing
from pytest import fixture
from pytest import mark
from pytest import raises


@fixture
def dimensions():
    from adhocracy_core.interfaces import Dimensions
    return Dimensions(width=200, height=100)


class TestImageDownload:

    @fixture
    def registry(self, registry_with_content, mock_sheet):
        registry = registry_with_content
        registry.content.get_sheet.return_value = mock_sheet
        return registry

    @fixture
    def meta(self):
        from .image import image_download_meta
        return image_download_meta

    @fixture
    def asset(self):
      from adhocracy_core.sheets.asset import IAssetData
      return testing.DummyResource(__provides__=IAssetData)

    @fixture
    def inst(self, meta):
        inst = meta.content_class()
        return inst

    def test_meta(self, meta):
        from . import image
        from . import asset
        assert meta.iresource is image.IImageDownload
        assert meta.iresource.isOrExtends(asset.IAssetDownload)
        assert meta.content_class == image.ImageDownload
        assert issubclass(meta.content_class, asset.AssetDownload)
        assert meta.permission_create == 'create_asset_download'
        assert meta.use_autonaming
        assert meta.after_creation == (image.allow_view_eveyone,
                                       )

    def test_get_response_return_asset_parent_data(self, inst, registry,
                                                   mock_sheet, asset):
        asset['download'] = inst
        file = Mock()
        mock_sheet.get.return_value = {'data': file}
        assert inst.get_response(registry) == file.get_response.return_value

    def test_get_response_raise_if_no_asset_parent(self, inst, registry):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        with raises(RuntimeConfigurationError):
            assert inst.get_response(registry)

    def test_get_response_return_old_resized_image(self, inst, registry):
        inst._is_resized = Mock(return_value=True)
        inst._get_response = Mock(return_value='FileResponse')
        response = inst.get_response(registry)
        assert response is inst._get_response.return_value

    def test_get_response_return_file_response(self,
                                               monkeypatch,
                                               inst,
                                               registry):
        from substanced.file import File
        file_response_mock = Mock(return_value='FileResponse')
        monkeypatch.setattr(File, 'get_response', lambda x: file_response_mock);
        response = inst._get_response()
        assert response is file_response_mock

    def test_is_resized_return_true_if_blob_has_size(self, inst):
        inst.get_size = Mock(return_value=100)
        assert inst._is_resized()

    def test_is_resized_return_false_if_blob_no_size(self, inst):
        inst.get_size = Mock(return_value=0)
        assert not inst._is_resized()

    def test_is_resized_return_false_if_blob_raises_error(self, inst):
        from ZODB.blob import BlobError
        inst.get_size = Mock(side_effect=BlobError)
        assert not inst._is_resized()

    def test_get_response_return_resized_image_if_dimensions_and_asset_parent(
            self, inst, asset, dimensions, mock_sheet, registry):
        asset['download'] = inst
        original = Mock()
        mock_sheet.get.return_value = {'data': original}
        inst._upload = Mock()
        inst.dimensions = dimensions
        inst._get_response = Mock(return_value='FileResponse')
        import bpdb;bpdb.set_trace()
        response = inst.get_response(registry)
        assert response is inst._get_response.return_value
        inst._upload.assert_called_with(original)

    def test_allow_view_everyone(context, registry, mocker):
        from . import image
        from .image import allow_view_eveyone
        set_acl = mocker.spy(image, 'set_acl')
        allow_view_eveyone(context, registry, {})
        set_acl.assert_called_with(context,
                                   [('Allow', 'system.Everyone', 'view')],
                                   registry=registry)

    @fixture
    def mock_file(self, mock_open):
        import io
        from substanced.file import File
        blob = Mock()
        blob.open.return_value = io.BytesIO(b'dummy blob')
        return Mock(spec=File, mimetype='image/xyz', blob=blob)

    @fixture
    def mock_open(self, monkeypatch, mock_original):
        from PIL import Image
        mock_open = Mock(spec=Image.open, return_value=mock_original)
        monkeypatch.setattr(Image, 'open', mock_open)
        return mock_open

    @fixture
    def mock_crop(self, monkeypatch, mock_cropped):
        from . import image
        mock_crop = Mock(spec=image.crop, return_value=mock_cropped)
        monkeypatch.setattr(image, 'crop', mock_crop)
        return mock_crop

    @fixture
    def mock_original(self):
        from PIL.Image import Image
        mock_original = Mock(spec=Image)
        return mock_original

    @fixture
    def mock_cropped(self, mock_resized):
        mock_cropped = copy(mock_resized)
        mock_cropped.resize.return_value = mock_resized
        return mock_cropped

    @fixture
    def mock_resized(self, mock_original):
        mock_resized = copy(mock_original)
        mock_resized.save.return_value = copy(mock_original)
        return mock_resized

    def test_upload_crop_and_resize(self, inst, mock_file, mock_crop,
                                    mock_original, mock_cropped, mock_resized):
        import io
        from PIL.Image import ANTIALIAS
        inst.upload = Mock()
        inst.dimensions = (1, 1)
        inst._upload(mock_file, True)
        assert mock_crop.call_args[0] == (mock_original, inst.dimensions)
        assert mock_cropped.resize.call_args(dimensions, ANTIALIAS)
        file_resized = mock_resized.save.call_args[0][0]
        assert isinstance(file_resized, io.BytesIO)
        assert inst.upload.call_args[0][0] == file_resized
        assert mock_resized.save.call_args[0][1] == mock_original.format
        assert inst.mimetype == mock_file.mimetype

    def test_upload_crop_and_resize_jpeg(self, inst, mock_crop, mock_original,
                                         mock_resized, mock_file):
        mock_original.format = 'JPEG'
        inst.upload = Mock()
        inst._upload(mock_file, True)
        assert mock_resized.save.call_args[0][1] == 'JPEG'

    def test_upload_crop_and_resize_png(self, inst, mock_crop, mock_original,
                                        mock_resized, mock_file):
        mock_original.format = 'PNG'
        mock_converted = copy(mock_original)
        mock_resized.convert.return_value = mock_converted
        inst.upload = Mock()
        inst._upload(mock_file, True)
        assert mock_resized.convert.call_args[0][0] == 'P'
        assert mock_converted.save.call_args[0][1] == 'PNG'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)


class TestCrop:

    def call_fut(self, *args):
        from .image import crop
        return crop(*args)

    def test_crop_height(self, dimensions):
        mock_image = Mock(size=(840, 700))
        crop_result = Mock()
        mock_image.crop.return_value = crop_result
        assert self.call_fut(mock_image, dimensions) == crop_result
        assert mock_image.crop.call_args[0][0] == (0, 140, 840, 560)

    def test_crop_width(self, dimensions):
        mock_image = Mock(size=(1000, 400))
        crop_result = Mock()
        mock_image.crop.return_value = crop_result
        assert self.call_fut(mock_image, dimensions) == crop_result
        assert mock_image.crop.call_args[0][0] == (100, 0, 900, 400)

    def test_crop_no_cropping_needed(self, dimensions):
        mock_image = Mock(size=(800, 400))
        assert self.call_fut(mock_image, dimensions) == mock_image
        assert not mock_image.crop.called

    def test_crop_no_cropping_needed_due_to_rounding(self, dimensions):
        mock_image = Mock(size=(999, 500))
        assert self.call_fut(mock_image, dimensions) == mock_image
        assert not mock_image.crop.called


class TestImage:

    @fixture
    def meta(self):
        from .image import image_meta
        return image_meta

    def test_meta(self, meta):
        from . import image
        from . import asset
        import adhocracy_core.sheets.image
        assert meta.iresource is image.IImage
        assert meta.is_implicit_addable is True
        assert meta.content_name == 'Image'
        assert not meta.use_autonaming
        assert meta.use_autonaming_random
        assert meta.extended_sheets ==\
               (adhocracy_core.sheets.image.IImageMetadata,)
        assert meta.after_creation == (asset.add_metadata,
                                       image.add_image_size_downloads,
                                       )

    @mark.usefixtures('integration')
    def test_create(self, registry, meta, pool):
        from adhocracy_core.interfaces import Dimensions
        from adhocracy_core.sheets.asset import IAssetData
        from adhocracy_core.sheets.image import IImageMetadata
        from .image import IImageDownload
        file = Mock(mimetype='image/png', size=100, title='title')
        appstructs = {IAssetData.__identifier__: {'data': file}}
        res = registry.content.create(meta.iresource.__identifier__,
                                      appstructs=appstructs,
                                      parent=pool)
        meta = registry.content.get_sheet(res, IImageMetadata).get()
        assert meta['filename'] == 'title'
        assert meta['size'] == 100
        assert meta['detail'] == res['0000000']
        assert IImageDownload.providedBy(meta['detail'])
        assert meta['detail'].dimensions == Dimensions(height=800, width=800)
        assert meta['thumbnail'] == res['0000001']
        assert meta['thumbnail'].dimensions == Dimensions(height=100, width=100)
