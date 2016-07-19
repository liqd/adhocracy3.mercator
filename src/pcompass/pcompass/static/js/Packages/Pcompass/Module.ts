import * as AdhPcompassProposalModule from "./Proposal/Module";
import * as AdhPcompassWorkbenchModule from "./Workbench/Module";


export var moduleName = "adhPcompass";

export var register = (angular) => {
    AdhPcompassProposalModule.register(angular);
    AdhPcompassWorkbenchModule.register(angular);

    angular
        .module(moduleName, [
            AdhPcompassProposalModule.moduleName
        ]);
};
