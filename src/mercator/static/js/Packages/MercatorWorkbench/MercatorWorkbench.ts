/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import AdhComment = require("../Comment/Comment");
import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhListing = require("../Listing/Listing");
import AdhMercatorProposal = require("../MercatorProposal/MercatorProposal");
import AdhMovingColumns = require("../MovingColumns/MovingColumns");
import AdhPermissions = require("../Permissions/Permissions");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUser = require("../User/User");
import AdhUtil = require("../Util/Util");

import RIBasicPool = require("../../Resources_/adhocracy_core/resources/pool/IBasicPool");
import RICommentVersion = require("../../Resources_/adhocracy_core/resources/comment/ICommentVersion");
import RIMercatorProposalVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposalVersion");
import RIUser = require("../../Resources_/adhocracy_core/resources/principal/IUser");
import RIUsersService = require("../../Resources_/adhocracy_core/resources/principal/IUsersService");
import SIComment = require("../../Resources_/adhocracy_core/sheets/comment/IComment");

var pkgLocation = "/MercatorWorkbench";

interface IMercatorWorkbenchScope extends ng.IScope {
    path : string;
    user : AdhUser.Service;
    websocketTestPaths : string;
    contentType : string;
    view : string;
    goToListing() : void;
    goToProposal(path : string) : void;
    proposalListingData : {
        facets : AdhListing.IFacet[];
        showFacets : boolean;
        sort : string;
        update?;
    };
}

interface IMercatorWorkbenchRootScope extends ng.IScope {
    mercatorProposalPostPoolOptions : AdhHttp.IOptions;
    addMercatorProposal : () => void;
}

export class MercatorWorkbench {
    public static templateUrl : string = pkgLocation + "/MercatorWorkbench.html";

    public createDirective(adhConfig : AdhConfig.IService) {
        var _self = this;
        var _class = (<any>_self).constructor;

        // FIXME: use dependency injection instead
        var resourceUrl = AdhResourceArea.resourceUrl(adhConfig);

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + _class.templateUrl,
            controller: ["adhUser", "adhPermissions", "adhTopLevelState", "$scope", "$rootScope", "$location", (
                adhUser : AdhUser.Service,
                adhPermissions : AdhPermissions.Service,
                adhTopLevelState : AdhTopLevelState.Service,
                $scope : IMercatorWorkbenchScope,
                $rootScope : IMercatorWorkbenchRootScope,
                $location : ng.ILocationService
            ) : void => {
                $scope.path = adhConfig.rest_url + adhConfig.custom["mercator_platform_path"];
                $scope.contentType = RIMercatorProposalVersion.content_type;
                $scope.user = adhUser;
                $scope.websocketTestPaths = JSON.stringify([$scope.path]);
                $scope.proposalListingData = {
                    facets: [{
                        key: "mercator_location",
                        name: "Location",
                        items: [
                            {key: "specific", name: "Specific"},
                            {key: "online", name: "Online"},
                            {key: "linked_to_ruhr", name: "Linked to the Ruhr area"}
                        ]
                    }, {
                        key: "mercator_requested_funding",
                        name: "Requested funding",
                        items: [
                            {key: "5000", name: "0 - 5000 €"},
                            {key: "10000", name: "5000 - 10000 €"},
                            {key: "20000", name: "10000 - 20000 €"},
                            {key: "50000", name: "20000 - 50000 €"}
                        ]
                    }],
                    showFacets: false,
                    sort: "-rates"
                };

                $rootScope.mercatorProposalPostPoolOptions = AdhHttp.emptyOptions;
                $rootScope.addMercatorProposal = () => {
                    if ($rootScope.mercatorProposalPostPoolOptions.POST) {
                        $location.url("/r/mercator/@create_proposal");
                    } else {
                        adhTopLevelState.setCameFrom("/r/mercator/@create_proposal");
                        $location.url("/login");
                    }
                };

                adhPermissions.bindScope($rootScope, $scope.path, "mercatorProposalPostPoolOptions");

                adhTopLevelState.on("view", (value : string) => {
                    $scope.view = value;
                });
                $scope.goToListing = () => {
                    $location.url("/r/mercator");
                };
                $scope.goToProposal = (path) => {
                    $location.url(resourceUrl(path));
                };
            }]
        };
    }
}


export var moduleName = "adhMercatorWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhComment.moduleName,
            AdhHttp.moduleName,
            AdhListing.moduleName,
            AdhMercatorProposal.moduleName,
            AdhMovingColumns.moduleName,
            AdhPermissions.moduleName,
            AdhResourceArea.moduleName,
            AdhTopLevelState.moduleName,
            AdhUser.moduleName
        ])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .default(RICommentVersion.content_type, "", {
                    space: "content",
                    movingColumns: "is-collapse-show-show"
                })
                .specific(RICommentVersion.content_type, "", ["adhHttp", (adhHttp : AdhHttp.Service<any>) =>
                                                              (resource : RICommentVersion) => {
                    var specifics = {};
                    specifics["commentUrl"] = resource.path;
                    specifics["commentableUrl"] = resource.data[SIComment.nick].refers_to;

                    return adhHttp.get(specifics["commentableUrl"])
                        .then((commentable) => {
                            if (commentable.content_type === RIMercatorProposalVersion.content_type) {
                                specifics["proposalUrl"] = specifics["commentableUrl"];
                            } else {
                                var subResourceUrl = AdhUtil.parentPath(specifics["commentableUrl"]);
                                var proposalItemUrl = AdhUtil.parentPath(subResourceUrl);
                                return adhHttp.getNewestVersionPathNoFork(proposalItemUrl).then((proposalUrl) => {
                                    specifics["proposalUrl"] = proposalUrl;
                                });
                            }
                        })
                        .then(() => specifics);
                }])
                .default(RIUser.content_type, "", {
                    space: "user",
                    movingColumns: "is-show-show-hide"
                })
                .specific(RIUser.content_type, "", () => (resource : RIUser) => {
                    return {
                        userUrl: resource.path
                    };
                })
                .default(RIUsersService.content_type, "", {
                    space: "user",
                    movingColumns: "is-show-show-hide"
                })
                .default(RIBasicPool.content_type, "", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    proposalUrl: "",  // not used by default, but should be overridable
                    focus: "0"
                })
                .default(RIBasicPool.content_type, "create_proposal", {
                    space: "content",
                    movingColumns: "is-show-hide-hide"
                });
        }])
        .directive("adhMercatorWorkbench", ["adhConfig", (adhConfig) =>
            new MercatorWorkbench().createDirective(adhConfig)]);
};
