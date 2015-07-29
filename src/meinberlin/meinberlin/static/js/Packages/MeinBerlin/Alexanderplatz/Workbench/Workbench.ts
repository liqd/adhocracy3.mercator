/// <reference path="../../../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import AdhConfig = require("../../../Config/Config");
import AdhDocument = require("../../../Document/Document");
import AdhHttp = require("../../../Http/Http");
import AdhMovingColumns = require("../../../MovingColumns/MovingColumns");
import AdhPermissions = require("../../../Permissions/Permissions");
import AdhProcess = require("../../../Process/Process");
import AdhResourceArea = require("../../../ResourceArea/ResourceArea");
import AdhTopLevelState = require("../../../TopLevelState/TopLevelState");

import RIAlexanderplatzProcess = require("../../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess");
import RIGeoDocument = require("../../../../Resources_/adhocracy_core/resources/document/IGeoDocument");
import RIGeoDocumentVersion = require("../../../../Resources_/adhocracy_core/resources/document/IGeoDocumentVersion");
import RIGeoProposal = require("../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal");
import RIGeoProposalVersion = require("../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion");
import RIParagraph = require("../../../../Resources_/adhocracy_core/resources/paragraph/IParagraph");
import RIParagraphVersion = require("../../../../Resources_/adhocracy_core/resources/paragraph/IParagraphVersion");
import SIParagraph = require("../../../../Resources_/adhocracy_core/sheets/document/IParagraph");
import SILocationReference = require("../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference");
import SIMultiPolygon = require("../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon");

var pkgLocation = "/MeinBerlin/Alexanderplatz/Workbench";


export var workbenchDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Workbench.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("view", scope));
            scope.$on("$destroy", adhTopLevelState.bind("tab", scope));
        }
    };
};

export var getProcessPolygon = (
    adhHttp : AdhHttp.Service<any>
) => (processUrl : string) : angular.IPromise<any> => {
    return adhHttp.get(processUrl).then((resource) => {
        var locationUrl = resource.data[SILocationReference.nick].location;
        return adhHttp.get(locationUrl).then((location) => {
            return location.data[SIMultiPolygon.nick].coordinates[0][0];
        });
    });
};

export var processDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProcessDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
            scope.$on("$destroy", adhTopLevelState.bind("tab", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");

            scope.showMap = (isShowMap) => {
                scope.shared.isShowMap = isShowMap;
            };

            scope.$watch("processUrl", (processUrl) => {
                if (processUrl) {
                    getProcessPolygon(adhHttp)(processUrl).then((polygon) => {
                        scope.polygon = polygon;
                    });
                }
            });
        }
    };
};

export var documentDetailColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/DocumentDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "documentUrl"]);
        }
    };
};

export var documentCreateColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/DocumentCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
            scope.$watch("processUrl", (processUrl) => {
                if (processUrl) {
                    getProcessPolygon(adhHttp)(processUrl).then((polygon) => {
                        scope.polygon = polygon;
                    });
                }
            });
        }
    };
};


export var moduleName = "adhMeinBerlinAlexanderplatzWorkbench";

export var register = (angular) => {
    var processType = RIAlexanderplatzProcess.content_type;

    angular
        .module(moduleName, [
            AdhDocument.moduleName,
            AdhPermissions.moduleName,
            AdhProcess.moduleName,
            AdhMovingColumns.moduleName,
            AdhResourceArea.moduleName,
            AdhTopLevelState.moduleName
        ])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[processType] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-mein-berlin-alexanderplatz-workbench></adh-mein-berlin-alexanderplatz-workbench>");
            }];
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                // documents tab
                .default(RIAlexanderplatzProcess, "", processType, "", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "documents"
                })
                .default(RIAlexanderplatzProcess, "create_document", processType, "", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "documents"
                })
                .defaultVersionable(RIGeoDocument, RIGeoDocumentVersion, "", processType, "", {
                    space: "content",
                    movingColumns: "is-show-show-hide",
                    tab: "documents"
                })
                .specificVersionable(RIGeoDocument, RIGeoDocumentVersion, "", processType, "", [
                    () => (item : RIGeoDocument, version : RIGeoDocumentVersion) => {
                        return {
                            documentUrl: version.path
                        };
                    }])
                .defaultVersionable(RIParagraph, RIParagraphVersion, "comments", processType, "", {
                    space: "content",
                    movingColumns: "is-collapse-show-show",
                    tab: "documents"
                })
                .specificVersionable(RIParagraph, RIParagraphVersion, "comments", processType, "", [
                    () => (item : RIParagraph, version : RIParagraphVersion) => {
                        var documentUrl = _.last(_.sortBy(version.data[SIParagraph.nick].documents));
                        return {
                            commentableUrl: version.path,
                            commentCloseUrl: documentUrl,
                            documentUrl: documentUrl
                        };
                    }])

                // proposals tab
                .default(RIAlexanderplatzProcess, "proposals", processType, "", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "proposals"
                })
                .default(RIAlexanderplatzProcess, "create_proposal", processType, "", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "proposals"
                })
                .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "", processType, "", {
                    space: "content",
                    movingColumns: "is-show-show-hide",
                    tab: "proposals"
                })
                .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "", processType, "", [
                    () => (item : RIGeoProposal, version : RIGeoProposalVersion) => {
                        return {
                            proposalUrl: version.path
                        };
                    }])
                .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "comments", processType, "", {
                    space: "content",
                    movingColumns: "is-collapse-show-show",
                    tab: "proposals"
                })
                .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "comments", processType, "", [
                    () => (item : RIGeoProposal, version : RIGeoProposalVersion) => {
                        return {
                            commentableUrl: version.path,
                            commentCloseUrl: version.path,
                            proposalUrl: version.path
                        };
                    }]);
        }])
        .directive("adhMeinBerlinAlexanderplatzWorkbench", ["adhConfig", "adhTopLevelState", workbenchDirective])
        .directive("adhMeinBerlinAlexanderplatzProcessColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", "adhHttp", processDetailColumnDirective])
        .directive("adhMeinBerlinAlexanderplatzDocumentDetailColumn", ["adhConfig", documentDetailColumnDirective])
        .directive("adhMeinBerlinAlexanderplatzDocumentCreateColumn", ["adhConfig", "adhHttp", documentCreateColumnDirective]);
};
