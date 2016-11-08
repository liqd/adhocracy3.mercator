import * as AdhEmbedModule from "../../Core/Embed/Module";
import * as AdhIdeaCollectionModule from "../../Core/IdeaCollection/Module";
import * as AdhNamesModule from "../../Core/Names/Module";
import * as AdhProcessModule from "../../Core/Process/Module";
import * as AdhResourceAreaModule from "../../Core/ResourceArea/Module";

import * as AdhEmbed from "../../Core/Embed/Embed";
import * as AdhIdeaCollectionProposal from "../../Core/IdeaCollection/Proposal/Proposal";
import * as AdhIdeaCollectionWorkbench from "../../Core/IdeaCollection/Workbench/Workbench";
import * as AdhNames from "../../Core/Names/Names";
import * as AdhProcess from "../../Core/Process/Process";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";

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
            AdhNamesModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("buergerhaushalt", ["burgerhaushalt"]);
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider : AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = (context? : string) => (provider) => {
                AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                    RIBuergerhaushaltProcess, RIBuergerhaushaltProposal, RIBuergerhaushaltProposalVersion)(context)(provider);
                AdhIdeaCollectionWorkbench.registerProposalRoutesFactory(
                    RIBuergerhaushaltProcess, RIBuergerhaushaltProposal, RIBuergerhaushaltProposalVersion, true)(context)(provider);
            };
            registerRoutes()(adhResourceAreaProvider);
            registerRoutes("buergerhaushalt")(adhResourceAreaProvider);

            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";
            adhResourceAreaProvider.processHeaderSlots[processType] = processHeaderSlot;
        }])
        .config(["adhConfig", "adhProcessProvider", (adhConfig, adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] =
                "<adh-idea-collection-workbench data-process-properties=\"processProperties\">" +
                "</adh-idea-collection-workbench>";
            adhProcessProvider.setProperties(processType, {
                createSlot: adhConfig.pkg_path + AdhIdeaCollectionProposal.pkgLocation + "/CreateSlot.html",
                detailSlot: adhConfig.pkg_path + AdhIdeaCollectionProposal.pkgLocation + "/DetailSlot.html",
                editSlot: adhConfig.pkg_path + AdhIdeaCollectionProposal.pkgLocation + "/EditSlot.html",
                hasAuthorInListItem: true,
                hasCommentColumn: true,
                hasDescription: true,
                hasLocation: true,
                hasLocationText: true,
                itemClass: RIBuergerhaushaltProposal,
                maxBudget: Infinity,
                proposalSheet: SIBuergerhaushaltProposal,
                versionClass: RIBuergerhaushaltProposalVersion
            });
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIBuergerhaushaltProcess.content_type] = "TR__RESOURCE_BUERGERHAUSHALT";
            adhNamesProvider.names[RIBuergerhaushaltProposalVersion.content_type] = "TR__RESOURCE_PROPOSAL";
        }]);
};
