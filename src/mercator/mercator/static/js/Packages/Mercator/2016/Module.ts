import * as AdhMercator2016ProposalModule from "./Proposal/Module";
import * as AdhMercator2016WorkbenchModule from "./Workbench/Module";


export var moduleName = "adhMercator2016";

export var register = (angular) => {
    AdhMercator2016ProposalModule.register(angular);
    AdhMercator2016WorkbenchModule.register(angular);

    angular
        .module(moduleName, [
            AdhMercator2016ProposalModule.moduleName,
            AdhMercator2016WorkbenchModule.moduleName
        ]);
};
