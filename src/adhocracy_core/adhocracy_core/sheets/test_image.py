from pyramid import testing
from pytest import fixture
from pytest import mark
from pytest import raises
import colander


class TestImageMetadataSheet:

    @fixture
    def meta(self):
        from .image import image_metadata_meta
        return image_metadata_meta

    @fixture
    def inst(self, meta, context):
        return meta.sheet_class(meta, context, None)

    def test_meta(self, meta):
        from . import image
        assert meta.isheet is image.IImageMetadata
        assert meta.schema_class == image.ImageMetadataSchema

    def test_get_empty(self, inst):
        assert inst.get() == {'attached_to': [],
                              'filename': '',
                              'mime_type': '',
                              'size': 0,
                              'detail': None,
                              'thumbnail': None,
                              'original': None}

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta, registry):
        context = testing.DummyResource(__provides__=meta.isheet)
        assert registry.content.get_sheet(context, meta.isheet)


class TestImageReference:

    @fixture
    def meta(self):
        from .image import image_reference_meta
        return image_reference_meta

    @fixture
    def inst(self, meta, context):
        return meta.sheet_class(meta, context, None)

    def test_meta(self, meta):
        from . import image
        from adhocracy_core.sheets import AnnotationRessourceSheet
        assert meta.sheet_class == AnnotationRessourceSheet
        assert meta.isheet == image.IImageReference
        assert meta.schema_class == image.ImageReferenceSchema
        assert meta.editable is True

    def test_create(self, meta, context):
        from .image import get_asset_choices
        inst = meta.sheet_class(meta, context, None)
        assert inst
        assert inst.schema['picture'].choices_getter == get_asset_choices

    def test_schema(self, inst):
        from .image import picture_url_validator
        from adhocracy_core.schema import URL
        assert inst.schema['external_picture_url'].validator.validators == \
               (URL.validator, picture_url_validator)

    def test_get_empty(self, inst):
        assert inst.get() == {'picture': None,
                              'picture_description': '',
                              'external_picture_url': ''}

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta, registry):
        context = testing.DummyResource(__provides__=meta.isheet)
        assert registry.content.get_sheet(context, meta.isheet)


class TestGetAssetChoices:

    def call_fut(self, *args):
        from .image import get_asset_choices
        return get_asset_choices(*args)

    def test_return_empty_list_if_no_assets_service(self, pool):
        assert self.call_fut(pool, None) == []

    def test_return_empty_list_if_empty_assets_service(self, pool, service):
        pool['assets'] = service
        assert self.call_fut(pool, None) == []

    def test_get_asset_choices_from_assets_service(self, pool, request_,
                                                   service, rest_url):
        from .image import IImageMetadata
        service['image'] = testing.DummyResource(__provides__=IImageMetadata)
        service['no_image'] = testing.DummyResource()
        pool['assets'] = service
        choices = self.call_fut(pool, request_)
        assert choices == [(rest_url + '/assets/image/', '/assets/image')]


class TestPictureUrlValidator:

    @fixture
    def test_image(self, httpserver):
        import os
        from adhocracy_core import sheets
        test_image_path = os.path.join(sheets.__path__[0], 'test_image.png')
        httpserver.serve_content(open(test_image_path, 'rb').read())
        return httpserver

    def call_fut(self, *args):
        from .image import picture_url_validator
        return picture_url_validator(*args)

    def test_raise_if_connection_error(self, node, mocker):
        from requests.exceptions import ConnectionError
        mocker.patch('requests.head', side_effect=ConnectionError)
        with raises(colander.Invalid) as err:
            self.call_fut(node, 'some_url')
        assert 'Connection failed' in err.value.msg

    def test_raise_if_status_code_not_200(self, node, test_image):
        test_image.code = 404
        with raises(colander.Invalid) as err:
            self.call_fut(node, test_image.url)
        assert '404 instead of 200' in err.value.msg

    @mark.parametrize('mimetype', ['image/jpeg', 'image/png', 'image/gif'])
    def test_ignore_if_image_mimetype(self, node, test_image, mimetype):
        test_image.headers['Content-Type'] = mimetype
        self.call_fut(node, test_image.url)

    def test_raise_if_non_image_mimetype(self, node, test_image):
        mimetype = 'no image'
        test_image.headers['Content-Type'] = mimetype
        with raises(colander.Invalid) as err:
            self.call_fut(node, test_image.url)
        assert 'not one of' in err.value.msg

    def test_raise_if_image_mimetype_but_size_to_big(self, node, mocker):
        from adhocracy_core.schema import FileStoreType
        over_max_size = FileStoreType.SIZE_LIMIT + 1
        resp = mocker.Mock(headers={'Content-Type': 'image/png',
                                    'Content-Length':  over_max_size},
                           status_code=200)
        mocker.patch('requests.head', return_value=resp)
        with raises(colander.Invalid) as err:
            self.call_fut(node, 'image url')
        assert 'too large' in err.value.msg


def test_image_mimetype_validator():
    from .image import image_mime_type_validator
    assert image_mime_type_validator.choices == \
           ('image/gif', 'image/jpeg', 'image/png')


def test_validate_image_data_mimetype(node, mocker):
    from . import image
    fut = image.validate_image_data_mimetype
    mocker.spy(image, 'image_mime_type_validator')
    file = mocker.Mock(mimetype='image/png')
    fut(node, file)
    image.image_mime_type_validator.assert_called_with(node, 'image/png')
