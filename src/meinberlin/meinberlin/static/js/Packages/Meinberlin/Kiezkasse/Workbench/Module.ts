import * as AdhAbuseModule from "../../../Abuse/Module";
import * as AdhCommentModule from "../../../Comment/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhProcessModule from "../../../Process/Module";
import * as AdhResourceActionsModule from "../../../ResourceActions/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhMeinberlinKiezkasseProcessModule from "../Process/Module";
import * as AdhMeinberlinProposalModule from "../../../Proposal/Module";

import * as AdhProcess from "../../../Process/Process";

import RIKiezkasseProcess from "../../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";

import * as Workbench from "./Workbench";


export var moduleName = "adhMeinberlinKiezkasseWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMeinberlinKiezkasseProcessModule.moduleName,
            AdhMeinberlinProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceActionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider) => {
            Workbench.registerRoutes(RIKiezkasseProcess.content_type)(adhResourceAreaProvider);
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[RIKiezkasseProcess.content_type] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-meinberlin-kiezkasse-workbench></adh-meinberlin-kiezkasse-workbench>");
            }];
        }])
        .directive("adhMeinberlinKiezkasseWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", Workbench.kiezkasseWorkbenchDirective])
        .directive("adhMeinberlinKiezkasseProposalDetailColumn", [
            "adhConfig", "adhPermissions", Workbench.kiezkasseProposalDetailColumnDirective])
        .directive("adhMeinberlinKiezkasseProposalCreateColumn", ["adhConfig", Workbench.kiezkasseProposalCreateColumnDirective])
        .directive("adhMeinberlinKiezkasseProposalEditColumn", ["adhConfig", Workbench.kiezkasseProposalEditColumnDirective])
        .directive("adhMeinberlinKiezkasseDetailColumn", ["adhConfig", Workbench.kiezkasseDetailColumnDirective])
        .directive("adhMeinberlinKiezkasseEditColumn", ["adhConfig", Workbench.kiezkasseEditColumnDirective]);
};
