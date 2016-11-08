import * as AdhIdeaCollectionModule from "../../Core/IdeaCollection/Module";
import * as AdhNamesModule from "../../Core/Names/Module";
import * as AdhProcessModule from "../../Core/Process/Module";
import * as AdhResourceAreaModule from "../../Core/ResourceArea/Module";

import * as AdhIdeaCollectionProposal from "../../Core/IdeaCollection/Proposal/Proposal";
import * as AdhIdeaCollectionWorkbench from "../../Core/IdeaCollection/Workbench/Workbench";
import * as AdhNames from "../../Core/Names/Names";
import * as AdhProcess from "../../Core/Process/Process";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";

import RIGeoProposal from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";


export var moduleName = "adhMeinberlinIdeaCollection";

export var register = (angular) => {
    var processType = RIIdeaCollectionProcess.content_type;

    angular
        .module(moduleName, [
            AdhIdeaCollectionModule.moduleName,
            AdhNamesModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
        ])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider: AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = (context? : string) => (provider) => {
                AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                    RIIdeaCollectionProcess, RIGeoProposal, RIGeoProposalVersion)(context)(provider);
                AdhIdeaCollectionWorkbench.registerProposalRoutesFactory(
                    RIIdeaCollectionProcess, RIGeoProposal, RIGeoProposalVersion, true)(context)(provider);
            };
            registerRoutes()(adhResourceAreaProvider);

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
                imageSlot: adhConfig.pkg_path + AdhIdeaCollectionProposal.pkgLocation + "/ImageSlot.html",
                itemClass: RIGeoProposal,
                versionClass: RIGeoProposalVersion
            });
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIIdeaCollectionProcess.content_type] = "TR__RESOURCE_IDEA_COLLECTION";
            adhNamesProvider.names[RIGeoProposalVersion.content_type] = "TR__RESOURCE_PROPOSAL";
        }]);
};
