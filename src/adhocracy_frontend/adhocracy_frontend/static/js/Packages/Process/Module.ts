import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhProcess from "./Process";


export var moduleName = "adhProcess";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhTopLevelStateModule.moduleName
        ])
        .provider("adhProcess", AdhProcess.Provider)
        .directive("adhWorkflowSwitch", ["adhConfig", "adhHttp", "adhPermissions", "$window", AdhProcess.workflowSwitchDirective])
        .directive("adhProcessView", ["adhTopLevelState", "adhProcess", "$compile", AdhProcess.processViewDirective])
        .directive("adhProcessButtonSlot", ["adhTopLevelState", "adhProcess", "$compile", AdhProcess.processButtonSlot])
        .directive("adhProcessListItem", AdhProcess.listItemDirective)
        .directive("adhProcessListing", ["adhConfig", AdhProcess.listingDirective]);
};
