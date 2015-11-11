import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMovingColumns from "../../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhProcess from "../../../Process/Process";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";

import * as AdhMeinberlinPhase from "../../Phase/Phase";

import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/Meinberlin/Buergerhaushalt/Process";


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@"
        },
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
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
                    });
                }
            });
            adhPermissions.bindScope(scope, () => scope.path);
        }
    };
};


export var phaseHeaderDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + AdhMeinberlinPhase.pkgLocation + "/PhaseHeader.html",
        scope: {},
        link: (scope : AdhMeinberlinPhase.IPhaseHeaderScope) => {
            var processUrl = adhTopLevelState.get("processUrl");
            adhHttp.get(processUrl).then((resource) => {
                var sheet : SIWorkflow.Sheet = resource.data[SIWorkflow.nick];
                scope.currentPhase = sheet.workflow_state;
            });

            scope.phases = [{
                name: "announce",
                title: "Information",
                description: "Ab dem 02.09.2015 können sich alle interessierten Bürgerinnen und Bürger zum Bürgerhaushalt " +
                    "Treptow-Köpenick online beteiligen. Auf der Internetseite des Bezirksamtes Treptow-Köpenick sowie eine " +
                    "Einwohnerversammlung werden allen Interessierten Informationen zum Verfahren zur Verfügung gestellt. Bisher " +
                    "offline eingereichte Vorschläge werden von den Fachämtern online eingetragen.",
                processType: "Bürgerhaushalt",
                votingAvailable: true,
                commentAvailable: true
            }, {
                name: "participate",
                title: "Ideensammlung",
                description: "In dieser Phase bringen Bürgerinnen und Bürger ihre Vorschläge ein und können Vorschläge anderer bewerten " +
                    "und diskutieren. Vorschläge beziehen sich auf das laufende oder zukünftige Kalenderjahr und können stets " +
                    "eingebracht werden. Vorschläge können auch offline eingereicht werden.",
                processType: "Bürgerhaushalt",
                votingAvailable: true,
                commentAvailable: true
            }, {
                name: "result",
                title: "Ergebnisse",
                description: "Bürgerinnen und Bürger können den Status aller Vorschläge sehen und gegebenenfalls die Stellungnahme des " +
                    "im Bezirksamt zuständigen Fachamtes lesen.",
                processType: "Bürgerhaushalt",
                votingAvailable: false,
                commentAvailable: false
            }];
        }
    };
};
