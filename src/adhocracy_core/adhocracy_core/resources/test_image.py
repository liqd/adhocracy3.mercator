from pytest import fixture
from pytest import mark


def test_image_meta():
    from .image import image_meta
    from .image import IImage
    from adhocracy_core.sheets.image import IImageMetadata
    meta = image_meta
    assert meta.iresource is IImage
    assert meta.is_implicit_addable is True
    assert IImageMetadata in meta.extended_sheets


@mark.usefixtures('integration')
class TestImage:

    @fixture
    def context(self, pool):
        return pool

    def test_create_sample_image(self, context, registry):
        from adhocracy_core.resources.image import IImage
        appstructs = {}
        res = registry.content.create(IImage.__identifier__,
                                      appstructs=appstructs,
                                      parent=context)
        assert IImage.providedBy(res)
