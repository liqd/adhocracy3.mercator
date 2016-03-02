"""Rate sheet."""
from pyramid.traversal import find_interface
from pyramid.registry import Registry
from substanced.util import find_service
from zope.interface.interfaces import IInterface
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IPredicateSheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import search_query
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.interfaces import Reference
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import AttributeResourceSheet
from adhocracy_core.sheets.versions import IVersions
from adhocracy_core.schema import Integer
from adhocracy_core.schema import Reference as ReferenceSchema
from adhocracy_core.schema import PostPool
from adhocracy_core.sheets import sheet_meta
from adhocracy_core.utils import get_user
from adhocracy_core.utils import get_sheet_field


class IRate(IPredicateSheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for the rate sheet."""


class IRateable(ISheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for resources that can be rated."""


class ICanRate(ISheet):
    """Marker interface for resources that can rate."""


class RateSubjectReference(SheetToSheet):
    """Reference from rate to rater."""

    source_isheet = IRate
    source_isheet_field = 'subject'
    target_isheet = ICanRate


class RateObjectReference(SheetToSheet):
    """Reference from rate to rated resource."""

    source_isheet = IRate
    source_isheet_field = 'object'
    target_isheet = IRateable


class RateSchema(colander.MappingSchema):
    """Rate sheet data structure."""

    subject = ReferenceSchema(reftype=RateSubjectReference)
    object = ReferenceSchema(reftype=RateObjectReference)
    rate = Integer(validator=colander.Range(-1, 1))

    @colander.deferred
    def validator(self, kw: dict) -> callable:
        """Validate the rate."""
        # TODO add post_pool validator
        context = kw['context']
        request = kw.get('request', None)
        if request is None:
            return
        registry = request.registry
        return colander.All(create_validate_subject(request),
                            create_validate_rate_is_unique(IRate,
                                                           context,
                                                           registry),
                            )


def create_validate_subject(request) -> callable:
    """Create validator to ensure value['subject'] is current user."""
    def validator(node, value):
        user = get_user(request)
        if user is None or user != value['subject']:
            err = colander.Invalid(node,
                                   msg='')  # msg='' workaround colander bug
            err['subject'] = 'Must be the currently logged-in user'
            raise err
    return validator


def create_validate_rate_is_unique(isheet: IInterface,
                                   context,
                                   registry: Registry) -> callable:
    """Create validator to ensure rate version is unique.

    Older rate versions with the same subject and object may occur.
    If they belong to a different rate item an error is thrown.


    :param isheet: :class:`adhocracy_core.sheets.rate.IRate` or
        :class:`adhocracy_core.sheets.rate.ILike` to define what kind
        of rate should be checked.
    """
    def validator(node, value):
        catalogs = find_service(context, 'catalogs')
        query = search_query._replace(
            references=(Reference(None, isheet, 'subject', value['subject']),
                        Reference(None, isheet, 'object', value['object'])),
            resolve=True,
        )
        same_rates = catalogs.search(query).elements
        if not same_rates:
            return
        item = find_interface(context, IItem)
        old_versions = get_sheet_field(item, IVersions, 'elements',
                                       registry=registry)
        for rate in same_rates:
            if rate not in old_versions:
                err = colander.Invalid(node, msg='')
                err['object'] = 'Another rate by the same user already exists'
                raise err
    return validator

rate_meta = sheet_meta._replace(isheet=IRate,
                                schema_class=RateSchema,
                                sheet_class=AttributeResourceSheet,
                                create_mandatory=True)


class CanRateSchema(colander.MappingSchema):
    """CanRate sheet data structure."""


can_rate_meta = sheet_meta._replace(isheet=ICanRate,
                                    schema_class=CanRateSchema)


class RateableSchema(colander.MappingSchema):
    """Commentable sheet data structure.

    `post_pool`: Pool to post new :class:`adhocracy_sample.resource.IRate`.
    """

    post_pool = PostPool(iresource_or_service_name='rates')


rateable_meta = sheet_meta._replace(
    isheet=IRateable,
    schema_class=RateableSchema,
    editable=False,
    creatable=False,
)


class ILike(IPredicateSheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for the like sheet."""


class ILikeable(ISheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for resources that can be liked."""


class ICanLike(ISheet):
    """Marker interface for resources that can like."""


class CanLikeSchema(colander.MappingSchema):
    """CanRate sheet data structure."""


can_like_meta = sheet_meta._replace(isheet=ICanLike,
                                    schema_class=CanLikeSchema)


class LikeSubjectReference(SheetToSheet):
    """Reference from like to liker."""

    source_isheet = ILike
    source_isheet_field = 'subject'
    target_isheet = ICanLike


class LikeObjectReference(SheetToSheet):
    """Reference from like to liked resource."""

    source_isheet = ILike
    source_isheet_field = 'object'
    target_isheet = ILikeable


class LikeSchema(colander.MappingSchema):
    """Like sheet data structure."""

    subject = ReferenceSchema(reftype=LikeSubjectReference)
    object = ReferenceSchema(reftype=LikeObjectReference)
    like = Integer(validator=colander.Range(0, 1))

    @colander.deferred
    def validator(node, kw: dict) -> callable:
        """Validate the like."""
        context = kw['context']
        request = kw.get('request', None)
        if request is None:
            return
        registry = request.registry
        return colander.All(create_validate_subject(request),
                            create_validate_rate_is_unique(ILike,
                                                           context,
                                                           registry),
                            )


like_meta = sheet_meta._replace(isheet=ILike,
                                schema_class=LikeSchema,
                                sheet_class=AttributeResourceSheet,
                                create_mandatory=True)


class LikeableSchema(colander.MappingSchema):
    """Likeable sheet data structure."""

    post_pool = PostPool(iresource_or_service_name='likes')


likeable_meta = sheet_meta._replace(
    isheet=ILikeable,
    schema_class=LikeableSchema,
    editable=False,
    creatable=False,
)


def includeme(config):
    """Register sheets, adapters and index views."""
    add_sheet_to_registry(rate_meta, config.registry)
    add_sheet_to_registry(like_meta, config.registry)
    add_sheet_to_registry(can_rate_meta, config.registry)
    add_sheet_to_registry(can_like_meta, config.registry)
    add_sheet_to_registry(rateable_meta, config.registry)
    add_sheet_to_registry(likeable_meta, config.registry)
