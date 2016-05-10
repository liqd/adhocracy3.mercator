import * as AdhMeinberlinBuergerhaushaltContextModule from "./Context/Module";
import * as AdhMeinberlinBuergerhaushaltProcessModule from "./Process/Module";


export var moduleName = "adhMeinberlinBuergerhaushalt";

export var register = (angular) => {
    AdhMeinberlinBuergerhaushaltContextModule.register(angular);
    AdhMeinberlinBuergerhaushaltProcessModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinberlinBuergerhaushaltContextModule.moduleName,
            AdhMeinberlinBuergerhaushaltProcessModule.moduleName,
            AdhMeinberlinBuergerhaushaltProcessModule.moduleName
        ]);
};
