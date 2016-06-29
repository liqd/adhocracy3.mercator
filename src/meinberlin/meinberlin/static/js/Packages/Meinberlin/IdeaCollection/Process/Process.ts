/// <reference path="../../../../../lib2/types/lodash.d.ts"/>
/// <reference path="../../../../../lib2/types/moment.d.ts"/>

import * as _ from "lodash";

import * as AdhBadge from "../../../Badge/Badge";
import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhProcess from "../../../Process/Process";
import * as AdhUtil from "../../../Util/Util";

import RIBuergerhaushaltProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import RIGeoProposalVersion from "../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIKiezkasseProposalVersion from "../../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion";

import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIName from "../../../../Resources_/adhocracy_core/sheets/name/IName";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/Meinberlin/IdeaCollection/Process";


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@",
            isBuergerhaushalt: "=?",
            isKiezkasse: "=?"
        },
        link: (scope) => {
            AdhBadge.getBadgeFacets(adhHttp, $q)(scope.path).then((facets) => {
                scope.facets = facets;
            });

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

            scope.showMap = (isShowMap) => {
                scope.isShowMap = isShowMap;
            };
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
        link: (scope, element) => {
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
