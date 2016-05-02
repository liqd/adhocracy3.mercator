"""Rate sheet."""
from colander import All
from colander import Invalid
from colander import deferred
from pyramid.traversal import find_interface
from pyramid.registry import Registry
from substanced.util import find_service
from zope.interface import implementer

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IPredicateSheet
from adhocracy_core.interfaces import IRateValidator
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import search_query
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.interfaces import Reference
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import AttributeResourceSheet
from adhocracy_core.schema import MappingSchema
from adhocracy_core.schema import Integer
from adhocracy_core.schema import Reference as ReferenceSchema
from adhocracy_core.schema import PostPool
from adhocracy_core.sheets import sheet_meta


class IRate(IPredicateSheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for the rate sheet."""


class IRateable(ISheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for resources that can be rated."""


@implementer(IRateValidator)
class RateableRateValidator:
    """
    Validator for rates about IRateable.

    The following values are allowed:

      * 1: pro
      * 0: neutral
      * -1: contra
    """

    _allowed_values = (1, 0, -1)

    def __init__(self, context):
        """Initialize self."""
        self.context = context

    def validate(self, rate: int) -> bool:
        """Validate the rate."""
        return rate in self._allowed_values

    def helpful_error_message(self) -> str:
        """Return error message."""
        return 'rate must be one of {}'.format(self._allowed_values)


class ILikeable(IRateable):
    """IRateable subclass that restricts the set of allowed values."""


@implementer(IRateValidator)
class LikeableRateValidator(RateableRateValidator):
    """
    Validator for rates about ILikeable.

    The following values are allowed:

      * 1: like
      * 0: neutral/no vote
    """

    _allowed_values = (1, 0)


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


class RateSchema(MappingSchema):
    """Rate sheet data structure."""

    subject = ReferenceSchema(reftype=RateSubjectReference)
    object = ReferenceSchema(reftype=RateObjectReference)
    rate = Integer()

    @deferred
    def validator(self, kw: dict) -> callable:
        """Validate the rate."""
        # TODO add post_pool validator
        context = kw['context']
        request = kw['request']
        registry = kw['registry']
        return All(create_validate_rate_value(registry),
                   create_validate_subject(request),
                   create_validate_is_unique(context, registry),
                   )


def create_validate_subject(request) -> callable:
    """Create validator to ensure value['subject'] is current user."""
    def validator(node, value):
        user = request.user
        if user is None or user != value['subject']:
            error = Invalid(node, msg='')
            error.add(Invalid(node['subject'],
                              msg='Must be the currently logged-in user'))
            raise error
    return validator


def create_validate_is_unique(context, registry: Registry) -> callable:
    """Create validatator to ensure rate version is unique.

    Older rate versions with the same subject and object may occur.
    If they belong to a different rate item an error is thrown.
    """
    from adhocracy_core.resources.rate import IRate as IRateItem
    from adhocracy_core.sheets.versions import IVersions

    def validator(node, value):
        catalogs = find_service(context, 'catalogs')
        query = search_query._replace(
            references=(Reference(None, IRate, 'subject', value['subject']),
                        Reference(None, IRate, 'object', value['object'])),
            resolve=True,
        )
        same_rates = catalogs.search(query).elements
        if not same_rates:
            return
        item = find_interface(context, IRateItem)
        old_versions = registry.content.get_sheet_field(item,
                                                        IVersions,
                                                        'elements')
        for rate in same_rates:
            if rate not in old_versions:
                error = Invalid(node, msg='')
                msg = 'Another rate by the same user already exists'
                error.add(Invalid(node['object'], msg=msg))
                raise error
    return validator


def create_validate_rate_value(registry: Registry) -> callable:
    """Create validator to validate value['rate'].

    Ask the validator registered for *object* whether *rate* is valid.
    In this way, `IRateable` subclasses can modify the range of allowed
    ratings by registering their own `IRateValidator` adapter.
    """
    def validator(node, value):
        rate_validator = registry.getAdapter(value['object'], IRateValidator)
        if not rate_validator.validate(value['rate']):
            error = Invalid(node, msg='')
            msg = rate_validator.helpful_error_message()
            error.add(Invalid(node['rate'], msg=msg))
            raise error
    return validator


rate_meta = sheet_meta._replace(isheet=IRate,
                                schema_class=RateSchema,
                                sheet_class=AttributeResourceSheet,
                                create_mandatory=True)


class CanRateSchema(MappingSchema):
    """CanRate sheet data structure."""


can_rate_meta = sheet_meta._replace(isheet=ICanRate,
                                    schema_class=CanRateSchema)


class RateableSchema(MappingSchema):
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


likeable_meta = rateable_meta._replace(
    isheet=ILikeable,
)


def includeme(config):
    """Register sheets, adapters and index views."""
    add_sheet_to_registry(rate_meta, config.registry)
    add_sheet_to_registry(can_rate_meta, config.registry)
    add_sheet_to_registry(rateable_meta, config.registry)
    add_sheet_to_registry(likeable_meta, config.registry)
    config.registry.registerAdapter(RateableRateValidator,
                                    (IRateable,),
                                    IRateValidator)
    config.registry.registerAdapter(LikeableRateValidator,
                                    (ILikeable,),
                                    IRateValidator)
