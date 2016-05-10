import * as AdhEmbedModule from "../../../Embed/Module";

import * as AdhEmbed from "../../../Embed/Embed";


export var moduleName = "adhMeinberlinBuergerhaushaltContext";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("buergerhaushalt", ["burgerhaushalt"]);
        }]);
};
