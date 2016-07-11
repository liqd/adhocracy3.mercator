import * as AdhIdeaCollectionModule from "../../IdeaCollection/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";

import * as AdhIdeaCollectionWorkbench from "../../IdeaCollection/Workbench/Workbench";
import * as AdhProcess from "../../Process/Process";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import RIGeoProposal from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";


export var moduleName = "adhMeinberlinIdeaCollection";

export var register = (angular) => {
    var processType = RIIdeaCollectionProcess.content_type;

    angular
        .module(moduleName, [,
            AdhIdeaCollectionModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
        ])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider: AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                RIIdeaCollectionProcess, RIGeoProposal, RIGeoProposalVersion);
            registerRoutes()(adhResourceAreaProvider);

            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";
            adhResourceAreaProvider.processHeaderSlots[processType] = processHeaderSlot;
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] =
                "<adh-idea-collection-workbench data-process-options=\"processOptions\">" +
                "</adh-idea-collection-workbench>";
            adhProcessProvider.processOptions[processType] = {
                hasLocation: true,
                proposalClass: RIGeoProposal,
                proposalVersionClass: RIGeoProposalVersion
            };
        }]);
};
