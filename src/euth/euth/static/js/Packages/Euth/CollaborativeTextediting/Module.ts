import * as AdhDocumentModule from "../../Core/Document/Module";
import * as AdhNamesModule from "../../Core/Names/Module";

import * as AdhDocument from "../../Core/Document/Document";
import * as AdhIdeaCollectionWorkbench from "../../Core/IdeaCollection/Workbench/Workbench";
import * as AdhNames from "../../Core/Names/Names";
import * as AdhProcess from "../../Core/Process/Process";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";

import RIDocument from "../../../Resources_/adhocracy_core/resources/document/IDocument";
import RIDocumentVersion from "../../../Resources_/adhocracy_core/resources/document/IDocumentVersion";
import RIEuthCollaborativeTextProcess from "../../../Resources_/adhocracy_euth/resources/collaborative_text/IProcess";
import RIEuthCollaborativeTextPrivateProcess from "../../../Resources_/adhocracy_euth/resources/collaborative_text/IPrivateProcess";

export var moduleName = "adhEuthCollaberativeTextediting";


export var register = (angular) => {

    angular
        .module(moduleName, [
            AdhDocumentModule.moduleName,
            AdhNamesModule.moduleName
        ])
        .config(["adhConfig", "adhProcessProvider", (adhConfig, adhProcessProvider : AdhProcess.Provider) => {
            _.forEach([RIEuthCollaborativeTextProcess.content_type, RIEuthCollaborativeTextPrivateProcess.content_type],
            (processType) => {
                adhProcessProvider.templates[processType] =
                    "<adh-idea-collection-workbench data-process-properties=\"processProperties\">" +
                    "</adh-idea-collection-workbench>";
                adhProcessProvider.setProperties(processType, {
                    proposalColumn: adhConfig.pkg_path + AdhDocument.pkgLocation + "/DetailSlot.html",
                    document: true,
                    hasCommentColumn: true,
                    item: RIDocument,
                    version: RIDocumentVersion
                });
            });
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider: AdhResourceArea.Provider, adhConfig) => {
            _.forEach([RIEuthCollaborativeTextProcess, RIEuthCollaborativeTextPrivateProcess],
            (process) => {
                var registerRoutes = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                    process, RIDocument, RIDocumentVersion, false, true);
                registerRoutes()(adhResourceAreaProvider);

                var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/AddDocumentSlot.html";
                adhResourceAreaProvider.processHeaderSlots[process.content_type] = processHeaderSlot;
            });
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIEuthCollaborativeTextProcess.content_type] = "TR__RESOURCE_COLLABORATIVE_TEXT_EDITING";
            adhNamesProvider.names[RIEuthCollaborativeTextPrivateProcess.content_type] = "TR__RESOURCE_COLLABORATIVE_TEXT_EDITING";
        }]);
};
