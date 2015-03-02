/* tslint:disable:variable-name */
/// <reference path="../../../lib/DefinitelyTyped/moment/moment.d.ts"/>

import _ = require("lodash");

import AdhAngularHelpers = require("../AngularHelpers/AngularHelpers");
import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhInject = require("../Inject/Inject");
import AdhLocale = require("../Locale/Locale");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhResourceUtil = require("../Util/ResourceUtil");
import AdhResourceWidgets = require("../ResourceWidgets/ResourceWidgets");
import AdhSticky = require("../Sticky/Sticky");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUtil = require("../Util/Util");

import ResourcesBase = require("../../ResourcesBase");

import RICommentVersion = require("../../Resources_/adhocracy_core/resources/comment/ICommentVersion");
import RIMercatorDescription = require("../../Resources_/adhocracy_mercator/resources/mercator/IDescription");
import RIMercatorDescriptionVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IDescriptionVersion");
import RIMercatorLocation = require("../../Resources_/adhocracy_mercator/resources/mercator/ILocation");
import RIMercatorLocationVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/ILocationVersion");
import RIMercatorExperience = require("../../Resources_/adhocracy_mercator/resources/mercator/IExperience");
import RIMercatorExperienceVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IExperienceVersion");
import RIMercatorFinance = require("../../Resources_/adhocracy_mercator/resources/mercator/IFinance");
import RIMercatorFinanceVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IFinanceVersion");
import RIMercatorIntroduction = require("../../Resources_/adhocracy_mercator/resources/mercator/IIntroduction");
import RIMercatorIntroductionVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IIntroductionVersion");
import RIMercatorIntroImage = require("../../Resources_/adhocracy_mercator/resources/mercator/IIntroImage");
import RIMercatorOrganizationInfo = require("../../Resources_/adhocracy_mercator/resources/mercator/IOrganizationInfo");
import RIMercatorOrganizationInfoVersion =
    require("../../Resources_/adhocracy_mercator/resources/mercator/IOrganizationInfoVersion");
import RIMercatorOutcome = require("../../Resources_/adhocracy_mercator/resources/mercator/IOutcome");
import RIMercatorOutcomeVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IOutcomeVersion");
import RIMercatorPartners = require("../../Resources_/adhocracy_mercator/resources/mercator/IPartners");
import RIMercatorPartnersVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IPartnersVersion");
import RIMercatorProposal = require("../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposal");
import RIMercatorProposalVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposalVersion");
import RIMercatorSteps = require("../../Resources_/adhocracy_mercator/resources/mercator/ISteps");
import RIMercatorStepsVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IStepsVersion");
import RIMercatorStory = require("../../Resources_/adhocracy_mercator/resources/mercator/IStory");
import RIMercatorStoryVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IStoryVersion");
import RIMercatorValue = require("../../Resources_/adhocracy_mercator/resources/mercator/IValue");
import RIMercatorValueVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IValueVersion");
import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
import SICommentable = require("../../Resources_/adhocracy_core/sheets/comment/ICommentable");
import SIHasAssetPool = require("../../Resources_/adhocracy_core/sheets/asset/IHasAssetPool");
import SILikeable = require("../../Resources_/adhocracy_core/sheets/rate/ILikeable");
import SIMercatorDescription = require("../../Resources_/adhocracy_mercator/sheets/mercator/IDescription");
import SIMercatorExperience = require("../../Resources_/adhocracy_mercator/sheets/mercator/IExperience");
import SIMercatorFinance = require("../../Resources_/adhocracy_mercator/sheets/mercator/IFinance");
import SIMercatorHeardFrom = require("../../Resources_/adhocracy_mercator/sheets/mercator/IHeardFrom");
import SIMercatorIntroduction = require("../../Resources_/adhocracy_mercator/sheets/mercator/IIntroduction");
import SIMercatorIntroImageMetadata = require("../../Resources_/adhocracy_mercator/sheets/mercator/IIntroImageMetadata");
import SIMercatorLocation = require("../../Resources_/adhocracy_mercator/sheets/mercator/ILocation");
import SIMercatorOrganizationInfo = require("../../Resources_/adhocracy_mercator/sheets/mercator/IOrganizationInfo");
import SIMercatorOutcome = require("../../Resources_/adhocracy_mercator/sheets/mercator/IOutcome");
import SIMercatorPartners = require("../../Resources_/adhocracy_mercator/sheets/mercator/IPartners");
import SIMercatorSteps = require("../../Resources_/adhocracy_mercator/sheets/mercator/ISteps");
import SIMercatorStory = require("../../Resources_/adhocracy_mercator/sheets/mercator/IStory");
import SIMercatorSubResources = require("../../Resources_/adhocracy_mercator/sheets/mercator/IMercatorSubResources");
import SIMercatorUserInfo = require("../../Resources_/adhocracy_mercator/sheets/mercator/IUserInfo");
import SIMercatorTitle = require("../../Resources_/adhocracy_mercator/sheets/mercator/ITitle");
import SIMercatorValue = require("../../Resources_/adhocracy_mercator/sheets/mercator/IValue");
import SIMetaData = require("../../Resources_/adhocracy_core/sheets/metadata/IMetadata");
import SIName = require("../../Resources_/adhocracy_core/sheets/name/IName");
import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");
import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");

var pkgLocation = "/MercatorProposal";


export interface IScopeData {
    commentCount : number;
    commentCountTotal : number;
    supporterCount : number;

    title : {
        title : string;
    }

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
        nickInstance : number;
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
 * upload mercator proposal image file.  this function can potentially
 * be more general; for now it just handles the Flow object and
 * promises the path of the image resource as a string.
 *
 * as the a3 asset protocol is much simpler than HTML5 file upload, we
 * compose the multi-part mime post request manually (no chunking).
 * The $flow object is just used for meta data retrieval and cleared
 * before it can upload anything.
 *
 * NOTE: this uses several HTML5 APIs so you need to check for
 * compability before using it.
 */
export var uploadImageFile = (
    adhHttp : AdhHttp.Service<any>,
    poolPath : string,
    flow : Flow
) : ng.IPromise<string> => {
    if (flow.files.length !== 1) {
        throw "could not upload file: $flow.files.length !== 1";
    }
    var file = flow.files[0].file;

    var bytes = () : any => {
        var func;
        if (file.mozSlice) {
            func = "mozSlice";
        } else if (file.webkitSlice) {
            func = "webkitSlice";
        } else {
            func = "slice";
        }

        return file[func](0, file.size, file.type);
    };

    var formData = new FormData();
    formData.append("content_type", RIMercatorIntroImage.content_type);
    formData.append("data:" + SIMercatorIntroImageMetadata.nick + ":mime_type", file.type);
    formData.append("data:adhocracy_core.sheets.asset.IAssetData:data", bytes());

    return adhHttp.get(poolPath)
        .then((mercatorPool) => {
            var postPath : string = mercatorPool.data[SIHasAssetPool.nick].asset_pool;
            return adhHttp.postRaw(postPath, formData)
                .then((rsp) => rsp.data.path);
        });
};

/**
 * promise supporters count.
 */
var countSupporters = (adhHttp : AdhHttp.Service<any>, postPoolPath : string, objectPath : string) : ng.IPromise<number> => {
    var query : any = {
        content_type: RIRateVersion.content_type,
        depth: "2",
        tag: "LAST",
        rate: "1",
        count: "true",
        elements: "omit"
    };
    query[SIRate.nick + ":object"] = objectPath;
    return adhHttp.get(postPoolPath, query)
        .then((response) => {
            var pool : SIPool.Sheet = response.data[SIPool.nick];
            return parseInt((<any>pool).count, 10);  // see #261
        });
};

/**
 * promise recursive comments count.
 */
var countComments = (adhHttp : AdhHttp.Service<any>, postPoolPath : string) : ng.IPromise<number> => {

    var query : any = {
        content_type: RICommentVersion.content_type,
        depth: "all",
        tag: "LAST",
        count: "true",
        elements: "omit"
    };

    // NOTE (important for re-factorers): we could filter like this:
    //
    // | query[SIComment.nick + ":refers_to"] = commentableVersion.path;
    //
    // but that would only catch comments in one sub-tree level.
    // so we must expect that each proposal has its own post pool,
    // and just count all LAST versions in that pool, ignoring the
    // refers_to.)

    return adhHttp.get(postPoolPath, query)
        .then((response) => {
            var pool : SIPool.Sheet = response.data[SIPool.nick];
            return parseInt((<any>pool).count, 10);  // see #261
        });
};

export class Widget<R extends ResourcesBase.Resource> extends AdhResourceWidgets.ResourceWidget<R, IScope> {
    constructor(
        public adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        private adhTopLevelState : AdhTopLevelState.Service,
        private flowFactory,
        private moment : MomentStatic,
        $q : ng.IQService
    ) {
        super(adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/ListItem.html";
    }

    public createDirective() : ng.IDirective {
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

        return instance;
    }

    public _handleDelete(
        instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>,
        path : string
    ) : ng.IPromise<void> {
        return this.$q.when();
    }

    private countComments(commentableVersion : any) : ng.IPromise<number> {
        var sheet : SICommentable.Sheet = commentableVersion.data[SICommentable.nick];
        return countComments(this.adhHttp, sheet.post_pool);
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
    ) : ng.IPromise<void> {
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

        data.user_info.first_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].personal_name;
        data.user_info.last_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].family_name;
        data.user_info.country = mercatorProposalVersion.data[SIMercatorUserInfo.nick].country;
        data.user_info.createtime = mercatorProposalVersion.data[SIMetaData.nick].item_creation_date;
        data.user_info.path = mercatorProposalVersion.data[SIMetaData.nick].creator;
        data.title = mercatorProposalVersion.data[SIMercatorTitle.nick].title;


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

        data.commentCountTotal = 0;
        data.commentCount = mercatorProposalVersion.data[SICommentable.nick].comments.length;
        this.countComments(mercatorProposalVersion)
            .then((count : number) => { data.commentCount = count; data.commentCountTotal += count; });

        data.supporterCount = 0;
        countSupporters(this.adhHttp, mercatorProposalVersion.data[SILikeable.nick].post_pool, mercatorProposalVersion.path)
            .then((count : number) => { data.supporterCount = count; });

        var subResourcePaths : SIMercatorSubResources.Sheet = mercatorProposalVersion.data[SIMercatorSubResources.nick];
        var subResourcePromises : ng.IPromise<ResourcesBase.Resource[]> = this.$q.all([
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

        return subResourcePromises.then((subResources : ResourcesBase.Resource[]) => {
            subResources.forEach((subResource : ResourcesBase.Resource) => {
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
                        scope.commentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { scope.commentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorIntroductionVersion.content_type: (() => {
                        var scope = data.introduction;
                        var res : SIMercatorIntroduction.Sheet = subResource.data[SIMercatorIntroduction.nick];
                        scope.teaser = res.teaser;
                        scope.picture = res.picture;
                        scope.commentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { scope.commentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorDescriptionVersion.content_type: (() => {
                        var scope = data.description;
                        var res : SIMercatorDescription.Sheet = subResource.data[SIMercatorDescription.nick];

                        scope.description = res.description;
                        scope.commentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { scope.commentCount = c; data.commentCountTotal += c; });
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
                        scope.commentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { scope.commentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorStoryVersion.content_type: (() => {
                        var res : SIMercatorStory.Sheet = subResource.data[SIMercatorStory.nick];
                        data.story = res.story;
                        data.storyCommentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { data.storyCommentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorOutcomeVersion.content_type: (() => {
                        var res : SIMercatorOutcome.Sheet = subResource.data[SIMercatorOutcome.nick];
                        data.outcome = res.outcome;
                        data.outcomeCommentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { data.outcomeCommentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorStepsVersion.content_type: (() => {
                        var res : SIMercatorSteps.Sheet = subResource.data[SIMercatorSteps.nick];
                        data.steps = res.steps;
                        data.stepsCommentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { data.stepsCommentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorValueVersion.content_type: (() => {
                        var res : SIMercatorValue.Sheet = subResource.data[SIMercatorValue.nick];
                        data.value = res.value;
                        data.valueCommentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { data.valueCommentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorPartnersVersion.content_type: (() => {
                        var res : SIMercatorPartners.Sheet = subResource.data[SIMercatorPartners.nick];
                        data.partners = res.partners;
                        data.partnersCommentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { data.partnersCommentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorFinanceVersion.content_type: (() => {
                        var scope = data.finance;
                        var res : SIMercatorFinance.Sheet = subResource.data[SIMercatorFinance.nick];

                        scope.budget = res.budget;
                        scope.requested_funding = res.requested_funding;
                        scope.other_sources = res.other_sources;
                        scope.granted = res.granted;
                        scope.commentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { scope.commentCount = c; data.commentCountTotal += c; });
                    })();
                    break;
                    case RIMercatorExperienceVersion.content_type: (() => {
                        var res : SIMercatorExperience.Sheet = subResource.data[SIMercatorExperience.nick];
                        data.experience = res.experience;
                        data.experienceCommentCount = subResource.data[SICommentable.nick].comments.length;
                        this.countComments(subResource).then((c) => { data.experienceCommentCount = c; data.commentCountTotal += c; });
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
                resource.data[SIMercatorTitle.nick] = new SIMercatorTitle.Sheet({
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
            if (_.contains(allKeys, key) && !(_.contains(fieldsMap[object.status_enum], key))) {
                delete object[key];
            }
        });
    }

    // NOTE: see _update.
    public _create(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>) : ng.IPromise<R[]> {

        var data : IScopeData = this.initializeScope(instance.scope);

        var postProposal = (imagePath? : string) : ng.IPromise<R[]> => {
            if (typeof imagePath !== "undefined") {
                data.introduction.picture = imagePath;
            } else if (typeof data.introduction.picture === "undefined") {
                delete data.introduction.picture;
            }

            var mercatorProposal = new RIMercatorProposal({preliminaryNames : this.adhPreliminaryNames});
            mercatorProposal.parent = instance.scope.poolPath;
            mercatorProposal.data[SIName.nick] = new SIName.Sheet({
                name: AdhUtil.normalizeName(data.title + <any>data.introduction.nickInstance)
            });

            var mercatorProposalVersion = new RIMercatorProposalVersion({preliminaryNames : this.adhPreliminaryNames});
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
                item.data[SIName.nick] = new SIName.Sheet({
                    name: AdhUtil.normalizeName(subresourceKey)
                });

                var version = new versionClass({preliminaryNames: this.adhPreliminaryNames});
                version.parent = item.path;
                version.data[SIVersionable.nick] = new SIVersionable.Sheet({
                    follows: [item.first_version_path]
                });

                this.fill(data, version);
                mercatorProposalVersion.data[SIMercatorSubResources.nick][subresourceKey] = version.path;

                return [item, version];
            });

            // FIXME: remove <any> when borisyankov/DefinitelyTyped#3573 is resolved
            return this.$q.when((<any>_).flattenDeep([mercatorProposal, mercatorProposalVersion, subresources]));
        };

        if (instance.scope.$flow && instance.scope.$flow.support && instance.scope.$flow.files.length > 0) {
            return uploadImageFile(this.adhHttp, "/mercator", instance.scope.$flow)
                .then(postProposal);
        } else {
            return postProposal();
        }
    }

    public _edit(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>, old : R) : ng.IPromise<R[]> {
        var self : Widget<R> = this;
        var data = this.initializeScope(instance.scope);

        var postProposal = (imagePath? : string) : ng.IPromise<R[]> => {
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
                // FIXME: remove <any> when borisyankov/DefinitelyTyped#3573 is resolved
                .then((subresources) => (<any>_).flattenDeep([mercatorProposalVersion, subresources]));

        };

        if (instance.scope.$flow && instance.scope.$flow.support && instance.scope.$flow.files.length > 0) {
            return uploadImageFile(this.adhHttp, "/mercator", instance.scope.$flow)
                .then(postProposal);
        } else {
            return postProposal();
        }
    }

    public _clear(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>) : void {
        delete instance.scope.data;
    }
}


export class CreateWidget<R extends ResourcesBase.Resource> extends Widget<R> {
    constructor(
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        adhTopLevelState : AdhTopLevelState.Service,
        private $timeout : ng.ITimeoutService,
        flowFactory,
        moment : MomentStatic,
        $q : ng.IQService
    ) {
        super(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, flowFactory, moment, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/Create.html";
    }

    public link(scope, element, attrs, wrapper) {
        var instance = super.link(scope, element, attrs, wrapper);
        instance.scope.data = <any>{};
        instance.scope.$watch("$viewContentLoaded", function() {
            if (!Modernizr.inputtypes.number) {
                element.find(":input[type='number']").updatePolyfill();
                $(".has-input-buttons").removeClass( "has-input-buttons").css({"display" : "inline-block"});
            }
        });
        // Fix for later, if we want to add a webshim datepicker
        /*var _self = this;
        instance.scope.$watch("data.organization_info.status_enum", function() {
            if (!Modernizr.inputtypes.date) {
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


export class DetailWidget<R extends ResourcesBase.Resource> extends Widget<R> {
    constructor(
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        adhTopLevelState : AdhTopLevelState.Service,
        flowFactory,
        moment : MomentStatic,
        $q : ng.IQService
    ) {
        super(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, flowFactory, moment, $q);
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
            update: "=?",
            facets: "=?",
            sort: "=?",
            frontendOrderPredicate: "=?",
            frontendOrderReverse: "=?",
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
                creator: scope.path.replace(adhConfig.rest_url, "").replace(/\/+$/, ""),
                depth: 2
            };
        }
    };
};


export var listItem = (adhConfig : AdhConfig.IService, adhHttp : AdhHttp.Service<any>, adhTopLevelState : AdhTopLevelState.Service) => {
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
                    last_name: proposal.data[SIMercatorUserInfo.nick].personal_name,
                    country: proposal.data[SIMetaData.nick].item_creation_date,
                    path: proposal.data[SIMetaData.nick].creator
                };
                scope.data.title = {
                    title: proposal.data[SIMercatorTitle.nick].title
                };
                adhHttp.get(proposal.data[SIMercatorSubResources.nick].introduction).then((introduction) => {
                    scope.data.introduction = {
                        picture: introduction.data[SIMercatorIntroduction.nick].picture
                    };
                });
                adhHttp.get(proposal.data[SIMercatorSubResources.nick].organization_info).then((organization_info) => {
                    scope.data.organization_info = {
                        name: organization_info.data[SIMercatorOrganizationInfo.nick].name
                    };
                });
                adhHttp.get(proposal.data[SIMercatorSubResources.nick].finance).then((finance) => {
                    scope.data.finance = {
                        budget: finance.data[SIMercatorFinance.nick].budget,
                        requested_funding: finance.data[SIMercatorFinance.nick].requested_funding
                    };
                });
                scope.$on("$destroy", adhTopLevelState.on("proposalUrl", (proposalVersionUrl) => {
                    if (!proposalVersionUrl) {
                        scope.selectedState = "";
                    } else if (proposalVersionUrl === scope.path) {
                        scope.selectedState = "is-selected";
                    } else {
                        scope.selectedState = "is-not-selected";
                    }
                }));
            });

            countSupporters(adhHttp, AdhUtil.parentPath(scope.path) + "rates/", scope.path).then((count) => {
                scope.data.supporterCount = count;
            });
            countComments(adhHttp, AdhUtil.parentPath(scope.path)).then((count) => {
                scope.data.commentCountTotal = count;
            });
        }
    };
};


export var imageUriFilter = () => {
    return (path? : string, format : string = "detail") : string => {
        if (path) {
            return path + "/" + format;
        } else {
            return "/static/fallback_" + format + ".jpg";
        }
    };
};


export var moduleName = "adhMercatorProposal";

export var register = (angular) => {
    angular
        .module(moduleName, [
            "duScroll",
            "ngMessages",
            AdhAngularHelpers.moduleName,
            AdhHttp.moduleName,
            AdhInject.moduleName,
            AdhLocale.moduleName,
            AdhPreliminaryNames.moduleName,
            AdhResourceArea.moduleName,
            AdhResourceWidgets.moduleName,
            AdhSticky.moduleName,
            AdhTopLevelState.moduleName
        ])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .default(RIMercatorProposalVersion.content_type, "", {
                    space: "content",
                    movingColumns: "is-show-show-hide"
                })
                .specific(RIMercatorProposalVersion.content_type, "", () => (resource : RIMercatorProposalVersion) => {
                    return {
                        proposalUrl: resource.path
                    };
                })
                .default(RIMercatorProposalVersion.content_type, "edit", {
                    space: "content",
                    movingColumns: "is-collapse-show-hide"
                })
                .specific(RIMercatorProposalVersion.content_type, "edit", ["adhHttp", (adhHttp : AdhHttp.Service<any>) => {
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
                .default(RIMercatorProposalVersion.content_type, "comments", {
                    space: "content",
                    movingColumns: "is-collapse-show-show"
                })
                .specific(RIMercatorProposalVersion.content_type, "comments", () => (resource : RIMercatorProposalVersion) => {
                    return {
                        proposalUrl: resource.path,
                        commentableUrl: resource.path
                    };
                });

            _(SIMercatorSubResources.Sheet._meta.readable).forEach((section : string) => {
                adhResourceAreaProvider
                    .default(RIMercatorProposalVersion.content_type, "comments:" + section, {
                        space: "content",
                        movingColumns: "is-collapse-show-show"
                    })
                    .specific(RIMercatorProposalVersion.content_type, "comments:" + section, () =>
                        (resource : RIMercatorProposalVersion) => {
                            return {
                                proposalUrl: resource.path,
                                commentableUrl: resource.data[SIMercatorSubResources.nick][section]
                            };
                        }
                    );
            }).value();
        }])
        .config(["flowFactoryProvider", (flowFactoryProvider) => {
            if (typeof flowFactoryProvider.defaults === "undefined") {
                flowFactoryProvider.defaults = {};
            }
            flowFactoryProvider.defaults = {
                singleFile: true,
                maxChunkRetries: 1,
                chunkRetryInterval: 5000,
                simultaneousUploads: 4,
                permanentErrors: [404, 500, 501, 502, 503],
                // these are not native to flow but used by custom functions
                minimumWidth: 400,
                maximumByteSize: 3000000,
                acceptedFileTypes: [
                    "gif",
                    "jpeg",
                    "png"
                ]  // correspond to exact mime types EG image/png
            };
        }])
        // NOTE: we do not use a Widget based directive here for performance reasons
        .directive("adhMercatorProposal", ["adhConfig", "adhHttp", "adhTopLevelState", listItem])
        .directive("adhMercatorProposalDetailView",
            ["adhConfig", "adhHttp", "adhPreliminaryNames", "adhTopLevelState", "flowFactory", "moment", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, flowFactory, moment, $q) => {
                var widget = new DetailWidget(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, flowFactory, moment, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalCreate",
            ["adhConfig", "adhHttp", "adhPreliminaryNames", "adhTopLevelState", "$timeout", "flowFactory", "moment", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $timeout, flowFactory, moment, $q) => {
                var widget = new CreateWidget(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $timeout, flowFactory, moment, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalListing", ["adhConfig", listing])
        .directive("adhMercatorUserProposalListing", ["adhConfig", userListing])
        .filter("adhImageUri", imageUriFilter)
        .controller("mercatorProposalFormController", ["$scope", "$element", "$window", ($scope : IControllerScope, $element, $window) => {
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

            var getFieldByName = (fieldName : string) => {
                var fieldNameArr : string[] = fieldName.split(".");
                return fieldNameArr[1]
                    ? $scope.mercatorProposalForm[fieldNameArr[0]][fieldNameArr[1]]
                    : $scope.mercatorProposalForm[fieldNameArr[0]];
            };

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

            $scope.showError = (fieldName : string, errorType : string) : boolean => {
                var field = getFieldByName(fieldName);
                return field.$error[errorType] && (field.$dirty || $scope.mercatorProposalForm.$submitted);
            };

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

            $scope.submitIfValid = (callCount = 0) => {
                var container = $element.parents("[data-du-scroll-container]");

                if (callCount > 10) {
                    throw "maximum number of post attempts reached!";
                }

                if ($scope.$flow && $scope.$flow.support) {
                    var imgUploadController = $scope.mercatorProposalIntroductionForm["introduction-picture-upload"];
                    imgUploadController.$setValidity("required", imageExists());
                }

                if ($scope.mercatorProposalForm.$valid) {
                    // append a random number to the nick to allow duplicate titles
                    $scope.data.introduction.nickInstance = $scope.data.introduction.nickInstance  ||
                        Math.floor((Math.random() * 10000) + 1);

                    $scope.submit()
                        .catch((error) => {
                            if (error && _.every(error, { "name": "data.adhocracy_core.sheets.name.IName.name" })) {
                                $scope.data.introduction.nickInstance++;
                                $scope.submitIfValid(callCount + 1);
                            } else {
                                container.scrollTopAnimated(0);
                            }
                        });
                } else {
                    var getErrorControllers = (ctrl) => _.flatten(_.values(ctrl.$error));

                    var errorForms = getErrorControllers($scope.mercatorProposalForm);
                    var errorControllers = _.flatten(_.map(errorForms, getErrorControllers));
                    var names = _.unique(_.map(errorControllers, "$name"));
                    var selector = _.map(names, (name) => "[name=\"" + name + "\"]").join(", ");

                    var element = $element.find(selector).first();
                    container.scrollToElementAnimated(element, 20);
                }
            };
        }]);
};
