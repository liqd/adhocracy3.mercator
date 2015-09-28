import * as AdhEmbedModule from "../../../Embed/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhMeinBerlinStadtforumWorkbenchModule from "../Workbench/Module";

import * as AdhEmbed from "../../../Embed/Embed";
import * as AdhResourceArea from "../../../ResourceArea/ResourceArea";

import * as AdhMeinBerlinStadtforumWorkbench from "../Workbench/Workbench";

// FIXME: import RIStadtforumProcess from "../../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IProcess";

import * as Context from "./Context";


export var moduleName = "adhMeinBerlinStadtforumContext";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhMeinBerlinStadtforumWorkbenchModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .directive("adhStadtforumContextHeader", ["adhConfig", "adhPermissions", "adhTopLevelState", Context.headerDirective])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("stadtforum");
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider.template("stadtforum", ["adhConfig", "$templateRequest", Context.areaTemplate]);
            /* FIXME
            AdhMeinBerlinStadtforumWorkbench.registerRoutes(
                RIStadtforumProcess.content_type,
                "stadtforum"
            )(adhResourceAreaProvider); */
        }]);
};
