/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as AdhBadge from "../../Badge/Badge";
import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhMapping from "../../Mapping/Mapping";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhPreliminaryNames from "../../PreliminaryNames/PreliminaryNames";
import * as AdhRate from "../../Rate/Rate";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../Util/Util";

import RIBuergerhaushaltProposal from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposal";
import RIBuergerhaushaltProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import RIGeoProposal from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIKiezkasseProposal from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposal";
import RIKiezkasseProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion";
import * as SIBuergerhaushaltProposal from "../../../Resources_/adhocracy_meinberlin/sheets/burgerhaushalt/IProposal";
import * as SICommentable from "../../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIDescription from "../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIKiezkasseProposal from "../../../Resources_/adhocracy_meinberlin/sheets/kiezkassen/IProposal";
import * as SILocationReference from "../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMetadata from "../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIMultiPolygon from "../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIPoint from "../../../Resources_/adhocracy_core/sheets/geo/IPoint";
import * as SIRateable from "../../../Resources_/adhocracy_core/sheets/rate/IRateable";
import * as SITitle from "../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../../Resources_/adhocracy_core/sheets/versions/IVersionable";

var pkgLocation = "/Meinberlin/Proposal";


export interface IScope extends angular.IScope {
    path? : string;
    options : AdhHttp.IOptions;
    errors? : AdhHttp.IBackendErrorItem[];
    data : {
        title : string;
        detail : string;
        rateCount : number;
        creator : string;
        creationDate : string;
        commentCount : number;
        lng : number;
        lat : number;
        polygon: number[][];
        assignments : AdhBadge.IBadge[];

        budget? : number;
        creatorParticipate? : boolean;
        locationText? : string;
    };
    selectedState? : string;
    isKiezkasse : boolean;
    isBuergerhaushalt : boolean;
    resource : any;
}

// FIXME: the following functions duplicate some of the adhResourceWidget functionality
// They are an experiment on how adhResourceWidget can be improved.  This duplication
// should be resolved at some point.
var bindPath = (
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges,
    $q : angular.IQService
) => (
    scope : IScope,
    pathKey : string = "path",
    isKiezkasse : boolean = false,
    isBuergerhaushalt : boolean = false
) : void => {
    var getPolygon = () => {
        var processUrl = adhTopLevelState.get("processUrl");

        return adhHttp.get(processUrl).then((process) => {
            var locationUrl = process.data[SILocationReference.nick]["location"];

            return adhHttp.get(locationUrl).then((location) => {
                return location.data[SIMultiPolygon.nick]["coordinates"][0][0];
            });
        });
    };

    scope.$watch(pathKey, (value : string) => {
        if (value) {
            adhHttp.get(value).then((resource) => {
                scope.resource = resource;

                var titleSheet : SITitle.Sheet = resource.data[SITitle.nick];
                var descriptionSheet : SIDescription.Sheet = resource.data[SIDescription.nick];
                var pointSheet : SIPoint.Sheet = resource.data[SIPoint.nick];
                var metadataSheet : SIMetadata.Sheet = resource.data[SIMetadata.nick];
                var rateableSheet : SIRateable.Sheet = resource.data[SIRateable.nick];

                if (isKiezkasse) {
                    var kiezkasseSheet : SIKiezkasseProposal.Sheet = resource.data[SIKiezkasseProposal.nick];
                } else if (isBuergerhaushalt) {
                    var buergerhaushaltSheet : SIBuergerhaushaltProposal.Sheet = resource.data[SIBuergerhaushaltProposal.nick];
                }

                $q.all([
                    adhRate.fetchAggregatedRates(rateableSheet.post_pool, resource.path),
                    getPolygon(),
                    adhGetBadges(resource)
                ]).then((args : any[]) => {
                    var rates = args[0];
                    var polygon = args[1];
                    var assignments = args[2];

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
                        lng: pointSheet.coordinates[0],
                        lat: pointSheet.coordinates[1],
                        polygon: polygon,
                        assignments: assignments
                    };
                    if (isKiezkasse) {
                        scope.data.budget = kiezkasseSheet.budget;
                        scope.data.creatorParticipate = kiezkasseSheet.creator_participate;
                        scope.data.locationText = kiezkasseSheet.location_text;
                    } else if (isBuergerhaushalt) {
                        scope.data.budget = buergerhaushaltSheet.budget;
                        scope.data.locationText = buergerhaushaltSheet.location_text;
                    }
                });
            });
        }
        adhPermissions.bindScope(scope, () => scope[pathKey]);
    });
};

var fill = (
    scope : IScope,
    proposalVersion,
    isKiezkasse : boolean = false,
    isBuergerhaushalt : boolean = false
) : void => {

    if (isKiezkasse) {
        proposalVersion.data[SIKiezkasseProposal.nick] = new SIKiezkasseProposal.Sheet({
            budget: scope.data.budget,
            creator_participate: scope.data.creatorParticipate,
            location_text: scope.data.locationText
        });
    } else if (isBuergerhaushalt) {
        proposalVersion.data[SIBuergerhaushaltProposal.nick] = new SIBuergerhaushaltProposal.Sheet({
            budget: scope.data.budget,
            location_text: scope.data.locationText
        });
    }
    proposalVersion.data[SITitle.nick] = new SITitle.Sheet({
        title: scope.data.title
    });
    proposalVersion.data[SIDescription.nick] = new SIDescription.Sheet({
        description: scope.data.detail
    });
    if (scope.data.lng && scope.data.lat) {
        proposalVersion.data[SIPoint.nick] = new SIPoint.Sheet({
            coordinates: [scope.data.lng, scope.data.lat]
        });
    }
};

var postCreate = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    poolPath : string,
    isKiezkasse : boolean = false,
    isBuergerhaushalt : boolean = false
) => {
    var proposalClass = RIGeoProposal;
    var proposalVersionClass = RIGeoProposalVersion;

    if (isKiezkasse) {
        proposalClass = RIKiezkasseProposal;
        proposalVersionClass = RIKiezkasseProposalVersion;
    } else if (isBuergerhaushalt) {
        proposalClass = RIBuergerhaushaltProposal;
        proposalVersionClass = RIBuergerhaushaltProposalVersion;
    }

    var proposal = new proposalClass({preliminaryNames: adhPreliminaryNames});
    proposal.parent = poolPath;
    var proposalVersion = new proposalVersionClass({preliminaryNames: adhPreliminaryNames});

    proposalVersion.parent = proposal.path;
    proposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [proposal.first_version_path]
    });
    fill(scope, proposalVersion, isKiezkasse, isBuergerhaushalt);

    return adhHttp.deepPost([proposal, proposalVersion]);
};

var postEdit = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    oldVersion,
    isKiezkasse : boolean = false,
    isBuergerhaushalt : boolean = false
) => {
    var proposalVersionClass = RIGeoProposalVersion;

    if (isKiezkasse) {
        proposalVersionClass = RIKiezkasseProposalVersion;
    } else if (isBuergerhaushalt) {
        proposalVersionClass = RIBuergerhaushaltProposalVersion;
    }

    var proposalVersion = new proposalVersionClass({preliminaryNames: adhPreliminaryNames});
    proposalVersion.parent = AdhUtil.parentPath(oldVersion.path);
    proposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [oldVersion.path]
    });
    fill(scope, proposalVersion, isKiezkasse, isBuergerhaushalt);

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
            path: "@",
            isKiezkasse: "=?",
            isBuergerhaushalt: "=?"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined, scope.isKiezkasse, scope.isBuergerhaushalt);
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
            path: "@",
            isKiezkasse: "=?",
            isBuergerhaushalt: "=?"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined, scope.isKiezkasse, scope.isBuergerhaushalt);
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

export var mapListItemDirective = (
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
        require: "^adhMapListingInternal",
        scope: {
            path: "@",
            isKiezkasse: "=?",
            isBuergerhaushalt: "=?"
        },
        link: (scope : IScope, element, attrs, mapListing : AdhMapping.MapListingController) => {
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined, scope.isKiezkasse, scope.isBuergerhaushalt);

            var unregister = scope.$watchGroup(["data.lat", "data.lng"], (values : number[]) => {
                if (typeof values[0] !== "undefined" && typeof values[1] !== "undefined") {
                    scope.$on("$destroy", mapListing.registerListItem(scope.path, values[0], values[1]));
                    unregister();
                }
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
            poolPath: "@",
            isKiezkasse: "=?",
            isBuergerhaushalt: "=?"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        link: (scope, element) => {
            scope.errors = [];
            scope.data = {};
            scope.create = true;
            scope.showError = adhShowError;

            scope.data.lat = undefined;
            scope.data.lng = undefined;

            adhHttp.get(scope.poolPath).then((pool) => {
                var locationUrl = pool.data[SILocationReference.nick]["location"];
                adhHttp.get(locationUrl).then((location) => {
                    var polygon = location.data[SIMultiPolygon.nick]["coordinates"][0][0];
                    scope.data.polygon = polygon;
                });
            });

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.meinberlinProposalForm, () => {
                    return postCreate(adhHttp, adhPreliminaryNames)(scope, scope.poolPath, scope.isKiezkasse, scope.isBuergerhaushalt)
                        .then((result) => {
                            $location.url(adhResourceUrlFilter(AdhUtil.parentPath(result[1].path)));
                        });
                });
            };

            scope.cancel = () => {
                var fallback = adhResourceUrlFilter(scope.poolPath);
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
            path: "@",
            isKiezkasse: "=?",
            isBuergerhaushalt: "=?"
        },
        link: (scope, element) => {
            scope.errors = [];
            scope.showError = adhShowError;
            scope.create = false;
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined, scope.isKiezkasse, scope.isBuergerhaushalt);

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.meinberlinProposalForm, () => {
                    return postEdit(adhHttp, adhPreliminaryNames)(scope, scope.resource, scope.isKiezkasse, scope.isBuergerhaushalt)
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

export var addProposalButtonDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/AddProposalButton.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");

            scope.setCameFrom = () => {
                adhTopLevelState.setCameFrom();
            };
        }
    };
};
