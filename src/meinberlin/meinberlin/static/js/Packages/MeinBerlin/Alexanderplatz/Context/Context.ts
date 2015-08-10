import AdhConfig = require("../../../Config/Config");
import AdhEmbed = require("../../../Embed/Embed");
import AdhHttp = require("../../../Http/Http");
import AdhMapping = require("../../../Mapping/Mapping");
import AdhPermissions = require("../../../Permissions/Permissions");
import AdhResourceArea = require("../../../ResourceArea/ResourceArea");
import AdhTopLevelState = require("../../../TopLevelState/TopLevelState");

import AdhMeinBerlinWorkbench = require("../Workbench/Workbench");

import RIAlexanderplatzProcess = require("../../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess");
import RIGeoDocument = require("../../../../Resources_/adhocracy_core/resources/document/IGeoDocument");
import RIGeoDocumentVersion = require("../../../../Resources_/adhocracy_core/resources/document/IGeoDocumentVersion");
import RIGeoProposal = require("../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal");
import RIGeoProposalVersion = require("../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion");
import RIParagraph = require("../../../../Resources_/adhocracy_core/resources/paragraph/IParagraph");
import RIParagraphVersion = require("../../../../Resources_/adhocracy_core/resources/paragraph/IParagraphVersion");
import SIParagraph = require("../../../../Resources_/adhocracy_core/sheets/document/IParagraph");

var pkgLocation = "/MeinBerlin/Alexanderplatz/Context";


export var headerDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/header.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");
            scope.$on("$destroy", adhTopLevelState.bind("tab", scope));
        }
    };

};


export var moduleName = "adhMeinBerlinAlexanderplatzContext";

export var register = (angular) => {
     var processType = RIAlexanderplatzProcess.content_type;

    angular
        .module(moduleName, [
            AdhEmbed.moduleName,
            AdhHttp.moduleName,
            AdhMeinBerlinWorkbench.moduleName,
            AdhPermissions.moduleName,
            AdhResourceArea.moduleName,
            AdhTopLevelState.moduleName
        ])
        .directive("adhAlexanderplatzContextHeader", ["adhConfig", "adhPermissions", "adhTopLevelState", headerDirective])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("alexanderplatz");
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider: AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .template("alexanderplatz", ["adhConfig", "$templateRequest", (
                    adhConfig: AdhConfig.IService,
                    $templateRequest: angular.ITemplateRequestService
                    ) => {
                    return $templateRequest(adhConfig.pkg_path + pkgLocation + "/template.html");
                }])
                .default(RIAlexanderplatzProcess, "", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "documents"
                })
                .default(RIAlexanderplatzProcess, "create_document", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "documents"
                })
                .specific(RIAlexanderplatzProcess, "create_document", processType, "alexanderplatz", [
                    "adhHttp", (adhHttp: AdhHttp.Service<any>) => (resource: RIAlexanderplatzProcess) => {
                        return adhHttp.options(resource.path).then((options: AdhHttp.IOptions) => {
                            if (!options.POST) {
                                throw 401;
                            } else {
                                return {};
                            }
                        });
                    }])
                .defaultVersionable(RIGeoDocument, RIGeoDocumentVersion, "", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-show-hide",
                    tab: "documents"
                })
                .specificVersionable(RIGeoDocument, RIGeoDocumentVersion, "", processType, "alexanderplatz", [
                    () => (item: RIGeoDocument, version: RIGeoDocumentVersion) => {
                        return {
                            documentUrl: version.path
                        };
                    }])
                .defaultVersionable(RIGeoDocument, RIGeoDocumentVersion, "edit", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-show-hide",
                    tab: "documents"
                })
                .specificVersionable(RIGeoDocument, RIGeoDocumentVersion, "edit", processType, "alexanderplatz", [
                    "adhHttp", (adhHttp: AdhHttp.Service<any>) => (item: RIGeoDocument, version: RIGeoDocumentVersion) => {
                        return adhHttp.options(item.path).then((options: AdhHttp.IOptions) => {
                            if (!options.POST) {
                                throw 401;
                            } else {
                                return {
                                    documentUrl: version.path
                                };
                            }
                        });
                    }])
                .defaultVersionable(RIParagraph, RIParagraphVersion, "comments", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-collapse-show-show",
                    tab: "documents"
                })
                .specificVersionable(RIParagraph, RIParagraphVersion, "comments", processType, "alexanderplatz", [
                    () => (item: RIParagraph, version: RIParagraphVersion) => {
                        var documentUrl = _.last(_.sortBy(version.data[SIParagraph.nick].documents));
                        return {
                            commentableUrl: version.path,
                            commentCloseUrl: documentUrl,
                            documentUrl: documentUrl
                        };
                    }])

            // proposals tab
                .default(RIAlexanderplatzProcess, "proposals", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "proposals"
                })
                .default(RIAlexanderplatzProcess, "create_proposal", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-hide-hide",
                    tab: "proposals"
                })
                .specific(RIAlexanderplatzProcess, "create_proposal", processType, "alexanderplatz", [
                    "adhHttp", (adhHttp: AdhHttp.Service<any>) => (resource: RIAlexanderplatzProcess) => {
                        return adhHttp.options(resource.path).then((options: AdhHttp.IOptions) => {
                            if (!options.POST) {
                                throw 401;
                            } else {
                                return {};
                            }
                        });
                    }])
                .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-show-hide",
                    tab: "proposals"
                })
                .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "", processType, "alexanderplatz", [
                    () => (item: RIGeoProposal, version: RIGeoProposalVersion) => {
                        return {
                            proposalUrl: version.path
                        };
                    }])
                .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "edit", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-show-show-hide",
                    tab: "proposals"
                })
                .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "edit", processType, "alexanderplatz", [
                    "adhHttp", (adhHttp: AdhHttp.Service<any>) => (item: RIGeoProposal, version: RIGeoProposalVersion) => {
                        return adhHttp.options(item.path).then((options: AdhHttp.IOptions) => {
                            if (!options.POST) {
                                throw 401;
                            } else {
                                return {
                                    proposalUrl: version.path
                                };
                            }
                        });
                    }])
                .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "comments", processType, "alexanderplatz", {
                    space: "content",
                    movingColumns: "is-collapse-show-show",
                    tab: "proposals"
                })
                .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "comments", processType, "alexanderplatz", [
                    () => (item: RIGeoProposal, version: RIGeoProposalVersion) => {
                        return {
                            commentableUrl: version.path,
                            commentCloseUrl: version.path,
                            proposalUrl: version.path
                        };
                    }]);
        }])
        .config(["adhMapDataProvider", (adhMapDataProvider: AdhMapping.MapDataProvider) => {
            adhMapDataProvider.icons["document"] = {
                className: "icon-board-pin",
                iconAnchor: [20, 39],
                iconSize: [40, 40]
            };
            adhMapDataProvider.icons["document-selected"] = {
                className: "icon-board-pin is-active",
                iconAnchor: [20, 39],
                iconSize: [40, 40]
            };
        }]);
};
