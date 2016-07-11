import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";

import * as AdhIdeaCollectionModule from "../../IdeaCollection/Module";

import * as AdhEmbed from "../../Embed/Embed";
import * as AdhProcess from "../../Process/Process";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as AdhIdeaCollectionWorkbench from "../../IdeaCollection/Workbench/Workbench";

import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RIBuergerhaushaltProposal from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposal";
import RIBuergerhaushaltProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import * as SIBuergerhaushaltProposal from "../../../Resources_/adhocracy_meinberlin/sheets/burgerhaushalt/IProposal";


export var moduleName = "adhMeinberlinBuergerhaushalt";

export var register = (angular) => {
    var processType = RIBuergerhaushaltProcess.content_type;

    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhIdeaCollectionModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("buergerhaushalt", ["burgerhaushalt"]);
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider : AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                RIBuergerhaushaltProcess, RIBuergerhaushaltProposal, RIBuergerhaushaltProposalVersion);
            registerRoutes()(adhResourceAreaProvider);
            registerRoutes("buergerhaushalt")(adhResourceAreaProvider);

            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";
            adhResourceAreaProvider.processHeaderSlots[processType] = processHeaderSlot;
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] =
                "<adh-idea-collection-workbench data-process-options=\"processOptions\">" +
                "</adh-idea-collection-workbench>";
            adhProcessProvider.processOptions[processType] = {
                hasLocation: true,
                hasLocationText: true,
                maxBudget: Infinity,
                proposalClass: RIBuergerhaushaltProposal,
                proposalSheet: SIBuergerhaushaltProposal,
                proposalVersionClass: RIBuergerhaushaltProposalVersion
            };
        }]);
};
