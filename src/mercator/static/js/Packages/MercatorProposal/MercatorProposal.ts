import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhInject = require("../Inject/Inject");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhResourceWidgets = require("../ResourceWidgets/ResourceWidgets");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUtil = require("../Util/Util");

import ResourcesBase = require("../../ResourcesBase");

import RIMercatorDetails = require("../../Resources_/adhocracy_mercator/resources/mercator/IDetails");
import RIMercatorDetailsVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IDetailsVersion");
import RIMercatorExperience = require("../../Resources_/adhocracy_mercator/resources/mercator/IExperience");
import RIMercatorExperienceVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IExperienceVersion");
import RIMercatorFinance = require("../../Resources_/adhocracy_mercator/resources/mercator/IFinance");
import RIMercatorFinanceVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IFinanceVersion");
import RIMercatorIntroduction = require("../../Resources_/adhocracy_mercator/resources/mercator/IIntroduction");
import RIMercatorIntroductionVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IIntroductionVersion");
import RIMercatorOrganizationInfo = require("../../Resources_/adhocracy_mercator/resources/mercator/IOrganizationInfo");
import RIMercatorOrganizationInfoVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IOrganizationInfoVersion");
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
import SIMercatorDetails = require("../../Resources_/adhocracy_mercator/sheets/mercator/IDetails");
import SIMercatorExperience = require("../../Resources_/adhocracy_mercator/sheets/mercator/IExperience");
import SIMercatorFinance = require("../../Resources_/adhocracy_mercator/sheets/mercator/IFinance");
import SIMercatorHeardFrom = require("../../Resources_/adhocracy_mercator/sheets/mercator/IHeardFrom");
import SIMercatorIntroduction = require("../../Resources_/adhocracy_mercator/sheets/mercator/IIntroduction");
import SIMercatorOrganizationInfo = require("../../Resources_/adhocracy_mercator/sheets/mercator/IOrganizationInfo");
import SIMercatorOutcome = require("../../Resources_/adhocracy_mercator/sheets/mercator/IOutcome");
import SIMercatorPartners = require("../../Resources_/adhocracy_mercator/sheets/mercator/IPartners");
import SIMercatorSteps = require("../../Resources_/adhocracy_mercator/sheets/mercator/ISteps");
import SIMercatorStory = require("../../Resources_/adhocracy_mercator/sheets/mercator/IStory");
import SIMercatorSubResources = require("../../Resources_/adhocracy_mercator/sheets/mercator/IMercatorSubResources");
import SIMercatorUserInfo = require("../../Resources_/adhocracy_mercator/sheets/mercator/IUserInfo");
import SIMercatorValue = require("../../Resources_/adhocracy_mercator/sheets/mercator/IValue");
import SIName = require("../../Resources_/adhocracy_core/sheets/name/IName");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");

var pkgLocation = "/MercatorProposal";


export interface IScope extends AdhResourceWidgets.IResourceWidgetScope {
    poolPath : string;
    showDetails() : void;
    mercatorProposalForm?;
    data : {
        countries : any;
        // 1. basic
        user_info : {
            first_name : string;
            last_name : string;
            country : string;
        };
        organization_info : {
            status_enum : string;  // (allowed values: 'registered_nonprofit', 'planned_nonprofit', 'support_needed', 'other')
            name : string;
            country : string;
            website : string;
            date_of_foreseen_registration : string;
            how_can_we_help_you : string;
            status_other : string;
        };

        // 2. introduction
        introduction : {
            title : string;
            teaser : string;
        };

        // 3. in detail
        details : {
            description : string;
            location_is_specific : boolean;
            location_specific_1 : string;
            location_specific_2 : string;
            location_specific_3 : string;
            location_is_online : boolean;
            location_is_linked_to_ruhr : boolean;
        };
        story : string;

        // 4. motivation
        outcome : string;
        steps : string;
        value : string;
        partners : string;

        // 5. financial planning
        finance : {
            budget : number;
            requested_funding : number;
            other_sources : string;
            granted : boolean;
        };

        // 6. extra
        experience : string;
        heard_from : {
            colleague : boolean;
            website : boolean;
            newsletter : boolean;
            facebook : boolean;
            other : boolean;
            other_specify : string
        }
    };
}


export class Widget<R extends ResourcesBase.Resource> extends AdhResourceWidgets.ResourceWidget<R, IScope> {
    constructor(
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        private adhTopLevelState : AdhTopLevelState.Service,
        $q : ng.IQService
    ) {
        super(adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/ListItem.html";
    }

    public createDirective() : ng.IDirective {
        var directive = super.createDirective();
        directive.scope.poolPath = "@";

        var originalLink = directive.link.bind(this);

        directive.link = (scope : IScope, element, attrs, wrapper) => {
            originalLink(scope, element, attrs, wrapper);

            scope.showDetails = () => {
                this.adhTopLevelState.set("content2Url", scope.path);
            };
        };

        return directive;
    }

    public _handleDelete(
        instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>,
        path : string
    ) : ng.IPromise<void> {
        return this.$q.when();
    }

    private initializeScope(scope) {
        if (!scope.hasOwnProperty("data")) {
            scope.data = {};
        }

        var data = scope.data;

        data.user_info = data.user_info || <any>{};
        data.organization_info = data.organization_info || <any>{};
        data.introduction = data.introduction || <any>{};
        data.details = data.details || <any>{};
        data.finance = data.finance || <any>{};
        data.heard_from = data.heard_from || <any>{};

        return data;
    }

    // NOTE: _update takes an item *version*, whereas _create
    // constructs an *item plus a new version*.
    public _update(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>, mercatorProposalVersion : R) : ng.IPromise<void> {
        var data = this.initializeScope(instance.scope);

        data.user_info.first_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].personal_name;
        data.user_info.last_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].family_name;
        data.user_info.country = mercatorProposalVersion.data[SIMercatorUserInfo.nick].country;

        data.heard_from.colleague = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_colleague;
        data.heard_from.website = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_website;
        data.heard_from.newsletter = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_newsletter;
        data.heard_from.facebook = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_facebook;
        data.heard_from.other = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_elsewhere;
        data.heard_from.other_specify = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_elsewhere;

        var subResourcePaths : SIMercatorSubResources.Sheet = mercatorProposalVersion.data[SIMercatorSubResources.nick];
        var subResourcePromises : ng.IPromise<ResourcesBase.Resource[]> = this.$q.all([
            this.adhHttp.get(subResourcePaths.organization_info),
            this.adhHttp.get(subResourcePaths.introduction),
            this.adhHttp.get(subResourcePaths.details),
            this.adhHttp.get(subResourcePaths.story),
            this.adhHttp.get(subResourcePaths.outcome),
            this.adhHttp.get(subResourcePaths.steps),
            this.adhHttp.get(subResourcePaths.value),
            this.adhHttp.get(subResourcePaths.partners),
            this.adhHttp.get(subResourcePaths.finance),
            this.adhHttp.get(subResourcePaths.experience)]);

        subResourcePromises.then((subResources : ResourcesBase.Resource[]) => {
            subResources.forEach((subResource : ResourcesBase.Resource) => {
                switch (subResource.content_type) {
                    case RIMercatorOrganizationInfoVersion.content_type: (() => {
                        var scope = data.organization_info;
                        var res : SIMercatorOrganizationInfo.Sheet = subResource.data[SIMercatorOrganizationInfo.nick];

                        scope.status_enum = res.status;
                        scope.name = res.name;
                        scope.country = res.country;
                        scope.website = res.website;
                        scope.date_of_foreseen_registration = res.planned_date;
                        scope.how_can_we_help_you = res.help_request;
                        scope.status_other = res.status_other;
                    })();
                    break;
                    case RIMercatorIntroductionVersion.content_type: (() => {
                        var scope = data.introduction;
                        var res : SIMercatorIntroduction.Sheet = subResource.data[SIMercatorIntroduction.nick];

                        scope.title = res.title;
                        scope.teaser = res.teaser;
                    })();
                    break;
                    case RIMercatorDetailsVersion.content_type: (() => {
                        var scope = data.details;
                        var res : SIMercatorDetails.Sheet = subResource.data[SIMercatorDetails.nick];

                        scope.description = res.description;
                        scope.location_is_specific = res.location_is_specific;
                        scope.location_specific_1 = res.location_specific_1;
                        scope.location_specific_2 = res.location_specific_2;
                        scope.location_specific_3 = res.location_specific_3;
                        scope.location_is_online = res.location_is_online;
                        scope.location_is_linked_to_ruhr = res.location_is_linked_to_ruhr;
                    })();
                    break;
                    case RIMercatorStoryVersion.content_type: (() => {
                        var res : SIMercatorStory.Sheet = subResource.data[SIMercatorStory.nick];
                        data.story = res.story;
                    })();
                    break;
                    case RIMercatorOutcomeVersion.content_type: (() => {
                        var res : SIMercatorOutcome.Sheet = subResource.data[SIMercatorOutcome.nick];
                        data.outcome = res.outcome;
                    })();
                    break;
                    case RIMercatorStepsVersion.content_type: (() => {
                        var res : SIMercatorSteps.Sheet = subResource.data[SIMercatorSteps.nick];
                        data.steps = res.steps;
                    })();
                    break;
                    case RIMercatorValueVersion.content_type: (() => {
                        var res : SIMercatorValue.Sheet = subResource.data[SIMercatorValue.nick];
                        data.value = res.value;
                    })();
                    break;
                    case RIMercatorPartnersVersion.content_type: (() => {
                        var res : SIMercatorPartners.Sheet = subResource.data[SIMercatorPartners.nick];
                        data.partners = res.partners;
                    })();
                    break;
                    case RIMercatorFinanceVersion.content_type: (() => {
                        var scope = data.finance;
                        var res : SIMercatorFinance.Sheet = subResource.data[SIMercatorFinance.nick];

                        scope.budget = res.budget;
                        scope.requested_funding = res.requested_funding;
                        scope.other_sources = res.other_sources;
                        scope.granted = res.granted;
                    })();
                    break;
                    case RIMercatorExperienceVersion.content_type: (() => {
                        var res : SIMercatorExperience.Sheet = subResource.data[SIMercatorExperience.nick];
                        data.experience = res.experience;
                    })();
                    break;
                    default: {
                        throw ("unkown content_type: " + subResource.content_type);
                    }
                }
            });
        });

        return this.$q.when();
    }

    // NOTE: see _update.
    public _create(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>) : ng.IPromise<R[]> {
        var data = this.initializeScope(instance.scope);

        var subResOrganizationInfo = new RIMercatorOrganizationInfo({preliminaryNames : this.adhPreliminaryNames});
        subResOrganizationInfo.data[SIName.nick] = new SIName.Sheet({ name : "OrganizationInfo" });
        var subResOrganizationInfoV = new RIMercatorOrganizationInfoVersion({preliminaryNames : this.adhPreliminaryNames});
        subResOrganizationInfoV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResOrganizationInfo.first_version_path]
        });
        subResOrganizationInfoV.data[SIMercatorOrganizationInfo.nick] = new SIMercatorOrganizationInfo.Sheet({
            status: data.organization_info.status_enum,
            name: data.organization_info.name,
            country: data.organization_info.country,
            website: data.organization_info.website,
            planned_date: data.organization_info.date_of_foreseen_registration,
            help_request: data.organization_info.how_can_we_help_you,
            status_other: data.organization_info.status_other
        });

        var subResIntroduction = new RIMercatorIntroduction({preliminaryNames : this.adhPreliminaryNames});
        subResIntroduction.data[SIName.nick] = new SIName.Sheet({ name : "Introduction" });
        var subResIntroductionV = new RIMercatorIntroductionVersion({preliminaryNames : this.adhPreliminaryNames});
        subResIntroductionV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResIntroduction.first_version_path]
        });
        subResIntroductionV.data[SIMercatorIntroduction.nick] = new SIMercatorIntroduction.Sheet({
            title: data.introduction.title,
            teaser: data.introduction.teaser
        });

        var subResDetails = new RIMercatorDetails({preliminaryNames : this.adhPreliminaryNames});
        subResDetails.data[SIName.nick] = new SIName.Sheet({ name : "Details" });
        var subResDetailsV = new RIMercatorDetailsVersion({preliminaryNames : this.adhPreliminaryNames});
        subResDetailsV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResDetails.first_version_path]
        });
        subResDetailsV.data[SIMercatorDetails.nick] = new SIMercatorDetails.Sheet({
            description: data.details.description,
            location_is_specific: data.details.location_is_specific,
            location_specific_1: data.details.location_specific_1,
            location_specific_2: data.details.location_specific_2,
            location_specific_3: data.details.location_specific_3,
            location_is_online: data.details.location_is_online,
            location_is_linked_to_ruhr: data.details.location_is_linked_to_ruhr
        });

        var subResStory = new RIMercatorStory({preliminaryNames : this.adhPreliminaryNames});
        subResStory.data[SIName.nick] = new SIName.Sheet({ name : "Story" });
        var subResStoryV = new RIMercatorStoryVersion({preliminaryNames : this.adhPreliminaryNames});
        subResStoryV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResStory.first_version_path]
        });
        subResStoryV.data[SIMercatorStory.nick] = new SIMercatorStory.Sheet({
            story: data.story
        });

        var subResOutcome = new RIMercatorOutcome({preliminaryNames : this.adhPreliminaryNames});
        subResOutcome.data[SIName.nick] = new SIName.Sheet({ name : "Outcome" });
        var subResOutcomeV = new RIMercatorOutcomeVersion({preliminaryNames : this.adhPreliminaryNames});
        subResOutcomeV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResOutcome.first_version_path]
        });
        subResOutcomeV.data[SIMercatorOutcome.nick] = new SIMercatorOutcome.Sheet({
            outcome: data.outcome
        });

        var subResSteps = new RIMercatorSteps({preliminaryNames : this.adhPreliminaryNames});
        subResSteps.data[SIName.nick] = new SIName.Sheet({ name : "Steps" });
        var subResStepsV = new RIMercatorStepsVersion({preliminaryNames : this.adhPreliminaryNames});
        subResStepsV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResSteps.first_version_path]
        });
        subResStepsV.data[SIMercatorSteps.nick] = new SIMercatorSteps.Sheet({
            steps: data.steps
        });

        var subResValue = new RIMercatorValue({preliminaryNames : this.adhPreliminaryNames});
        subResValue.data[SIName.nick] = new SIName.Sheet({ name : "Value" });
        var subResValueV = new RIMercatorValueVersion({preliminaryNames : this.adhPreliminaryNames});
        subResValueV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResValue.first_version_path]
        });
        subResValueV.data[SIMercatorValue.nick] = new SIMercatorValue.Sheet({
            value: data.value
        });

        var subResPartners = new RIMercatorPartners({preliminaryNames : this.adhPreliminaryNames});
        subResPartners.data[SIName.nick] = new SIName.Sheet({ name : "Partners" });
        var subResPartnersV = new RIMercatorPartnersVersion({preliminaryNames : this.adhPreliminaryNames});
        subResPartnersV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResPartners.first_version_path]
        });
        subResPartnersV.data[SIMercatorPartners.nick] = new SIMercatorPartners.Sheet({
            partners: data.partners
        });

        var subResFinance = new RIMercatorFinance({preliminaryNames : this.adhPreliminaryNames});
        subResFinance.data[SIName.nick] = new SIName.Sheet({ name : "Finance" });
        var subResFinanceV = new RIMercatorFinanceVersion({preliminaryNames : this.adhPreliminaryNames});
        subResFinanceV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResFinance.first_version_path]
        });
        subResFinanceV.data[SIMercatorFinance.nick] = new SIMercatorFinance.Sheet({
            budget: data.finance.budget,
            requested_funding: data.finance.requested_funding,
            other_sources: data.finance.other_sources,
            granted: data.finance.granted
        });

        var subResExperience = new RIMercatorExperience({preliminaryNames : this.adhPreliminaryNames});
        subResExperience.data[SIName.nick] = new SIName.Sheet({ name : "Experience" });
        var subResExperienceV = new RIMercatorExperienceVersion({preliminaryNames : this.adhPreliminaryNames});
        subResExperienceV.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [subResExperience.first_version_path]
        });
        subResExperienceV.data[SIMercatorExperience.nick] = new SIMercatorExperience.Sheet({
            experience: data.experience
        });

        var mercatorProposal = new RIMercatorProposal({preliminaryNames : this.adhPreliminaryNames});
        mercatorProposal.data[SIName.nick] = new SIName.Sheet({
            name: AdhUtil.normalizeName(data.introduction.title)
        });

        var mercatorProposalVersion = new RIMercatorProposalVersion({preliminaryNames : this.adhPreliminaryNames});
        mercatorProposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [mercatorProposal.first_version_path]
        });
        mercatorProposalVersion.data[SIMercatorUserInfo.nick] = new SIMercatorUserInfo.Sheet({
            personal_name: data.user_info.first_name,
            family_name: data.user_info.last_name,
            country: data.user_info.country
        });
        mercatorProposalVersion.data[SIMercatorHeardFrom.nick] = new SIMercatorHeardFrom.Sheet({
            heard_from_colleague: data.heard_from.colleague,
            heard_from_website: data.heard_from.website,
            heard_from_newsletter: data.heard_from.newsletter,
            heard_from_facebook: data.heard_from.facebook,
            heard_elsewhere: (data.heard_from.other ? data.heard_from.other_specify : "")
        });
        mercatorProposalVersion.data[SIMercatorSubResources.nick] = new SIMercatorSubResources.Sheet({
            organization_info: subResOrganizationInfoV.path,
            introduction: subResIntroductionV.path,
            details: subResDetailsV.path,
            story: subResStoryV.path,
            outcome: subResOutcomeV.path,
            steps: subResStepsV.path,
            value: subResValueV.path,
            partners: subResPartnersV.path,
            finance: subResFinanceV.path,
            experience: subResExperienceV.path
        });

        mercatorProposal.parent = instance.scope.poolPath;
        mercatorProposalVersion.parent = mercatorProposal.path;

        subResOrganizationInfo.parent = mercatorProposal.path;
        subResOrganizationInfoV.parent = subResOrganizationInfo.path;
        subResIntroduction.parent = mercatorProposal.path;
        subResIntroductionV.parent = subResIntroduction.path;
        subResDetails.parent = mercatorProposal.path;
        subResDetailsV.parent = subResDetails.path;
        subResStory.parent = mercatorProposal.path;
        subResStoryV.parent = subResStory.path;
        subResOutcome.parent = mercatorProposal.path;
        subResOutcomeV.parent = subResOutcome.path;
        subResSteps.parent = mercatorProposal.path;
        subResStepsV.parent = subResSteps.path;
        subResValue.parent = mercatorProposal.path;
        subResValueV.parent = subResValue.path;
        subResPartners.parent = mercatorProposal.path;
        subResPartnersV.parent = subResPartners.path;
        subResFinance.parent = mercatorProposal.path;
        subResFinanceV.parent = subResFinance.path;
        subResExperience.parent = mercatorProposal.path;
        subResExperienceV.parent = subResExperience.path;

        return this.$q.when([
            mercatorProposal,
            mercatorProposalVersion,
            subResOrganizationInfo,
            subResIntroduction,
            subResDetails,
            subResStory,
            subResOutcome,
            subResSteps,
            subResValue,
            subResPartners,
            subResFinance,
            subResExperience,
            subResOrganizationInfoV,
            subResIntroductionV,
            subResDetailsV,
            subResStoryV,
            subResOutcomeV,
            subResStepsV,
            subResValueV,
            subResPartnersV,
            subResFinanceV,
            subResExperienceV
        ]);
    }

    public _edit(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>, old : R) : ng.IPromise<R[]> {
        return this.$q.when([]);
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
        $q : ng.IQService
    ) {
        super(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/Create.html";
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
        $q : ng.IQService
    ) {
        super(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q);
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
            facets: "="
        }
    };
};


export var lastVersion = (
    $compile : ng.ICompileService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        scope: {
            itemPath: "@"
        },
        transclude: true,
        template: "<adh-inject></adh-inject>",
        link: (scope) => {
            adhHttp.getNewestVersionPathNoFork(scope.itemPath).then(
                (versionPath) => {
                    scope.versionPath = versionPath;
                });
        }
    };
};

export var countrySelect = () => {

    var countries : {
        name: string;
        code: string;
    }[] = [
        {name: "Afghanistan", code: "AF"},
        {name: "Åland Islands", code: "AX"},
        {name: "Albania", code: "AL"},
        {name: "Algeria", code: "DZ"},
        {name: "American Samoa", code: "AS"},
        {name: "AndorrA", code: "AD"},
        {name: "Angola", code: "AO"},
        {name: "Anguilla", code: "AI"},
        {name: "Antarctica", code: "AQ"},
        {name: "Antigua and Barbuda", code: "AG"},
        {name: "Argentina", code: "AR"},
        {name: "Armenia", code: "AM"},
        {name: "Aruba", code: "AW"},
        {name: "Australia", code: "AU"},
        {name: "Austria", code: "AT"},
        {name: "Azerbaijan", code: "AZ"},
        {name: "Bahamas", code: "BS"},
        {name: "Bahrain", code: "BH"},
        {name: "Bangladesh", code: "BD"},
        {name: "Barbados", code: "BB"},
        {name: "Belarus", code: "BY"},
        {name: "Belgium", code: "BE"},
        {name: "Belize", code: "BZ"},
        {name: "Benin", code: "BJ"},
        {name: "Bermuda", code: "BM"},
        {name: "Bhutan", code: "BT"},
        {name: "Bolivia", code: "BO"},
        {name: "Bosnia and Herzegovina", code: "BA"},
        {name: "Botswana", code: "BW"},
        {name: "Bouvet Island", code: "BV"},
        {name: "Brazil", code: "BR"},
        {name: "British Indian Ocean Territory", code: "IO"},
        {name: "Brunei Darussalam", code: "BN"},
        {name: "Bulgaria", code: "BG"},
        {name: "Burkina Faso", code: "BF"},
        {name: "Burundi", code: "BI"},
        {name: "Cambodia", code: "KH"},
        {name: "Cameroon", code: "CM"},
        {name: "Canada", code: "CA"},
        {name: "Cape Verde", code: "CV"},
        {name: "Cayman Islands", code: "KY"},
        {name: "Central African Republic", code: "CF"},
        {name: "Chad", code: "TD"},
        {name: "Chile", code: "CL"},
        {name: "China", code: "CN"},
        {name: "Christmas Island", code: "CX"},
        {name: "Cocos (Keeling) Islands", code: "CC"},
        {name: "Colombia", code: "CO"},
        {name: "Comoros", code: "KM"},
        {name: "Congo", code: "CG"},
        {name: "Congo, The Democratic Republic of the", code: "CD"},
        {name: "Cook Islands", code: "CK"},
        {name: "Costa Rica", code: "CR"},
        {name: "Cote D\'Ivoire", code: "CI"},
        {name: "Croatia", code: "HR"},
        {name: "Cuba", code: "CU"},
        {name: "Cyprus", code: "CY"},
        {name: "Czech Republic", code: "CZ"},
        {name: "Denmark", code: "DK"},
        {name: "Djibouti", code: "DJ"},
        {name: "Dominica", code: "DM"},
        {name: "Dominican Republic", code: "DO"},
        {name: "Ecuador", code: "EC"},
        {name: "Egypt", code: "EG"},
        {name: "El Salvador", code: "SV"},
        {name: "Equatorial Guinea", code: "GQ"},
        {name: "Eritrea", code: "ER"},
        {name: "Estonia", code: "EE"},
        {name: "Ethiopia", code: "ET"},
        {name: "Falkland Islands (Malvinas)", code: "FK"},
        {name: "Faroe Islands", code: "FO"},
        {name: "Fiji", code: "FJ"},
        {name: "Finland", code: "FI"},
        {name: "France", code: "FR"},
        {name: "French Guiana", code: "GF"},
        {name: "French Polynesia", code: "PF"},
        {name: "French Southern Territories", code: "TF"},
        {name: "Gabon", code: "GA"},
        {name: "Gambia", code: "GM"},
        {name: "Georgia", code: "GE"},
        {name: "Germany", code: "DE"},
        {name: "Ghana", code: "GH"},
        {name: "Gibraltar", code: "GI"},
        {name: "Greece", code: "GR"},
        {name: "Greenland", code: "GL"},
        {name: "Grenada", code: "GD"},
        {name: "Guadeloupe", code: "GP"},
        {name: "Guam", code: "GU"},
        {name: "Guatemala", code: "GT"},
        {name: "Guernsey", code: "GG"},
        {name: "Guinea", code: "GN"},
        {name: "Guinea-Bissau", code: "GW"},
        {name: "Guyana", code: "GY"},
        {name: "Haiti", code: "HT"},
        {name: "Heard Island and Mcdonald Islands", code: "HM"},
        {name: "Holy See (Vatican City State)", code: "VA"},
        {name: "Honduras", code: "HN"},
        {name: "Hong Kong", code: "HK"},
        {name: "Hungary", code: "HU"},
        {name: "Iceland", code: "IS"},
        {name: "India", code: "IN"},
        {name: "Indonesia", code: "ID"},
        {name: "Iran, Islamic Republic Of", code: "IR"},
        {name: "Iraq", code: "IQ"},
        {name: "Ireland", code: "IE"},
        {name: "Isle of Man", code: "IM"},
        {name: "Israel", code: "IL"},
        {name: "Italy", code: "IT"},
        {name: "Jamaica", code: "JM"},
        {name: "Japan", code: "JP"},
        {name: "Jersey", code: "JE"},
        {name: "Jordan", code: "JO"},
        {name: "Kazakhstan", code: "KZ"},
        {name: "Kenya", code: "KE"},
        {name: "Kiribati", code: "KI"},
        {name: "Korea, Democratic People'S Republic of", code: "KP"},
        {name: "Korea, Republic of", code: "KR"},
        {name: "Kuwait", code: "KW"},
        {name: "Kyrgyzstan", code: "KG"},
        {name: "Lao People'S Democratic Republic", code: "LA"},
        {name: "Latvia", code: "LV"},
        {name: "Lebanon", code: "LB"},
        {name: "Lesotho", code: "LS"},
        {name: "Liberia", code: "LR"},
        {name: "Libyan Arab Jamahiriya", code: "LY"},
        {name: "Liechtenstein", code: "LI"},
        {name: "Lithuania", code: "LT"},
        {name: "Luxembourg", code: "LU"},
        {name: "Macao", code: "MO"},
        {name: "Macedonia, The Former Yugoslav Republic of", code: "MK"},
        {name: "Madagascar", code: "MG"},
        {name: "Malawi", code: "MW"},
        {name: "Malaysia", code: "MY"},
        {name: "Maldives", code: "MV"},
        {name: "Mali", code: "ML"},
        {name: "Malta", code: "MT"},
        {name: "Marshall Islands", code: "MH"},
        {name: "Martinique", code: "MQ"},
        {name: "Mauritania", code: "MR"},
        {name: "Mauritius", code: "MU"},
        {name: "Mayotte", code: "YT"},
        {name: "Mexico", code: "MX"},
        {name: "Micronesia, Federated States of", code: "FM"},
        {name: "Moldova, Republic of", code: "MD"},
        {name: "Monaco", code: "MC"},
        {name: "Mongolia", code: "MN"},
        {name: "Montserrat", code: "MS"},
        {name: "Morocco", code: "MA"},
        {name: "Mozambique", code: "MZ"},
        {name: "Myanmar", code: "MM"},
        {name: "Namibia", code: "NA"},
        {name: "Nauru", code: "NR"},
        {name: "Nepal", code: "NP"},
        {name: "Netherlands", code: "NL"},
        {name: "Netherlands Antilles", code: "AN"},
        {name: "New Caledonia", code: "NC"},
        {name: "New Zealand", code: "NZ"},
        {name: "Nicaragua", code: "NI"},
        {name: "Niger", code: "NE"},
        {name: "Nigeria", code: "NG"},
        {name: "Niue", code: "NU"},
        {name: "Norfolk Island", code: "NF"},
        {name: "Northern Mariana Islands", code: "MP"},
        {name: "Norway", code: "NO"},
        {name: "Oman", code: "OM"},
        {name: "Pakistan", code: "PK"},
        {name: "Palau", code: "PW"},
        {name: "Palestinian Territory, Occupied", code: "PS"},
        {name: "Panama", code: "PA"},
        {name: "Papua New Guinea", code: "PG"},
        {name: "Paraguay", code: "PY"},
        {name: "Peru", code: "PE"},
        {name: "Philippines", code: "PH"},
        {name: "Pitcairn", code: "PN"},
        {name: "Poland", code: "PL"},
        {name: "Portugal", code: "PT"},
        {name: "Puerto Rico", code: "PR"},
        {name: "Qatar", code: "QA"},
        {name: "Reunion", code: "RE"},
        {name: "Romania", code: "RO"},
        {name: "Russian Federation", code: "RU"},
        {name: "Rwanda", code: "RW"},
        {name: "Saint Helena", code: "SH"},
        {name: "Saint Kitts and Nevis", code: "KN"},
        {name: "Saint Lucia", code: "LC"},
        {name: "Saint Pierre and Miquelon", code: "PM"},
        {name: "Saint Vincent and the Grenadines", code: "VC"},
        {name: "Samoa", code: "WS"},
        {name: "San Marino", code: "SM"},
        {name: "Sao Tome and Principe", code: "ST"},
        {name: "Saudi Arabia", code: "SA"},
        {name: "Senegal", code: "SN"},
        {name: "Serbia and Montenegro", code: "CS"},
        {name: "Seychelles", code: "SC"},
        {name: "Sierra Leone", code: "SL"},
        {name: "Singapore", code: "SG"},
        {name: "Slovakia", code: "SK"},
        {name: "Slovenia", code: "SI"},
        {name: "Solomon Islands", code: "SB"},
        {name: "Somalia", code: "SO"},
        {name: "South Africa", code: "ZA"},
        {name: "South Georgia and the South Sandwich Islands", code: "GS"},
        {name: "Spain", code: "ES"},
        {name: "Sri Lanka", code: "LK"},
        {name: "Sudan", code: "SD"},
        {name: "Suriname", code: "SR"},
        {name: "Svalbard and Jan Mayen", code: "SJ"},
        {name: "Swaziland", code: "SZ"},
        {name: "Sweden", code: "SE"},
        {name: "Switzerland", code: "CH"},
        {name: "Syrian Arab Republic", code: "SY"},
        {name: "Taiwan, Province of China", code: "TW"},
        {name: "Tajikistan", code: "TJ"},
        {name: "Tanzania, United Republic of", code: "TZ"},
        {name: "Thailand", code: "TH"},
        {name: "Timor-Leste", code: "TL"},
        {name: "Togo", code: "TG"},
        {name: "Tokelau", code: "TK"},
        {name: "Tonga", code: "TO"},
        {name: "Trinidad and Tobago", code: "TT"},
        {name: "Tunisia", code: "TN"},
        {name: "Turkey", code: "TR"},
        {name: "Turkmenistan", code: "TM"},
        {name: "Turks and Caicos Islands", code: "TC"},
        {name: "Tuvalu", code: "TV"},
        {name: "Uganda", code: "UG"},
        {name: "Ukraine", code: "UA"},
        {name: "United Arab Emirates", code: "AE"},
        {name: "United Kingdom", code: "GB"},
        {name: "United States", code: "US"},
        {name: "United States Minor Outlying Islands", code: "UM"},
        {name: "Uruguay", code: "UY"},
        {name: "Uzbekistan", code: "UZ"},
        {name: "Vanuatu", code: "VU"},
        {name: "Venezuela", code: "VE"},
        {name: "Viet Nam", code: "VN"},
        {name: "Virgin Islands, British", code: "VG"},
        {name: "Virgin Islands, U.S.", code: "VI"},
        {name: "Wallis and Futuna", code: "WF"},
        {name: "Western Sahara", code: "EH"},
        {name: "Yemen", code: "YE"},
        {name: "Zambia", code: "ZM"},
        {name: "Zimbabwe", code: "ZW"}
    ];

    return {
        scope: {
            name: "@",
            required: "@",
            value: "=ngModel"
        },
        restrict: "E",
        template:
            "<select data-ng-model=\"value\" name=\"{{name}}\"" +
            "    data-ng-options=\"c.code as c.name for c in countries\" data-ng-required=\"required\"></select>",
        link: (scope) => {
            scope.countries = countries;
        }
    };
};

export var moduleName = "adhMercatorProposal";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
            AdhInject.moduleName,
            AdhPreliminaryNames.moduleName,
            AdhResourceArea.moduleName,
            AdhResourceWidgets.moduleName,
            AdhTopLevelState.moduleName
        ])
        .config(["adhResourceAreaProvider", "adhTopLevelStateProvider", (
            adhResourceAreaProvider : AdhResourceArea.Provider,
            adhTopLevelStateProvider : AdhTopLevelState.Provider
        ) => {
            adhTopLevelStateProvider
                .when("mercator", ["adhConfig", "$rootScope", (adhConfig, $scope) : AdhTopLevelState.IAreaInput => {
                    $scope.path = adhConfig.rest_url + adhConfig.custom["mercator_platform_path"];
                    return {
                        template: "<adh-resource-wrapper>" +
                            "<adh-mercator-proposal-create data-path=\"@preliminary\" data-mode=\"edit\" data-pool-path=\"{{path}}\">" +
                            "</adh-mercator-proposal-create></adh-resource-wrapper>"
                    };
                }]);
            adhResourceAreaProvider
                .when(RIMercatorProposal.content_type, {
                     space: "content",
                     movingColumns: "is-show-show-hide"
                })
                .when(RIMercatorProposalVersion.content_type, {
                     space: "content",
                     movingColumns: "is-show-show-hide"
                });
        }])
        .directive("adhMercatorProposal", ["adhConfig", "adhHttp", "adhPreliminaryNames", "adhTopLevelState", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q) => {
                var widget = new Widget(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalDetailView", ["adhConfig", "adhHttp", "adhPreliminaryNames", "adhTopLevelState", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q) => {
                var widget = new DetailWidget(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalCreate", ["adhConfig", "adhHttp", "adhPreliminaryNames", "adhTopLevelState", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q) => {
                var widget = new CreateWidget(adhConfig, adhHttp, adhPreliminaryNames, adhTopLevelState, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalListing", ["adhConfig", listing])
        // FIXME: These should both be moved to ..core ?
        .directive("countrySelect", ["adhConfig", countrySelect])
        .directive("adhLastVersion", ["$compile", "adhHttp", lastVersion]);
};
