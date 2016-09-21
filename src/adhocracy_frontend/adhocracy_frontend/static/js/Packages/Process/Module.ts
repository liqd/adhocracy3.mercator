import * as AdhHttpModule from "../Http/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhProcess from "./Process";


export var moduleName = "adhProcess";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttpModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .provider("adhProcess", AdhProcess.Provider)
        .directive("adhWorkflowSwitch", [
            "adhConfig", "adhHttp", "adhPermissions", "$q", "$translate", "$window", AdhProcess.workflowSwitchDirective])
        .directive("adhProcessView", ["adhTopLevelState", "adhProcess", "$compile", AdhProcess.processViewDirective])
        .directive("adhCurrentProcessTitle", ["adhTopLevelState", "adhHttp", AdhProcess.currentProcessTitleDirective]);
};
