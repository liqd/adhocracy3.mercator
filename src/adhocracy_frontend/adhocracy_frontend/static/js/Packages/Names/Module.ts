import * as Names from "./Names";

import RIProposal from "../../Resources_/adhocracy_core/resources/proposal/IProposal";

export var moduleName = "adhNames";


export var register = (angular) => {
    angular
        .module(moduleName, [])
        .provider("adhNames", Names.Provider)
        // these are core resources that don't have any other logical place to be named
        .config(["adhNamesProvider", (adhNamesProvider : Names.Provider) => {
            adhNamesProvider.names[RIProposal.content_type] = "TR__RESOURCE_PROPOSAL";
        }]);
};
