/// <reference path="../../../../lib2/types/lodash.d.ts"/>
/// <reference path="../../../../lib2/types/moment.d.ts"/>

import * as AdhBadge from "../../Badge/Badge";
import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhProcess from "../../Process/Process";

import * as SILocationReference from "../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIWorkflow from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/IdeaCollection/Process";


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@",
            processOptions: "="
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

                        if (scope.processOptions.hasLocation) {
                            var locationUrl = resource.data[SILocationReference.nick].location;
                            adhHttp.get(locationUrl).then((location) => {
                                var polygon = location.data[SIMultiPolygon.nick].coordinates[0][0];
                                scope.polygon =  polygon;
                            });
                        }

                        var proposalVersion = scope.processOptions.proposalVersionClass;
                        scope.contentType = proposalVersion.content_type;
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
