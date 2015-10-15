import * as AdhS1ContextModule from "./Context/Module";
import * as AdhS1ProposalModule from "./Proposal/Module";
import * as AdhS1WorkbenchModule from "./Workbench/Module";


export var moduleName = "adhS1";

export var register = (angular) => {
    AdhS1ContextModule.register(angular);
    AdhS1ProposalModule.register(angular);
    AdhS1WorkbenchModule.register(angular);

    angular
        .module(moduleName, [
            AdhS1ContextModule.moduleName,
            AdhS1ProposalModule.moduleName,
            AdhS1WorkbenchModule.moduleName
        ]);
};
