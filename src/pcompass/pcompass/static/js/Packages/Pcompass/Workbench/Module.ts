import * as AdhAbuseModule from "../../Abuse/Module";
import * as AdhCommentModule from "../../Comment/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhMovingColumnsModule from "../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhProposalModule from "../Proposal/Module";

import * as AdhProcess from "../../Process/Process";

import RIPcompassProcess from "../../../Resources_/adhocracy_pcompass/resources/request/IProcess";

import * as Workbench from "./Workbench";


export var moduleName = "adhPcompassWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhProposalModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", Workbench.registerRoutes(RIPcompassProcess.content_type)])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[RIPcompassProcess.content_type] =
                "<adh-pcompass-workbench></adh-pcompass-workbench>";
        }])
        .directive("adhPcompassWorkbench", ["adhTopLevelState", "adhConfig", "adhHttp", Workbench.workbenchDirective])
        .directive("adhPcompassProposalDetailColumn", [
            "adhConfig", "adhHttp", "adhPermissions", "adhTopLevelState", Workbench.proposalDetailColumnDirective])
        .directive("adhPcompassProposalCreateColumn", ["adhConfig", "adhTopLevelState", Workbench.proposalCreateColumnDirective])
        .directive("adhPcompassProposalEditColumn", ["adhConfig", "adhTopLevelState", Workbench.proposalEditColumnDirective])
        .directive("adhPcompassProcessDetailColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.processDetailColumnDirective]);
};
