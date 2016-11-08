/// <reference path="../../../../../lib2/types/angular.d.ts"/>

import * as AdhBadge from "../../Badge/Badge";
import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhMapping from "../../Mapping/Mapping";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhPreliminaryNames from "../../PreliminaryNames/PreliminaryNames";
import * as AdhProcess from "../../Process/Process";
import * as AdhRate from "../../Rate/Rate";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../Util/Util";

import * as ResourcesBase from "../../../ResourcesBase";

import RICommentVersion from "../../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RISystemUser from "../../../../Resources_/adhocracy_core/resources/principal/ISystemUser";
import * as SICommentable from "../../../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIDescription from "../../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMetadata from "../../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIPoint from "../../../../Resources_/adhocracy_core/sheets/geo/IPoint";
import * as SIRateable from "../../../../Resources_/adhocracy_core/sheets/rate/IRateable";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../../../Resources_/adhocracy_core/sheets/versions/IVersionable";

export var pkgLocation = "/Core/IdeaCollection/Proposal";


export interface IScope extends angular.IScope {
    path? : string;
    options : AdhHttp.IOptions;
    errors? : AdhHttp.IBackendErrorItem[];
    data : {
        title : string;
        detail? : string;
        rateCount : number;
        creator : string;
        creationDate : string;
        commentCount : number;
        lng? : number;
        lat? : number;
        polygon? : number[][];
        assignments : AdhBadge.IBadgeAssignment[];
        picture? : string;
        budget? : number;
        creatorParticipate? : boolean;
        locationText? : string;
        anonymize? : boolean;
        createdAnonymously? : boolean;
    };
    selectedState? : string;
    processProperties : AdhProcess.IProcessProperties;
    resource : any;
    config? : AdhConfig.IService;
    commentType? : string;
}

export var bindPath = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    $q : angular.IQService
) => (
    scope : IScope,
    pathKey : string = "path"
) : void => {
    var getPolygon = () => {
        if (scope.processProperties.hasLocation) {
            var processUrl = adhTopLevelState.get("processUrl");
            return adhHttp.get(processUrl).then((process) : angular.IPromise<void | number[][]> => {
                var locationUrl = SILocationReference.get(process).location;
                if (locationUrl) {
                    return adhHttp.get(locationUrl).then((location) => {
                        return SIMultiPolygon.get(location).coordinates[0][0];
                    });
                }
                return $q.when();
            });
        } else {
            return $q.when();
        }
    };

    scope.$watch(pathKey, (value : string) => {
        if (value) {
            adhHttp.get(value).then((resource) => {
                scope.resource = resource;

                var titleSheet = SITitle.get(resource);
                var pointSheet = SIPoint.get(resource);
                var metadataSheet = SIMetadata.get(resource);
                var rateableSheet = SIRateable.get(resource);

                var proposalSheetClass = scope.processProperties.proposalSheet;
                if (proposalSheetClass) {
                    var proposalSheet = proposalSheetClass.get(resource);
                }

                $q.all([
                    adhRate.fetchAggregatedRates(rateableSheet.post_pool, resource.path),
                    getPolygon(),
                    adhGetBadges(resource)
                ]).then((args : any[]) => {
                    var rates = args[0];
                    var polygon = args[1];
                    var assignments = args[2];

                    var ratesPro = rates["1"] || 0;
                    var ratesContra = rates["-1"] || 0;

                    scope.data = {
                        title: titleSheet.title,
                        rateCount: ratesPro - ratesContra,
                        creator: metadataSheet.creator,
                        creationDate: metadataSheet.item_creation_date,
                        commentCount: SICommentable.get(resource).comments_count,
                        assignments: assignments
                    };

                    if (scope.processProperties.hasDescription) {
                        var descriptionSheet = SIDescription.get(resource);
                        scope.data.detail = descriptionSheet.description;
                    }

                    if (adhConfig.anonymize_enabled) {
                        adhHttp.get(scope.data.creator).then((res) => {
                            scope.data.createdAnonymously = res.content_type === RISystemUser.content_type;
                        });
                    }
                    if (scope.processProperties.hasLocation) {
                        scope.data.lng = pointSheet.coordinates[0];
                        scope.data.lat = pointSheet.coordinates[1];
                        scope.data.polygon = polygon;
                    }
                    if (scope.processProperties.hasImage) {
                        scope.data.picture = SIImageReference.get(resource).picture;
                    }
                    // WARNING: proposalSheet is not a regular feature of adhocracy,
                    // but a hack of Buergerhaushalt and Kiezkasse.
                    if (proposalSheet) {
                        if (scope.processProperties.maxBudget) {
                            scope.data.budget = proposalSheet.budget;
                        }
                        if (scope.processProperties.hasCreatorParticipate) {
                            scope.data.creatorParticipate = proposalSheet.creator_participate;
                        }
                        if (scope.processProperties.hasLocationText) {
                            scope.data.locationText = proposalSheet.location_text;
                        }
                    }
                });
            });
        }
        adhPermissions.bindScope(scope, () => scope[pathKey]);
    });
};

var fill = (
    scope : IScope,
    proposalVersion
) : void => {
    // WARNING: proposalSheet is not a regular feature of adhocracy,
    // but a hack of Buergerhaushalt and Kiezkasse.
    var proposalSheet = scope.processProperties.proposalSheet;
    if (proposalSheet && scope.processProperties.hasCreatorParticipate
        && scope.processProperties.hasLocationText && scope.processProperties.maxBudget) {
        proposalSheet.set(proposalVersion, {
            budget: scope.data.budget,
            creator_participate: scope.data.creatorParticipate,
            location_text: scope.data.locationText
        });
    } else if (proposalSheet && scope.processProperties.hasLocationText && scope.processProperties.maxBudget) {
        proposalSheet.set(proposalVersion, {
            budget: scope.data.budget,
            location_text: scope.data.locationText
        });
    }
    SITitle.set(proposalVersion, {
        title: scope.data.title
    });
    if (scope.processProperties.hasDescription) {
        SIDescription.set(proposalVersion, {
            description: scope.data.detail
        });
    }
    if (scope.data.lng && scope.data.lat) {
        SIPoint.set(proposalVersion, {
            coordinates: [scope.data.lng, scope.data.lat]
        });
    }
};

var postCreate = (
    adhHttp : AdhHttp.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    poolPath : string
) => {
    var proposalClass = scope.processProperties.proposalClass;
    var proposalVersionClass = scope.processProperties.proposalVersionClass;

    var proposal : ResourcesBase.IResource = {
        path: adhPreliminaryNames.nextPreliminary(),
        first_version_path: adhPreliminaryNames.nextPreliminary(),
        parent: poolPath,
        content_type: proposalClass.content_type,
        data: {},
    };
    var proposalVersion : ResourcesBase.IResource = {
        path: adhPreliminaryNames.nextPreliminary(),
        parent: proposal.path,
        content_type: proposalVersionClass.content_type,
        data: {},
    };

    SIVersionable.set(proposalVersion, {
        follows: [proposal.first_version_path]
    });
    fill(scope, proposalVersion);

    return adhHttp.deepPost([proposal, proposalVersion], {
        anonymize: scope.data.anonymize
    });
};

var postEdit = (
    adhHttp : AdhHttp.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    oldVersion
) => {
    var proposalVersionClass = scope.processProperties.proposalVersionClass;

    var proposalVersion : ResourcesBase.IResource = {
        path: adhPreliminaryNames.nextPreliminary(),
        parent: AdhUtil.parentPath(oldVersion.path),
        content_type: proposalVersionClass.content_type,
        data: {},
    };
    SIVersionable.set(proposalVersion, {
        follows: [oldVersion.path]
    });
    fill(scope, proposalVersion);

    return adhHttp.deepPost([proposalVersion], {
        anonymize: scope.data.anonymize
    });
};

export var detailDirective = (
    processType? : string
) => (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    adhProcess : AdhProcess.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@",
            processProperties: "=?"
        },
        link: (scope : IScope) => {
            if (!scope.processProperties && processType) {
                scope.processProperties = adhProcess.getProperties(processType);
            }

            bindPath(adhConfig, adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined);
            scope.commentType = RICommentVersion.content_type;
        }
    };
};

export var listItemDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        scope: {
            path: "@",
            processProperties: "="
        },
        link: (scope : IScope) => {
            bindPath(adhConfig, adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined);
            scope.$on("$destroy", adhTopLevelState.on("proposalUrl", (proposalVersionUrl) => {
                if (!proposalVersionUrl) {
                    scope.selectedState = "";
                } else if (proposalVersionUrl === scope.path) {
                    scope.selectedState = "is-selected";
                } else {
                    scope.selectedState = "is-not-selected";
                }
            }));
            scope.commentType = RICommentVersion.content_type;
        }
    };
};

export var mapListItemDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        require: "^adhMapListingInternal",
        scope: {
            path: "@",
            processProperties: "="
        },
        link: (scope : IScope, element, attrs, mapListing : AdhMapping.MapListingController) => {
            bindPath(adhConfig, adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined);

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
            scope.commentType = RICommentVersion.content_type;
        }
    };
};

export var createDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
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
            processProperties: "=",
            cancelUrl: "=?"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        link: (scope, element) => {
            scope.errors = [];
            scope.data = {};
            scope.create = true;
            scope.showError = adhShowError;
            scope.config = adhConfig;

            scope.data.lat = undefined;
            scope.data.lng = undefined;

            if (scope.processProperties.hasLocation) {
                adhHttp.get(scope.poolPath).then((pool) => {
                    var locationUrl = SILocationReference.get(pool).location;
                    if (locationUrl) {
                        adhHttp.get(locationUrl).then((location) => {
                            var polygon = SIMultiPolygon.get(location).coordinates[0][0];
                            scope.data.polygon = polygon;
                        });
                    }
                });
            }

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.ideaCollectionProposalForm, () => {
                    return postCreate(adhHttp, adhPreliminaryNames)(scope, scope.poolPath)
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
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhRate : AdhRate.Service,
    adhResourceUrlFilter,
    adhShowError,
    adhSubmitIfValid,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    $location : angular.ILocationService,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            path: "@",
            processProperties: "=",
            cancelUrl: "=?"
        },
        link: (scope, element) => {
            scope.errors = [];
            scope.showError = adhShowError;
            scope.config = adhConfig;
            scope.create = false;
            bindPath(adhConfig, adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(
                scope, undefined);

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.ideaCollectionProposalForm, () => {
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
