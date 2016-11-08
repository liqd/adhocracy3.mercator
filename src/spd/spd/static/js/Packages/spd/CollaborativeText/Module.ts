import * as AdhAbuseModule from "../../Core/Abuse/Module";
import * as AdhCommentModule from "../../Core/Comment/Module";
import * as AdhDocumentModule from "../../Core/Document/Module";
import * as AdhEmbedModule from "../../Core/Embed/Module";
import * as AdhHttpModule from "../../Core/Http/Module";
import * as AdhIdeaCollectionModule from "../../Core/IdeaCollection/Module";
import * as AdhMovingColumnsModule from "../../Core/MovingColumns/Module";
import * as AdhPermissionsModule from "../../Core/Permissions/Module";
import * as AdhResourceActionsModule from "../../Core/ResourceActions/Module";
import * as AdhResourceAreaModule from "../../Core/ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../Core/TopLevelState/Module";

import * as AdhDocument from "../../Core/Document/Document";
import * as AdhEmbed from "../../Core/Embed/Embed";
import * as AdhIdeaCollectionWorkbench from "../../Core/IdeaCollection/Workbench/Workbench";
import * as AdhNames from "../../Core/Names/Names";
import * as AdhProcess from "../../Core/Process/Process";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";

import RIDigitalLebenProcess from "../../../Resources_/adhocracy_spd/resources/digital_leben/IProcess";
import RIDocument from "../../../Resources_/adhocracy_core/resources/document/IDocument";
import RIDocumentVersion from "../../../Resources_/adhocracy_core/resources/document/IDocumentVersion";

export var moduleName = "adhSpdCollaborativeText";

export var register = (angular) => {
    var processType = RIDigitalLebenProcess.content_type;

    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhDocumentModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhIdeaCollectionModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhResourceActionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("debate-workbench");
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider: AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = (context? : string) => (provider) => {
                AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                    RIDigitalLebenProcess, RIDocument, RIDocumentVersion)(context)(provider);
                AdhIdeaCollectionWorkbench.registerDocumentRoutesFactory(
                    RIDigitalLebenProcess, RIDocument, RIDocumentVersion)(context)(provider);
            };
            registerRoutes()(adhResourceAreaProvider);

            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/AddDocumentSlot.html";
            adhResourceAreaProvider.processHeaderSlots[processType] = processHeaderSlot;
        }])
        .config(["adhConfig", "adhProcessProvider", (adhConfig, adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] =
                "<adh-idea-collection-workbench data-process-properties=\"processProperties\">" +
                "</adh-idea-collection-workbench>";
            adhProcessProvider.setProperties(processType, {
                createSlot: adhConfig.pkg_path + AdhDocument.pkgLocation + "/CreateSlot.html",
                detailSlot: adhConfig.pkg_path + AdhDocument.pkgLocation + "/DetailSlot.html",
                editSlot: adhConfig.pkg_path + AdhDocument.pkgLocation + "/EditSlot.html",
                hasCommentColumn: true,
                itemClass: RIDocument,
                versionClass: RIDocumentVersion
            });
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[processType] = "TR__RESOURCE_COLLABORATIVE_TEXT_EDITING";
        }]);
};
