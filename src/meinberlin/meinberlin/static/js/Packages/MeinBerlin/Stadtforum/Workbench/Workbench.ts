/// <reference path="../../../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMovingColumns from "../../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhResourceArea from "../../../ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../../Util/Util";

import RIComment from "../../../../Resources_/adhocracy_core/resources/comment/IComment";
import RICommentVersion from "../../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
/* FIXME: import RIStadtforumProcess from "../../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IProcess";
import RIProposal from "../../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IProposal";
import RIProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IProposalVersion";
import * as SIComment from "../../../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment"; */

var pkgLocation = "/MeinBerlin/Stadtforum/Workbench";


export var stadtforumWorkbenchDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Workbench.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("view", scope));
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("contentType", scope));

            scope.views = {
                process: "default",
                proposal: "default",
                comment: "default"
            };

            scope.$watchGroup(["contentType", "view"], (values) => {
                var contentType = values[0];
                var view = values[1];
                /* FIXME:
                if (contentType === RIStadtforumProcess.content_type) {
                    scope.views.process = view;
                } else {
                    scope.views.process = "default";
                }

                if (contentType === RIProposal.content_type || contentType === RIProposalVersion.content_type) {
                    scope.views.proposal = view;
                } else {
                    scope.views.proposal = "default";
                } */
            });

            scope.$watch("processUrl", (processUrl) => {
                if (processUrl) {
                    adhHttp.get(processUrl).then((resource) => {
                        // FIXME: scope.currentPhase = resource.data[SIWorkflow.nick].workflow_state;
                    });
                }
            });
        }

    };
};

export var stadtforumProposalDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/StadtforumProposalDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
            adhPermissions.bindScope(scope, () => scope.proposalUrl && AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");
        }
    };
};

export var stadtforumProposalCreateColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/StadtforumProposalCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
        }
    };
};

export var stadtforumProposalEditColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/StadtforumProposalEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
        }
    };
};

export var stadtforumDetailColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/StadtforumDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
            scope.shared = column.$scope.shared;
            scope.showMap = (isShowMap) => {
                scope.shared.isShowMap = isShowMap;
            };
        }
    };
};

export var stadtforumEditColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/StadtforumEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
        }
    };
};

export var registerRoutes = (
    processType : string = "",
    context : string = ""
) => (adhResourceAreaProvider : AdhResourceArea.Provider) => {
    adhResourceAreaProvider
        /* FIXME:
        .default(RIStadtforumProcess, "", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .default(RIStadtforumProcess, "edit", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .specific(RIStadtforumProcess, "edit", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (resource : RIStadtforumProcess) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.PUT) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .default(RIStadtforumProcess, "create_proposal", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specific(RIStadtforumProcess, "create_proposal", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (resource : RIStadtforumProcess) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .defaultVersionable(RIProposal, RIProposalVersion, "edit", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "edit", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (item : RIProposal, version : RIProposalVersion) => {
                return adhHttp.options(item.path).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {
                            proposalUrl: version.path
                        };
                    }
                });
            }])
        .defaultVersionable(RIProposal, RIProposalVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "", processType, context, [
            () => (item : RIProposal, version : RIProposalVersion) => {
                return {
                    proposalUrl: version.path
                };
            }])
        .defaultVersionable(RIProposal, RIProposalVersion, "comments", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "comments", processType, context, [
            () => (item : RIProposal, version : RIProposalVersion) => {
                return {
                    commentableUrl: version.path,
                    commentCloseUrl: version.path,
                    proposalUrl: version.path
                };
            }]) */
        .defaultVersionable(RIComment, RICommentVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(RIComment, RICommentVersion, "", processType, context, ["adhHttp", "$q", (
            adhHttp : AdhHttp.Service<any>,
            $q : angular.IQService
        ) => {
            var getCommentableUrl = (resource) : angular.IPromise<any> => {
                if (resource.content_type !== RICommentVersion.content_type) {
                    return $q.when(resource);
                } else {
                    /* FIXME: var url = resource.data[SIComment.nick].refers_to;
                    return adhHttp.get(url).then(getCommentableUrl); */
                }
            };

            return (item : RIComment, version : RICommentVersion) => {
                return getCommentableUrl(version).then((commentable) => {
                    return {
                        commentableUrl: commentable.path,
                        commentCloseUrl: commentable.path,
                        proposalUrl: commentable.path
                    };
                });
            };
        }]);
};
