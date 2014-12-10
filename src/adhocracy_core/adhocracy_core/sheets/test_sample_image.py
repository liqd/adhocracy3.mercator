from pyramid import testing
from pytest import fixture


class TestSampleImageMetadataSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.sample_image import sample_image_metadata_meta
        return sample_image_metadata_meta

    def test_create(self, meta):
        from adhocracy_core.sheets.sample_image import ISampleImageMetadata
        from adhocracy_core.sheets.sample_image import _sample_image_mime_type_validator
        assert meta.isheet is ISampleImageMetadata
        assert meta.mime_type_validator is _sample_image_mime_type_validator
        assert 'detail' in meta.image_sizes

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'attached_to': [], 'filename': '',
                              'mime_type': '', 'size': 0}


def test_sample_image_mime_type_validator():
    from adhocracy_core.sheets.sample_image import _sample_image_mime_type_validator
    assert _sample_image_mime_type_validator('image/jpeg') is True
    assert _sample_image_mime_type_validator('image/png') is True
    assert _sample_image_mime_type_validator('image/blah') is False
    assert _sample_image_mime_type_validator('') is False
    assert _sample_image_mime_type_validator(None) is False


def test_includeme_register_sample_image_sheet(config):
    from adhocracy_core.sheets.sample_image import ISampleImageMetadata
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.sample_image')
    context = testing.DummyResource(__provides__=ISampleImageMetadata)
    inst = get_sheet(context, ISampleImageMetadata)
    assert inst.meta.isheet is ISampleImageMetadata
