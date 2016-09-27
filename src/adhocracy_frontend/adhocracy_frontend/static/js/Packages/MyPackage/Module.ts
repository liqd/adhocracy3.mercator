import * as AdhMyPackageMyProposalModule from "./MyProposal/Module";
import * as AdhMyPackageMyWorkbenchModule from "./MyWorkbench/Module";

export var moduleName = "adhMyPackage";


export var register = (angular) => {
    AdhMyPackageMyWorkbenchModule.register(angular);
    AdhMyPackageMyProposalModule.register(angular);

    angular
        .module(moduleName, [
            AdhMyPackageMyWorkbenchModule.moduleName,
            AdhMyPackageMyProposalModule.moduleName
        ]);
};
