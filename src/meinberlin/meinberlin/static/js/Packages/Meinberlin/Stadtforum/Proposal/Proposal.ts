/// <reference path="../../../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as AdhBadge from "../../../Badge/Badge";
import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhPreliminaryNames from "../../../PreliminaryNames/PreliminaryNames";
import * as AdhRate from "../../../Rate/Rate";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";

import * as SICommentable from "../../../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIDescription from "../../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIMetadata from "../../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIRateable from "../../../../Resources_/adhocracy_core/sheets/rate/IRateable";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../../../Resources_/adhocracy_core/sheets/versions/IVersionable";
import RIProposal from "../../../../Resources_/adhocracy_core/resources/proposal/IProposal";
import RIProposalVersion from "../../../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";

var pkgLocation = "/Meinberlin/Stadtforum/Proposal";


export interface IScope extends angular.IScope {
    path? : string;
    options : AdhHttp.IOptions;
    errors? : AdhHttp.IBackendErrorItem[];
    data : {
        title : string;
        detail : string;
        creator : string;
        rateCount : number;
        creationDate : string;
        commentCount : number;
        assignments : AdhBadge.IBadge[];
    };
    selectedState? : string;
    resource : any;
    goToLogin() : void;
}

var bindPath = (
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges,
    $q : angular.IQService
) => (
    scope : IScope,
    pathKey : string = "path"
) : void => {
    scope.$watch(pathKey, (value : string) => {
        if (value) {
            adhHttp.get(value).then((resource) => {
                scope.resource = resource;

                var titleSheet : SITitle.Sheet = resource.data[SITitle.nick];
                var descriptionSheet : SIDescription.Sheet = resource.data[SIDescription.nick];
                var metadataSheet : SIMetadata.Sheet = resource.data[SIMetadata.nick];
                var rateableSheet : SIRateable.Sheet = resource.data[SIRateable.nick];

                $q.all([
                    adhRate.fetchAggregatedRates(rateableSheet.post_pool, resource.path),
                    adhGetBadges(resource)
                ]).then((args : any[]) => {
                    var rates = args[0];
                    var assignments = args[1];

                    // FIXME: an adapter should take care of this
                    var ratesPro = rates["1"] || 0;
                    var ratesContra = rates["-1"] || 0;

                    scope.data = {
                        title: titleSheet.title,
                        detail: descriptionSheet.description,
                        rateCount: ratesPro - ratesContra,
                        creator: metadataSheet.creator,
                        creationDate: metadataSheet.item_creation_date,
                        commentCount: resource[SICommentable.nick].comments_count,
                        assignments: assignments
                    };
                });
            });
        }
        adhPermissions.bindScope(scope, () => scope[pathKey]);
    });
};

var fill = (
    scope : IScope,
    proposalVersion : RIProposalVersion
) : void => {
    proposalVersion.data[SITitle.nick] = new SITitle.Sheet({
        title: scope.data.title
    });
    proposalVersion.data[SIDescription.nick] = new SIDescription.Sheet({
        description: ""
    });
};

var postCreate = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    poolPath : string
) => {
    var proposal = new RIProposal({preliminaryNames: adhPreliminaryNames});
    proposal.parent = poolPath;
    var proposalVersion = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});

    proposalVersion.parent = proposal.path;
    proposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [proposal.first_version_path]
    });
    fill(scope, proposalVersion);

    return adhHttp.deepPost([proposal, proposalVersion]);
};


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(scope);

            scope.goToLogin = () => {
                adhTopLevelState.setCameFromAndGo("/login");
            };
        }
    };
};

export var createDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError,
    adhSubmitIfValid,
    adhResourceUrlFilter,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        scope: {
            poolPath: "@"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        link: (scope, element) => {
            scope.errors = [];
            scope.data = {};
            scope.showError = adhShowError;

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.proposalForm, () => {
                    return postCreate(adhHttp, adhPreliminaryNames)(scope, scope.poolPath);
                });
            };
        }
    };
};
