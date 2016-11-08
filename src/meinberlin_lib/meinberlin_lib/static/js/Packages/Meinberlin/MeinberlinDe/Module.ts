import * as AdhEmbedModule from "../../Core/Embed/Module";
import * as AdhResourceAreaModule from "../../Core/ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../Core/TopLevelState/Module";

import * as AdhMeinberlinAlexanderplatzWorkbenchModule from "../Alexanderplatz/Workbench/Module";
import * as AdhIdeaCollectionModule from "../../Core/IdeaCollection/Module";

import * as AdhEmbed from "../../Core/Embed/Embed";
import * as AdhResourceArea from "../../Core/ResourceArea/ResourceArea";

import * as AdhMeinberlinAlexanderplatzWorkbench from "../Alexanderplatz/Workbench/Workbench";
import * as AdhIdeaCollectionWorkbench from "../../Core/IdeaCollection/Workbench/Workbench";

import RIAlexanderplatzProcess from "../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";
import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RIBuergerhaushaltProposal from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposal";
import RIBuergerhaushaltProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProposalVersion";
import RICollaborativeTextProcess from "../../../Resources_/adhocracy_meinberlin/resources/collaborative_text/IProcess";
import RIDocument from "../../../Resources_/adhocracy_core/resources/document/IDocument";
import RIDocumentVersion from "../../../Resources_/adhocracy_core/resources/document/IDocumentVersion";
import RIGeoProposal from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";
import RIKiezkasseProcess from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";
import RIKiezkasseProposal from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposal";
import RIKiezkasseProposalVersion from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion";
import RIPoll from "../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IPoll";
import RIProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";
import RIStadtforumProcess from "../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IProcess";

import * as AdhMeinberlinDe from "./MeinberlinDe";


export var moduleName = "adhMeinberlinDe";

export var register = (angular) => {
    angular
        .module(moduleName, [
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
            AdhMeinberlinAlexanderplatzWorkbench.registerRoutes(
                RIAlexanderplatzProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);

            var registerRoutes1 = AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                RIBuergerhaushaltProcess, RIBuergerhaushaltProposal, RIBuergerhaushaltProposalVersion);
            registerRoutes1("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes2 = AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                RIIdeaCollectionProcess, RIGeoProposal, RIGeoProposalVersion);
            registerRoutes2("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes3 = AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                RIKiezkasseProcess, RIKiezkasseProposal, RIKiezkasseProposalVersion);
            registerRoutes3("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes4 = AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                RIStadtforumProcess, RIPoll, RIProposalVersion);
            registerRoutes4("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes5 = AdhIdeaCollectionWorkbench.registerCommonRoutesFactory(
                RICollaborativeTextProcess, RIDocument, RIDocumentVersion);
            registerRoutes5("mein.berlin.de")(adhResourceAreaProvider);

            var registerRoutes6 = AdhIdeaCollectionWorkbench.registerProposalRoutesFactory(
                RIBuergerhaushaltProcess, RIBuergerhaushaltProposal, RIBuergerhaushaltProposalVersion, true);
            registerRoutes6("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes7 = AdhIdeaCollectionWorkbench.registerProposalRoutesFactory(
                RIIdeaCollectionProcess, RIGeoProposal, RIGeoProposalVersion, true);
            registerRoutes7("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes8 = AdhIdeaCollectionWorkbench.registerProposalRoutesFactory(
                RIKiezkasseProcess, RIKiezkasseProposal, RIKiezkasseProposalVersion, true);
            registerRoutes8("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes9 = AdhIdeaCollectionWorkbench.registerProposalRoutesFactory(
                RIStadtforumProcess, RIPoll, RIProposalVersion, false);
            registerRoutes9("mein.berlin.de")(adhResourceAreaProvider);
            var registerRoutes10 = AdhIdeaCollectionWorkbench.registerDocumentRoutesFactory(
                RICollaborativeTextProcess, RIDocument, RIDocumentVersion);
            registerRoutes10("mein.berlin.de")(adhResourceAreaProvider);
        }])
        .directive("adhMeinberlinDeHeader", ["adhConfig", "adhTopLevelState", AdhMeinberlinDe.headerDirective]);
};
