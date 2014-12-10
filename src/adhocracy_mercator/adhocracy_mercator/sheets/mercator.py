"""Sheets for Mercator proposals."""
import colander

from adhocracy_core.interfaces import Dimensions
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_metadata_defaults
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.asset import asset_metadata_meta
from adhocracy_core.schema import AdhocracySchemaNode
from adhocracy_core.schema import Boolean
from adhocracy_core.schema import CurrencyAmount
from adhocracy_core.schema import ISOCountryCode
from adhocracy_core.schema import Reference
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import DateTime
from adhocracy_core.schema import Text
from adhocracy_core.schema import URL
from adhocracy_core.utils import get_sheet_field


class IMercatorSubResources(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for commentable subresources of MercatorProposal."""


class IUserInfo(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for information about the proposal submitter."""


class IOrganizationInfo(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for organizational information."""


class IIntroduction(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the proposal introduction."""


class IDescription(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for proposal description."""


class ILocation(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for proposal location."""


class IStory(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the story description."""


class IOutcome(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the outcome description."""


class ISteps(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the steps description."""


class IValue(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the value description."""


class IPartners(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for the partner description."""


class IFinance(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for financial aspects."""


class IExperience(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for additional fields."""


class IHeardFrom(ISheet, ISheetReferenceAutoUpdateMarker):

    """Marker interface for heard from fields."""


class UserInfoSchema(colander.MappingSchema):

    """Data structure for information about the proposal submitter."""

    personal_name = SingleLine(missing=colander.required)
    family_name = SingleLine()
    country = ISOCountryCode()


userinfo_meta = sheet_metadata_defaults._replace(isheet=IUserInfo,
                                                 schema_class=UserInfoSchema)


class OrganizationInfoReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'organization_info'
    target_isheet = IOrganizationInfo


class IntroductionReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'introduction'
    target_isheet = IIntroduction


class DescriptionReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'description'
    target_isheet = IDescription


class LocationReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'location'
    target_isheet = ILocation


class StoryReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'story'
    target_isheet = IStory


class OutcomeReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'outcome'
    target_isheet = IOutcome


class StepsReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'steps'
    target_isheet = ISteps


class ValueReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'value'
    target_isheet = IValue


class PartnersReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'partners'
    target_isheet = IPartners


class FinanceReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'finance'
    target_isheet = IFinance


class ExperienceReference(SheetToSheet):

    source_isheet = IMercatorSubResources
    source_isheet_field = 'experience'
    target_isheet = IExperience


class MercatorSubResourcesSchema(colander.MappingSchema):

    organization_info = Reference(reftype=OrganizationInfoReference)
    introduction = Reference(reftype=IntroductionReference)
    description = Reference(reftype=DescriptionReference)
    location = Reference(reftype=LocationReference)
    story = Reference(reftype=StoryReference)
    outcome = Reference(reftype=OutcomeReference)
    steps = Reference(reftype=StepsReference)
    value = Reference(reftype=ValueReference)
    partners = Reference(reftype=PartnersReference)
    finance = Reference(reftype=FinanceReference)
    experience = Reference(reftype=ExperienceReference)


mercator_sub_resources_meta = sheet_metadata_defaults._replace(
    isheet=IMercatorSubResources,
    schema_class=MercatorSubResourcesSchema)


class StatusEnum(AdhocracySchemaNode):

    """Enum of organizational statuses."""

    schema_type = colander.String
    default = 'other'
    missing = colander.required
    validator = colander.OneOf(['registered_nonprofit',
                                'planned_nonprofit',
                                'support_needed',
                                'other',
                                ])


class OrganizationInfoSchema(colander.MappingSchema):

    """Data structure for organizational information."""

    name = SingleLine()
    country = ISOCountryCode()
    status = StatusEnum()
    status_other = Text(validator=colander.Length(max=500))
    """Custom description for status == other."""
    # FIXME status_other must be non-empty if status=other, otherwise it must
    # be empty or null
    website = URL()
    planned_date = DateTime(missing=colander.drop, default=None)
    help_request = Text(validator=colander.Length(max=500))

    def validator(self, node, value):
        """Make `status_other` required if `status` == `other`."""
        status = value.get('status', None)
        if status == 'other':
            if not value.get('status_other', None):
                status_other = node['status_other']
                raise colander.Invalid(status_other,
                                       msg='Required iff status == other')
        else:
            # FIXME: Allow multiple errors at the same time
            name = node['name']
            if not value.get('name', None):
                raise colander.Invalid(name,
                                       msg='Required iff status != other')
            country = node['country']
            if not value.get('country', None):
                raise colander.Invalid(country,
                                       msg='Required iff status != other')


organizationinfo_meta = sheet_metadata_defaults._replace(
    isheet=IOrganizationInfo, schema_class=OrganizationInfoSchema)


class IIntroImageMetadata(IAssetMetadata):

    """Marker interface for intro images."""


def _intro_image_mime_type_validator(mime_type: str) -> bool:
    return mime_type in ('image/gif', 'image/jpeg', 'image/png')


intro_image_metadata_meta = asset_metadata_meta._replace(
    isheet=IIntroImageMetadata,
    mime_type_validator=_intro_image_mime_type_validator,
    image_sizes={'thumbnail': Dimensions(width=100, height=50),
                 'detail': Dimensions(width=500, height=250)},
)


class IntroImageReference(SheetToSheet):

    """Reference to an intro image."""

    source_isheet = IIntroduction
    source_isheet_field = 'picture'
    target_isheet = IIntroImageMetadata


class IntroductionSchema(colander.MappingSchema):

    """Data structure for the proposal introduction."""

    title = SingleLine(validator=colander.Length(min=1, max=100))
    teaser = Text(validator=colander.Length(min=1, max=300))
    picture = Reference(reftype=IntroImageReference)


introduction_meta = sheet_metadata_defaults._replace(
    isheet=IIntroduction, schema_class=IntroductionSchema)


class DescriptionSchema(colander.MappingSchema):

    """Data structure for for proposal description."""

    description = Text(validator=colander.Length(min=1, max=1000))


description_meta = sheet_metadata_defaults._replace(
    isheet=IDescription, schema_class=DescriptionSchema)


class LocationSchema(colander.MappingSchema):

    """Data structure for for proposal location."""

    location_is_specific = Boolean()
    location_specific_1 = SingleLine()
    location_specific_2 = SingleLine()
    location_specific_3 = SingleLine()
    location_is_online = Boolean()
    location_is_linked_to_ruhr = Boolean()


location_meta = sheet_metadata_defaults._replace(isheet=ILocation,
                                                 schema_class=LocationSchema)


LOCATION_INDEX_KEYWORDS = ['specific', 'online', 'linked_to_ruhr']


def index_location(resource, default) -> list:
    """Return search index keywords based on the "location_is_..." fields."""
    location = get_sheet_field(resource, IMercatorSubResources, 'location')
    # FIXME: Why is location '' in the first pass of that function
    # during MercatorProposal create?
    if location is None or location == '':
        return default
    locations = []
    for keyword in LOCATION_INDEX_KEYWORDS:
        if get_sheet_field(location, ILocation, 'location_is_' + keyword):
            locations.append(keyword)
    return locations if locations else default


class StorySchema(colander.MappingSchema):
    story = Text(validator=colander.Length(min=1, max=800))


story_meta = sheet_metadata_defaults._replace(isheet=IStory,
                                              schema_class=StorySchema)


class OutcomeSchema(colander.MappingSchema):
    outcome = Text(validator=colander.Length(min=1, max=800))


outcome_meta = sheet_metadata_defaults._replace(
    isheet=IOutcome, schema_class=OutcomeSchema)


class StepsSchema(colander.MappingSchema):
    steps = Text(validator=colander.Length(min=1, max=800))


steps_meta = sheet_metadata_defaults._replace(
    isheet=ISteps, schema_class=StepsSchema)


class ValueSchema(colander.MappingSchema):
    value = Text(validator=colander.Length(min=1, max=800))


values_meta = sheet_metadata_defaults._replace(
    isheet=IValue, schema_class=ValueSchema)


class PartnersSchema(colander.MappingSchema):
    partners = Text(validator=colander.Length(min=1, max=800))


partners_meta = sheet_metadata_defaults._replace(
    isheet=IPartners, schema_class=PartnersSchema)


class FinanceSchema(colander.MappingSchema):

    """Data structure for financial aspects."""

    budget = CurrencyAmount(missing=colander.required)
    requested_funding = CurrencyAmount(
        missing=colander.required,
        validator=colander.Range(min=0, max=50000))
    other_sources = SingleLine()
    granted = Boolean()
    # financial_plan = AssetPath()  # (2 Mb. max.)


finance_meta = sheet_metadata_defaults._replace(isheet=IFinance,
                                                schema_class=FinanceSchema)


BUDGET_INDEX_LIMIT_KEYWORDS = [5000, 10000, 20000, 50000]


def index_requested_funding(resource: IResource, default) -> str:
    """Return search index keyword based on the "requested_funding" field."""
    # FIXME: Why is finance '' in the first pass of that function
    # during MercatorProposal create?
    # This sounds like a bug, the default value for References is None,
    # Note: you should not cast resources to Boolean because a resource without
    # sub resources is equal False [joka]
    finance = get_sheet_field(resource, IMercatorSubResources, 'finance')
    if finance is None or finance == '':
            return default
    funding = get_sheet_field(finance, IFinance, 'requested_funding')
    for limit in BUDGET_INDEX_LIMIT_KEYWORDS:
        if funding <= limit:
            return [str(limit)]
    return default


class ExperienceSchema(colander.MappingSchema):

    """Data structure for additional fields."""

    # media = list of AssetPath()
    experience = Text()


experience_meta = sheet_metadata_defaults._replace(
    isheet=IExperience,
    schema_class=ExperienceSchema)


class HeardFromSchema(colander.MappingSchema):

    heard_from_colleague = Boolean()
    heard_from_website = Boolean()
    heard_from_newsletter = Boolean()
    heard_from_facebook = Boolean()
    # There is no heard_from_elsewhere Boolean, since that automatically
    # follows iff heard_elsewhere is not empty
    heard_elsewhere = Text()


heardfrom_meta = sheet_metadata_defaults._replace(
    isheet=IHeardFrom, schema_class=HeardFromSchema)


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(mercator_sub_resources_meta, config.registry)
    add_sheet_to_registry(userinfo_meta, config.registry)
    add_sheet_to_registry(organizationinfo_meta, config.registry)
    add_sheet_to_registry(introduction_meta, config.registry)
    add_sheet_to_registry(description_meta, config.registry)
    add_sheet_to_registry(location_meta, config.registry)
    add_sheet_to_registry(story_meta, config.registry)
    add_sheet_to_registry(outcome_meta, config.registry)
    add_sheet_to_registry(steps_meta, config.registry)
    add_sheet_to_registry(values_meta, config.registry)
    add_sheet_to_registry(partners_meta, config.registry)
    add_sheet_to_registry(finance_meta, config.registry)
    add_sheet_to_registry(experience_meta, config.registry)
    add_sheet_to_registry(heardfrom_meta, config.registry)
    add_sheet_to_registry(intro_image_metadata_meta, config.registry)
    config.add_indexview(index_location,
                         catalog_name='adhocracy',
                         index_name='mercator_location',
                         context=IMercatorSubResources)
    config.add_indexview(index_requested_funding,
                         catalog_name='adhocracy',
                         index_name='mercator_requested_funding',
                         context=IMercatorSubResources)
