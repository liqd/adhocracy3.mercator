import * as AdhMarkdownModule from "../Markdown/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

import * as AdhProcess from "./Process";


export var moduleName = "adhProcess";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhMarkdownModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .provider("adhProcess", AdhProcess.Provider)
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("home", () : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/Home.html"
                    };
                });
        }])
        .directive("adhWorkflowSwitch", ["adhConfig", "adhHttp", "adhPermissions", "$window", AdhProcess.workflowSwitchDirective])
        .directive("adhProcessView", ["adhTopLevelState", "adhProcess", "$compile", AdhProcess.processViewDirective])
        .directive("adhProcessListItem", ["adhConfig", "adhHttp", AdhProcess.listItemDirective])
        .directive("adhProcessListing", ["adhConfig", "$translate", AdhProcess.listingDirective])
        .directive("adhCurrentProcessTitle", ["adhTopLevelState", "adhHttp", AdhProcess.currentProcessTitleDirective]);
};
