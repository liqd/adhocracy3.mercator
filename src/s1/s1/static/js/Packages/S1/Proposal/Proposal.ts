/// <reference path="../../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as AdhBadge from "../../Badge/Badge";
import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhPreliminaryNames from "../../PreliminaryNames/PreliminaryNames";
import * as AdhProcess from "../../Process/Process";
import * as AdhRate from "../../Rate/Rate";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../Util/Util";

import RICommentVersion from "../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIProposal from "../../../Resources_/adhocracy_s1/resources/s1/IProposal";
import RIProposalVersion from "../../../Resources_/adhocracy_s1/resources/s1/IProposalVersion";
import * as SICommentable from "../../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIDescription from "../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIMetadata from "../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIPool from "../../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SIRateable from "../../../Resources_/adhocracy_core/sheets/rate/IRateable";
import * as SITitle from "../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../../Resources_/adhocracy_core/sheets/versions/IVersionable";
import * as SIWorkflowAssignment from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/S1/Proposal";


export interface IScope extends angular.IScope {
    path : string;
    resource : RIProposalVersion;
    selectedState? : string;
    data : {
        title : string;
        description : string;
        rateCount : number;
        creator : string;
        creationDate : string;
        commentCount : number;
        assignments : AdhBadge.IBadge[];
        workflowState : string;
        decisionDate : string;
    };
}

export interface IFormScope extends IScope {
    poolPath : string;
    errors : AdhHttp.IBackendErrorItem[];
    showError : Function;
    submit : Function;
    cancel : Function;
    S1ProposalForm : angular.IFormController;
}


var bindPath = (
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhRate : AdhRate.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges,
    $q : angular.IQService
) => (
    scope : IScope,
    pathKey : string = "path"
) : void => {
    var getCommentCount = (resource) => {
        var commentableSheet : SICommentable.Sheet = resource.data[SICommentable.nick];

        return adhHttp.get(commentableSheet.post_pool, {
            content_type: RICommentVersion.content_type,
            depth: "all",
            tag: "LAST",
            count: true
        }).then((pool) => {
            return pool.data[SIPool.nick].count;
        });
    };

    scope.$watch(pathKey, (value : string) => {
        if (value) {
            // get resource
            $q.all([
                adhHttp.get(AdhUtil.parentPath(value)),
                adhHttp.get(value)
            ]).then((args : any) => {
                var item : RIProposal = args[0];
                var version : RIProposalVersion = args[1];

                scope.resource = version;

                var titleSheet : SITitle.Sheet = version.data[SITitle.nick];
                var descriptionSheet : SIDescription.Sheet = version.data[SIDescription.nick];
                var metadataSheet : SIMetadata.Sheet = version.data[SIMetadata.nick];
                var rateableSheet : SIRateable.Sheet = version.data[SIRateable.nick];
                var workflowAssignmentSheet : SIWorkflowAssignment.Sheet = item.data[SIWorkflowAssignment.nick];

                $q.all([
                    getCommentCount(version),
                    adhGetBadges(version),
                    adhRate.fetchAggregatedRates(rateableSheet.post_pool, version.path)
                ]).then((args : any) => {
                    var commentCount = args[0];
                    var badgeAssignments = args[1];
                    // FIXME: an adapter should take care of this
                    var ratesPro = args[2]["1"] || 0;
                    var ratesContra = args[2]["-1"] || 0;

                    scope.data = {
                        title: titleSheet.title,
                        description: descriptionSheet.description,
                        rateCount: ratesPro - ratesContra,
                        creator: metadataSheet.creator,
                        creationDate: metadataSheet.item_creation_date,
                        commentCount: commentCount,
                        assignments: badgeAssignments,
                        workflowState: workflowAssignmentSheet.workflow_state,
                        decisionDate: AdhProcess.getStateData(workflowAssignmentSheet, workflowAssignmentSheet.workflow_state).start_date
                    };
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
    proposalVersion.data[SITitle.nick] = new SITitle.Sheet({
        title: scope.data.title
    });
    proposalVersion.data[SIDescription.nick] = new SIDescription.Sheet({
        description: scope.data.description
    });
};

var postCreate = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    poolPath : string
) => {
    var proposal = new RIProposal({preliminaryNames: adhPreliminaryNames});
    proposal.parent = poolPath;
    var proposalVersion = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});

    proposalVersion.parent = proposal.path;
    proposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [proposal.first_version_path]
    });
    fill(scope, proposalVersion);

    return adhHttp.deepPost([proposal, proposalVersion]);
};

var postEdit = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : IScope,
    oldVersion : RIProposalVersion
) => {
    var proposalVersion = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
    proposalVersion.parent = AdhUtil.parentPath(oldVersion.path);
    proposalVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [oldVersion.path]
    });
    fill(scope, proposalVersion);

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
            path: "@"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(scope);
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
            path: "@"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(scope);
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
            poolPath: "@"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        link: (scope : IFormScope, element) => {
            scope.errors = [];
            scope.data = <any>{};
            scope.showError = adhShowError;

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.S1ProposalForm, () => {
                    return postCreate(adhHttp, adhPreliminaryNames)(scope, scope.poolPath)
                        .then((result) => {
                            $location.url(adhResourceUrlFilter(AdhUtil.parentPath(result[1].path)));
                        });
                });
            };

            scope.$on("$destroy", adhTopLevelState.on("targetMeeting", (meeting) => {
                scope.cancel = () => {
                    var fallback = adhResourceUrlFilter(scope.poolPath, meeting);
                    adhTopLevelState.goToCameFrom(fallback);
                };
            }));
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
            path: "@"
        },
        link: (scope : IFormScope, element) => {
            scope.errors = [];
            scope.showError = adhShowError;
            bindPath(adhHttp, adhPermissions, adhRate, adhTopLevelState, adhGetBadges, $q)(scope);

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.S1ProposalForm, () => {
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

export var listingDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        scope: {
            facets: "=?",
            update: "=?",
            sort: "=?",
            reverse: "=?",
            state: "@?",
            decisionDate: "@?",
            creator: "@?"
        },
        link: (scope) => {
            scope.contentType = RIProposalVersion.content_type;
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.params = {};

            if (scope.creator) {
                scope.params.creator = scope.creator.replace(adhConfig.rest_url, "").replace(/\/+$/, "");
                // processUrl is "/" in user space
                scope.params.depth = "all";
            }
            if (scope.state) {
                scope.params.workflow_state = scope.state;
                scope.params.depth = "all";
            }
            if (scope.decisionDate) {
                scope.params.decision_date = scope.decisionDate;
            }
        }
    };
};
