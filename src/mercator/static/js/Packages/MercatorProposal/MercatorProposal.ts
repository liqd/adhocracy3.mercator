import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhInject = require("../Inject/Inject");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhResourceWidgets = require("../ResourceWidgets/ResourceWidgets");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");

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
    data : {
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
        $q : ng.IQService
    ) {
        super(adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/ListItem.html";
    }

    public createDirective() : ng.IDirective {
        var directive = super.createDirective();
        directive.scope.poolPath = "@";
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
                    case RIMercatorOrganizationInfo.content_type: (() => {
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
                    case RIMercatorIntroduction.content_type: (() => {
                        var scope = data.introduction;
                        var res : SIMercatorIntroduction.Sheet = subResource.data[SIMercatorIntroduction.nick];

                        scope.title = res.title;
                        scope.teaser = res.teaser;
                    })();
                    break;
                    case RIMercatorDetails.content_type: (() => {
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
                    case RIMercatorStory.content_type: (() => {
                        var res : SIMercatorStory.Sheet = subResource.data[SIMercatorStory.nick];
                        data.story = res.story;
                    })();
                    break;
                    case RIMercatorOutcome.content_type: (() => {
                        var res : SIMercatorOutcome.Sheet = subResource.data[SIMercatorOutcome.nick];
                        data.outcome = res.outcome;
                    })();
                    break;
                    case RIMercatorSteps.content_type: (() => {
                        var res : SIMercatorSteps.Sheet = subResource.data[SIMercatorSteps.nick];
                        data.steps = res.steps;
                    })();
                    break;
                    case RIMercatorValue.content_type: (() => {
                        var res : SIMercatorValue.Sheet = subResource.data[SIMercatorValue.nick];
                        data.value = res.value;
                    })();
                    break;
                    case RIMercatorPartners.content_type: (() => {
                        var res : SIMercatorPartners.Sheet = subResource.data[SIMercatorPartners.nick];
                        data.partners = res.partners;
                    })();
                    break;
                    case RIMercatorFinance.content_type: (() => {
                        var scope = data.finance;
                        var res : SIMercatorFinance.Sheet = subResource.data[SIMercatorFinance.nick];

                        scope.budget = res.budget;
                        scope.requested_funding = res.requested_funding;
                        scope.other_sources = res.other_sources;
                        scope.granted = res.granted;
                    })();
                    break;
                    case RIMercatorExperience.content_type: (() => {
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
            name: data.introduction.title
        });

        var mercatorProposalVersion = new RIMercatorProposalVersion({preliminaryNames : this.adhPreliminaryNames});
        mercatorProposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [mercatorProposal.first_version_path]
        });
        mercatorProposalVersion.data[SIMercatorUserInfo.nick] = new SIMercatorUserInfo.Sheet({
            personal_name: data.user_info.user.name,
            family_name: data.user_info.lastname,
            country: data.user_info.user.country
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
}


export class CreateWidget<R extends ResourcesBase.Resource> extends Widget<R> {
    constructor(
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        $q : ng.IQService
    ) {
        super(adhConfig, adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/Create.html";
    }
}


export class DetailWidget<R extends ResourcesBase.Resource> extends Widget<R> {
    constructor(
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        $q : ng.IQService
    ) {
        super(adhConfig, adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/Detail.html";
    }
}


export var listing = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        scope: {
            path: "@"
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
                    $scope.path = adhConfig.rest_url + adhConfig.rest_platform_path;
                    return {
                        template: "<adh-resource-wrapper>" +
                            "<adh-mercator-proposal-create data-path=\"@preliminary\" data-mode=\"edit\" data-pool-path=\"{{path}}\">" +
                            "</adh-mercator-proposal-create></adh-resource-wrapper>"
                    };
                }])
                .when("mercator-listing", ["adhConfig", "$rootScope", (adhConfig, $scope) : AdhTopLevelState.IAreaInput => {
                    $scope.path = adhConfig.rest_url + adhConfig.rest_platform_path;
                    return {
                        template: "<adh-mercator-proposal-listing data-path=\"{{path}}\">" +
                            "</adh-mercator-proposal-listing>"
                    };
                }])
                .when("mercator-detail", ["adhConfig", "$rootScope", (adhConfig, $rootScope) : AdhTopLevelState.IAreaInput => {
                    // FIXME: this always shows proposal with title "title".  for testing only.
                    $rootScope.path = adhConfig.rest_url + adhConfig.rest_platform_path + "title/";
                    return {
                        template:
                            "<adh-resource-wrapper>" +
                            "<adh-last-version data-item-path=\"{{path}}\">" +
                            "<adh-mercator-proposal-detail-view data-ng-if=\"versionPath\" data-path=\"{{versionPath}}\">" +
                            "</adh-mercator-proposal-detail-view>" +
                            "</adh-last-version>" +
                            "</adh-resource-wrapper>"
                    };
                }]);
            adhResourceAreaProvider
                .when(RIMercatorProposal.content_type, {
                     space: "content",
                     movingColumns: "is-show-show-hide"
                });
        }])
        .directive("adhMercatorProposal", ["adhConfig", "adhHttp", "adhPreliminaryNames", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, $q) => {
                var widget = new Widget(adhConfig, adhHttp, adhPreliminaryNames, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalDetailView", ["adhConfig", "adhHttp", "adhPreliminaryNames", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, $q) => {
                var widget = new DetailWidget(adhConfig, adhHttp, adhPreliminaryNames, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalCreate", ["adhConfig", "adhHttp", "adhPreliminaryNames", "$q",
            (adhConfig, adhHttp, adhPreliminaryNames, $q) => {
                var widget = new CreateWidget(adhConfig, adhHttp, adhPreliminaryNames, $q);
                return widget.createDirective();
            }])
        .directive("adhMercatorProposalListing", ["adhConfig", listing])
        .directive("adhLastVersion", ["$compile", "adhHttp", lastVersion]);
};
