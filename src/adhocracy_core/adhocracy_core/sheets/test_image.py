from pyramid import testing
from pytest import fixture
from pytest import mark


class TestImageMetadataSheet:

    @fixture
    def meta(self):
        from .image import image_metadata_meta
        return image_metadata_meta

    def test_meta(self, meta):
        from . import image
        assert meta.isheet is image.IImageMetadata
        assert meta.schema_class == image.ImageMetadataSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'attached_to': [],
                              'filename': '',
                              'mime_type': '',
                              'size': 0,
                              'detail': None,
                              'thumbnail': None}

    def test_validate_mime_type(self, meta, context):
        inst = meta.sheet_class(meta, context)
        validator = inst.schema['mime_type'].validator
        assert validator.choices == ('image/gif', 'image/jpeg', 'image/png')

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)




class TestImageReference:

    @fixture
    def meta(self):
        from .image import image_reference_meta
        return image_reference_meta

    def test_meta(self, meta):
      from . import image
      from adhocracy_core.sheets import AnnotationRessourceSheet
      assert meta.sheet_class == AnnotationRessourceSheet
      assert meta.isheet == image.IImageReference
      assert meta.schema_class == image.ImageReferenceSchema
      assert meta.editable is True

    def test_create(self, meta, context):
        assert meta.sheet_class(meta, context)

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'picture': None,
                              'picture_description': '',
                              'external_picture_url': ''}

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta, registry):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet, registry=registry)
