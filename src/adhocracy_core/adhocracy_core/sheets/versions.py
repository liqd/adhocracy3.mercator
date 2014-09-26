"""Sheets to work with versionable resources."""
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.interfaces import NewVersionToOldVersion
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.sheets.pool import PoolSheet
from adhocracy_core.schema import UniqueReferences


class IVersionable(ISheet):

    """Maker interface for resources with the versionable sheet."""


class VersionableFollowsReference(NewVersionToOldVersion):

    """versionable sheet reference to preceding versions."""

    source_isheet = IVersionable
    source_isheet_field = 'follows'
    target_isheet = IVersionable


class VersionableSchema(colander.MappingSchema):

    """ Versionable sheet data structure.

    Set/get predecessor (`follows`) and get successor (`followed_by`) versions
    of this resource.
    """

    follows = UniqueReferences(reftype=VersionableFollowsReference)
    followed_by = UniqueReferences(readonly=True,
                                   backref=True,
                                   reftype=VersionableFollowsReference)


versionable_metadata = sheet_metadata_defaults._replace(
    isheet=IVersionable,
    schema_class=VersionableSchema,
)


class IForkableVersionable(IVersionable):

    """Maker interface for resources that support forking.

    This means that the multiple heads are allowed (the LAST tag can point
    to two or more versions).
    """


forkable_versionable_metadata = versionable_metadata._replace(
    isheet=IForkableVersionable,
)


class IVersions(ISheet):

    """Marker interface for the versions sheet."""


class IVersionsElementsReference(SheetToSheet):

    """version sheet elements reference."""

    source_isheet = IVersions
    source_isheet_field = 'elements'
    target_isheet = IVersionable


class VersionsSchema(colander.MappingSchema):

    """Versions sheet data structure.

    `elements`: Dag for collecting all versions of one item.
    """

    elements = UniqueReferences(
        reftype=IVersionsElementsReference)


versions_metadata = sheet_metadata_defaults._replace(
    isheet=IVersions,
    sheet_class=PoolSheet,
    schema_class=VersionsSchema,
    editable=False,
    creatable=False,
)


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(versionable_metadata, config.registry)
    add_sheet_to_registry(forkable_versionable_metadata, config.registry)
    add_sheet_to_registry(versions_metadata, config.registry)
