import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhIdeaCollectionModule from "../../IdeaCollection/Module";
import * as AdhNamesModule from "../../Names/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";

import * as AdhIdeaCollectionWorkbench from "../../IdeaCollection/Workbench/Workbench";
import * as AdhNames from "../../Names/Names";
import * as AdhProcess from "../../Process/Process";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import RIGeoProposal from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";

import * as AdhEmbed from "../../Embed/Embed";


export var moduleName = "adhMeinberlinIdeaCollection";

export var register = (angular) => {
    var processType = RIIdeaCollectionProcess.content_type;

    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhIdeaCollectionModule.moduleName,
            AdhNamesModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("meinberlin-proposal-detail")
                .registerDirective("meinberlin-proposal-list-item")
                .registerDirective("meinberlin-proposal-create")
                .registerDirective("meinberlin-proposal-edit")
                .registerDirective("meinberlin-proposal-list");
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider: AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                RIIdeaCollectionProcess, RIGeoProposal, RIGeoProposalVersion);
            registerRoutes()(adhResourceAreaProvider);

            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";
            adhResourceAreaProvider.processHeaderSlots[processType] = processHeaderSlot;
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] =
                "<adh-idea-collection-workbench data-process-properties=\"processProperties\">" +
                "</adh-idea-collection-workbench>";
            adhProcessProvider.processProperties[processType] = {
                hasLocation: true,
                proposalClass: RIGeoProposal,
                proposalVersionClass: RIGeoProposalVersion
            };
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIIdeaCollectionProcess.content_type] = "TR__RESOURCE_IDEA_COLLECTION";
            adhNamesProvider.names[RIGeoProposalVersion.content_type] = "TR__RESOURCE_PROPOSAL";
        }]);
};
