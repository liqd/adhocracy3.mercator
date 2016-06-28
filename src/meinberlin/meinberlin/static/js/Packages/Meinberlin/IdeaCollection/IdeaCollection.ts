/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhMovingColumns from "../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";

import RIComment from "../../../Resources_/adhocracy_core/resources/comment/IComment";
import RICommentVersion from "../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RIBuergerhaushaltProposal from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposal";
import RIBuergerhaushaltProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import RIGeoProposal from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";
import RIKiezkasseProcess from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";
import RIKiezkasseProposal from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposal";
import RIKiezkasseProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion";
import * as SIComment from "../../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIWorkflow from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

export var pkgLocation = "/Meinberlin/IdeaCollection";


export var workbenchDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/IdeaCollection.html",
        scope: {
            isBuergerhaushalt: "=?",
            isKiezkasse: "=?"
        },
        link: (scope) => {
            var processType = RIIdeaCollectionProcess;
            var proposalType = RIGeoProposal;
            var proposalVersionType = RIGeoProposalVersion;

            if (scope.isKiezkasse) {
                processType = RIKiezkasseProcess;
                proposalType = RIKiezkasseProposal;
                proposalVersionType = RIKiezkasseProposalVersion;
            } else if (scope.isBuergerhaushalt) {
                processType = RIBuergerhaushaltProcess;
                proposalType = RIBuergerhaushaltProposal;
                proposalVersionType = RIBuergerhaushaltProposalVersion;
            }

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

                if (contentType === processType.content_type) {
                    scope.views.process = view;
                } else {
                    scope.views.process = "default";
                }

                if (contentType === proposalType.content_type || contentType === proposalVersionType.content_type) {
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

export var proposalDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("proposalUrl", scope));
        }
    };
};

export var proposalCreateColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
        }
    };
};

export var proposalEditColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("proposalUrl", scope));
        }
    };
};

export var detailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/DetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
        }
    };
};

export var editColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/EditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
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


export var registerRoutesFactory = (
    ideaCollection : string
) => (
    processType : string = "",
    context : string = ""
) => (adhResourceAreaProvider : AdhResourceArea.Provider) => {
    var ideaCollectionType = RIIdeaCollectionProcess;
    var proposalType = RIGeoProposal;
    var proposalVersionType = RIGeoProposalVersion;

    if (ideaCollection === RIKiezkasseProcess.content_type) {
        ideaCollectionType = RIKiezkasseProcess;
        proposalType = RIKiezkasseProposal;
        proposalVersionType = RIKiezkasseProposalVersion;
    } else if (ideaCollection === RIBuergerhaushaltProcess.content_type) {
        ideaCollectionType = RIBuergerhaushaltProcess;
        proposalType = RIBuergerhaushaltProposal;
        proposalVersionType = RIBuergerhaushaltProposalVersion;
    }

    adhResourceAreaProvider
        .default(ideaCollectionType, "", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .default(ideaCollectionType, "edit", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .specific(ideaCollectionType, "edit", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (resource) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.PUT) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .default(ideaCollectionType, "create_proposal", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specific(ideaCollectionType, "create_proposal", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (resource) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .defaultVersionable(proposalType, proposalVersionType, "edit", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(proposalType, proposalVersionType, "edit", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (item, version) => {
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
        .defaultVersionable(proposalType, proposalVersionType, "", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(proposalType, proposalVersionType, "", processType, context, [
            () => (item, version) => {
                return {
                    proposalUrl: version.path
                };
            }])
        .defaultVersionable(proposalType, proposalVersionType, "comments", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(proposalType, proposalVersionType, "comments", processType, context, [
            () => (item, version) => {
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
