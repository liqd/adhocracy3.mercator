/// <reference path="../../../../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>
/// <reference path="../../../../../lib/DefinitelyTyped/moment/moment.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMovingColumns from "../../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhProcess from "../../../Process/Process";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../../Util/Util";

import * as AdhMeinBerlinPhase from "../../Phase/Phase";

import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";
import * as SIName from "../../../../Resources_/adhocracy_core/sheets/name/IName";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflow from "../../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/MeinBerlin/Stadtforum/Process";


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
            scope.shared = column.$scope.shared;
            scope.showMap = (isShowMap : boolean) => {
                scope.shared.isShowMap = isShowMap;
            };
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
        templateUrl: adhConfig.pkg_path + AdhMeinBerlinPhase.pkgLocation + "/PhaseHeader.html",
        scope: {},
        link: (scope : AdhMeinBerlinPhase.IPhaseHeaderScope) => {
            var processUrl = adhTopLevelState.get("processUrl");
            adhHttp.get(processUrl).then((resource) => {
                var sheet = resource.data[SIWorkflow.nick];
                scope.currentPhase = sheet.workflow_state;
                scope.phases[0].startDate = AdhProcess.getStateData(sheet, "announce").start_date;
                scope.phases[0].endDate = AdhProcess.getStateData(sheet, "participate").start_date;
                scope.phases[1].startDate = AdhProcess.getStateData(sheet, "participate").start_date;
                scope.phases[1].endDate = AdhProcess.getStateData(sheet, "evaluate").start_date;
                scope.phases[2].startDate = AdhProcess.getStateData(sheet, "evaluate").start_date;
                scope.phases[2].endDate = AdhProcess.getStateData(sheet, "result").start_date;
                scope.phases[3].startDate = AdhProcess.getStateData(sheet, "result").start_date;
            });

            scope.phases = [{
                name: "announce",
                title: "Information",
                description: "Ab dem Start der Ideensammlungsphase können alle interessierten Bürger*innen sich " +
                    "beteiligen und Vorschläge für Projekte in der Bezirksregion einreichen, diskutieren und " +
                    "bewerten. Am Ende der Ideensammlungsphase findet die Bürgerversammlung statt, wo Vorschläge " +
                    "vor Ort eingereicht, vorgestellt und abgestimmt werden. In der Phase „Ergebnisse“ können alle " +
                    "Interessierten die Vorschläge sehen, die realisiert werden.",
                processType: "Kiezkasse",
                votingAvailable: false,
                commentAvailable: false
            }, {
                name: "participate",
                title: "Ideensammlung",
                description: "Alle Interessierten werden aufgerufen, Vorschläge für Projekte in der Bezirksregion " +
                    "zu machen. Die Angabe der Kosten soll die Mehrwertsteuer enthalten. Vorschläge können aber " +
                    "auch noch offline in der Bürgerversammlung gemacht werden. Alle Vorschläge (offline und online) " +
                    "werden dann bei der Bürgerversammlung beschlossen.",
                processType: "Kiezkasse",
                votingAvailable: true,
                commentAvailable: true
            }, {
                name: "evaluate",
                title: "Bürgerversammlung",
                description: "In dieser Phase können keine Vorschläge mehr online eingereicht, kommentiert oder " +
                    "bewertet werden. Vorschläge können aber noch offline in der Bürgerversammlung gemacht werden. Alle " +
                    "Vorschläge werden dann vor Ort vorgestellt und abgestimmt. Die Art und Weise der Abstimmung bestimmt " +
                    "die Bürgerversammlung selbst. Offline-Vorschläge werden online eingereicht.",
                processType: "Kiezkasse",
                votingAvailable: false,
                commentAvailable: false
            }, {
                name: "result",
                title: "Ergebnisse",
                description: "In der Ergebnisphase wird dargestellt, welche Vorschläge realisiert werden. Diese " +
                    "werden vom zuständigen Fachamt des Bezirksamtes, ggf. gemeinsam mit den Antragstellern, umgesetzt. " +
                    "Die Projekte müssen bis Mitte Dezember realisiert und abgerechnet werden.",
                processType: "Kiezkasse",
                votingAvailable: false,
                commentAvailable: false
            }];
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
                return adhSubmitIfValid(scope, element, scope.stadtforumProcessForm, () => {
                    process.data[SITitle.nick].title = scope.data.title;
                    process.data[SIName.nick] = undefined;
                    process.data[SIImageReference.nick] = undefined;

                    if (_.contains(scope.data.availableWorkflowStates, scope.data.workflowState)) {
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
