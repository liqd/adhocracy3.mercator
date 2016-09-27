import * as AdhHttpModule from "../../Http/Module";
import * as AdhListingModule from "../../Listing/Module";
import * as AdhMovingColumnsModule from "../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhConfig from "../../Config/Config";
import * as AdhProcess from "../../Process/Process";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import RIProcess from "../../../Resources_/adhocracy_core/resources/process/IProcess";

import * as MyWorkbench from "./MyWorkbench";

export var moduleName = "adhMyPackageMyWorkbench";


export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttpModule.moduleName,
            AdhListingModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[RIProcess.content_type] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-my-workbench></adh-my-workbench>");
            }];
        }])
        .config(["adhResourceAreaProvider", "adhConfigProvider", (
            adhResourceAreaProvider : AdhResourceArea.Provider,
            adhConfigProvider : AdhConfig.Provider
        ) => {
            var adhConfig = adhConfigProvider.config;
            var customHeader = adhConfig.pkg_path + MyWorkbench.pkgLocation + "/CustomHeader.html";
            adhResourceAreaProvider.customHeader(RIProcess.content_type, customHeader);
            MyWorkbench.registerRoutes(RIProcess.content_type)(adhResourceAreaProvider);
        }])
        .directive("adhMyWorkbench", ["adhConfig", "adhTopLevelState", MyWorkbench.workbenchDirective])
        .directive("adhMyWorkbenchProposalDetailColumn", ["adhConfig", MyWorkbench.proposalDetailColumnDirective])
        .directive("adhMyWorkbenchProposalCreateColumn", ["adhConfig", MyWorkbench.proposalCreateColumnDirective])
        .directive("adhMyWorkbenchProposalListingColumn", ["adhConfig", MyWorkbench.proposalListingColumnDirective])
        .directive("adhMyAddProposalButton", ["adhConfig", "adhPermissions", "adhTopLevelState", MyWorkbench.addProposalButton]);
};
