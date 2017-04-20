"""Description Sheet."""
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_meta
from adhocracy_core.schema import MappingSchema
from adhocracy_core.schema import Text


class IDescription(ISheet, ISheetReferenceAutoUpdateMarker):
    """Market interface for the description sheet."""


class DescriptionSchema(MappingSchema):
    """Description sheet data structure.

    `short_description`: teaser text for listings, html description etc.
    `description`: a full description
    """

    short_description = Text(missing='')
    description = Text(missing='')


description_meta = sheet_meta._replace(isheet=IDescription,
                                       schema_class=DescriptionSchema,
                                       )


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(description_meta, config.registry)
