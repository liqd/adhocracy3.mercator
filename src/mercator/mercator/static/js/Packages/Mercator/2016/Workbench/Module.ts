import * as AdhHttpModule from "../../../Http/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhProcessModule from "../../../Process/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import RIMercator2016Process from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IProcess";

import * as AdhMercator2015WorkbenchModule from "../../2015/Workbench/Module";
import * as AdhMercator2016ProposalModule from "../Proposal/Module";

import * as Workbench from "./Workbench";


export var moduleName = "adhMercator2016Workbench";

export var register = (angular) => {
    var processType = RIMercator2016Process.content_type;

    angular
        .module(moduleName, [
            AdhHttpModule.moduleName,
            AdhMercator2015WorkbenchModule.moduleName,
            AdhMercator2016ProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", "adhConfigProvider", (adhResourceAreaProvider, adhConfigProvider) => {
            var adhConfig = adhConfigProvider.config;
            var processType = RIMercator2016Process.content_type;
            var customHeader = adhConfig.pkg_path + Workbench.pkgLocation + "/CustomHeader.html";
            adhResourceAreaProvider.customHeader(processType, customHeader);
            Workbench.registerRoutes(processType)(adhResourceAreaProvider);
        }])
        .config(["adhProcessProvider", (adhProcessProvider) => {
            adhProcessProvider.templateFactories[processType] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-mercator-2016-workbench></adh-mercator-2016-workbench>");
            }];
        }])
        .directive("adhMercator2016Workbench", ["adhConfig", "adhTopLevelState", Workbench.workbenchDirective])
        .directive("adhMercator2016ProposalCreateColumn", [
            "adhConfig", "adhResourceUrlFilter", "$location", Workbench.proposalCreateColumnDirective])
        .directive("adhMercator2016ProposalDetailColumn", [
            "$window", "adhTopLevelState", "adhPermissions", "adhConfig", Workbench.proposalDetailColumnDirective])
        .directive("adhMercator2016ProposalModerateColumn", [
            "adhConfig", "adhResourceUrlFilter", "$location", Workbench.proposalModerateColumnDirective])
        .directive("adhMercator2016ProposalEditColumn", [
            "adhConfig", "adhResourceUrlFilter", "$location", Workbench.proposalEditColumnDirective])
        .directive("adhMercator2016ProposalListingColumn",
            ["adhConfig", "adhHttp", "adhTopLevelState", Workbench.proposalListingColumnDirective])
        .directive("adhMercator2016AddProposalButton", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.addProposalButton]);
};
