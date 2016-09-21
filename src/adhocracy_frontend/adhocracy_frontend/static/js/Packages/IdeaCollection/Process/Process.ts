/// <reference path="../../../../lib2/types/lodash.d.ts"/>
/// <reference path="../../../../lib2/types/moment.d.ts"/>

import * as AdhBadge from "../../Badge/Badge";
import * as AdhConfig from "../../Config/Config";
import * as AdhEmbed from "../../Embed/Embed";
import * as AdhHttp from "../../Http/Http";
import * as AdhPermissions from "../../Permissions/Permissions";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as SIDescription from "../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SILocationReference from "../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SITitle from "../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflow from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/IdeaCollection/Process";


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
                        var sheet = resource.data[SIWorkflow.nick];
                        var stateName = sheet.workflow_state;
                        scope.currentPhase = AdhResourceArea.getStateData(sheet, stateName);
                        scope.data.title = resource.data[SITitle.nick].title;
                        scope.data.shortDescription = resource.data[SIDescription.nick].short_description;

                        scope.hasLocation = scope.processProperties.hasLocation && resource.data[SILocationReference.nick].location;
                        if (scope.hasLocation) {
                            var locationUrl = resource.data[SILocationReference.nick].location;
                            adhHttp.get(locationUrl).then((location) => {
                                var polygon = location.data[SIMultiPolygon.nick].coordinates[0][0];
                                scope.polygon =  polygon;
                            });
                        }

                        var proposalVersion = scope.processProperties.proposalVersionClass;
                        scope.contentType = proposalVersion.content_type;
                    });
                }
            });
            adhPermissions.bindScope(scope, () => scope.path);

            scope.showMap = (isShowMap) => {
                scope.data.isShowMap = isShowMap;
            };

            var context = adhEmbed.getContext();
            scope.hasResourceHeader = (context === "mein.bärlin.de");
        }
    };
};
