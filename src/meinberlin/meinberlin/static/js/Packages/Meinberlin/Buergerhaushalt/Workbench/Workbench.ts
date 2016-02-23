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
import RIBuergerhaushaltProcess from "../../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RIProposal from "../../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposal";
import RIProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import * as SIComment from "../../../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

export var pkgLocation = "/Meinberlin/Buergerhaushalt/Workbench";


export var buergerhaushaltWorkbenchDirective = (
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

                if (contentType === RIBuergerhaushaltProcess.content_type) {
                    scope.views.process = view;
                } else {
                    scope.views.process = "default";
                }

                if (contentType === RIProposal.content_type || contentType === RIProposalVersion.content_type) {
                    scope.views.proposal = view;
                } else {
                    scope.views.proposal = "default";
                }
            });

            scope.$watch("processUrl", (processUrl) => {
                if (processUrl) {
                    adhHttp.get(processUrl).then((resource) => {
                        scope.currentPhase = resource.data[SIWorkflow.nick].workflow_state;
                    });
                }
            });
        }

    };
};

export var buergerhaushaltProposalDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/BuergerhaushaltProposalDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
            adhPermissions.bindScope(scope, () => scope.proposalUrl && AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");
        }
    };
};

export var buergerhaushaltProposalCreateColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/BuergerhaushaltProposalCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
        }
    };
};

export var buergerhaushaltProposalEditColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/BuergerhaushaltProposalEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
        }
    };
};

export var buergerhaushaltDetailColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/BuergerhaushaltDetailColumn.html",
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
        .default(RIBuergerhaushaltProcess, "", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .default(RIBuergerhaushaltProcess, "create_proposal", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specific(RIBuergerhaushaltProcess, "create_proposal", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (resource : RIBuergerhaushaltProcess) => {
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
            }])
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
                    var url = resource.data[SIComment.nick].refers_to;
                    return adhHttp.get(url).then(getCommentableUrl);
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

export var addProposalButton = (
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
        }
    };
};
