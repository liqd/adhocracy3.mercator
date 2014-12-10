"""Mercator proposal."""
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IItem
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.asset import asset_meta
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.resources.itemversion import itemversion_metadata
from adhocracy_core.resources.item import item_metadata
from adhocracy_core.resources.comment import add_commentsservice
from adhocracy_core.resources.rate import add_ratesservice
from adhocracy_core.sheets.asset import IAssetMetadata
from adhocracy_core.sheets.rate import ILikeable
from adhocracy_core.sheets.comment import ICommentable
import adhocracy_mercator.sheets.mercator


class IOrganizationInfoVersion(IItemVersion):

    """One of the mercator commentable subresources."""


organization_info_version_meta = itemversion_metadata._replace(
    content_name='OrganizationInfoVersion',
    iresource=IOrganizationInfoVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IOrganizationInfo,
        ICommentable],
)


class IOrganizationInfo(IItem):

    """One of the mercator commentable subresources version pool."""


organization_info_meta = item_metadata._replace(
    content_name='OrganizationInfo',
    iresource=IOrganizationInfo,
    element_types=[IOrganizationInfoVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IOrganizationInfoVersion,
)


class IIntroImage(IAsset):

    """Image attached to the introduction of a proposal."""


intro_image_meta = asset_meta._replace(
    content_name='IIntroImage',
    iresource=IIntroImage,
    is_implicit_addable=True,
    # replace IAssetMetadata sheet by IIntroImageMetadata
    basic_sheets=list(
        set(asset_meta.basic_sheets) - {IAssetMetadata, }
        | {adhocracy_mercator.sheets.mercator.IIntroImageMetadata, }),
)


class IIntroductionVersion(IItemVersion):

    """One of the mercator commentable subresources."""


introduction_version_meta = itemversion_metadata._replace(
    content_name='IntroductionVersion',
    iresource=IIntroductionVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IIntroduction,
        ICommentable],
)


class IIntroduction(IItem):

    """One of the mercator commentable subresources version pool."""


introduction_meta = item_metadata._replace(
    content_name='Introduction',
    iresource=IIntroduction,
    element_types=[IIntroductionVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IIntroductionVersion,
)


class IDescriptionVersion(IItemVersion):

    """One of the mercator commentable subresources."""


description_version_meta = itemversion_metadata._replace(
    content_name='DescriptionVersion',
    iresource=IDescriptionVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IDescription,
        ICommentable],
)


class IDescription(IItem):

    """One of the mercator commentable subresources version pool."""


description_meta = item_metadata._replace(
    content_name='Description',
    iresource=IDescription,
    element_types=[IDescriptionVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IDescriptionVersion,
)


class ILocationVersion(IItemVersion):

    """One of the mercator commentable subresources."""


location_version_meta = itemversion_metadata._replace(
    content_name='LocationVersion',
    iresource=ILocationVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.ILocation,
        ICommentable],
)


class ILocation(IItem):

    """One of the mercator commentable subresources version pool."""


location_meta = item_metadata._replace(
    content_name='Location',
    iresource=ILocation,
    element_types=[ILocationVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=ILocationVersion,
)


class IStoryVersion(IItemVersion):

    """One of the mercator commentable subresources."""


story_version_meta = itemversion_metadata._replace(
    content_name='StoryVersion',
    iresource=IStoryVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IStory,
        ICommentable],
)


class IStory(IItem):

    """One of the mercator commentable subresources version pool."""


story_meta = item_metadata._replace(
    content_name='Story',
    iresource=IStory,
    element_types=[IStoryVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IStoryVersion,
)


class IOutcomeVersion(IItemVersion):

    """One of the mercator commentable subresources."""


outcome_version_meta = itemversion_metadata._replace(
    content_name='OutcomeVersion',
    iresource=IOutcomeVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IOutcome,
        ICommentable],
)


class IOutcome(IItem):

    """One of the mercator commentable subresources version pool."""


outcome_meta = item_metadata._replace(
    content_name='Outcome',
    iresource=IOutcome,
    element_types=[IOutcomeVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IOutcomeVersion,
)


class IStepsVersion(IItemVersion):

    """One of the mercator commentable subresources."""


steps_version_meta = itemversion_metadata._replace(
    content_name='StepsVersion',
    iresource=IStepsVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.ISteps,
        ICommentable],
)


class ISteps(IItem):

    """One of the mercator commentable subresources version pool."""


steps_meta = item_metadata._replace(
    content_name='Steps',
    iresource=ISteps,
    element_types=[IStepsVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IStepsVersion,
)


class IValueVersion(IItemVersion):

    """One of the mercator commentable subresources."""


value_version_meta = itemversion_metadata._replace(
    content_name='ValueVersion',
    iresource=IValueVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IValue,
        ICommentable],
)


class IValue(IItem):

    """One of the mercator commentable subresources version pool."""


value_meta = item_metadata._replace(
    content_name='Value',
    iresource=IValue,
    element_types=[IValueVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IValueVersion,
)


class IPartnersVersion(IItemVersion):

    """One of the mercator commentable subresources."""


partners_version_meta = itemversion_metadata._replace(
    content_name='PartnersVersion',
    iresource=IPartnersVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IPartners,
        ICommentable],
)


class IPartners(IItem):

    """One of the mercator commentable subresources version pool."""


partners_meta = item_metadata._replace(
    content_name='Partners',
    iresource=IPartners,
    element_types=[IPartnersVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IPartnersVersion,
)


class IFinanceVersion(IItemVersion):

    """One of the mercator commentable subresources."""


finance_version_meta = itemversion_metadata._replace(
    content_name='FinanceVersion',
    iresource=IFinanceVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IFinance,
        ICommentable],
)


class IFinance(IItem):

    """One of the mercator commentable subresources version pool."""


finance_meta = item_metadata._replace(
    content_name='Finance',
    iresource=IFinance,
    element_types=[IFinanceVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IFinanceVersion,
)


class IExperienceVersion(IItemVersion):

    """One of the mercator commentable subresources."""


experience_version_meta = itemversion_metadata._replace(
    content_name='ExperienceVersion',
    iresource=IExperienceVersion,
    extended_sheets=[
        adhocracy_mercator.sheets.mercator.IExperience,
        ICommentable],
)


class IExperience(IItem):

    """One of the mercator commentable subresources version pool."""


experience_meta = item_metadata._replace(
    content_name='Experience',
    iresource=IExperience,
    element_types=[IExperienceVersion,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
    ],
    item_type=IExperienceVersion,
)


class IMercatorProposalVersion(IItemVersion):

    """A Mercator proposal."""


mercator_proposal_version_meta = itemversion_metadata._replace(
    content_name='MercatorProposalVersion',
    iresource=IMercatorProposalVersion,
    extended_sheets=[adhocracy_mercator.sheets.mercator.IUserInfo,
                     adhocracy_mercator.sheets.mercator.IHeardFrom,
                     adhocracy_mercator.sheets.mercator.IMercatorSubResources,
                     ICommentable,
                     ILikeable],
)


class IMercatorProposal(IItem):

    """Mercator proposal versions pool."""


mercator_proposal_meta = item_metadata._replace(
    content_name='MercatorProposal',
    iresource=IMercatorProposal,
    element_types=[IMercatorProposalVersion,
                   IOrganizationInfo,
                   IIntroduction,
                   IDescription,
                   ILocation,
                   IStory,
                   IOutcome,
                   ISteps,
                   IValue,
                   IPartners,
                   IFinance,
                   IExperience,
                   ],
    after_creation=item_metadata.after_creation + [
        add_commentsservice,
        add_ratesservice,
    ],
    item_type=IMercatorProposalVersion,
    is_implicit_addable=True,
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(mercator_proposal_meta, config)
    add_resource_type_to_registry(mercator_proposal_version_meta, config)
    add_resource_type_to_registry(organization_info_meta, config)
    add_resource_type_to_registry(organization_info_version_meta, config)
    add_resource_type_to_registry(intro_image_meta, config)
    add_resource_type_to_registry(introduction_meta, config)
    add_resource_type_to_registry(introduction_version_meta, config)
    add_resource_type_to_registry(description_meta, config)
    add_resource_type_to_registry(description_version_meta, config)
    add_resource_type_to_registry(location_meta, config)
    add_resource_type_to_registry(location_version_meta, config)
    add_resource_type_to_registry(story_meta, config)
    add_resource_type_to_registry(story_version_meta, config)
    add_resource_type_to_registry(outcome_meta, config)
    add_resource_type_to_registry(outcome_version_meta, config)
    add_resource_type_to_registry(steps_meta, config)
    add_resource_type_to_registry(steps_version_meta, config)
    add_resource_type_to_registry(value_meta, config)
    add_resource_type_to_registry(value_version_meta, config)
    add_resource_type_to_registry(partners_meta, config)
    add_resource_type_to_registry(partners_version_meta, config)
    add_resource_type_to_registry(finance_meta, config)
    add_resource_type_to_registry(finance_version_meta, config)
    add_resource_type_to_registry(experience_meta, config)
    add_resource_type_to_registry(experience_version_meta, config)
