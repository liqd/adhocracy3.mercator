import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhIdeaCollectionModule from "../../IdeaCollection/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";

import * as AdhEmbed from "../../Embed/Embed";
import * as AdhIdeaCollectionWorkbench from "../../IdeaCollection/Workbench/Workbench";
import * as AdhProcess from "../../Process/Process";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import RIPcompassProcess from "../../../Resources_/adhocracy_pcompass/resources/request/IProcess";
import RIProposal from "../../../Resources_/adhocracy_core/resources/proposal/IProposal";
import RIProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";


export var moduleName = "adhPcompassWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhIdeaCollectionModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("pcompass");
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider : AdhResourceArea.Provider, adhConfig) => {
            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";
            var registerRoutes = AdhIdeaCollectionWorkbench.registerRoutesFactory(RIPcompassProcess, RIProposal, RIProposalVersion);
            registerRoutes()(adhResourceAreaProvider);
            registerRoutes("pcompass")(adhResourceAreaProvider);
            adhResourceAreaProvider.processHeaderSlots[RIPcompassProcess.content_type] = processHeaderSlot;
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[RIPcompassProcess.content_type] =
                    "<adh-idea-collection-workbench data-process-options=\"processOptions\"></adh-idea-collection-workbench>";
            adhProcessProvider.processOptions[RIPcompassProcess.content_type] = {
                hasImage: true,
                proposalClass: RIProposal,
                proposalVersionClass: RIProposalVersion
            };
        }]);
};
