"""Metadata Sheet."""
from datetime import datetime

import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.events import ResourceSheetModified
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.sheets.user import IUserBasic
from adhocracy_core.schema import DateTime
from adhocracy_core.schema import Reference
from adhocracy_core.utils import get_sheet


class IMetadata(ISheet):

    """Market interface for the metadata sheet."""


class MetadataCreatorsReference(SheetToSheet):

    """Metadata sheet creators reference."""

    source_isheet = IMetadata
    source_isheet_field = 'creator'
    target_isheet = IUserBasic


def resource_modified_metadata_subscriber(event):
    """Update the `modification_date` metadata."""
    sheet = get_sheet(event.object, IMetadata)
    sheet.set({'modification_date': datetime.now()}, send_event=False)


class MetadataSchema(colander.MappingSchema):

    """Metadata sheet data structure.

    `creation_date`: Creation date of this resource. defaults to now.
    `item_creation_date`: Equals creation date for ISimple/IPool, equals
                          the item creation date for
                          :class:`adhocracy_core.interfaces.IItemVersion`.
                          This exists to ease the frontend end development.
                          This may go away if we have a high level API
                          to make :class:`adhocracy_core.interfaces.Item`
                         /`IItemVersion` one `thing`.
                         defaults to now.
    `modification_date`: Modification date of this resource. defaults to now.
    `creator`: creator (list of user resources) of this resource.
    """

    creator = Reference(reftype=MetadataCreatorsReference)
    creation_date = DateTime(missing=colander.drop)
    item_creation_date = DateTime(missing=colander.drop)
    modification_date = DateTime(missing=colander.drop)


metadata_metadata = sheet_metadata_defaults._replace(
    isheet=IMetadata,
    schema_class=MetadataSchema,
    editable=False,
    creatable=False,
    readable=True,
)


def includeme(config):
    """Register sheets, add subscriber to update creation/modification date."""
    add_sheet_to_registry(metadata_metadata, config.registry)
    config.add_subscriber(resource_modified_metadata_subscriber,
                          ResourceSheetModified,
                          interface=IMetadata)
