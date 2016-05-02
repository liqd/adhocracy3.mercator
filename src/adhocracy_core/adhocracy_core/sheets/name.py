"""Name Sheet."""
from colander import required
from adhocracy_core.interfaces import ISheet
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_meta
from adhocracy_core.schema import MappingSchema
from adhocracy_core.schema import Name


class IName(ISheet):
    """Market interface for the name sheet."""


class NameSchema(MappingSchema):
    """Name sheet data structure.

    `name`: a human readable resource Identifier
    """

    name = Name(missing=required)


name_meta = sheet_meta._replace(isheet=IName,
                                schema_class=NameSchema,
                                editable=False,
                                create_mandatory=True,
                                )


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(name_meta, config.registry)
