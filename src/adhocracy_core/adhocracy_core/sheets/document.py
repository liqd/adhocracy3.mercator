"""Sheets to store a document."""
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets.sample_image import ISampleImageMetadata
from adhocracy_core.schema import Reference
from adhocracy_core.schema import UniqueReferences
from adhocracy_core.schema import Text
from adhocracy_core.schema import SingleLine


class IDocument(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the document sheet."""


class ISection(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the section sheet."""


class IParagraph(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the paragraph sheet."""


class DocumentElementsReference(SheetToSheet):

    """Document elements reference."""

    source_isheet = IDocument
    source_isheet_field = 'elements'
    target_isheet = ISection


class DocumentPictureReference(SheetToSheet):

    """Document picture reference."""

    source_isheet = IDocument
    source_isheet_field = 'picture'
    target_isheet = ISampleImageMetadata


class SectionElementsReference(SheetToSheet):

    """Section element reference."""

    source_isheet = ISection
    source_isheet_field = 'elements'
    target_isheet = IParagraph


class SectionSubsectionsReference(SheetToSheet):

    """Section subsection reference."""

    source_isheet = ISection
    source_isheet_field = 'subsections'
    target_isheet = ISection


class DocumentSchema(colander.MappingSchema):

    """Document sheet data structure.

    `title`: one line title
    `description`: summary text
    `picture`: a picture
    `elements`: structural subelements like sections
    """

    title = SingleLine()
    description = Text()
    picture = Reference(reftype=DocumentPictureReference)
    elements = UniqueReferences(reftype=DocumentElementsReference)


document_meta = sheet_metadata_defaults._replace(isheet=IDocument,
                                                 schema_class=DocumentSchema,
                                                 )


class SectionSchema(colander.MappingSchema):

    """Section sheet data structure.

    `elements`: content subelements like paragraphs
    `subsections`: structural subelements like sections
    """

    title = SingleLine()
    elements = UniqueReferences(reftype=SectionElementsReference)
    subsections = UniqueReferences(reftype=SectionSubsectionsReference)


section_meta = sheet_metadata_defaults._replace(isheet=ISection,
                                                schema_class=SectionSchema)


class ParagraphSchema(colander.MappingSchema):

    """Section sheet data structure.

    `content`:  Text
    """

    content = Text()


paragraph_meta = sheet_metadata_defaults._replace(isheet=IParagraph,
                                                  schema_class=ParagraphSchema)


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(document_meta, config.registry)
    add_sheet_to_registry(section_meta, config.registry)
    add_sheet_to_registry(paragraph_meta, config.registry)
