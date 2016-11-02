import * as AdhEmbedModule from "../../Core/Embed/Module";
import * as AdhIdeaCollectionModule from "../../Core/IdeaCollection/Module";
import * as AdhProcessModule from "../../Core/Process/Module";
import * as AdhResourceAreaModule from "../../Core/ResourceArea/Module";

import * as AdhEmbed from "../../Core/Embed/Embed";
import * as AdhIdeaCollectionWorkbench from "../../Core/IdeaCollection/Workbench/Workbench";
import * as AdhProcess from "../../Core/Process/Process";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";

import RIEuthProcess from "../../../Resources_/adhocracy_euth/resources/idea_collection/IProcess";
import RIEuthPrivateProcess from "../../../Resources_/adhocracy_euth/resources/idea_collection/IPrivateProcess";
import RIProposal from "../../../Resources_/adhocracy_core/resources/proposal/IProposal";
import RIProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";

export var moduleName = "adhEuthIdeaCollection";


export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhIdeaCollectionModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("euth");
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider : AdhResourceArea.Provider, adhConfig) => {
            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";

            _.forEach([RIEuthProcess, RIEuthPrivateProcess], (processType) => {
                var registerRoutes = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                    processType, RIProposal, RIProposalVersion, true);
                registerRoutes()(adhResourceAreaProvider);
                registerRoutes("euth")(adhResourceAreaProvider);
                adhResourceAreaProvider.processHeaderSlots[processType.content_type] = processHeaderSlot;
            });
        }])
        .config(["adhConfig", "adhProcessProvider", (adhConfig, adhProcessProvider : AdhProcess.Provider) => {
            _.forEach([RIEuthProcess, RIEuthPrivateProcess], (processType) => {
                adhProcessProvider.templates[processType.content_type] =
                    "<adh-idea-collection-workbench data-process-properties=\"processProperties\">" +
                    "</adh-idea-collection-workbench>";
                adhProcessProvider.setProperties(processType.content_type, {
                    proposalColumn: adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProposalColumn.html",
                    hasAuthorInListItem: true,
                    hasCommentColumn: true,
                    hasDescription: true,
                    hasImage: true,
                    item: RIProposal,
                    version: RIProposalVersion
                });
            });
        }]);
};
