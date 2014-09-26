"""Rate sheet."""
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IPredicateSheet
from adhocracy_core.interfaces import IPostPoolSheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.interfaces import IItem
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.schema import Reference
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.schema import PostPoolMappingSchema
from adhocracy_core.schema import PostPool
from adhocracy_core.schema import Rate
from adhocracy_core.utils import get_sheet


class IRate(IPredicateSheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the rate sheet."""


class IRateable(IPostPoolSheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for resources that can be rated."""


class ICanRate(ISheet):

    """Marker interface for resources that can rate."""


class RateSubjectReference(SheetToSheet):

    """Reference from comment version to the commented-on item version."""

    source_isheet = IRate
    source_isheet_field = 'subject'
    target_isheet = ICanRate


class RateObjectReference(SheetToSheet):

    """Reference from comment version to the commented-on item version."""

    source_isheet = IRate
    source_isheet_field = 'object'
    target_isheet = IRateable


class RateSchema(colander.MappingSchema):

    """Rate sheet data structure.

    `rate`: 1, 0, or -1
    """

    subject = Reference(reftype=RateSubjectReference)
    object = Reference(reftype=RateObjectReference)
    rate = Rate()


rate_meta = sheet_metadata_defaults._replace(isheet=IRate,
                                             schema_class=RateSchema,
                                             create_mandatory=True)


class CanRateSchema(colander.MappingSchema):

    """CanRate sheet data structure."""


can_rate_meta = sheet_metadata_defaults._replace(isheet=ICanRate,
                                                 schema_class=CanRateSchema)


class RateableSchema(PostPoolMappingSchema):

    """Commentable sheet data structure.

    `post_pool`: Pool to post new :class:`adhocracy_sample.resource.IRate`.
    """

    post_pool = PostPool(iresource_or_service_name=IItem)


rateable_meta = sheet_metadata_defaults._replace(
    isheet=IRateable,
    schema_class=RateableSchema,
    editable=False,
    creatable=False,
)


def index_rate(resource, default):
    """Return rate value of the :class:`IRate`.rate field."""
    sheet = get_sheet(resource, IRate)
    rate = sheet.get()['rate']
    return rate


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(rate_meta, config.registry)
    add_sheet_to_registry(can_rate_meta, config.registry)
    add_sheet_to_registry(rateable_meta, config.registry)
    config.add_indexview(index_rate,
                         catalog_name='adhocracy',
                         index_name='rate',
                         context=IRate)
