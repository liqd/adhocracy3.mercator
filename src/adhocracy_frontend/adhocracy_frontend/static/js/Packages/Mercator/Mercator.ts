import AdhResourcesBase = require("../../ResourcesBase");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhResourceWidgets = require("../ResourceWidgets/ResourceWidgets");

import RIMercatorProposal = require("../../Resources_/adhocracy_core/resources/mercator/IMercatorProposal");
import RIMercatorProposalVersion = require("../../Resources_/adhocracy_core/resources/mercator/IMercatorProposalVersion");

import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");
import SIUserInfo = require("../../Resources_/adhocracy_core/sheets/mercator/IUserInfo");
import SIOrganizationInfo = require("../../Resources_/adhocracy_core/sheets/mercator/IOrganizationInfo");
import SIIntroduction = require("../../Resources_/adhocracy_core/sheets/mercator/IIntroduction");
import SIDetails = require("../../Resources_/adhocracy_core/sheets/mercator/IDetails");
import SIMotivation = require("../../Resources_/adhocracy_core/sheets/mercator/IMotivation");
import SIFinance = require("../../Resources_/adhocracy_core/sheets/mercator/IFinance");
import SIExtras = require("../../Resources_/adhocracy_core/sheets/mercator/IExtras");
import SIName = require("../../Resources_/adhocracy_core/sheets/name/IName");

var pkgLocation = "/Mercator";


export interface IMercatorProposalScope extends AdhResourceWidgets.IResourceWidgetScope {
    poolPath : string;
    data : {
        basic : {
            user : {
                name : string;
                lastname : string;
                email : string;
            };
            organisation : {
                name : string;
                email : string;
                address : string;
                postcode : string;
                city : string;
                country : string;
                status : string;
                statustext : string;
                description : string;
                size : string;
                cooperation : boolean;
                cooperationText? : string;
            };
        };
        introduction : {
            title : string;
            teaser : string;
            picture? : any;
        };
        detail : {
            description : string;
            location : string;
            story : string;
        };
        motivation : {
            outcome : string;
            steps : string;
            value : string;
            partners : string;
        };
        finance : {
            budget : number;
            funding : number;
            granted : boolean;
            document? : any;
        };
        extra : {
            mediaFiles? : any[];
            experience? : string;
            hear : {
                colleague : boolean;
                website : boolean;
                newsletter : boolean;
                facebook : boolean;
                other : boolean;
                otherDescription : string;
            }
        };
    };
}


export class MercatorProposal<R extends AdhResourcesBase.Resource> extends AdhResourceWidgets.ResourceWidget<R, IMercatorProposalScope> {
    constructor(
        adhConfig : AdhConfig.Type,
        adhHttp : AdhHttp.Service<any>,
        adhPreliminaryNames : AdhPreliminaryNames,
        $q : ng.IQService
    ) {
        super(adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/MercatorProposalCreate.html";
    }

    public createDirective() : ng.IDirective {
        var directive = super.createDirective();
        directive.scope.poolPath = "@";
        return directive;
    }

    public _handleDelete(
        instance : AdhResourceWidgets.IResourceWidgetInstance<R, IMercatorProposalScope>,
        path : string
    ) : ng.IPromise<void> {
        return this.$q.when();
    }

    public _update(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IMercatorProposalScope>, resource : R) : ng.IPromise<void> {
        return this.$q.when();
    }

    public _create(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IMercatorProposalScope>) : ng.IPromise<R[]> {
        var data = instance.scope.data || <any>{};
        data.basic = data.basic || <any>{};
        data.basic.user = data.basic.user || <any>{};
        data.basic.organisation = data.basic.organisation || <any>{};
        data.introduction = data.introduction || <any>{};
        data.detail = data.detail || <any>{};
        data.motivation = data.motivation || <any>{};
        data.finance = data.finance || <any>{};
        data.extra = data.extra || <any>{};
        data.extra.hear = data.extra.hear || <any>{};

        var mercatorProposal = new RIMercatorProposal({preliminaryNames : this.adhPreliminaryNames});
        mercatorProposal.parent = instance.scope.poolPath;
        mercatorProposal.data[SIName.nick] = new SIName.AdhocracyCoreSheetsNameIName({
            name: data.introduction.title
        });

        var mercatorProposalVersion = new RIMercatorProposalVersion({preliminaryNames : this.adhPreliminaryNames});
        mercatorProposalVersion.data[SIUserInfo.nick] = new SIUserInfo.AdhocracyCoreSheetsMercatorIUserInfo({
            personal_name: data.basic.user.name,
            family_name: data.basic.user.lastname,
            email: data.basic.user.email
        });
        mercatorProposalVersion.data[SIOrganizationInfo.nick] = new SIOrganizationInfo.AdhocracyCoreSheetsMercatorIOrganizationInfo({
            name: data.basic.organisation.name,
            email: data.basic.organisation.email,
            street_address: data.basic.organisation.address,
            postcode: data.basic.organisation.postcode,
            city: data.basic.organisation.city,
            country: data.basic.organisation.country,
            status: data.basic.organisation.status,
            status_other: data.basic.organisation.statustext,
            description: data.basic.organisation.description,
            size: data.basic.organisation.size,
            cooperation_explanation: data.basic.organisation.cooperationText
        });
        mercatorProposalVersion.data[SIIntroduction.nick] = new SIIntroduction.AdhocracyCoreSheetsMercatorIIntroduction({
            title: data.introduction.title,
            teaser: data.introduction.teaser
        });
        mercatorProposalVersion.data[SIDetails.nick] = new SIDetails.AdhocracyCoreSheetsMercatorIDetails({
            description: data.detail.description,
            location_is_city: data.detail.location.city,
            location_is_country: data.detail.location.country,
            location_is_town: data.detail.location.town,
            location_is_online: data.detail.location.online,
            location_is_linked_to_ruhr: data.detail.location.ruhr,
            story: data.detail.story
        });
        mercatorProposalVersion.data[SIMotivation.nick] = new SIMotivation.AdhocracyCoreSheetsMercatorIMotivation({
            outcome: data.motivation.outcome,
            steps: data.motivation.steps,
            value: data.motivation.value,
            partners: data.motivation.partners
        });
        mercatorProposalVersion.data[SIFinance.nick] = new SIFinance.AdhocracyCoreSheetsMercatorIFinance({
            budget: data.finance.budget,
            requested_funding: data.finance.funding,
            granted: data.finance.granted
        });
        mercatorProposalVersion.data[SIExtras.nick] = new SIExtras.AdhocracyCoreSheetsMercatorIExtras({
            experience: data.extra.experience,
            heard_from_colleague: data.extra.hear.colleague,
            heard_from_website: data.extra.hear.website,
            heard_from_newsletter: data.extra.hear.newsletter,
            heard_from_facebook: data.extra.hear.facebook,
            heard_elsewhere: data.extra.hear.otherDescription
        });
        mercatorProposalVersion.data[SIVersionable.nick] = new SIVersionable.AdhocracyCoreSheetsVersionsIVersionable({
            follows: [mercatorProposal.first_version_path]
        });
        mercatorProposalVersion.parent = mercatorProposal.path;

        console.log(mercatorProposalVersion);
        return this.$q.when([mercatorProposal, mercatorProposalVersion]);
    }

    public _edit(instance : AdhResourceWidgets.IResourceWidgetInstance<R, IMercatorProposalScope>, old : R) : ng.IPromise<R[]> {
        return this.$q.when([]);
    }
}
