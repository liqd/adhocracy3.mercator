/// <reference path="../../../../../lib2/types/lodash.d.ts"/>
/// <reference path="../../../../../lib2/types/moment.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMovingColumns from "../../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhProcess from "../../../Process/Process";
import * as AdhUtil from "../../../Util/Util";

import RIBuergerhaushaltProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import RIGeoProposalVersion from "../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIKiezkasseProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion";


import * as SIBadge from "../../../../Resources_/adhocracy_core/sheets/badge/IBadge";
import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIName from "../../../../Resources_/adhocracy_core/sheets/name/IName";
import * as SIPool from "../../../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/Meinberlin/IdeaCollection/Process";


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    $q : angular.IQService
) => {
    var extractBadge = (badge) => {
        return {
            name: badge.data[SIName.nick].name,
            title: badge.data[SITitle.nick].title,
            path: badge.path,
            groups: badge.data[SIBadge.nick].groups
        };
    };

    var extractGroup = (group) => {
        return {
            name: group.data[SIName.nick].name,
            title: group.data[SITitle.nick].title,
            path: group.path
        };
    };

    var collectBadgesByGroup = (groupPaths, badges) => {
        var badgesByGroup = {};
        _.forEach(groupPaths, (groupPath) => {
            badgesByGroup[groupPath] = [];
            _.forOwn(badges, (badge) => {
                if (_.includes(badge.groups, groupPath)) {
                    badgesByGroup[groupPath].push(badge.path);
                }
            });
        });
        return badgesByGroup;
    };

    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@",
            hasSwotLabels: "=?",
            isBuergerhaushalt: "=?",
            isKiezkasse: "=?"
        },
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            if (scope.hasSwotLabels) {
                scope.facets = [];
                var params = {
                    elements: "content",
                    depth: 4,
                    content_type: "adhocracy_core.resources.badge.IBadge"
                };
                adhHttp.get(scope.path, params).then((response) => {
                    var badgePaths = _.map(response.data[SIPool.nick].elements, "path");
                    $q.all(_.map(badgePaths, (b : string) => adhHttp.get(b).then(extractBadge))).then((badges : any) => {
                        scope.badges = _.keyBy(badges, "path");
                        var groupPaths: string[] = _.union.apply(_, _.map(badges, "groups"));
                        return $q.all(_.map(groupPaths, (g) => adhHttp.get(g))).then((result) => {
                            scope.badgeGroups = _.keyBy(_.map(result, extractGroup), "path");
                            scope.badgesByGroup = collectBadgesByGroup(groupPaths, badges);
                            _.forOwn(scope.badgeGroups, (v, group) => {
                                adhHttp.get(group).then((g) => {
                                    var items = [];
                                    _.forOwn(scope.badgesByGroup[group], (badge) => {
                                        adhHttp.get(badge).then((b) => {
                                            items.push({
                                                key: extractBadge(b).name,
                                                name: extractBadge(b).title
                                            });
                                        });
                                    });
                                    scope.facets.push({
                                        key: extractGroup(g).name,
                                        name: extractGroup(g).title,
                                        items: items
                                    });
                                });
                            });
                        });
                    });
                });

/*                scope.facets = [{
                    key: "badge",
                    name: "TR__MEINBERLIN_IDEA_COLLECTION_CATEGORIES_LABEL",
                    items: [
                        { key: "strengths", name: "TR__MEINBERLIN_IDEA_COLLECTION_CATEGORIES_STRENGTHS" },
                        { key: "weaknesses", name: "TR__MEINBERLIN_IDEA_COLLECTION_CATEGORIES_WEAKNESSES" },
                        { key: "proposals", name: "TR__MEINBERLIN_IDEA_COLLECTION_CATEGORIES_PROPOSALS" },
                        { key: "visions", name: "TR__MEINBERLIN_IDEA_COLLECTION_CATEGORIES_VISIONS" }
                    ]
                }];*/
            }

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
            scope.sort = "item_creation_date";

            scope.$watch("path", (value : string) => {
                if (value) {
                    adhHttp.get(value).then((resource) => {
                        var sheet = resource.data[SIWorkflow.nick];
                        var stateName = sheet.workflow_state;
                        scope.currentPhase = AdhProcess.getStateData(sheet, stateName);

                        var locationUrl = resource.data[SILocationReference.nick].location;
                        adhHttp.get(locationUrl).then((location) => {
                            var polygon = location.data[SIMultiPolygon.nick].coordinates[0][0];
                            scope.polygon =  polygon;
                        });

                        if (scope.isBuergerhaushalt) {
                            scope.contentType = RIBuergerhaushaltProposalVersion.content_type;
                        } else if (scope.isKiezkasse) {
                            scope.contentType = RIKiezkasseProposalVersion.content_type;
                        } else {
                            scope.contentType = RIGeoProposalVersion.content_type;
                        }
                    });
                }
            });
            adhPermissions.bindScope(scope, () => scope.path);
        }
    };
};


export var editDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhShowError,
    adhSubmitIfValid,
    moment
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Edit.html",
        scope: {
            path: "@"
        },
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            var process;
            scope.data = {};
            scope.showError = adhShowError;
            adhHttp.get(scope.path).then((resource) => {
                process = resource;
                scope.data.title = process.data[SITitle.nick].title;

                var sheet = process.data[SIWorkflow.nick];
                _.forEach(["announce", "draft", "participate", "evaluate", "result", "closed"], (stateName : string) => {
                    var data = AdhProcess.getStateData(sheet, stateName);
                    scope.data[stateName + "_description"] = data.description;
                    scope.data[stateName + "_start_date"] = moment(data.start_date).format("YYYY-MM-DD");
                });

                scope.data.currentWorkflowState = process.data[SIWorkflow.nick].workflow_state;
            });
            adhHttp.options(scope.path, {importOptions: false}).then((raw) => {
                // extract available transitions
                scope.data.availableWorkflowStates = AdhUtil.deepPluck(raw, [
                    "data", "PUT", "request_body", "data", SIWorkflow.nick, "workflow_state"]);
            });
            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.ideaCollectionProcessForm, () => {
                    process.data[SITitle.nick].title = scope.data.title;
                    process.data[SIName.nick] = undefined;
                    process.data[SIImageReference.nick] = undefined;

                    if (_.includes(scope.data.availableWorkflowStates, scope.data.workflowState)) {
                        process.data[SIWorkflow.nick] = {
                            workflow_state: scope.data.workflowState
                        };
                    } else {
                        process.data[SIWorkflow.nick] = {};
                    }

                    process.data[SIWorkflow.nick].state_data = _.map(
                        ["announce", "draft", "participate", "evaluate", "result", "closed"], (stateName : string) => {
                        return {
                            name: stateName,
                            description: scope.data[stateName + "_description"],
                            start_date: scope.data[stateName + "_start_date"]
                        };
                    });

                    return adhHttp.put(process.path, process);
                });
            };
        }
    };
};
