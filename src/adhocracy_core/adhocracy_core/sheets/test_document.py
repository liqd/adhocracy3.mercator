from pyramid import testing
from pytest import fixture


class TestDocumentSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.document import document_meta
        return document_meta

    def test_create(self, meta, context):
        from adhocracy_core.sheets.document import IDocument
        from adhocracy_core.sheets.document import DocumentSchema
        from adhocracy_core.sheets import GenericResourceSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, GenericResourceSheet)
        assert inst.meta.isheet == IDocument
        assert inst.meta.schema_class == DocumentSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'title': '', 'description': '', 'picture': '',
                              'elements': []}


def test_includeme_register_document_sheet(config):
    from adhocracy_core.sheets.document import IDocument
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.document')
    context = testing.DummyResource(__provides__=IDocument)
    assert get_sheet(context, IDocument)


class TestParagraphSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.document import paragraph_meta
        return paragraph_meta

    def test_create(self, meta, context):
        from adhocracy_core.sheets.document import IParagraph
        from adhocracy_core.sheets.document import ParagraphSchema
        from adhocracy_core.sheets import GenericResourceSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, GenericResourceSheet)
        assert inst.meta.isheet == IParagraph
        assert inst.meta.schema_class == ParagraphSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'content': ''}


def test_includeme_register_paragraph_sheet(config):
    from adhocracy_core.sheets.document import IParagraph
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.document')
    context = testing.DummyResource(__provides__=IParagraph)
    assert get_sheet(context, IParagraph)


class TestSectionSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.document import section_meta
        return section_meta

    def test_create(self, meta, context):
        from adhocracy_core.sheets.document import ISection
        from adhocracy_core.sheets.document import SectionSchema
        from adhocracy_core.sheets import GenericResourceSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, GenericResourceSheet)
        assert inst.meta.isheet == ISection
        assert inst.meta.schema_class == SectionSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'elements': [], 'subsections': [], 'title': ''}


def test_includeme_register_section_sheet(config):
    from adhocracy_core.sheets.document import ISection
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.document')
    context = testing.DummyResource(__provides__=ISection)
    assert get_sheet(context, ISection)
