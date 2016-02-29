import * as AdhAbuseModule from "../../../Abuse/Module";
import * as AdhCommentModule from "../../../Comment/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhProcessModule from "../../../Process/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";

import * as AdhMeinberlinBuergerhaushaltProcessModule from "../Process/Module";
import * as AdhMeinberlinProposalModule from "../../../Proposal/Module";

import * as AdhProcess from "../../../Process/Process";

import RIBuergerhaushaltProcess from "../../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";

import * as Workbench from "./Workbench";


export var moduleName = "adhMeinberlinBuergerhaushaltWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMeinberlinBuergerhaushaltProcessModule.moduleName,
            AdhMeinberlinProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", "adhConfigProvider", (adhResourceAreaProvider, adhConfigProvider) => {
            var adhConfig = adhConfigProvider.config;
            var processType = RIBuergerhaushaltProcess.content_type;
            var customHeader = adhConfig.pkg_path + Workbench.pkgLocation + "/CustomHeader.html";
            adhResourceAreaProvider.customHeader(processType, customHeader);
            Workbench.registerRoutes(processType)(adhResourceAreaProvider);
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[RIBuergerhaushaltProcess.content_type] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-meinberlin-buergerhaushalt-workbench></adh-meinberlin-buergerhaushalt-workbench>");
            }];
        }])
        .directive("adhMeinberlinBuergerhaushaltWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", Workbench.buergerhaushaltWorkbenchDirective])
        .directive("adhMeinberlinBuergerhaushaltProposalDetailColumn", [
            "adhConfig", "adhPermissions", Workbench.buergerhaushaltProposalDetailColumnDirective])
        .directive("adhMeinberlinBuergerhaushaltProposalCreateColumn", [
            "adhConfig", Workbench.buergerhaushaltProposalCreateColumnDirective])
        .directive("adhMeinberlinBuergerhaushaltProposalEditColumn", ["adhConfig", Workbench.buergerhaushaltProposalEditColumnDirective])
        .directive("adhMeinberlinBuergerhaushaltDetailColumn", ["adhConfig", Workbench.buergerhaushaltDetailColumnDirective]);
};
