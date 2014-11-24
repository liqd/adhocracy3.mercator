import fustyFlowFactory = require("fustyFlowFactory");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhInject = require("../Inject/Inject");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhResourceUtil = require("../Util/ResourceUtil");
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
import SIMetaData = require("../../Resources_/adhocracy_core/sheets/metadata/IMetadata");
import SIName = require("../../Resources_/adhocracy_core/sheets/name/IName");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");

var pkgLocation = "/MercatorProposal";


export interface IScope extends AdhResourceWidgets.IResourceWidgetScope {
    poolPath : string;
    mercatorProposalForm? : any;
    data : {
        // 1. basic
        user_info : {
            first_name : string;
            last_name : string;
            country : string;
            createtime : string;
            path : string;
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
            imageUpload : Flow;
            nickInstance : number;
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
        };

        accept_disclaimer : string;

        image : any;

    };
}

export interface IControllerScope extends IScope {
    showError : (fieldName : string, errorType : string) => boolean;
    showHeardFromError : () => boolean;
    showDetailsLocationError : () => boolean;
    submitIfValid : () => void;
    mercatorProposalExtraForm? : any;
    mercatorProposalDetailForm? : any;
}


/**
 * upload mercator proposal image file.  this function can potentially
 * be more flexible; for now it just handles the Flow object and
 * promises the path of the image resource as a string.
 *
 * FIXME: implement this function!
 */
export var uploadImageFile = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    $q : ng.IQService,
    flow : Flow
) : ng.IPromise<string> => {

    console.log("uploadImageFile: not fully implemented, but we already collect the file meta data locally in the browser:");

    flow.opts.target = adhConfig.rest_url + adhConfig.custom["mercator_platform_path"];

    console.log(JSON.stringify(flow.opts, null, 2));
    _.forOwn(flow.files, (value, key) => {
        console.log(JSON.stringify(value.file, null, 2));
    });

    flow.resume();
    return (<any>$q.reject("blöp"));
};


export class Widget<R extends ResourcesBase.Resource> extends AdhResourceWidgets.ResourceWidget<R, IScope> {
    constructor(
        public adhConfig : AdhConfig.IService,
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
    public _update(
        instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>,
        mercatorProposalVersion : R
    ) : ng.IPromise<void> {
        var data = this.initializeScope(instance.scope);

        data.user_info.first_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].personal_name;
        data.user_info.last_name = mercatorProposalVersion.data[SIMercatorUserInfo.nick].family_name;
        data.user_info.country = mercatorProposalVersion.data[SIMercatorUserInfo.nick].country;
        data.user_info.createtime = AdhUtil.formatDate(mercatorProposalVersion.data[SIMetaData.nick].item_creation_date);
        data.user_info.path = mercatorProposalVersion.data[SIMetaData.nick].creator;

        data.heard_from.colleague = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_colleague === "true";
        data.heard_from.website = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_website === "true";
        data.heard_from.newsletter = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_newsletter === "true";
        data.heard_from.facebook = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_from_facebook === "true";
        data.heard_from.other = mercatorProposalVersion.data[SIMercatorHeardFrom.nick].heard_elsewhere !== "";
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
                        scope.location_is_specific = res.location_is_specific === "true";
                        scope.location_specific_1 = res.location_specific_1;
                        scope.location_specific_2 = res.location_specific_2;
                        scope.location_specific_3 = res.location_specific_3;
                        scope.location_is_online = res.location_is_online === "true";
                        scope.location_is_linked_to_ruhr = res.location_is_linked_to_ruhr === "true";
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

                        scope.budget = parseInt(res.budget, 10);
                        scope.requested_funding = parseInt(res.requested_funding, 10);
                        scope.other_sources = res.other_sources;
                        scope.granted = res.granted === "True";
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
                    title: data.introduction.title,
                    teaser: data.introduction.teaser
                });
                break;
            case RIMercatorDetailsVersion.content_type:
                resource.data[SIMercatorDetails.nick] = new SIMercatorDetails.Sheet({
                    description: data.details.description,
                    location_is_specific: data.details.location_is_specific,
                    location_specific_1: data.details.location_specific_1,
                    location_specific_2: data.details.location_specific_2,
                    location_specific_3: data.details.location_specific_3,
                    location_is_online: data.details.location_is_online,
                    location_is_linked_to_ruhr: data.details.location_is_linked_to_ruhr
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
                resource.data[SIMercatorHeardFrom.nick] = new SIMercatorHeardFrom.Sheet({
                    heard_from_colleague: data.heard_from.colleague,
                    heard_from_website: data.heard_from.website,
                    heard_from_newsletter: data.heard_from.newsletter,
                    heard_from_facebook: data.heard_from.facebook,
                    heard_elsewhere: (data.heard_from.other ? data.heard_from.other_specify : "")
                });
                resource.data[SIMercatorSubResources.nick] = new SIMercatorSubResources.Sheet(<any>{});
                break;
        }
    }

    // NOTE: see _update.
    public _create(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>) : ng.IPromise<R[]> {
        var data = this.initializeScope(instance.scope);
        var imagePathPromise = uploadImageFile(this.adhConfig, this.adhHttp, this.$q, data.introduction.imageUpload);

        // FIXME: attach imagePath to proposal intro resource.  (need to wait for backend.)
        // FIXME: handle file upload in _update.
        // FIXME: We need to wait for this promise with everything
        // else. Otherwise, the upload could be interrupted by a hard
        // redirect or similar.
        imagePathPromise.then(
            (path) => {
                console.log("upload successful:");
                console.log(path);
            },
            () => {
                console.log("upload error:");
                console.log(arguments);
            });

        var mercatorProposal = new RIMercatorProposal({preliminaryNames : this.adhPreliminaryNames});
        mercatorProposal.parent = instance.scope.poolPath;
        mercatorProposal.data[SIName.nick] = new SIName.Sheet({
            name: AdhUtil.normalizeName(data.introduction.title + data.introduction.nickInstance)
        });

        var mercatorProposalVersion = new RIMercatorProposalVersion({preliminaryNames : this.adhPreliminaryNames});
        mercatorProposalVersion.parent = mercatorProposal.path;
        mercatorProposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
            follows: [mercatorProposal.first_version_path]
        });

        this.fill(data, mercatorProposalVersion);

        var subresources = _.map([
            [RIMercatorOrganizationInfo, RIMercatorOrganizationInfoVersion, "organization_info"],
            [RIMercatorIntroduction, RIMercatorIntroductionVersion, "introduction"],
            [RIMercatorDetails, RIMercatorDetailsVersion, "details"],
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

        return this.$q.when(_.flatten([mercatorProposal, mercatorProposalVersion, subresources]));
    }

    public _edit(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IScope>, old : R) : ng.IPromise<R[]> {
        var self : Widget<R> = this;
        var data = this.initializeScope(instance.scope);

        var mercatorProposalVersion = AdhResourceUtil.derive(old, {preliminaryNames : this.adhPreliminaryNames});
        mercatorProposalVersion.parent = AdhUtil.parentPath(old.path);
        this.fill(data, mercatorProposalVersion);

        return this.$q
            .all(_.map(old.data[SIMercatorSubResources.nick], (path : string, key : string) => {
                return self.adhHttp.get(path).then((oldSubresource) => {
                    var subresource = AdhResourceUtil.derive(oldSubresource, {preliminaryNames : self.adhPreliminaryNames});
                    subresource.parent = AdhUtil.parentPath(oldSubresource.path);
                    self.fill(data, subresource);
                    mercatorProposalVersion.data[SIMercatorSubResources.nick][key] = subresource.path;
                    return subresource;
                });
            }))
            .then((subresources) => _.flatten([mercatorProposalVersion, subresources]));
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

    public link(scope, element, attrs, wrapper) {
        var instance = super.link(scope, element, attrs, wrapper);
        instance.scope.data = <any>{};
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
            update: "=",
            facets: "=",
            sort: "="
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
            (elm, attr) => {
                attr.star = (attr.required === "required") ? "*" : "";
                return "<select data-ng-model=\"value\" name=\"{{name}}\"" +
                "       data-ng-options=\"c.code as c.name for c in countries\" data-ng-required=\"required\">" +
                "           <option value=\"\" selected>{{ 'Country" + attr.star + "' | translate }}</option>" +
                "</select>";
            },
        link: (scope) => {
            scope.countries = countries;
        }
    };
};


/**
 * Recompiles children on every change of `value`. `value` is available in
 * child scope as `key`.
 *
 * Example:
 *
 *     <adh-recompile-on-change data-value="{{proposalPath}}" data-key="path">
 *         <adh-proposal path="{{path}}"></adh-proposal>
 *     </adh-recompile-on-change>
 *
 * FIXME: move to different package
 */
export var recompileOnChange = ($compile : ng.ICompileService) => {
    return {
        restrict: "E",
        compile: (element, link) => {
            if (jQuery.isFunction(link)) {
                link = {post: link};
            }

            var contents = element.contents().remove();
            var compiledContents;

            return {
                pre: (link && link.pre) ? link.pre : null,
                post: (scope : ng.IScope, element, attrs) => {
                    if (!compiledContents) {
                        compiledContents = $compile(contents);
                    }

                    var innerScope = scope.$new();

                    scope.$watch(() => attrs["value"], (value) => {
                        element.html("");

                        innerScope[attrs["key"]] = value;

                        compiledContents(innerScope, (clone) => {
                            element.append(clone);
                        });
                    });

                    if (link && link.post) {
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
};


export var moduleName = "adhMercatorProposal";

export var register = (angular) => {
    angular
        .module(moduleName, [
            "duScroll",
            AdhHttp.moduleName,
            AdhInject.moduleName,
            AdhPreliminaryNames.moduleName,
            AdhResourceArea.moduleName,
            AdhResourceWidgets.moduleName,
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
                .specific(RIMercatorProposalVersion.content_type, "edit", () => (resource : RIMercatorProposalVersion) => {
                    return {
                        proposalUrl: resource.path
                    };
                })
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
            });
        }])
        .config(["flowFactoryProvider", (flowFactoryProvider) => {
            if (typeof flowFactoryProvider.defaults === "undefined") {
                flowFactoryProvider.defaults = {};
            }

            flowFactoryProvider.factory = fustyFlowFactory;
            flowFactoryProvider.defaults.singleFile = true;
            flowFactoryProvider.defaults.maxChunkRetries = 1;
            flowFactoryProvider.defaults.chunkRetryInterval = 5000;
            flowFactoryProvider.defaults.simultaneousUploads = 4;
            flowFactoryProvider.defaults.permanentErrors = [404, 500, 501, 502, 503];

            flowFactoryProvider.on("catchAll", () => {
                console.log(arguments);
            });
        }])
        .directive("adhRecompileOnChange", ["$compile", recompileOnChange])
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
        .directive("adhLastVersion", ["$compile", "adhHttp", lastVersion])
        .controller("mercatorProposalFormController", ["$scope", "$element", ($scope : IControllerScope, $element) => {
            var heardFromCheckboxes = [
                "heard-from-colleague",
                "heard-from-website",
                "heard-from-newsletter",
                "heard-from-facebook",
                "heard-from-other"
            ];

            var detailsLocationCheckboxes = [
                "details-location-is-specific",
                "details-location-is-online",
                "details-location-is-linked-to-ruhr"
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

            $scope.showDetailsLocationError = () : boolean => {
                return showCheckboxGroupError($scope.mercatorProposalDetailForm, detailsLocationCheckboxes);
            };

            $scope.submitIfValid = () => {
                var container = $element.parents("[data-du-scroll-container]");
                $scope.data.introduction.nickInstance = $scope.data.introduction.nickInstance ? $scope.data.introduction.nickInstance : 0;
                if ($scope.mercatorProposalForm.$valid) {
                    // pluck flow object from file upload scope, and
                    // attach it to where ResourceWidgets can find it.
                    $scope.data.introduction.imageUpload = angular.element($("[name=introduction-picture-upload]")).scope().$flow;
                    $scope.submit().catch((error) => {
                        if (_.every(error, { "name": "data.adhocracy_core.sheets.name.IName.name" })) {
                            $scope.data.introduction.nickInstance++;
                            $scope.submitIfValid();
                        }
                    });
                } else {
                    var element = $element.find(".ng-invalid");
                    container.scrollToElementAnimated(element);
                }
            };
        }]);
};
