import * as AdhIdeaCollectionModule from "../../Core/IdeaCollection/Module";
import * as AdhNamesModule from "../../Core/Names/Module";
import * as AdhProcessModule from "../../Core/Process/Module";
import * as AdhResourceAreaModule from "../../Core/ResourceArea/Module";

import * as AdhEmbed from "../../Core/Embed/Embed";
import * as AdhIdeaCollectionProposal from "../../Core/IdeaCollection/Proposal/Proposal";
import * as AdhIdeaCollectionWorkbench from "../../Core/IdeaCollection/Workbench/Workbench";
import * as AdhNames from "../../Core/Names/Names";
import * as AdhPoll from "../../Core/IdeaCollection/Poll/Poll";
import * as AdhProcess from "../../Core/Process/Process";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";

import RIPoll from "../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IPoll";
import RIProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";
import RIStadtforumProcess from "../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IProcess";

export var moduleName = "adhMeinberlinStadtforum";

export var register = (angular) => {
    var processType = RIStadtforumProcess.content_type;

    angular
        .module(moduleName, [
            AdhIdeaCollectionModule.moduleName,
            AdhNamesModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("meinberlin-stadtforum-proposal-detail")
                .registerDirective("meinberlin-stadtforum-proposal-create");
        }])
        .directive("adhMeinberlinStadtforumProposalCreate", [
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhShowError",
            "adhSubmitIfValid",
            "adhResourceUrlFilter",
            "$location",
            AdhIdeaCollectionProposal.createDirective
        ])
        .directive("adhMeinberlinStadtforumProposalDetail", [
            "adhConfig",
            "adhHttp",
            "adhPermissions",
            "adhProcess",
            "adhRate",
            "adhTopLevelState",
            "adhGetBadges",
            "$q",
            AdhIdeaCollectionProposal.detailDirective(processType)])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider : AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                RIStadtforumProcess, RIPoll, RIProposalVersion, false);
            registerRoutes()(adhResourceAreaProvider);

            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";
            adhResourceAreaProvider.processHeaderSlots[processType] = processHeaderSlot;
        }])
        .config(["adhProcessProvider", "adhConfig", (adhProcessProvider : AdhProcess.Provider, adhConfig) => {
            adhProcessProvider.templates[processType] =
                "<adh-idea-collection-workbench data-process-properties=\"processProperties\">" +
                "</adh-idea-collection-workbench>";
            adhProcessProvider.setProperties(processType, {
                detailSlot: adhConfig.pkg_path + AdhPoll.pkgLocation + "/DetailSlot.html",
                proposalClass: RIPoll,
                proposalVersionClass: RIProposalVersion
            });
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[processType] = "TR__RESOURCE_STADTFORUM";
            adhNamesProvider.names[RIProposalVersion.content_type] = "TR__RESOURCE_POLL";
        }]);
};
