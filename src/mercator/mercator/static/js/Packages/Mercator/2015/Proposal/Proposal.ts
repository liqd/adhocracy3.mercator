/// <reference path="../../../../_all.d.ts"/>
/// <reference path="../../../../../lib2/types/moment.d.ts"/>

import * as _ from "lodash";

import * as AdhBadge from "../../../Badge/Badge";
import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMetaApi from "../../../MetaApi/MetaApi";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhPreliminaryNames from "../../../PreliminaryNames/PreliminaryNames";
import * as AdhResourceArea from "../../../ResourceArea/ResourceArea";
import * as AdhResourceUtil from "../../../Util/ResourceUtil";
import * as AdhResourceWidgets from "../../../ResourceWidgets/ResourceWidgets";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../../Util/Util";

import * as ResourcesBase from "../../../../ResourcesBase";

import RIMercatorDescription from "../../../../Resources_/adhocracy_mercator/resources/mercator/IDescription";
import RIMercatorDescriptionVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IDescriptionVersion";
import RIMercatorLocation from "../../../../Resources_/adhocracy_mercator/resources/mercator/ILocation";
import RIMercatorLocationVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/ILocationVersion";
import RIMercatorExperience from "../../../../Resources_/adhocracy_mercator/resources/mercator/IExperience";
import RIMercatorExperienceVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IExperienceVersion";
import RIMercatorFinance from "../../../../Resources_/adhocracy_mercator/resources/mercator/IFinance";
import RIMercatorFinanceVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IFinanceVersion";
import RIMercatorIntroduction from "../../../../Resources_/adhocracy_mercator/resources/mercator/IIntroduction";
import RIMercatorIntroductionVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IIntroductionVersion";
import RIMercatorIntroImage from "../../../../Resources_/adhocracy_mercator/resources/mercator/IIntroImage";
import RIMercatorOrganizationInfo from "../../../../Resources_/adhocracy_mercator/resources/mercator/IOrganizationInfo";
import RIMercatorOrganizationInfoVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IOrganizationInfoVersion";
import RIMercatorOutcome from "../../../../Resources_/adhocracy_mercator/resources/mercator/IOutcome";
import RIMercatorOutcomeVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IOutcomeVersion";
import RIMercatorPartners from "../../../../Resources_/adhocracy_mercator/resources/mercator/IPartners";
import RIMercatorPartnersVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IPartnersVersion";
import RIMercatorProposal from "../../../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposal";
import RIMercatorProposalVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposalVersion";
import RIMercatorSteps from "../../../../Resources_/adhocracy_mercator/resources/mercator/ISteps";
import RIMercatorStepsVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IStepsVersion";
import RIMercatorStory from "../../../../Resources_/adhocracy_mercator/resources/mercator/IStory";
import RIMercatorStoryVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IStoryVersion";
import RIMercatorValue from "../../../../Resources_/adhocracy_mercator/resources/mercator/IValue";
import RIMercatorValueVersion from "../../../../Resources_/adhocracy_mercator/resources/mercator/IValueVersion";
import RIRateVersion from "../../../../Resources_/adhocracy_core/resources/rate/IRateVersion";
import * as SICommentable from "../../../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SILikeable from "../../../../Resources_/adhocracy_core/sheets/rate/ILikeable";
import * as SILogbook from "../../../../Resources_/adhocracy_core/sheets/logbook/IHasLogbookPool";
import * as SIMercatorDescription from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IDescription";
import * as SIMercatorExperience from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IExperience";
import * as SIMercatorFinance from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IFinance";
import * as SIMercatorHeardFrom from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IHeardFrom";
import * as SIMercatorIntroduction from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IIntroduction";
import * as SIMercatorIntroImageMetadata from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IIntroImageMetadata";
import * as SIMercatorLocation from "../../../../Resources_/adhocracy_mercator/sheets/mercator/ILocation";
import * as SIMercatorOrganizationInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IOrganizationInfo";
import * as SIMercatorOutcome from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IOutcome";
import * as SIMercatorPartners from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IPartners";
import * as SIMercatorSteps from "../../../../Resources_/adhocracy_mercator/sheets/mercator/ISteps";
import * as SIMercatorStory from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IStory";
import * as SIMercatorSubResources from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IMercatorSubResources";
import * as SIMercatorUserInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IUserInfo";
import * as SIMercatorValue from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IValue";
import * as SIMetaData from "../../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIPool from "../../../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SIRate from "../../../../Resources_/adhocracy_core/sheets/rate/IRate";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../../../Resources_/adhocracy_core/sheets/versions/IVersionable";

export var pkgLocation = "/Mercator/2015/Proposal";


export interface IScopeData {
    commentCount : number;
    commentCountTotal : number;
    supporterCount : number;
    winnerBadgeAssignment : AdhBadge.IBadge;
    currentPhase: string;
    logbookPoolPath: string;

    title : {
        title : string;
    };

    // 1. basic
    user_info : {
        first_name : string;
        last_name : string;
        country : string;
        createtime : Date;
        path : string;
        commentCount : number;
    };
    organization_info : {
        status_enum : string;  // (allowed values: 'registered_nonprofit', 'planned_nonprofit', 'support_needed', 'other')
        name : string;
        country : string;
        website : string;
        date_of_foreseen_registration : string;
        how_can_we_help_you : string;
        status_other : string;
        commentCount : number;
    };

    // 2. introduction
    introduction : {
        teaser : string;
        picture : string;
        commentCount : number;
    };

    // 3. in detail
    description : {
        description : string;
        commentCount : number;
    };

    location : {
        location_is_specific : boolean;
        location_specific_1 : string;
        location_specific_2 : string;
        location_specific_3 : string;
        location_is_online : boolean;
        location_is_linked_to_ruhr : boolean;
        commentCount : number;
    };

    story : string;
    storyCommentCount : number;

    // 4. motivation
    outcome : string;
    outcomeCommentCount : number;
    steps : string;
    stepsCommentCount : number;
    value : string;
    valueCommentCount : number;
    partners : string;
    partnersCommentCount : number;

    // 5. financial planning
    finance : {
        budget : number;
        requested_funding : number;
        other_sources : string;
        granted : boolean;
        commentCount : number;
    };

    // 6. extra
    experience : string;
    experienceCommentCount : number;
    heard_from : {
        colleague : boolean;
        website : boolean;
        newsletter : boolean;
        facebook : boolean;
        other : boolean;
        other_specify : string;
    };
    accept_disclaimer : string;
}

export interface IScope extends AdhResourceWidgets.IResourceWidgetScope {
    poolPath : string;
    mercatorProposalForm? : any;
    data : IScopeData;
    selectedState : string;
    subResourceSelectedState : (key : string) => string;
    commentableUrl : string;
    $flow? : Flow;
    create : boolean;
    financialPlanTemplate : string;
    showBlogTabs : () => boolean;
}

export interface IControllerScope extends IScope {
    showError : (fieldName : string, errorType : string) => boolean;
    showHeardFromError : () => boolean;
    showLocationError : () => boolean;
    showFinanceGrantedInfo : () => boolean;
    submitIfValid : (callCount? : number) => void;
    mercatorProposalExtraForm? : any;
    mercatorProposalDetailForm? : any;
    mercatorProposalIntroductionForm? : any;
}


/**
 * promise supporters count.
 */
export var countSupporters = (adhHttp : AdhHttp.Service<any>, postPoolPath : string, objectPath : string) : angular.IPromise<number> => {
    var query : any = {
        content_type: RIRateVersion.content_type,
        depth: "2",
        tag: "LAST",
        rate: "1",
        elements: "omit"
    };
    query[SIRate.nick + ":object"] = objectPath;
    return adhHttp.get(postPoolPath, query)
        .then((response) => {
            var pool : SIPool.Sheet = response.data[SIPool.nick];
            return parseInt((<any>pool).count, 10);  // see #261
        });
};


export class Widget<R extends ResourcesBase.IResource> extends AdhResourceWidgets.ResourceWidget<R, IScope> {
    constructor(
        public adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        private adhTopLevelState : AdhTopLevelState.Service,
        private adhGetBadges : AdhBadge.IGetBadges,
        private adhUploadImage,
        private flowFactory,
        private moment : moment.MomentStatic,
        private $window : Window,
        private $location : angular.ILocationService,
        public $q : angular.IQService
    ) {
        super(adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/ListItem.html";
    }

    public createDirective() : angular.IDirective {
        var directive = super.createDirective();
        directive.scope.poolPath = "@";
        directive.scope.create = "@";
        return directive;
    }

    public link(scope, element, attrs, wrapper) {
        var instance = super.link(scope, element, attrs, wrapper);

        instance.scope.$flow = this.flowFactory.create();

        scope.$watch(() => this.adhConfig.locale, (locale) => {
            var financialPlanUrl : string;

            if (locale === "de") {
                financialPlanUrl = this.adhConfig.custom["financial_plan_url_de"];
            } else {
                financialPlanUrl = this.adhConfig.custom["financial_plan_url_en"];
            }
            scope.financialPlanTemplate = "<a href=\"" + financialPlanUrl + "\" target=\"_blank\">{{content}}</a>";
        });

        scope.$on("$destroy", this.adhTopLevelState.on("proposalUrl", (proposalVersionUrl) => {
            if (!proposalVersionUrl) {
                scope.selectedState = "";
            } else if (proposalVersionUrl === scope.path) {
                scope.selectedState = "is-selected";
            } else {
                scope.selectedState = "is-not-selected";
            }
        }));
        scope.$on("$destroy", this.adhTopLevelState.bind("commentableUrl", scope));
        scope.$on("$destroy", this.adhTopLevelState.bind("proposalTab", scope));

        return instance;
    }

    public _handleDelete(
        instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>,
        path : string
    ) : angular.IPromise<void> {
        var itemPath = AdhUtil.parentPath(path);
        // FIXME: translate
        if (this.$window.confirm("Do you really want to delete this?")) {
            return this.adhHttp.hide(itemPath, RIMercatorProposal.content_type)
                .then(() => {
                    this.$location.url("/r/mercator");
                });
        }
        return this.$q.when();
    }

    private initializeScope(scope : IScope) : IScopeData {
        if (!scope.hasOwnProperty("data")) {
            scope.data = <IScopeData>{};
        }

        var data = scope.data;

        data.user_info = data.user_info || <any>{};
        data.title = data.title || <any>{};
        data.organization_info = data.organization_info || <any>{};
        data.introduction = data.introduction || <any>{};
        data.description = data.description || <any>{};
        data.location = data.location || <any>{};
        data.finance = data.finance || <any>{};

        return data;
    }

    // NOTE: _update takes an item *version*, whereas _create
    // constructs an *item plus a new version*.
    public _update(
        instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>,
        mercatorProposalVersion : R
    ) : angular.IPromise<void> {
        var data = this.initializeScope(instance.scope);

        instance.scope.subResourceSelectedState = (key : string) => {
            var url = mercatorProposalVersion.data[SIMercatorSubResources.nick][key];
            if (!instance.scope.commentableUrl) {
                return "";
            } else if (instance.scope.commentableUrl === url) {
                return "is-selected";
            } else {
                return "is-not-selected";
            }
        };

        instance.scope.showBlogTabs = () => {
            return instance.scope.data.winnerBadgeAssignment && instance.scope.data.currentPhase === "result";
        };

        data.user_info.first_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].personal_name;
        data.user_info.last_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].family_name;
        data.user_info.country = mercatorProposalVersion.data[SIMercatorUserInfo.nick].country;
        data.user_info.createtime = mercatorProposalVersion.data[SIMetaData.nick].item_creation_date;
        data.user_info.path = mercatorProposalVersion.data[SIMetaData.nick].creator;
        data.title = mercatorProposalVersion.data[SITitle.nick].title;
        data.logbookPoolPath = mercatorProposalVersion.data[SILogbook.nick].logbook_pool;

        var heardFrom : SIMercatorHeardFrom.Sheet = mercatorProposalVersion.data[SIMercatorHeardFrom.nick];
        if (typeof heardFrom !== "undefined") {
            data.heard_from = {
                colleague: heardFrom.heard_from_colleague,
                website: heardFrom.heard_from_website,
                newsletter: heardFrom.heard_from_newsletter,
                facebook: heardFrom.heard_from_facebook,
                other: heardFrom.heard_elsewhere !== "",
                other_specify: heardFrom.heard_elsewhere
            };
        }

        data.commentCount = mercatorProposalVersion.data[SICommentable.nick].comments_count;
        data.commentCountTotal = data.commentCount;

        data.supporterCount = 0;
        countSupporters(this.adhHttp, mercatorProposalVersion.data[SILikeable.nick].post_pool, mercatorProposalVersion.path)
            .then((count : number) => { data.supporterCount = count; });

        this.adhGetBadges(<any>mercatorProposalVersion).then((assignments : AdhBadge.IBadge[]) => {
            var communityAssignment = _.find(assignments, (a) => a.name === "community");
            var winningAssignment = _.find(assignments, (a) => a.name === "winning");

            data.winnerBadgeAssignment = communityAssignment || winningAssignment;
        });

        instance.scope.$on("$destroy", <any>this.adhTopLevelState.bind("processState", data, "currentPhase"));

        var subResourcePaths : SIMercatorSubResources.Sheet = mercatorProposalVersion.data[SIMercatorSubResources.nick];
        var subResourcePromises : angular.IPromise<ResourcesBase.IResource[]> = this.$q.all([
            this.adhHttp.get(subResourcePaths.organization_info),
            this.adhHttp.get(subResourcePaths.introduction),
            this.adhHttp.get(subResourcePaths.description),
            this.adhHttp.get(subResourcePaths.location),
            this.adhHttp.get(subResourcePaths.story),
            this.adhHttp.get(subResourcePaths.outcome),
            this.adhHttp.get(subResourcePaths.steps),
            this.adhHttp.get(subResourcePaths.value),
            this.adhHttp.get(subResourcePaths.partners),
            this.adhHttp.get(subResourcePaths.finance),
            this.adhHttp.get(subResourcePaths.experience)
        ]);

        return subResourcePromises.then((subResources : ResourcesBase.IResource[]) => {
            subResources.forEach((subResource : ResourcesBase.IResource) => {
                switch (subResource.content_type) {
                    case RIMercatorOrganizationInfoVersion.content_type: (() => {
                        var scope = data.organization_info;
                        var res : SIMercatorOrganizationInfo.Sheet = subResource.data[SIMercatorOrganizationInfo.nick];

                        scope.status_enum = res.status;
                        scope.name = res.name;
                        scope.country = res.country;
                        scope.website = res.website;
                        if (res.planned_date) {
                            scope.date_of_foreseen_registration = this.moment(res.planned_date).format("YYYY-MM-DD");
                        }
                        scope.how_can_we_help_you = res.help_request;
                        scope.status_other = res.status_other;
                        scope.commentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += scope.commentCount;
                    })();
                    break;
                    case RIMercatorIntroductionVersion.content_type: (() => {
                        var scope = data.introduction;
                        var res : SIMercatorIntroduction.Sheet = subResource.data[SIMercatorIntroduction.nick];
                        scope.teaser = res.teaser;
                        scope.picture = res.picture;
                        scope.commentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += scope.commentCount;
                    })();
                    break;
                    case RIMercatorDescriptionVersion.content_type: (() => {
                        var scope = data.description;
                        var res : SIMercatorDescription.Sheet = subResource.data[SIMercatorDescription.nick];

                        scope.description = res.description;
                        scope.commentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += scope.commentCount;
                    })();
                    break;
                    case RIMercatorLocationVersion.content_type: (() => {
                        var scope = data.location;
                        var res : SIMercatorLocation.Sheet = subResource.data[SIMercatorLocation.nick];

                        scope.location_is_specific = res.location_is_specific;
                        scope.location_specific_1 = res.location_specific_1;
                        scope.location_specific_2 = res.location_specific_2;
                        scope.location_specific_3 = res.location_specific_3;
                        scope.location_is_online = res.location_is_online;
                        scope.location_is_linked_to_ruhr = res.location_is_linked_to_ruhr;
                        scope.commentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += scope.commentCount;
                    })();
                    break;
                    case RIMercatorStoryVersion.content_type: (() => {
                        var res : SIMercatorStory.Sheet = subResource.data[SIMercatorStory.nick];
                        data.story = res.story;
                        data.storyCommentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += data.storyCommentCount;
                    })();
                    break;
                    case RIMercatorOutcomeVersion.content_type: (() => {
                        var res : SIMercatorOutcome.Sheet = subResource.data[SIMercatorOutcome.nick];
                        data.outcome = res.outcome;
                        data.outcomeCommentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += data.outcomeCommentCount;
                    })();
                    break;
                    case RIMercatorStepsVersion.content_type: (() => {
                        var res : SIMercatorSteps.Sheet = subResource.data[SIMercatorSteps.nick];
                        data.steps = res.steps;
                        data.stepsCommentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += data.stepsCommentCount;
                    })();
                    break;
                    case RIMercatorValueVersion.content_type: (() => {
                        var res : SIMercatorValue.Sheet = subResource.data[SIMercatorValue.nick];
                        data.value = res.value;
                        data.valueCommentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += data.valueCommentCount;
                    })();
                    break;
                    case RIMercatorPartnersVersion.content_type: (() => {
                        var res : SIMercatorPartners.Sheet = subResource.data[SIMercatorPartners.nick];
                        data.partners = res.partners;
                        data.partnersCommentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += data.partnersCommentCount;
                    })();
                    break;
                    case RIMercatorFinanceVersion.content_type: (() => {
                        var scope = data.finance;
                        var res : SIMercatorFinance.Sheet = subResource.data[SIMercatorFinance.nick];

                        scope.budget = res.budget;
                        scope.requested_funding = res.requested_funding;
                        scope.other_sources = res.other_sources;
                        scope.granted = res.granted;
                        scope.commentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += scope.commentCount;
                    })();
                    break;
                    case RIMercatorExperienceVersion.content_type: (() => {
                        var res : SIMercatorExperience.Sheet = subResource.data[SIMercatorExperience.nick];
                        data.experience = res.experience;
                        data.experienceCommentCount = subResource.data[SICommentable.nick].comments_count;
                        data.commentCountTotal += data.experienceCommentCount;
                    })();
                    break;
                    default: {
                        throw ("unkown content_type: " + subResource.content_type);
                    }
                }
            });
        });
    }

    private fill(data, resource) : void {

        switch (resource.content_type) {
            case RIMercatorOrganizationInfoVersion.content_type:
                resource.data[SIMercatorOrganizationInfo.nick] = new SIMercatorOrganizationInfo.Sheet({
                    status: data.organization_info.status_enum,
                    name: data.organization_info.name,
                    country: data.organization_info.country,
                    website: data.organization_info.website,
                    planned_date: data.organization_info.date_of_foreseen_registration,
                    help_request: data.organization_info.how_can_we_help_you,
                    status_other: data.organization_info.status_other
                });
                break;
            case RIMercatorIntroductionVersion.content_type:
                resource.data[SIMercatorIntroduction.nick] = new SIMercatorIntroduction.Sheet({
                    teaser: data.introduction.teaser,
                    picture: data.introduction.picture
                });
                break;
            case RIMercatorDescriptionVersion.content_type:
                resource.data[SIMercatorDescription.nick] = new SIMercatorDescription.Sheet({
                    description: data.description.description
                });
                break;
            case RIMercatorLocationVersion.content_type:
                resource.data[SIMercatorLocation.nick] = new SIMercatorLocation.Sheet({
                    location_is_specific: data.location.location_is_specific,
                    location_specific_1: data.location.location_specific_1,
                    location_specific_2: data.location.location_specific_2,
                    location_specific_3: data.location.location_specific_3,
                    location_is_online: data.location.location_is_online,
                    location_is_linked_to_ruhr: data.location.location_is_linked_to_ruhr
                });
                break;
            case RIMercatorStoryVersion.content_type:
                resource.data[SIMercatorStory.nick] = new SIMercatorStory.Sheet({
                    story: data.story
                });
                break;
            case RIMercatorOutcomeVersion.content_type:
                resource.data[SIMercatorOutcome.nick] = new SIMercatorOutcome.Sheet({
                    outcome: data.outcome
                });
                break;
            case RIMercatorStepsVersion.content_type:
                resource.data[SIMercatorSteps.nick] = new SIMercatorSteps.Sheet({
                    steps: data.steps
                });
                break;
            case RIMercatorValueVersion.content_type:
                resource.data[SIMercatorValue.nick] = new SIMercatorValue.Sheet({
                    value: data.value
                });
                break;
            case RIMercatorPartnersVersion.content_type:
                resource.data[SIMercatorPartners.nick] = new SIMercatorPartners.Sheet({
                    partners: data.partners
                });
                break;
            case RIMercatorFinanceVersion.content_type:
                resource.data[SIMercatorFinance.nick] = new SIMercatorFinance.Sheet({
                    budget: data.finance.budget,
                    requested_funding: data.finance.requested_funding,
                    other_sources: data.finance.other_sources,
                    granted: data.finance.granted
                });
                break;
            case RIMercatorExperienceVersion.content_type:
                resource.data[SIMercatorExperience.nick] = new SIMercatorExperience.Sheet({
                    experience: data.experience
                });
                break;
            case RIMercatorProposalVersion.content_type:
                resource.data[SIMercatorUserInfo.nick] = new SIMercatorUserInfo.Sheet({
                    personal_name: data.user_info.first_name,
                    family_name: data.user_info.last_name,
                    country: data.user_info.country
                });
                resource.data[SITitle.nick] = new SITitle.Sheet({
                    title: data.title
                });
                if (typeof data.heard_from !== "undefined") {
                    resource.data[SIMercatorHeardFrom.nick] = new SIMercatorHeardFrom.Sheet({
                        heard_from_colleague: data.heard_from.colleague,
                        heard_from_website: data.heard_from.website,
                        heard_from_newsletter: data.heard_from.newsletter,
                        heard_from_facebook: data.heard_from.facebook,
                        heard_elsewhere: (data.heard_from.other ? data.heard_from.other_specify : "")
                    });
                }
                resource.data[SIMercatorSubResources.nick] = new SIMercatorSubResources.Sheet(<any>{});
                break;
        }

    }

    private cleanOrganizationInfo(data) : void {
        var fieldsMap = {
            "registered_nonprofit": ["name", "country", "website"],
            "planned_nonprofit" : ["name", "country", "website", "date_of_foreseen_registration"],
            "support_needed" : ["name", "country", "website", "how_can_we_help_you"],
            "other" : ["status_other"]
        };
        var allKeys = _.uniq(_.flatten(_.values(fieldsMap)));

        _.forOwn(data.organization_info, (value, key, object) => {
            if (_.includes(allKeys, key) && !(_.includes(fieldsMap[object.status_enum], key))) {
                delete object[key];
            }
        });
    }

    // NOTE: see _update.
    public _create(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>) : angular.IPromise<R[]> {

        var data : IScopeData = this.initializeScope(instance.scope);

        var postProposal = (imagePath? : string) : angular.IPromise<R[]> => {
            if (typeof imagePath !== "undefined") {
                data.introduction.picture = imagePath;
            } else if (typeof data.introduction.picture === "undefined") {
                delete data.introduction.picture;
            }

            var mercatorProposal = new RIMercatorProposal({preliminaryNames: this.adhPreliminaryNames});
            mercatorProposal.parent = instance.scope.poolPath;

            var mercatorProposalVersion = new RIMercatorProposalVersion({preliminaryNames: this.adhPreliminaryNames});
            mercatorProposalVersion.parent = mercatorProposal.path;
            mercatorProposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
                follows: [mercatorProposal.first_version_path]
            });

            this.fill(data, mercatorProposalVersion);

            this.cleanOrganizationInfo(data);

            var subresources = _.map([
                [RIMercatorOrganizationInfo, RIMercatorOrganizationInfoVersion, "organization_info"],
                [RIMercatorIntroduction, RIMercatorIntroductionVersion, "introduction"],
                [RIMercatorDescription, RIMercatorDescriptionVersion, "description"],
                [RIMercatorLocation, RIMercatorLocationVersion, "location"],
                [RIMercatorStory, RIMercatorStoryVersion, "story"],
                [RIMercatorOutcome, RIMercatorOutcomeVersion, "outcome"],
                [RIMercatorSteps, RIMercatorStepsVersion, "steps"],
                [RIMercatorValue, RIMercatorValueVersion, "value"],
                [RIMercatorPartners, RIMercatorPartnersVersion, "partners"],
                [RIMercatorFinance, RIMercatorFinanceVersion, "finance"],
                [RIMercatorExperience, RIMercatorExperienceVersion, "experience"]
            ], (stuff) => {
                var itemClass = <any>stuff[0];
                var versionClass = <any>stuff[1];
                var subresourceKey = <string>stuff[2];

                var item = new itemClass({preliminaryNames: this.adhPreliminaryNames});
                item.parent = mercatorProposal.path;

                var version = new versionClass({preliminaryNames: this.adhPreliminaryNames});
                version.parent = item.path;
                version.data[SIVersionable.nick] = new SIVersionable.Sheet({
                    follows: [item.first_version_path]
                });

                this.fill(data, version);
                mercatorProposalVersion.data[SIMercatorSubResources.nick][subresourceKey] = version.path;

                return [item, version];
            });

            return this.$q.when(_.flattenDeep([mercatorProposal, mercatorProposalVersion, subresources]));
        };

        if (instance.scope.$flow && instance.scope.$flow.support && instance.scope.$flow.files.length > 0) {
            return this.adhUploadImage(
                    "/mercator",
                    instance.scope.$flow,
                    RIMercatorIntroImage.content_type,
                    SIMercatorIntroImageMetadata.nick)
                .then(postProposal);
        } else {
            return postProposal();
        }
    }

    public _edit(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>, old : R) : angular.IPromise<R[]> {
        var self : Widget<R> = this;
        var data = this.initializeScope(instance.scope);

        var postProposal = (imagePath? : string) : angular.IPromise<R[]> => {
            if (typeof imagePath !== "undefined") {
                data.introduction.picture = imagePath;
            } else if (typeof data.introduction.picture === "undefined") {
                delete data.introduction.picture;
            }

            var mercatorProposalVersion = AdhResourceUtil.derive(old, {preliminaryNames : this.adhPreliminaryNames});
            mercatorProposalVersion.parent = AdhUtil.parentPath(old.path);

            this.fill(data, mercatorProposalVersion);

            this.cleanOrganizationInfo(data);

            return AdhUtil.qFilter(_.map(old.data[SIMercatorSubResources.nick], (path : string, key : string) => {
                    var deferred = self.$q.defer();
                    self.adhHttp.get(path).then((oldSubresource) => {
                        var subresource = AdhResourceUtil.derive(oldSubresource, {preliminaryNames : self.adhPreliminaryNames});
                        subresource.parent = AdhUtil.parentPath(oldSubresource.path);
                        self.fill(data, subresource);
                        if (AdhResourceUtil.hasEqualContent(oldSubresource, subresource)) {
                            mercatorProposalVersion.data[SIMercatorSubResources.nick][key] = oldSubresource.path;
                            deferred.reject();
                        } else {
                            mercatorProposalVersion.data[SIMercatorSubResources.nick][key] = subresource.path;
                            deferred.resolve(subresource);
                        }
                    });
                    return deferred.promise;
                }), self.$q)
                .then((subresources) => _.flattenDeep([mercatorProposalVersion, subresources]));

        };

        if (instance.scope.$flow && instance.scope.$flow.support && instance.scope.$flow.files.length > 0) {
            return this.adhUploadImage(
                    "/mercator",
                    instance.scope.$flow,
                    RIMercatorIntroImage.content_type,
                    SIMercatorIntroImageMetadata.nick)
                .then(postProposal);
        } else {
            return postProposal();
        }
    }

    public _clear(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>) : void {
        delete instance.scope.data;
    }
}


export class CreateWidget<R extends ResourcesBase.IResource> extends Widget<R> {
    constructor(
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        adhTopLevelState : AdhTopLevelState.Service,
        adhGetBadges : AdhBadge.IGetBadges,
        adhUploadImage,
        private $timeout : angular.ITimeoutService,
        flowFactory,
        moment : moment.MomentStatic,
        private modernizr : ModernizrStatic,
        $window : Window,
        $location : angular.ILocationService,
        $q : angular.IQService
    ) {
        super(
            adhConfig,
            adhHttp,
            adhPreliminaryNames,
            adhTopLevelState,
            adhGetBadges,
            adhUploadImage,
            flowFactory,
            moment,
            $window,
            $location,
            $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/Create.html";
    }

    public link(scope, element, attrs, wrapper) {
        var instance = super.link(scope, element, attrs, wrapper);
        instance.scope.data = <any>{};
        instance.scope.$watch("$viewContentLoaded", () => {
            if (!this.modernizr.inputtypes.number) {
                element.find(":input[type='number']").updatePolyfill();
                $(".has-input-buttons").removeClass( "has-input-buttons").css({"display" : "inline-block"});
            }
        });
        // Fix for later, if we want to add a webshim datepicker
        /*var _self = this;
        instance.scope.$watch("data.organization_info.status_enum", function() {
            if (!this.modernizr.inputtypes.date) {
                _self.$timeout(() => {
                    element.find(":input[type='date']").updatePolyfill();
                });
            }
        });*/
        return instance;
    }

    public _clear(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>) : void {
        super._clear(instance);

        // FIXME: I don't know whether both are needed.
        instance.scope.mercatorProposalForm.$setPristine();
        instance.scope.mercatorProposalForm.$setUntouched();
    }
}


export class DetailWidget<R extends ResourcesBase.IResource> extends Widget<R> {
    constructor(
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        adhTopLevelState : AdhTopLevelState.Service,
        adhGetBadges : AdhBadge.IGetBadges,
        adhUploadImage,
        flowFactory,
        moment : moment.MomentStatic,
        $window,
        $location,
        $q : angular.IQService
    ) {
        super(
            adhConfig,
            adhHttp,
            adhPreliminaryNames,
            adhTopLevelState,
            adhGetBadges,
            adhUploadImage,
            flowFactory,
            moment,
            $window,
            $location,
            $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/Detail.html";
    }
}


export var listing = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        scope: {
            path: "@",
            contentType: "@",
            facets: "=?",
            sort: "=?",
            sorts: "=?",
            reverse: "=?",
            initialLimit: "=?",
            params: "=?"
        }
    };
};


export var userListing = (adhConfig : AdhConfig.IService) => {
    return {
        scope: {
            path: "@"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserListing.html",
        link: (scope) => {
            scope.poolUrl = adhConfig.rest_url + adhConfig.custom["mercator_platform_path"];
            scope.contentType = RIMercatorProposalVersion.content_type;
            scope.params = {
                creator: scope.path.replace(adhConfig.rest_url, "").replace(/\/+$/, "")
            };
        }
    };
};


export var listItem = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        scope: {
            path: "@"
        },
        link: (scope, element) => {
            scope.data  = {};
            adhHttp.get(scope.path).then((proposal) => {
                scope.data.user_info = {
                    first_name: proposal.data[SIMercatorUserInfo.nick].personal_name,
                    last_name: proposal.data[SIMercatorUserInfo.nick].family_name,
                    createtime: proposal.data[SIMetaData.nick].item_creation_date,
                    path: proposal.data[SIMetaData.nick].creator
                };
                scope.data.title = {
                    title: proposal.data[SITitle.nick].title
                };
                adhHttp.get(proposal.data[SIMercatorSubResources.nick].introduction).then((introduction) => {
                    scope.data.introduction = {
                        picture: introduction.data[SIMercatorIntroduction.nick].picture
                    };
                });
                adhHttp.get(proposal.data[SIMercatorSubResources.nick].organization_info).then((organizationInfo) => {
                    scope.data.organization_info = {
                        name: organizationInfo.data[SIMercatorOrganizationInfo.nick].name
                    };
                });
                adhHttp.get(proposal.data[SIMercatorSubResources.nick].finance).then((finance) => {
                    scope.data.finance = {
                        budget: finance.data[SIMercatorFinance.nick].budget,
                        requested_funding: finance.data[SIMercatorFinance.nick].requested_funding
                    };
                });

                adhGetBadges(proposal).then((assignments) => {
                    var communityAssignment = _.find(assignments, (a) => a.name === "community");
                    var winningAssignment = _.find(assignments, (a) => a.name === "winning");

                    scope.data.winnerBadgeAssignment = communityAssignment || winningAssignment;
                });

                scope.$on("$destroy", adhTopLevelState.bind("processState", scope.data, "currentPhase"));

                scope.$on("$destroy", adhTopLevelState.on("proposalUrl", (proposalVersionUrl) => {
                    if (!proposalVersionUrl) {
                        scope.selectedState = "";
                    } else if (proposalVersionUrl === scope.path) {
                        scope.selectedState = "is-selected";
                    } else {
                        scope.selectedState = "is-not-selected";
                    }
                }));

                // FIXME: does not count comments to sub-resources
                scope.data.commentCountTotal = proposal.data[SICommentable.nick].comments_count;
            });

            countSupporters(adhHttp, AdhUtil.parentPath(scope.path) + "rates/", scope.path).then((count) => {
                scope.data.supporterCount = count;
            });
        }
    };
};


export var addProposalButton = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/AddProposalButton.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("processState", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");
            scope.setCameFrom = () => adhTopLevelState.setCameFrom();
        }
    };
};


export var mercatorProposalFormController = ($scope : IControllerScope, $element, $window, adhShowError, adhSubmitIfValid) => {
    var heardFromCheckboxes = [
        "heard-from-colleague",
        "heard-from-website",
        "heard-from-newsletter",
        "heard-from-facebook",
        "heard-from-other"
    ];

    var locationCheckboxes = [
        "location-location-is-specific",
        "location-location-is-online",
        "location-location-is-linked-to-ruhr"
    ];

    var updateCheckBoxGroupValidity = (form, names : string[]) : boolean => {
        var valid =  _.some(names, (name) => form[name].$modelValue);
        _.forOwn(names, (name) => {
            form[name].$setValidity("groupRequired", valid);
        });
        return valid;
    };

    var showCheckboxGroupError = (form, names : string[]) : boolean => {
        var dirty = $scope.mercatorProposalForm.$submitted || _.some(names, (name) => form[name].$dirty);
        return !updateCheckBoxGroupValidity(form, names) && dirty;
    };

    $scope.showError = adhShowError;

    $scope.showHeardFromError = () : boolean => {
        return showCheckboxGroupError($scope.mercatorProposalExtraForm, heardFromCheckboxes);
    };

    $scope.showLocationError = () : boolean => {
        return showCheckboxGroupError($scope.mercatorProposalDetailForm, locationCheckboxes);
    };

    $scope.showFinanceGrantedInfo = () : boolean => {
        return ($scope.data.finance && $scope.data.finance.other_sources && $scope.data.finance.other_sources !== "");
    };

    var imageExists = () => {
        if ($scope.$flow && $scope.$flow.support) {
            return ($scope.data.introduction && $scope.data.introduction.picture) || $scope.$flow.files.length > 0;
        } else {
            return false;
        }
    };

    // $scope.$flow is set in parent link() function, so it is not available yet
    _.defer(() => {
        if ($scope.$flow && $scope.$flow.support) {
            var imgUploadController = $scope.mercatorProposalIntroductionForm["introduction-picture-upload"];

            // validate image upload
            $scope.$flow.on("fileAdded", (file, event) => {
                // We can only check some constraints after the image has
                // been loaded asynchronously.  So we always return false in
                // order to keep flow.js from adding the image and then add
                // it manually after successful validation.

                // FIXME: possible compatibility issue
                var _URL = $window.URL || $window.webkitURL;

                var img = new Image();
                img.src = _URL.createObjectURL(file.file);
                img.onload = () => {
                    imgUploadController.$setDirty();
                    imgUploadController.$setValidity("required", true);
                    imgUploadController.$setValidity("tooBig", file.size <= $scope.$flow.opts.maximumByteSize);
                    imgUploadController.$setValidity(
                        "wrongType", $scope.$flow.opts.acceptedFileTypes.indexOf(file.getType()) !== -1);
                    imgUploadController.$setValidity("tooNarrow", img.width >= $scope.$flow.opts.minimumWidth);

                    if (imgUploadController.$valid) {
                        $scope.$flow.files[0] = file;
                    } else {
                        $scope.$flow.cancel();
                        imgUploadController.$setValidity("required", imageExists());
                    }

                    $scope.$apply();
                };

                $scope.$apply();
                return false;
            });
        }
    });

    $scope.submitIfValid = (callCount = 0) : angular.IPromise<any> => {
        if ($scope.$flow && $scope.$flow.support) {
            var imgUploadController = $scope.mercatorProposalIntroductionForm["introduction-picture-upload"];
            imgUploadController.$setValidity("required", imageExists());
        }

        return adhSubmitIfValid($scope, $element, $scope.mercatorProposalForm, () => {
            return $scope.submit();
        });
    };
};


export var registerRoutes = (
    processType : string = "",
    context : string = ""
) => (
    adhResourceAreaProvider : AdhResourceArea.Provider,
    adhMetaApi : AdhMetaApi.Service
) => {
    adhResourceAreaProvider
        .default(RIMercatorProposalVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specific(RIMercatorProposalVersion, "", processType, context, () => (resource : RIMercatorProposalVersion) => {
            return {
                proposalUrl: resource.path
            };
        })
        .default(RIMercatorProposalVersion, "edit", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-hide"
        })
        .specific(RIMercatorProposalVersion, "edit", processType, context, ["adhHttp", (adhHttp : AdhHttp.Service<any>) => {
            return (resource : RIMercatorProposalVersion) => {
                var poolPath = AdhUtil.parentPath(resource.path);

                return adhHttp.options(poolPath).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {
                            proposalUrl: resource.path
                        };
                    }
                });
            };
        }])
        .default(RIMercatorProposalVersion, "blog", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide",
            proposalTab: "blog"
        })
        .specific(RIMercatorProposalVersion, "blog", processType, context, () => (resource : RIMercatorProposalVersion) => {
            return {
                proposalUrl: resource.path
            };
        })
        .default(RIMercatorProposalVersion, "comments", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specific(RIMercatorProposalVersion, "comments", processType, context, () => (resource : RIMercatorProposalVersion) => {
            return {
                proposalUrl: resource.path,
                commentableUrl: resource.path,
                commentCloseUrl: resource.path
            };
        });

    var sections = _.map(adhMetaApi.sheet(SIMercatorSubResources.nick).fields, "name");
    _.forEach(sections, (section : string) => {
        adhResourceAreaProvider
            .default(RIMercatorProposalVersion, "comments:" + section, processType, context, {
                space: "content",
                movingColumns: "is-collapse-show-show"
            })
            .specific(RIMercatorProposalVersion, "comments:" + section, processType, context, () =>
                (resource : RIMercatorProposalVersion) => {
                    return {
                        proposalUrl: resource.path,
                        commentableUrl: resource.data[SIMercatorSubResources.nick][section],
                        commentCloseUrl: resource.path
                    };
                }
            );
    });
};
