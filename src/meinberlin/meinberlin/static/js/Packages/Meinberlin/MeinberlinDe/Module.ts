import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhDebateWorkbenchModule from "../../DebateWorkbench/Module";
import * as AdhMeinberlinAlexanderplatzWorkbenchModule from "../Alexanderplatz/Workbench/Module";
import * as AdhIdeaCollectionModule from "../../IdeaCollection/Module";

import * as AdhEmbed from "../../Embed/Embed";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as AdhDebateWorkbench from "../../DebateWorkbench/DebateWorkbench";
import * as AdhMeinberlinAlexanderplatzWorkbench from "../Alexanderplatz/Workbench/Workbench";
import * as AdhIdeaCollectionWorkbench from "../../IdeaCollection/Workbench/Workbench";

import RIAlexanderplatzProcess from "../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";
import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RIBuergerhaushaltProposal from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposal";
import RIBuergerhaushaltProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import RICollaborativeTextProcess from "../../../Resources_/adhocracy_meinberlin/resources/collaborative_text/IProcess";
import RIGeoProposal from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";
import RIKiezkasseProcess from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";
import RIKiezkasseProposal from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposal";
import RIKiezkasseProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion";

import * as AdhMeinberlinDe from "./MeinberlinDe";


export var moduleName = "adhMeinberlinDe";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhDebateWorkbenchModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhIdeaCollectionModule.moduleName,
            AdhMeinberlinAlexanderplatzWorkbenchModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("mein.berlin.de");
            adhEmbedProvider.contextHeaders["mein.berlin.de"] = "<adh-meinberlin-de-header></adh-meinberlin-de-header>";
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            AdhDebateWorkbench.registerRoutes(
                RICollaborativeTextProcess, "mein.berlin.de")(adhResourceAreaProvider);
            AdhMeinberlinAlexanderplatzWorkbench.registerRoutes(
                RIAlexanderplatzProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);

            var registerRoutes1 = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                RIBuergerhaushaltProcess, RIBuergerhaushaltProposal, RIBuergerhaushaltProposalVersion);
            registerRoutes1("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes2 = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                RIIdeaCollectionProcess, RIGeoProposal, RIGeoProposalVersion);
            registerRoutes2("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes3 = AdhIdeaCollectionWorkbench.registerRoutesFactory(
                RIKiezkasseProcess, RIKiezkasseProposal, RIKiezkasseProposalVersion);
            registerRoutes3("mein.berlin.de")(adhResourceAreaProvider);
        }])
        .directive("adhMeinberlinDeHeader", ["adhConfig", "adhTopLevelState", AdhMeinberlinDe.headerDirective]);
};
