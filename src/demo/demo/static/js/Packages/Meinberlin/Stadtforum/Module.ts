import * as AdhMeinberlinStadtforumProposalModule from "./Proposal/Module";


export var moduleName = "adhMeinBerlinStadtforum";

export var register = (angular) => {
    AdhMeinberlinStadtforumProposalModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinberlinStadtforumProposalModule.moduleName,
        ]);
};
