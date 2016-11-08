/// <reference path="../../../../../lib2/types/lodash.d.ts"/>
/// <reference path="../../../../../lib2/types/moment.d.ts"/>

import * as AdhBadge from "../../Badge/Badge";
import * as AdhConfig from "../../Config/Config";
import * as AdhEmbed from "../../Embed/Embed";
import * as AdhHttp from "../../Http/Http";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhProcess from "../../Process/Process";

import * as SIDescription from "../../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/Core/IdeaCollection/Process";


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhEmbed: AdhEmbed.Service,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    $q : angular.IQService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@",
            processProperties: "="
        },
        link: (scope) => {
            AdhBadge.getBadgeFacets(adhHttp, $q)(scope.path).then((facets) => {
                scope.facets = facets;
            });

            scope.data = {};

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
                        var workflow = SIWorkflow.get(resource);
                        var stateName = workflow.workflow_state;
                        scope.currentPhase = AdhProcess.getStateData(workflow, stateName);
                        scope.data.picture = (SIImageReference.get(resource) || {}).picture;
                        scope.data.title = SITitle.get(resource).title;
                        scope.data.participationStartDate = AdhProcess.getStateData(workflow, "participate").start_date;
                        scope.data.participationEndDate = AdhProcess.getStateData(workflow, "evaluate").start_date;
                        scope.data.shortDescription = SIDescription.get(resource).short_description;

                        scope.hasLocation = scope.processProperties.hasLocation && SILocationReference.get(resource).location;
                        if (scope.hasLocation) {
                            var locationUrl = SILocationReference.get(resource).location;
                            adhHttp.get(locationUrl).then((location) => {
                                var polygon = SIMultiPolygon.get(location).coordinates[0][0];
                                scope.polygon =  polygon;
                            });
                        }

                        scope.contentType = scope.processProperties.versionClass.content_type;
                    });
                }
            });
            adhPermissions.bindScope(scope, () => scope.path);

            scope.showMap = (isShowMap) => {
                scope.data.isShowMap = isShowMap;
            };

            var context = adhEmbed.getContext();
            scope.hasResourceHeader = (context === "");
        }
    };
};
