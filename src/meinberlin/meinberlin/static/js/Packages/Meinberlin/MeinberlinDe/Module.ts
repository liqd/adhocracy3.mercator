import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhDebateWorkbenchModule from "../../DebateWorkbench/Module";
import * as AdhMeinberlinAlexanderplatzWorkbenchModule from "../Alexanderplatz/Workbench/Module";
import * as AdhMeinberlinBuergerhaushaltWorkbenchModule from "../Buergerhaushalt/Workbench/Module";
import * as AdhMeinberlinKiezkasseWorkbenchModule from "../Kiezkasse/Workbench/Module";


import * as AdhEmbed from "../../Embed/Embed";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as AdhDebateWorkbench from "../../DebateWorkbench/DebateWorkbench";
import * as AdhMeinberlinAlexanderplatzWorkbench from "../Alexanderplatz/Workbench/Workbench";
import * as AdhMeinberlinBuergerhaushaltWorkbench from "../Buergerhaushalt/Workbench/Workbench";
import * as AdhMeinberlinKiezkasseWorkbench from "../Kiezkasse/Workbench/Workbench";

import RIAlexanderplatzProcess from "../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";
import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RICollaborativeTextProcess from "../../../Resources_/adhocracy_meinberlin/resources/collaborative_text/IProcess";
import RIKiezkasseProcess from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";

import * as AdhMeinberlinDe from "./MeinberlinDe";


export var moduleName = "adhMeinberlinDe";
export var pkgLocation = "/Meinberlin/MeinberlinDe";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhDebateWorkbenchModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhMeinberlinAlexanderplatzWorkbenchModule.moduleName,
            AdhMeinberlinBuergerhaushaltWorkbenchModule.moduleName,
            AdhMeinberlinKiezkasseWorkbenchModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", "adhConfigProvider", (adhEmbedProvider: AdhEmbed.Provider, adhConfigProvider) => {
            var adhConfig = adhConfigProvider.config;
            adhEmbedProvider.registerContext("mein.berlin.de");
            adhEmbedProvider.headerUrl = adhConfig.pkg_path + pkgLocation + "/Header.html";
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider: AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .template("mein.berlin.de", ["adhConfig", "$templateRequest", AdhMeinberlinDe.areaTemplate]);
            AdhDebateWorkbench.registerRoutes(
                RICollaborativeTextProcess, "mein.berlin.de")(adhResourceAreaProvider);
            AdhMeinberlinAlexanderplatzWorkbench.registerRoutes(
                RIAlexanderplatzProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
            AdhMeinberlinBuergerhaushaltWorkbench.registerRoutes(
                RIBuergerhaushaltProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
            AdhMeinberlinKiezkasseWorkbench.registerRoutes(
                RIKiezkasseProcess.content_type, "mein.berlin.de")(adhResourceAreaProvider);
        }])
        .directive("adhMeinberlinDeHeader", ["adhConfig", "adhTopLevelState", AdhMeinberlinDe.headerDirective]);
};
