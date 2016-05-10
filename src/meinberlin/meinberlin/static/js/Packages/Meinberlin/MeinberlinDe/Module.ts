import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhDebateWorkbenchModule from "../../DebateWorkbench/Module";
import * as AdhMeinberlinAlexanderplatzWorkbenchModule from "../Alexanderplatz/Workbench/Module";
import * as AdhMeinberlinIdeaCollectionModule from "../IdeaCollection/Module";
import * as AdhMeinberlinKiezkasseWorkbenchModule from "../Kiezkasse/Workbench/Module";

import * as AdhEmbed from "../../Embed/Embed";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as AdhDebateWorkbench from "../../DebateWorkbench/DebateWorkbench";
import * as AdhMeinberlinAlexanderplatzWorkbench from "../Alexanderplatz/Workbench/Workbench";
import * as AdhMeinberlinIdeaCollection from "../IdeaCollection/IdeaCollection";
import * as AdhMeinberlinKiezkasseWorkbench from "../Kiezkasse/Workbench/Workbench";

import RIAlexanderplatzProcess from "../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";
import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RICollaborativeTextProcess from "../../../Resources_/adhocracy_meinberlin/resources/collaborative_text/IProcess";
import RIKiezkasseProcess from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";

import * as AdhMeinberlinDe from "./MeinberlinDe";


export var moduleName = "adhMeinberlinDe";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhDebateWorkbenchModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhMeinberlinAlexanderplatzWorkbenchModule.moduleName,
            AdhMeinberlinIdeaCollectionModule.moduleName,
            AdhMeinberlinKiezkasseWorkbenchModule.moduleName,
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
            AdhMeinberlinIdeaCollection.registerRoutes(
                RIBuergerhaushaltProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
            AdhMeinberlinKiezkasseWorkbench.registerRoutes(
                RIKiezkasseProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
        }])
        .directive("adhMeinberlinDeHeader", ["adhConfig", "adhTopLevelState", AdhMeinberlinDe.headerDirective]);
};
