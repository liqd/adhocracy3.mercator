/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as AdhBadge from "../Badge/Badge";
import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhRate from "../Rate/Rate";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import * as SICommentable from "../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIDescription from "../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIMetadata from "../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIRateable from "../../Resources_/adhocracy_core/sheets/rate/IRateable";
import * as SITitle from "../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";
import RIProposal from "../../Resources_/adhocracy_core/resources/proposal/IProposal";
import RIProposalVersion from "../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";

var pkgLocation = "/Proposal";


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
                        commentCount: resource.data[SICommentable.nick].comments_count,
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
        description: scope.data.detail
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

var postEdit = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    oldVersion : RIProposalVersion
) => {
    var proposalVersion = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
    proposalVersion.parent = AdhUtil.parentPath(oldVersion.path);
    proposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [oldVersion.path]
    });
    fill(scope, proposalVersion);

    return adhHttp.deepPost([proposalVersion]);
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
        }
    };
};

export var listItemDirective = (
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
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        scope: {
            path: "@"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(scope);
            scope.$on("$destroy", adhTopLevelState.on("proposalUrl", (proposalVersionUrl) => {
                if (!proposalVersionUrl) {
                    scope.selectedState = "";
                } else if (proposalVersionUrl === scope.path) {
                    scope.selectedState = "is-selected";
                } else {
                    scope.selectedState = "is-not-selected";
                }
            }));
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
        scope: {},
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        link: (scope, element) => {
            scope.errors = [];
            scope.data = {};
            scope.showError = adhShowError;

            var processUrl = adhTopLevelState.get("processUrl");

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.proposalForm, () => {
                    return postCreate(adhHttp, adhPreliminaryNames)(scope, processUrl)
                        .then((result) => {
                            $location.url(adhResourceUrlFilter(AdhUtil.parentPath(result[1].path)));
                        });
                });
            };

            scope.cancel = () => {
                var fallback = adhResourceUrlFilter(processUrl);
                adhTopLevelState.goToCameFrom(fallback);
            };
        }
    };
};

export var editDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhRate : AdhRate.Service,
    adhResourceUrlFilter,
    adhShowError,
    adhSubmitIfValid,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges,
    $location : angular.ILocationService,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            path: "@"
        },
        link: (scope, element) => {
            scope.errors = [];
            scope.showError = adhShowError;
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(scope);

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.proposalForm, () => {
                    return postEdit(adhHttp, adhPreliminaryNames)(scope, scope.resource)
                        .then((result) => {
                            $location.url(adhResourceUrlFilter(AdhUtil.parentPath(result[0].path)));
                    });
                });
            };

            scope.cancel = () => {
                var fallback = adhResourceUrlFilter(AdhUtil.parentPath(scope.path));
                adhTopLevelState.goToCameFrom(fallback);
            };
        }
    };
};
