/// <reference path="../../../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMovingColumns from "../../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhResourceArea from "../../../ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../../Util/Util";
import * as AdhUserViews from "../../../User/Views";

import * as AdhMercator2015Workbench from "../../2015/Workbench/Workbench";

import RICommentVersion from "../../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIProcess from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IProcess";
import RIProposal from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IMercatorProposal";
import * as SIComment from "../../../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIMercatorSubResources from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IMercatorSubResources";
import * as SIWinnerInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IWinnerInfo";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/Mercator/2016/Workbench";


export var workbenchDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Workbench.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("view", scope));
        }
    };
};


var bindRedirectsToScope = (scope, adhConfig, adhResourceUrlFilter, $location) => {
    scope.redirectAfterProposalCancel = (resourcePath : string) => {
        // FIXME: use adhTopLevelState.goToCameFrom
        $location.url(adhResourceUrlFilter(resourcePath));
    };
    scope.redirectAfterProposalSubmit = (result : any[]) => {
        var proposal = _.find(result, (r) => r.content_type === RIProposal.content_type);
        if (typeof proposal !== "undefined") {
            $location.url(adhResourceUrlFilter(proposal.path));
        } else {
            throw 404;
        }
    };
};


export var proposalCreateColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhResourceUrlFilter : (path : string) => string,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
            bindRedirectsToScope(scope, adhConfig, adhResourceUrlFilter, $location);
        }
    };
};


export var proposalDetailColumnDirective = (
    $window : Window,
    adhTopLevelState : AdhTopLevelState.Service,
    adhPermissions : AdhPermissions.Service,
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
            adhPermissions.bindScope(scope, () => scope.proposalUrl && AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");
            adhPermissions.bindScope(scope, () => scope.proposalUrl, "proposalOptions");

            scope.delete = () => {
                column.$broadcast("triggerDelete", scope.proposalUrl);
            };

            scope.canModerate = () => scope.proposalOptions.canPut(SIWinnerInfo.nick);

            scope.print = () => {
                // only the focused column is printed
                adhTopLevelState.set("focus", 1);
                $window.print();
            };
        }
    };
};


export var proposalEditColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhResourceUrlFilter : (path : string) => string,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
            bindRedirectsToScope(scope, adhConfig, adhResourceUrlFilter, $location);
        }
    };
};


export var proposalModerateColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhResourceUrlFilter : (path : string) => string,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalModerateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
            bindRedirectsToScope(scope, adhConfig, adhResourceUrlFilter, $location);
        }
    };
};


export var proposalListingColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalListingColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
            scope.contentType = RIProposal.content_type;

            scope.sorts = [{
                key: "rates",
                name: "TR__RATES",
                index: "rates",
                reverse: true
            }, {
                key: "item_creation_date",
                name: "TR__CREATION_DATE",
                index: "item_creation_date",
                reverse: true
            }];

            var processUrl = adhTopLevelState.get("processUrl");
            adhHttp.get(processUrl).then((resource) => {
                var currentPhase = resource.data[SIWorkflow.nick].workflow_state;

                if (typeof scope.facets === "undefined") {
                    scope.facets = [{
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
                    }, {
                        key: "mercator_topic",
                        name: "TR__MERCATOR_TOPIC",
                        wide: true,
                        items: [
                            {key: "democracy_and_participation", name: "TR__MERCATOR_TOPIC_DEMOCRACY"},
                            {key: "arts_and_cultural_activities", name: "TR__MERCATOR_TOPIC_CULTURE"},
                            {key: "environment", name: "TR__MERCATOR_TOPIC_ENVIRONMENT"},
                            {key: "social_inclusion", name: "TR__MERCATOR_TOPIC_SOCIAL"},
                            {key: "migration", name: "TR__MERCATOR_TOPIC_MIGRATION"},
                            {key: "communities", name: "TR__MERCATOR_TOPIC_COMMUNITY"},
                            {key: "urban_development", name: "TR__MERCATOR_TOPIC_URBAN"},
                            {key: "education", name: "TR__MERCATOR_TOPIC_EDUCATION"},
                            {key: "other", name: "TR__MERCATOR_TOPIC_OTHER"}
                        ]
                    }];

                    if (currentPhase === "result") {
                        scope.facets.push({
                            key: "badge",
                            name: "TR__MERCATOR_BADGE_AWARDS_LABEL",
                            items: [
                                {key: "winning", name: "TR__MERCATOR_BADGE_WINNERS", enabled: true},
                                {key: "community", name: "TR__MERCATOR_BADGE_COMMUNITY_AWARD"}
                            ]
                        });
                    }
                }

                scope.sort = "item_creation_date";
                scope.setSort = (sort : string) => {
                    scope.sort = sort;
                };
                scope.initialLimit = 50;

                scope.ready = true;
            });
        }
    };
};


export var registerRoutes = (
    processType : string = "",
    context : string = ""
) => (adhResourceAreaProvider : AdhResourceArea.Provider) => {
    AdhMercator2015Workbench.registerRoutes(processType, context);

    adhResourceAreaProvider
        .default(RICommentVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specific(RICommentVersion, "", processType, context, ["adhHttp", "$q", (
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

                if (commentable.content_type === RIProposal.content_type) {
                    specifics["proposalUrl"] = specifics["commentableUrl"];
                    specifics["commentCloseUrl"] = specifics["commentableUrl"];
                } else {
                    var subResourceUrl = AdhUtil.parentPath(specifics["commentableUrl"]);
                    var proposalItemUrl = AdhUtil.parentPath(subResourceUrl);
                    return adhHttp.getNewestVersionPathNoFork(proposalItemUrl).then((proposalUrl) => {
                        specifics["proposalUrl"] = proposalUrl;
                        specifics["commentCloseUrl"] = proposalUrl;
                    });
                }
            })
            .then(() => specifics);
        }])
        .default(RIProcess, "", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide",
            proposalUrl: "",  // not used by default, but should be overridable
            focus: "0"
        })
        .default(RIProcess, "create_proposal", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide"
        })
        .specific(RIProcess, "create_proposal", processType, context, ["adhHttp",
            (adhHttp : AdhHttp.Service<any>) => {
                return (resource : RIProcess) => {
                    return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                        if (!options.POST) {
                            throw 401;
                        } else {
                            return {};
                        }
                    });
                };
            }]
        )
        .default(RIProposal, "", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide"
        })
        .specific(RIProposal, "", processType, context, () => (resource : RIProposal) => {
            return {
                proposalUrl: resource.path
            };
        })
        .default(RIProposal, "moderate", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-hide"
        })
        .specific(RIProposal, "moderate", processType, context, ["adhHttp", (adhHttp : AdhHttp.Service<any>) => {
            return (resource : RIProposal) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.canPut(SIWinnerInfo.nick)) {
                        throw 401;
                    } else {
                        return {
                            proposalUrl: resource.path
                        };
                    }
                });
            };
        }])
        .default(RIProposal, "edit", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-hide"
        })
        .specific(RIProposal, "edit", processType, context, ["adhHttp", (adhHttp : AdhHttp.Service<any>) => {
            return (resource : RIProposal) => {
                var poolPath = AdhUtil.parentPath(resource.path);

                return adhHttp.options(poolPath).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {
                            proposalUrl: resource.path
                        };
                    }
                });
            };
        }])
        .default(RIProposal, "blog", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide",
            proposalTab: "blog"
        })
        .specific(RIProposal, "blog", processType, context, () => (resource : RIProposal) => {
            return {
                proposalUrl: resource.path
            };
        })
        .default(RIProposal, "comments", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show"
        })
        .specific(RIProposal, "comments", processType, context, () => (resource : RIProposal) => {
            return {
                proposalUrl: resource.path,
                commentableUrl: resource.path,
                commentCloseUrl: resource.path
            };
        });

    _(SIMercatorSubResources.Sheet._meta.readable).forEach((section : string) => {
        adhResourceAreaProvider
            .default(RIProposal, "comments:" + section, processType, context, {
                space: "content",
                movingColumns: "is-collapse-show-show"
            })
            .specific(RIProposal, "comments:" + section, processType, context, () =>
                (resource : RIProposal) => {
                    return {
                        proposalUrl: resource.path,
                        commentableUrl: resource.data[SIMercatorSubResources.nick][section],
                        commentCloseUrl: resource.path
                    };
                }
            );
    }).value();

    AdhUserViews.registerRoutes(context)(adhResourceAreaProvider);
};
