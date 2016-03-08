import * as AdhMeinberlinBuergerhaushaltProcessModule from "./Process/Module";
import * as AdhMeinberlinBuergerhaushaltWorkbenchModule from "./Workbench/Module";


export var moduleName = "adhMeinberlinBuergerhaushalt";

export var register = (angular) => {
    AdhMeinberlinBuergerhaushaltProcessModule.register(angular);
    AdhMeinberlinBuergerhaushaltWorkbenchModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinberlinBuergerhaushaltProcessModule.moduleName,
            AdhMeinberlinBuergerhaushaltWorkbenchModule.moduleName
        ]);
};
