"""Name Sheet."""
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.schema import Name


class IName(ISheet):

    """Market interface for the name sheet."""


class NameSchema(colander.MappingSchema):

    """Name sheet data structure.

    `name`: a human readable resource Identifier
    """

    name = Name()


name_metadata = sheet_metadata_defaults._replace(isheet=IName,
                                                 schema_class=NameSchema,
                                                 editable=False,
                                                 create_mandatory=True,
                                                 )


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(name_metadata, config.registry)
