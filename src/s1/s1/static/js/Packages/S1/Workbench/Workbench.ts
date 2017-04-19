/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../../Core/Config/Config";
import * as AdhHttp from "../../Core/Http/Http";
import * as AdhPermissions from "../../Core/Permissions/Permissions";
import * as AdhProcess from "../../Core/Process/Process";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../../Core/TopLevelState/TopLevelState";
import * as AdhUtil from "../../Core/Util/Util";

import * as ResourcesBase from "../../ResourcesBase";

import RIComment from "../../../Resources_/adhocracy_core/resources/comment/IComment";
import RICommentVersion from "../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIS1Process from "../../../Resources_/adhocracy_s1/resources/s1/IProcess";
import RIProposal from "../../../Resources_/adhocracy_s1/resources/s1/IProposal";
import RIProposalVersion from "../../../Resources_/adhocracy_s1/resources/s1/IProposalVersion";
import * as SIComment from "../../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIDescription from "../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SITitle from "../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflowAssignment from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

export var pkgLocation = "/S1/Workbench";


export var s1WorkbenchDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Workbench.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("view", scope));
            scope.$on("$destroy", adhTopLevelState.bind("meeting", scope));
            scope.$on("$destroy", adhTopLevelState.bind("landingPage", scope));
        }
    };
};


export var s1CurrentColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/CurrentColumn.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.contentType = RIProposalVersion.content_type;

            scope.$watch("processUrl", (processUrl : string) => {
                adhHttp.get(processUrl).then((process : ResourcesBase.IResource) => {
                    var workflowState = SIWorkflowAssignment.get(process).workflow_state;
                    var decisionDate = AdhUtil.deepPluck(
                        AdhProcess.getStateData(SIWorkflowAssignment.get(process), "result"), ["start_date"]);

                    if (workflowState === "propose") {
                        scope.proposalState = "proposed";
                    } else if (workflowState === "select") {
                        scope.proposalState = "voteable";
                    } else {
                        scope.proposalState = "[\"any\", [\"selected\", \"rejected\"]]";
                        scope.decisionDate = decisionDate;
                    }
                });
            });

            scope.sorts = [{
                key: "item_creation_date",
                name: "TR__CREATION_DATE",
                index: "item_creation_date",
                reverse: true
            }, {
                key: "rates",
                name: "TR__RATES",
                index: "rates",
                reverse: true
            }, {
                key: "controversiality",
                name: "TR__CONTROVERSIALITY",
                index: "controversiality",
                reverse: true
            }, {
                key: "comments",
                name: "TR__COMMENTS_TOTAL",
                index: "comments",
                reverse: true
            }];
        }
    };
};


export var s1NextColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/NextColumn.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.contentType = RIProposalVersion.content_type;

            scope.$watch("processUrl", (processUrl : string) => {
                adhHttp.get(processUrl).then((process : ResourcesBase.IResource) => {
                    scope.processState = SIWorkflowAssignment.get(process).workflow_state;

                    if (scope.processState === "propose") {
                        scope.proposalState = "none";
                    } else {
                        scope.proposalState = "proposed";
                    }
                });
            });

            scope.sorts = [{
                key: "item_creation_date",
                name: "TR__CREATION_DATE",
                index: "item_creation_date",
                reverse: true
            }, {
                key: "rates",
                name: "TR__RATES",
                index: "rates",
                reverse: true
            }, {
                key: "controversiality",
                name: "TR__CONTROVERSIALITY",
                index: "controversiality",
                reverse: true
            }, {
                key: "comments",
                name: "TR__COMMENTS_TOTAL",
                index: "comments",
                reverse: true
            }];
        }
    };
};


export var s1ArchiveColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ArchiveColumn.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.contentType = RIProposalVersion.content_type;

            scope.$watch("processUrl", (processUrl : string) => {
                adhHttp.get(processUrl).then((process : ResourcesBase.IResource) => {
                    scope.proposalState = "[\"any\", [\"selected\", \"rejected\"]]";

                    var workflowState = SIWorkflowAssignment.get(process).workflow_state;
                    if (workflowState === "result") {
                        var decisionDate = AdhUtil.deepPluck(
                            AdhProcess.getStateData(SIWorkflowAssignment.get(process), "result"), ["start_date"]);
                        scope.decisionDate = "[\"lt\",  \"" + decisionDate + "\"]";
                    }
                });
            });

            scope.facets = [{
                key: "workflow_state",
                name: "TR__S1_FACET_STATE_HEADER",
                items: [
                    {key: "selected", name: "TR__S1_FACET_SELECTED"},
                    {key: "rejected", name: "TR__S1_FACET_REJECTED"}
                ]
            }];

            scope.sorts = [{
                key: "item_creation_date",
                name: "TR__CREATION_DATE",
                index: "item_creation_date",
                reverse: true
            }, {
                key: "rates",
                name: "TR__RATES",
                index: "rates",
                reverse: true
            }, {
                key: "controversiality",
                name: "TR__CONTROVERSIALITY",
                index: "controversiality",
                reverse: true
            }, {
                key: "comments",
                name: "TR__COMMENTS_TOTAL",
                index: "comments",
                reverse: true
            }];
        }
    };
};


export var s1ProposalDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalDetailColumn.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("meeting", scope));
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("proposalUrl", scope));
            adhPermissions.bindScope(scope, () => scope.proposalUrl && AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");
        }
    };
};

export var s1ProposalCreateColumnDirective = (
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

export var s1ProposalEditColumnDirective = (
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

export var s1LandingDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Landing.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.on("processUrl", (processUrl) => {
                adhHttp.get(processUrl).then((process) => {
                    scope.processTitle = SITitle.get(process).title;
                    scope.processShortDescription = SIDescription.get(process).short_description;
                    scope.processDescription = SIDescription.get(process).description;
                });
            }));
        }
    };
};


/**
 *         | proposed | voteable | selected | rejected
 * ---------------------------------------------------
 * propose | current  | -        | archive  | archive
 * select  | next     | current  | archive  | archive
 * result  | next     | -        | cur/arc  | cur/arc
 */
var getMeeting = (proposal : ResourcesBase.IResource, process : ResourcesBase.IResource) => {
    var processState = SIWorkflowAssignment.get(process).workflow_state;
    var proposalState = SIWorkflowAssignment.get(proposal).workflow_state;

    if (proposalState === "proposed") {
        return processState === "propose" ? "current" : "next";
    } else if (proposalState === "voteable") {
        return "current";
    } else if (processState !== "result") {
        return "archive";
    } else {
        var processDecisionDate = AdhUtil.deepPluck(
            AdhProcess.getStateData(SIWorkflowAssignment.get(process), "result"), ["start_date"]);
        var proposalDecisionDate = AdhUtil.deepPluck(
            AdhProcess.getStateData(SIWorkflowAssignment.get(proposal), proposalState), ["start_date"]);

        return (proposalDecisionDate <= processDecisionDate) ? "archive" : "current";
    }
};


export var registerRoutes = (
    processType : string = "",
    context : string = ""
) => (adhResourceAreaProvider : AdhResourceArea.Provider) => {
    adhResourceAreaProvider
        .default(RIS1Process, "", processType, context, {
            space: "content",
            landingPage: "true"
        })
        .default(RIS1Process, "current", processType, context, {
            space: "content",
            meeting: "current",
            movingColumns: "is-show-hide-hide"
        })
        .default(RIS1Process, "create-proposal", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .specific(RIS1Process, "create-proposal", processType, context,
            ["adhHttp", (adhHttp : AdhHttp.Service) => {
                return (resource : ResourcesBase.IResource) => {
                    return adhHttp.options(resource.path).then((options) => {
                        if (options.POST) {
                            var processState = SIWorkflowAssignment.get(resource).workflow_state;
                            return {
                                targetMeeting: processState === "propose" ? "current" : "next"
                            };
                        } else {
                            throw 401;
                        }
                    });
                };
            }])
        .default(RIS1Process, "archive", processType, context, {
            space: "content",
            meeting: "archive",
            movingColumns: "is-show-hide-hide"
        })
        .default(RIS1Process, "next", processType, context, {
            space: "content",
            meeting: "next",
            movingColumns: "is-show-hide-hide"
        })

        .defaultVersionable(RIProposal, RIProposalVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "", processType, context, () => {
            return (
                item : ResourcesBase.IResource,
                version : ResourcesBase.IResource,
                isVersion : boolean,
                process : ResourcesBase.IResource
            ) => {
                return {
                    proposalUrl: version.path,
                    meeting: getMeeting(item, process)
                };
            };
        })
        .defaultVersionable(RIProposal, RIProposalVersion, "edit", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "edit", processType, context,
            ["adhHttp", (adhHttp : AdhHttp.Service) => {
                return (
                    item : ResourcesBase.IResource,
                    version : ResourcesBase.IResource,
                    isVersion : boolean,
                    process : ResourcesBase.IResource
                ) => {
                    return adhHttp.options(item.path).then((options) => {
                        if (options.POST) {
                            return {
                                proposalUrl: version.path,
                                meeting: getMeeting(item, process)
                            };
                        } else {
                            throw 401;
                        }
                    });
                };
            }])
        .defaultVersionable(RIProposal, RIProposalVersion, "comments", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(RIProposal, RIProposalVersion, "comments", processType, context, () => {
            return (
                item : ResourcesBase.IResource,
                version : ResourcesBase.IResource,
                isVersion : boolean,
                process : ResourcesBase.IResource
            ) => {
                return {
                    proposalUrl: version.path,
                    commentableUrl: version.path,
                    commentCloseUrl: version.path,
                    meeting: getMeeting(item, process)
                };
            };
        })
        .defaultVersionable(RIComment, RICommentVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specificVersionable(RIComment, RICommentVersion, "", processType, context, ["adhHttp", "$q", (
            adhHttp : AdhHttp.Service,
            $q : angular.IQService
        ) => {
            var getCommentableUrl = (resource) : angular.IPromise<any> => {
                if (resource.content_type !== RICommentVersion.content_type) {
                    return $q.when(resource);
                } else {
                    var url = SIComment.get(resource).refers_to;
                    return adhHttp.get(url).then(getCommentableUrl);
                }
            };

            return (item : ResourcesBase.IResource, version : ResourcesBase.IResource) => {
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
