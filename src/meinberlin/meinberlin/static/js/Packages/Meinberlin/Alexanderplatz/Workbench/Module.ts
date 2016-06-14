import * as AdhDocumentModule from "../../../Document/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhMappingModule from "../../../Mapping/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhProcessModule from "../../../Process/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import RIAlexanderplatzProcess from "../../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";

import * as AdhProcess from "../../../Process/Process";

import * as Workbench from "./Workbench";


export var moduleName = "adhMeinberlinAlexanderplatzWorkbench";

export var register = (angular) => {
    var processType = RIAlexanderplatzProcess.content_type;

    angular
        .module(moduleName, [
            AdhDocumentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMappingModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] =
                "<adh-meinberlin-alexanderplatz-workbench></adh-meinberlin-alexanderplatz-workbench>";
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider, adhConfig) => {
            var processType = RIAlexanderplatzProcess.content_type;
            var customHeader = adhConfig.pkg_path + Workbench.pkgLocation + "/CustomHeader.html";
            adhResourceAreaProvider.customHeader(processType, customHeader);
            Workbench.registerRoutes(processType)(adhResourceAreaProvider);
        }])
        .directive("adhMeinberlinAlexanderplatzWorkbench", [
            "adhConfig", "adhTopLevelState", Workbench.workbenchDirective])
        .directive("adhMeinberlinAlexanderplatzProcessColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", "adhHttp", Workbench.processDetailColumnDirective])
        .directive("adhMeinberlinAlexanderplatzDocumentDetailColumn", [
            "adhConfig",
            "adhPermissions",
            "adhTopLevelState",
            "adhHttp",
            "adhResourceUrlFilter",
            "$location",
            "$window",
            "$translate",
            Workbench.documentDetailColumnDirective])
        .directive("adhMeinberlinAlexanderplatzProposalDetailColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.proposalDetailColumnDirective])
        .directive("adhMeinberlinAlexanderplatzDocumentCreateColumn", [
            "adhConfig", "adhHttp", "adhTopLevelState", "adhResourceUrlFilter", Workbench.documentCreateColumnDirective])
        .directive("adhMeinberlinAlexanderplatzProposalCreateColumn", [
            "adhConfig", "adhTopLevelState", "adhResourceUrlFilter", Workbench.proposalCreateColumnDirective])
        .directive("adhMeinberlinAlexanderplatzDocumentEditColumn", [
            "adhConfig", "adhHttp", "adhTopLevelState", "adhResourceUrlFilter", Workbench.documentEditColumnDirective])
        .directive("adhMeinberlinAlexanderplatzProposalEditColumn", [
            "adhConfig", "adhTopLevelState", "adhResourceUrlFilter", Workbench.proposalEditColumnDirective])
        .directive("adhMeinberlinAlexanderplatzAddProposalButton", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.addProposalButtonDirective]);
};
