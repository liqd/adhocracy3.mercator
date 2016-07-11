/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";

import RIComment from "../../../Resources_/adhocracy_core/resources/comment/IComment";
import RICommentVersion from "../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import * as SIComment from "../../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIWorkflow from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

export var pkgLocation = "/IdeaCollection/Workbench";


export var workbenchDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Workbench.html",
        scope: {
            processOptions: "="
        },
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("view", scope));
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("contentType", scope));
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
        link: (scope) => {
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
        link: (scope) => {
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
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("proposalUrl", scope));
        }
    };
};

export var proposalImageColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl,
    adhParentPath
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalImageColumn.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("proposalUrl", scope));
            scope.goBack = () => {
                var url = adhResourceUrl(adhParentPath(scope.proposalUrl));
                adhTopLevelState.goToCameFrom(url);
            };
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
        link: (scope) => {
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
    ideaCollection,
    proposalType,
    proposalVersionType
) => (
    context : string = ""
) => (adhResourceAreaProvider : AdhResourceArea.Provider) => {

    adhResourceAreaProvider
        .default(ideaCollection, "", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .default(ideaCollection, "edit", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .specific(ideaCollection, "edit", ideaCollection.content_type, context, [
            "adhHttp", (adhHttp : AdhHttp.Service) => (resource) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.PUT) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .default(ideaCollection, "create_proposal", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specific(ideaCollection, "create_proposal", ideaCollection.content_type, context, [
            "adhHttp", (adhHttp : AdhHttp.Service) => (resource) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .defaultVersionable(proposalType, proposalVersionType, "edit", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(proposalType, proposalVersionType, "edit", ideaCollection.content_type, context, [
            "adhHttp", (adhHttp : AdhHttp.Service) => (item, version) => {
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
        .defaultVersionable(proposalType, proposalVersionType, "image", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(proposalType, proposalVersionType, "image", ideaCollection.content_type, context, [
            "adhHttp", (adhHttp : AdhHttp.Service) => (item, version) => {
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
        .defaultVersionable(proposalType, proposalVersionType, "", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(proposalType, proposalVersionType, "", ideaCollection.content_type, context, [
            () => (item, version) => {
                return {
                    proposalUrl: version.path
                };
            }])
        .defaultVersionable(proposalType, proposalVersionType, "comments", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(proposalType, proposalVersionType, "comments", ideaCollection.content_type, context, [
            () => (item, version) => {
                return {
                    commentableUrl: version.path,
                    commentCloseUrl: version.path,
                    proposalUrl: version.path
                };
            }])
        .defaultVersionable(RIComment, RICommentVersion, "", ideaCollection.content_type, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(RIComment, RICommentVersion, "", ideaCollection.content_type, context, ["adhHttp", "$q", (
            adhHttp : AdhHttp.Service,
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
