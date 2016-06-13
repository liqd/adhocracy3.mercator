import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";

import * as AdhMeinberlinIdeaCollectionModule from "../IdeaCollection/Module";

import * as AdhEmbed from "../../Embed/Embed";
import * as AdhProcess from "../../Process/Process";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as AdhMeinberlinIdeaCollection from "../IdeaCollection/IdeaCollection";

import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";


export var moduleName = "adhMeinberlinBuergerhaushalt";

export var register = (angular) => {
    var processType = RIBuergerhaushaltProcess.content_type;

    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhMeinberlinIdeaCollectionModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("buergerhaushalt", ["burgerhaushalt"]);
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            var registerRoutes = AdhMeinberlinIdeaCollection.registerRoutesFactory(processType);
            registerRoutes(processType)(adhResourceAreaProvider);
            registerRoutes(processType, "buergerhaushalt")(adhResourceAreaProvider);
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] =
                "<adh-meinberlin-idea-collection-workbench data-is-buergerhaushalt=\"true\"></adh-meinberlin-idea-collection-workbench>";
            adhProcessProvider.buttons[processType] = "<adh-meinberlin-add-proposal-button>"
                + "</adh-meinberlin-add-proposal-button>";
        }]);
};
