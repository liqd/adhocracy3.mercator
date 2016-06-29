import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../../Util/Util";

import * as ResourcesBase from "../../ResourcesBase";

import * as SIBadgeable from "../../../../Resources_/adhocracy_core/sheets/badge/IBadgeable";
import * as SIComment from "../../../../Resources_/adhocracy_core/sheets/comment/IComment";
import RIComment from "../../../../Resources_/adhocracy_core/resources/comment/IComment";
import RICommentVersion from "../../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIProposal from "../../../../Resources_/adhocracy_core/resources/proposal/IProposal";
import RIProposalVersion from "../../../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";

var pkgLocation = "/Euth/IdeaCollection/Workbench";


export var workbenchDirective = (
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
        }
    };
};

export var proposalDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalDetailColumn.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("proposalUrl", scope));
            adhPermissions.bindScope(scope, () => scope.proposalUrl && AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");

            scope.column = column;
            var badgeAssignmentPoolPath;
            scope.$watch("proposalUrl", (proposalUrl) => {
                if (proposalUrl) {
                    adhHttp.get(proposalUrl).then((proposal) => {
                        badgeAssignmentPoolPath = proposal.data[SIBadgeable.nick].post_pool;
                    });
                }
            });
            adhPermissions.bindScope(scope, () => badgeAssignmentPoolPath, "badgeAssignmentPoolOptions");
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

export var processDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProcessDetailColumn.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");
            scope.contentType = RIProposalVersion.content_type;
        }
    };
};

export var registerRoutes = (
    processType : ResourcesBase.IResourceClass,
    context : string = ""
) => (adhResourceAreaProvider : AdhResourceArea.Provider) => {
    adhResourceAreaProvider
        .default(processType, "", processType.content_type, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .default(processType, "create_proposal", processType.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specific(processType, "create_proposal", processType.content_type, context, [
            "adhHttp", (adhHttp: AdhHttp.Service<any>) => (resource: ResourcesBase.IResource) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .defaultVersionable(RIProposal, RIProposalVersion, "edit", processType.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "edit", processType.content_type, context, [
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
        .defaultVersionable(RIProposal, RIProposalVersion, "image", processType.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "image", processType.content_type, context, [
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
        .defaultVersionable(RIProposal, RIProposalVersion, "", processType.content_type, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "", processType.content_type, context, [
            () => (item : RIProposal, version : RIProposalVersion) => {
                return {
                    proposalUrl: version.path
                };
            }])
        .defaultVersionable(RIProposal, RIProposalVersion, "comments", processType.content_type, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "comments", processType.content_type, context, [
            () => (item : RIProposal, version : RIProposalVersion) => {
                return {
                    commentableUrl: version.path,
                    commentCloseUrl: version.path,
                    proposalUrl: version.path
                };
            }])
        .defaultVersionable(RIComment, RICommentVersion, "", processType.content_type, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(RIComment, RICommentVersion, "", processType.content_type, context, ["adhHttp", "$q", (
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
