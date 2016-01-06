"""Sheets for Mercator 2 proposals."""
import colander

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ISheetReferenceAutoUpdateMarker
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.schema import AdhocracySchemaNode
from adhocracy_core.schema import Boolean
from adhocracy_core.schema import CurrencyAmount
from adhocracy_core.schema import DateTime
from adhocracy_core.schema import Email
from adhocracy_core.schema import ISOCountryCode
from adhocracy_core.schema import Integer
from adhocracy_core.schema import Reference
from adhocracy_core.schema import SingleLine
from adhocracy_core.schema import Text
from adhocracy_core.schema import URL
from adhocracy_core.schema import AdhocracySequenceNode
from adhocracy_core.sheets import add_sheet_to_registry
from adhocracy_core.sheets import sheet_meta


class IUserInfo(ISheet):
    """Marker interface for information about the proposal submitter."""


class UserInfoSchema(colander.MappingSchema):
    """Information about the proposal submitter."""

    first_name = SingleLine(missing=colander.required)
    last_name = SingleLine(missing=colander.required)

userinfo_meta = sheet_meta._replace(isheet=IUserInfo,
                                    schema_class=UserInfoSchema)


class IOrganizationInfo(ISheet):
    """Marker interface for organizational information."""


class OrganizationStatusEnum(AdhocracySchemaNode):
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

    name = SingleLine(missing=colander.drop)
    city = SingleLine(missing=colander.drop)
    country = ISOCountryCode(missing=colander.drop)
    help_request = Text(validator=colander.Length(max=300))
    registration_date = DateTime(missing=colander.drop, default=None)
    website = URL(missing=colander.drop)
    contact_email = Email(missing=colander.drop)
    status = OrganizationStatusEnum(missing=colander.required)
    status_other = Text(validator=colander.Length(max=300))

    def validator(self, node, value):
        """Extra validation depending on the status of the organisation.

        Make `status_other` required if `status` == `other` and
        `help_request` required if `status` == `support_needed`.
        """
        status = value.get('status', None)
        if status == 'support_needed':
            if not value.get('help_request', None):
                help_request = node['help_request']
                raise colander.Invalid(
                    help_request,
                    msg='Required iff status == support_needed')
        elif status == 'other':
            if not value.get('status_other', None):
                status_other = node['status_other']
                raise colander.Invalid(status_other,
                                       msg='Required iff status == other')


organizationinfo_meta = sheet_meta._replace(
    isheet=IOrganizationInfo,
    schema_class=OrganizationInfoSchema)


class IPitch(ISheet):
    """Marker interface for the pitch."""


class PitchSchema(colander.MappingSchema):
    pitch = Text(missing=colander.required,
                 validator=colander.Length(min=3, max=500))


pitch_meta = sheet_meta._replace(
    isheet=IPitch, schema_class=PitchSchema)


class IPartners(ISheet):
    """Marker interface for the partner description."""


class PartnersSchema(colander.MappingSchema):
    has_partners = Boolean()
    partner1_name = SingleLine()
    partner1_website = URL()
    partner1_country = ISOCountryCode()
    partner2_name = SingleLine()
    partner2_website = URL()
    partner2_country = ISOCountryCode()
    partner3_name = SingleLine()
    partner3_website = URL()
    partner3_country = ISOCountryCode()
    other_partners = Text()


partners_meta = sheet_meta._replace(
    isheet=IPartners, schema_class=PartnersSchema)


class TopicEnum(AdhocracySchemaNode):
    """Enum of topic domains."""

    schema_type = colander.String
    default = 'other'
    missing = colander.required
    validator = colander.OneOf(['democracy_and_participation',
                                'arts_and_cultural_activities',
                                'environment',
                                'social_inclusion',
                                'migration',
                                'communities',
                                'urban_development',
                                'education',
                                'other',
                                ])


class TopicEnums(AdhocracySequenceNode):
    """List of TopicEnums."""

    missing = colander.required
    topics = TopicEnum()


class ITopic(ISheet):
    """Marker interface for the topic (ex: democracy, art, environment etc)."""


class TopicSchema(colander.MappingSchema):
    topic = TopicEnums(validator=colander.Length(min=1, max=2))
    topic_other = Text()

    def validator(self, node: colander.SchemaNode, value: dict):
        """Extra validation depending on the status of the topic."""
        topics = value.get('topic', [])
        if 'other' in topics:
            if not value.get('topic_other', None):
                raise colander.Invalid(node['topic_other'],
                                       msg='Required if "other" in topic')
        if _has_duplicates(topics):
            raise colander.Invalid(node['topic'],
                                   msg='Duplicates are not allowed')


def _has_duplicates(iterable: list) -> bool:
    return len(iterable) != len(set(iterable))


topic_meta = sheet_meta._replace(
    isheet=ITopic,
    schema_class=TopicSchema)


class IDuration(ISheet):
    """Marker interface for the duration."""


class DurationSchema(colander.MappingSchema):
    duration = Integer(missing=colander.required)


duration_meta = sheet_meta._replace(
    isheet=IDuration,
    schema_class=DurationSchema)


class ILocation(ISheet):
    """Marker interface for the location."""


class LocationSchema(colander.MappingSchema):
    location = SingleLine()
    is_online = Boolean()
    has_link_to_ruhr = Boolean(missing=colander.required, default=False)
    link_to_ruhr = Text()

    def validator(self, node, value):
        """Extra validation depending on the status of the location.

        Make `link_to_ruhr` required if `has_link_to_ruhr` == `True`.
        """
        has_link_to_ruhr = value.get('has_link_to_ruhr', None)
        if has_link_to_ruhr:
            if not value.get('link_to_ruhr', None):
                link_to_ruhr = node['link_to_ruhr']
                raise colander.Invalid(
                    link_to_ruhr,
                    msg='Required iff has_link_to_ruhr == True')


location_meta = sheet_meta._replace(
    isheet=ILocation,
    schema_class=LocationSchema,
)


class IStatus(ISheet):
    """Marker interface for the project status."""


class ProjectStatusEnum(AdhocracySchemaNode):
    """Enum of organizational statuses."""

    schema_type = colander.String
    default = 'other'
    missing = colander.required
    validator = colander.OneOf(['starting',
                                'developing',
                                'scaling',
                                'other',
                                ])


class StatusSchema(colander.MappingSchema):
    status = ProjectStatusEnum(missing=colander.required)


status_meta = sheet_meta._replace(
    isheet=IStatus,
    schema_class=StatusSchema,
)


class IChallenge(ISheet):
    """Marker interface for the challenge in the road to impact section."""


class ChallengeSchema(colander.MappingSchema):
    """Datastruct for the challenge field."""

    challenge = Text(missing=colander.required,
                     validator=colander.Length(min=3, max=500))

challenge_meta = sheet_meta._replace(
    isheet=IChallenge,
    schema_class=ChallengeSchema,
)


class IGoal(ISheet):
    """Marker interface for the 'aiming for' in the road to impact section."""


class GoalSchema(colander.MappingSchema):
    """Datastruct for the goal."""

    goal = Text(missing=colander.required,
                validator=colander.Length(min=3, max=500))

goal_meta = sheet_meta._replace(
    isheet=IGoal,
    schema_class=GoalSchema,
)


class IPlan(ISheet):
    """Marker interface for the 'plan' in the road to impact section."""


class PlanSchema(colander.MappingSchema):
    """Datastruct for the challenge field."""

    plan = Text(missing=colander.required,
                validator=colander.Length(min=3, max=800))

plan_meta = sheet_meta._replace(
    isheet=IPlan,
    schema_class=PlanSchema,
)


class ITarget(ISheet):
    """Marker interface for the 'target' in the road to impact section."""


class TargetSchema(colander.MappingSchema):
    """Datastruct for the challenge field."""

    target = Text(missing=colander.required,
                  validator=colander.Length(min=3, max=500))

target_meta = sheet_meta._replace(
    isheet=ITarget,
    schema_class=TargetSchema,
)


class ITeam(ISheet):
    """Marker interface for the 'team' in the road to impact section."""


class TeamSchema(colander.MappingSchema):
    """Datastruct for the challenge field."""

    team = Text(missing=colander.required,
                validator=colander.Length(min=3, max=800))

team_meta = sheet_meta._replace(
    isheet=ITeam,
    schema_class=TeamSchema,
)


class IExtraInfo(ISheet):
    """Marker interface for the 'extrainfo' in the road to impact section."""


class ExtraInfoSchema(colander.MappingSchema):
    """Datastruct for the challenge field."""

    extrainfo = Text(missing=colander.required,
                     validator=colander.Length(min=3, max=500))

extrainfo_meta = sheet_meta._replace(
    isheet=IExtraInfo,
    schema_class=ExtraInfoSchema,
)


class IConnectionCohesion(ISheet):
    """Marker iface for 'connection and cohesion' in the selection criteria."""


class ConnectionCohesionSchema(colander.MappingSchema):
    """Datastruct for the connection and cohesion field."""

    connection_cohesion = Text(missing=colander.required,
                               validator=colander.Length(min=3, max=500))

connectioncohesion_meta = sheet_meta._replace(
    isheet=IConnectionCohesion,
    schema_class=ConnectionCohesionSchema,
)


class IDifference(ISheet):
    """Marker interface for the 'difference' in the selection section."""


class DifferenceSchema(colander.MappingSchema):
    """Datastruct for the challenge field."""

    difference = Text(missing=colander.required,
                      validator=colander.Length(min=3, max=500))

difference_meta = sheet_meta._replace(
    isheet=IDifference,
    schema_class=DifferenceSchema,
)


class IPracticalRelevance(ISheet):
    """Marker for the 'practical relevance' in the selection criteria."""


class PracticalRelevanceSchema(colander.MappingSchema):
    """Datastruct for the challenge field."""

    practicalrelevance = Text(missing=colander.required,
                              validator=colander.Length(min=3, max=500))

practicalrelevance_meta = sheet_meta._replace(
    isheet=IPracticalRelevance,
    schema_class=PracticalRelevanceSchema,
)


class IFinancialPlanning(ISheet):
    """Marker interface for the financial planning."""


class FinancialPlanningSchema(colander.MappingSchema):
    budget = CurrencyAmount(missing=colander.required)
    requested_funding = CurrencyAmount(
        missing=colander.required,
        validator=colander.Range(min=1, max=50000))
    major_expenses = Text(missing=colander.required)


class IExtraFunding(ISheet):
    """Marker interface for the 'other sources of income' fie."""


class ExtraFundingSchema(colander.MappingSchema):
    other_sources = Text()
    secured = Boolean(default=False)


extra_funding_meta = sheet_meta._replace(
    isheet=IExtraFunding,
    schema_class=ExtraFundingSchema,
    permission_view='view_mercator2_extra_funding',
)


financialplanning_meta = sheet_meta._replace(
    isheet=IFinancialPlanning,
    schema_class=FinancialPlanningSchema,
)


class ICommunity(ISheet):
    """Marker interface for the community information."""


class HeardFromEnum(AdhocracySchemaNode):
    """Enum of organizational statuses."""

    schema_type = colander.String
    default = 'other'
    missing = colander.required
    validator = colander.OneOf(['personal_contact',
                                'website',
                                'facebook',
                                'twitter',
                                'newsletter',
                                'other',
                                ])


class HeardFromEnums(AdhocracySequenceNode):
    """List of HeardFromEnums."""

    missing = colander.required
    heard_froms = HeardFromEnum()


class CommunitySchema(colander.MappingSchema):
    expected_feedback = Text(missing=colander.drop)
    heard_froms = HeardFromEnums(validator=colander.Length(min=1))
    heard_from_other = Text()

    def validator(self, node: colander.SchemaNode, value: dict):
        """Extra validation depending on the status of the heard froms."""
        heard_froms = value.get('heard_froms', [])
        if 'other' in heard_froms:
            if not value.get('heard_from_other', None):
                raise colander.Invalid(
                    node['heard_from_other'],
                    msg='Required if "other" in heard_froms')
        if _has_duplicates(heard_froms):
            raise colander.Invalid(node['heard_froms'],
                                   msg='Duplicates are not allowed')

community_meta = sheet_meta._replace(
    isheet=ICommunity,
    schema_class=CommunitySchema,
)


class IWinnerInfo(ISheet):
    """Marker interface for the winner information."""


class WinnerInfoSchema(colander.MappingSchema):
    funding = Integer()

winnerinfo_meta = sheet_meta._replace(
    isheet=IWinnerInfo,
    schema_class=WinnerInfoSchema,
    permission_view='view_mercator2_winnerinfo',
    permission_edit='edit_mercator2_winnerinfo',
)


class IMercatorSubResources(ISheet, ISheetReferenceAutoUpdateMarker):
    """Marker interface for commentable subresources of MercatorProposal."""


class PitchReference(SheetToSheet):
    """Reference to pitch."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'pitch'
    target_isheet = IPitch


class PartnersReference(SheetToSheet):
    """Reference to partners."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'partners'
    target_isheet = IPartners


class DurationReference(SheetToSheet):
    """Reference to duration."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'duration'
    target_isheet = IDuration


class ChallengeReference(SheetToSheet):
    """Reference to challenge."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'challenge'
    target_isheet = IChallenge


class GoalReference(SheetToSheet):
    """Reference to goal."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'goal'
    target_isheet = IGoal


class PlanReference(SheetToSheet):
    """Reference to plan."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'plan'
    target_isheet = IPlan


class TargetReference(SheetToSheet):
    """Reference to target."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'target'
    target_isheet = ITarget


class TeamReference(SheetToSheet):
    """Reference to team."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'team'
    target_isheet = ITeam


class ExtraInfoReference(SheetToSheet):
    """Reference to extrainfo."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'extrainfo'
    target_isheet = IExtraInfo


class ConnectionCohesionReference(SheetToSheet):
    """Reference to connectioncohesion."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'connectioncohesion'
    target_isheet = IConnectionCohesion


class DifferenceReference(SheetToSheet):
    """Reference to difference."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'difference'
    target_isheet = IDifference


class PracticalRelevanceReference(SheetToSheet):
    """Reference to practical relevance."""

    source_isheet = IMercatorSubResources
    source_isheet_field = 'practicalrelevance'
    target_isheet = IPracticalRelevance


class MercatorSubResourcesSchema(colander.MappingSchema):
    """Subresources of mercator."""

    pitch = Reference(reftype=PitchReference)
    partners = Reference(reftype=PartnersReference)
    duration = Reference(reftype=DurationReference)
    challenge = Reference(reftype=ChallengeReference)
    goal = Reference(reftype=GoalReference)
    plan = Reference(reftype=PlanReference)
    target = Reference(reftype=TargetReference)
    team = Reference(reftype=TeamReference)
    extrainfo = Reference(reftype=ExtraInfoReference)
    connectioncohesion = Reference(reftype=ConnectionCohesionReference)
    difference = Reference(reftype=DifferenceReference)
    practicalrelevance = Reference(reftype=PracticalRelevanceReference)


mercator_subresources_meta = sheet_meta._replace(
    isheet=IMercatorSubResources,
    schema_class=MercatorSubResourcesSchema)


def includeme(config):
    """Register sheets."""
    add_sheet_to_registry(userinfo_meta, config.registry)
    add_sheet_to_registry(organizationinfo_meta, config.registry)
    add_sheet_to_registry(pitch_meta, config.registry)
    add_sheet_to_registry(partners_meta, config.registry)
    add_sheet_to_registry(topic_meta, config.registry)
    add_sheet_to_registry(duration_meta, config.registry)
    add_sheet_to_registry(location_meta, config.registry)
    add_sheet_to_registry(status_meta, config.registry)
    add_sheet_to_registry(challenge_meta, config.registry)
    add_sheet_to_registry(goal_meta, config.registry)
    add_sheet_to_registry(plan_meta, config.registry)
    add_sheet_to_registry(target_meta, config.registry)
    add_sheet_to_registry(team_meta, config.registry)
    add_sheet_to_registry(extrainfo_meta, config.registry)
    add_sheet_to_registry(connectioncohesion_meta, config.registry)
    add_sheet_to_registry(difference_meta, config.registry)
    add_sheet_to_registry(practicalrelevance_meta, config.registry)
    add_sheet_to_registry(financialplanning_meta, config.registry)
    add_sheet_to_registry(extra_funding_meta, config.registry)
    add_sheet_to_registry(community_meta, config.registry)
    add_sheet_to_registry(winnerinfo_meta, config.registry)
    add_sheet_to_registry(mercator_subresources_meta, config.registry)
