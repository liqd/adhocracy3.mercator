import * as AdhMeinberlinKiezkasseProcessModule from "./Process/Module";
import * as AdhMeinberlinKiezkasseWorkbenchModule from "./Workbench/Module";


export var moduleName = "adhMeinberlinKiezkasse";

export var register = (angular) => {
    AdhMeinberlinKiezkasseProcessModule.register(angular);
    AdhMeinberlinKiezkasseWorkbenchModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinberlinKiezkasseProcessModule.moduleName,
            AdhMeinberlinKiezkasseWorkbenchModule.moduleName
        ]);
};
