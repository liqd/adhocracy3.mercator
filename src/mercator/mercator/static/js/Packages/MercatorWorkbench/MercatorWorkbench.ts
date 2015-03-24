/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import AdhAbuse = require("../Abuse/Abuse");
import AdhComment = require("../Comment/Comment");
import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhListing = require("../Listing/Listing");
import AdhMercatorProposal = require("../MercatorProposal/MercatorProposal");
import AdhMovingColumns = require("../MovingColumns/MovingColumns");
import AdhPermissions = require("../Permissions/Permissions");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhUser = require("../User/User");
import AdhUtil = require("../Util/Util");

import RIPoolWithAssets = require("../../Resources_/adhocracy_core/resources/asset/IPoolWithAssets");
import RICommentVersion = require("../../Resources_/adhocracy_core/resources/comment/ICommentVersion");
import RIMercatorProposalVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposalVersion");
import SIComment = require("../../Resources_/adhocracy_core/sheets/comment/IComment");

var pkgLocation = "/MercatorWorkbench";


export var mercatorWorkbenchDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MercatorWorkbench.html"
    };
};


var bindRedirectsToScope = (scope, adhConfig, $location) => {
    // FIXME: use dependency injection instead
    var adhResourceUrl = AdhResourceArea.resourceUrl(adhConfig);

    scope.redirectAfterProposalCancel = (resourcePath : string) => {
        // FIXME: use adhTopLevelState.redirectToCameFrom
        $location.url(adhResourceUrl(resourcePath));
    };
    scope.redirectAfterProposalSubmit = (result : {path : string }[]) => {
        var proposalVersionPath = result.slice(-1)[0].path;
        $location.url(adhResourceUrl(proposalVersionPath));
    };
};


export var commentColumnDirective = (bindVariablesAndClear : AdhMovingColumns.IBindVariablesAndClear, adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/CommentColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            bindVariablesAndClear(scope, column, ["proposalUrl", "commentableUrl"]);
            scope.frontendOrderPredicate = (id) => id;
            scope.frontendOrderReverse = true;
        }
    };
};


export var mercatorProposalCreateColumnDirective = (
    bindVariablesAndClear : AdhMovingColumns.IBindVariablesAndClear,
    adhConfig : AdhConfig.IService,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MercatorProposalCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            bindVariablesAndClear(scope, column, ["platformUrl"]);
            bindRedirectsToScope(scope, adhConfig, $location);
        }
    };
};


export var mercatorProposalDetailColumnDirective = (
    bindVariablesAndClear : AdhMovingColumns.IBindVariablesAndClear,
    adhPermissions : AdhPermissions.Service,
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MercatorProposalDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            bindVariablesAndClear(scope, column, ["platformUrl", "proposalUrl"]);
            adhPermissions.bindScope(scope, () => scope.proposalUrl && AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");

            scope.delete = () => {
                column.$broadcast("triggerDelete", scope.proposalUrl);
            };
        }
    };
};


export var mercatorProposalEditColumnDirective = (
    bindVariablesAndClear : AdhMovingColumns.IBindVariablesAndClear,
    adhConfig : AdhConfig.IService,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MercatorProposalEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            bindVariablesAndClear(scope, column, ["platformUrl", "proposalUrl"]);
            bindRedirectsToScope(scope, adhConfig, $location);
        }
    };
};


export var mercatorProposalListingColumnDirective = (
    bindVariablesAndClear : AdhMovingColumns.IBindVariablesAndClear,
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MercatorProposalListingColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            bindVariablesAndClear(scope, column, ["platformUrl", "proposalUrl"]);
            scope.contentType = RIMercatorProposalVersion.content_type;
            scope.shared.facets = [{
                key: "mercator_location",
                name: "TR__MERCATOR_PROPOSAL_LOCATION_LABEL",
                items: [
                    {key: "specific", name: "TR__MERCATOR_PROPOSAL_SPECIFIC"},
                    {key: "online", name: "TR__ONLINE"},
                    {key: "linked_to_ruhr", name: "TR__MERCATOR_PROPOSAL_LOCATION_LINKAGE_TO_RUHR"}
                ]
            }, {
                key: "mercator_requested_funding",
                name: "TR__MERCATOR_PROPOSAL_REQUESTED_FUNDING",
                items: [
                    {key: "5000", name: "0 - 5000 €"},
                    {key: "10000", name: "5000 - 10000 €"},
                    {key: "20000", name: "10000 - 20000 €"},
                    {key: "50000", name: "20000 - 50000 €"}
                ]
            }];
            scope.shared.sort = "rates";
            scope.shared.setSort = (sort : string) => {
                scope.shared.sort = sort;
            };
            scope.frontendOrderReverse = true;
        }
    };
};


export var moduleName = "adhMercatorWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAbuse.moduleName,
            AdhComment.moduleName,
            AdhHttp.moduleName,
            AdhListing.moduleName,
            AdhMercatorProposal.moduleName,
            AdhMovingColumns.moduleName,
            AdhPermissions.moduleName,
            AdhResourceArea.moduleName,
            AdhUser.moduleName
        ])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .default(RICommentVersion.content_type, "", "", {
                    space: "content",
                    movingColumns: "is-collapse-show-show"
                })
                .specific(RICommentVersion.content_type, "", "", ["adhHttp", "$q", (
                    adhHttp : AdhHttp.Service<any>,
                    $q : angular.IQService
                ) => (resource : RICommentVersion) => {
                    var specifics = {};
                    specifics["commentUrl"] = resource.path;

                    var getCommentableUrl = (resource) : angular.IPromise<any> => {
                        if (resource.content_type !== RICommentVersion.content_type) {
                            return $q.when(resource);
                        } else {
                            var url = resource.data[SIComment.nick].refers_to;
                            return adhHttp.get(url).then(getCommentableUrl);
                        }
                    };

                    return getCommentableUrl(resource).then((commentable) => {
                        specifics["commentableUrl"] = commentable.path;

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
                .default(RIPoolWithAssets.content_type, "", "", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    proposalUrl: "",  // not used by default, but should be overridable
                    focus: "0"
                })
                .default(RIPoolWithAssets.content_type, "create_proposal", "", {
                    space: "content",
                    movingColumns: "is-show-hide-hide"
                })
                .specific(RIPoolWithAssets.content_type, "create_proposal", "", ["adhHttp", "adhUser",
                    (adhHttp : AdhHttp.Service<any>, adhUser) => {
                        return (resource : RIPoolWithAssets) => {
                            return adhUser.ready.then(() => {
                                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                                    if (!options.POST) {
                                        throw 401;
                                    } else {
                                        return {};
                                    }
                                });
                            });
                        };
                    }]
                );
        }])
        .config(["adhProcessProvider", (adhProcessProvider) => {
            adhProcessProvider.templateFactories[""] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-mercator-workbench></adh-mercator-workbench>");
            }];
        }])
        .directive("adhMercatorWorkbench", ["adhConfig", mercatorWorkbenchDirective])
        .directive("adhCommentColumn", ["adhBindVariablesAndClear", "adhConfig", commentColumnDirective])
        .directive("adhMercatorProposalCreateColumn", ["adhBindVariablesAndClear", "adhConfig", "$location",
            mercatorProposalCreateColumnDirective])
        .directive("adhMercatorProposalDetailColumn", ["adhBindVariablesAndClear", "adhPermissions", "adhConfig",
            mercatorProposalDetailColumnDirective])
        .directive("adhMercatorProposalEditColumn", ["adhBindVariablesAndClear", "adhConfig", "$location",
            mercatorProposalEditColumnDirective])
        .directive("adhMercatorProposalListingColumn", ["adhBindVariablesAndClear", "adhConfig", mercatorProposalListingColumnDirective]);
};
