from pyramid import testing
from pytest import fixture
from pytest import mark


class TestDocument:

    @fixture
    def meta(self):
        from .document import document_meta
        return document_meta

    def test_meta(self, meta):
        from adhocracy_core import sheets
        from adhocracy_core import resources
        from adhocracy_core.interfaces import ITag
        assert meta.iresource == resources.document.IDocument
        assert meta.element_types == (ITag,
                                      resources.paragraph.IParagraph,
                                      resources.document.IDocumentVersion,
                                      )
        assert meta.extended_sheets == (sheets.badge.IBadgeable,
                                        )
        assert meta.item_type == resources.document.IDocumentVersion
        assert meta.permission_create == 'create_document'
        assert resources.comment.add_commentsservice in meta.after_creation
        assert resources.rate.add_ratesservice in meta.after_creation
        assert meta.use_autonaming
        assert meta.autonaming_prefix == 'document_'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)


class TestDocumentVersion:

    @fixture
    def meta(self):
        from .document import document_version_meta
        return document_version_meta

    def test_meta(self, meta):
        from adhocracy_core import resources
        from adhocracy_core import sheets
        assert meta.iresource == resources.document.IDocumentVersion
        assert meta.extended_sheets == (sheets.document.IDocument,
                                        sheets.comment.ICommentable,
                                        sheets.badge.IBadgeable,
                                        sheets.rate.IRateable,
                                        sheets.image.IImageReference,
                                        sheets.title.ITitle,
                                        )
        assert meta.permission_create == 'edit_document'

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)

class TestGeoDocument:

    @fixture
    def meta(self):
        from .document import geo_document_meta
        return geo_document_meta

    def test_meta(self, meta):
        from adhocracy_core import resources
        from adhocracy_core.interfaces import ITag
        from .document import IGeoDocument
        from .document import IGeoDocumentVersion
        assert meta.iresource == IGeoDocument
        assert meta.element_types == (ITag,
                                      resources.paragraph.IParagraph,
                                      IGeoDocumentVersion
                                      )

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)

class TestGeoDocumentVersion:

    @fixture
    def meta(self):
        from .document import geo_document_version_meta
        return geo_document_version_meta

    def test_meta(self, meta):
        from adhocracy_core import resources
        from adhocracy_core import sheets
        from .document import IGeoDocumentVersion
        assert meta.iresource == IGeoDocumentVersion
        assert meta.extended_sheets == (sheets.document.IDocument,
                                        sheets.comment.ICommentable,
                                        sheets.badge.IBadgeable,
                                        sheets.rate.IRateable,
                                        sheets.image.IImageReference,
                                        sheets.title.ITitle,
                                        sheets.geo.IPoint
                                        )

    @mark.usefixtures('integration')
    def test_create(self, registry, meta):
        assert registry.content.create(meta.iresource.__identifier__)
