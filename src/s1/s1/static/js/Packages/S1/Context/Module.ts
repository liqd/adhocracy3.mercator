import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";
import * as AdhUserViewsModule from "../../User/ViewsModule";

import * as AdhEmbed from "../../Embed/Embed";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";
import * as AdhUserViews from "../../User/Views";

import * as AdhS1WorkbenchModule from "../Workbench/Module";
import * as AdhS1Workbench from "../Workbench/Workbench";

import RIS1Process from "../../../Resources_/adhocracy_s1/resources/s1/IProcess";

import * as Context from "./Context";


export var moduleName = "adhS1Context";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhS1WorkbenchModule.moduleName,
            AdhTopLevelStateModule.moduleName,
            AdhUserViewsModule.moduleName
        ])
        .directive("adhS1ContextHeader", ["adhConfig", "adhPermissions", "adhTopLevelState", Context.headerDirective])
        .directive("adhS1StateIndicator", ["adhConfig", "adhHttp", "adhTopLevelState", Context.stateIndicatorDirective])
        .directive("adhS1MeetingSelector", ["adhConfig", "adhHttp", "adhTopLevelState", Context.meetingSelectorDirective])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerContext("s1");
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider.template("s1", ["adhConfig", "$templateRequest", Context.areaTemplate]);
            AdhS1Workbench.registerRoutes(RIS1Process.content_type, "s1")(adhResourceAreaProvider);
            AdhUserViews.registerRoutes("s1")(adhResourceAreaProvider);
        }]);
};
