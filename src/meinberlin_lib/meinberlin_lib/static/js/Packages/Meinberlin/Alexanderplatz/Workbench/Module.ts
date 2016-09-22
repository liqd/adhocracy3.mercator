import * as AdhDocumentModule from "../../../Document/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhIdeaCollectionModule from "../../../IdeaCollection/Module";
import * as AdhMappingModule from "../../../Mapping/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhNamesModule from "../../../Names/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhProcessModule from "../../../Process/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhIdeaCollectionWorkbench from "../../../IdeaCollection/Workbench/Workbench";
import * as AdhNames from "../../../Names/Names";
import * as AdhProcess from "../../../Process/Process";

import RIAlexanderplatzProcess from "../../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";
import RIGeoProposal from "../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";

import * as Workbench from "./Workbench";


export var moduleName = "adhMeinberlinAlexanderplatzWorkbench";

export var register = (angular) => {
    var processType = RIAlexanderplatzProcess.content_type;

    angular
        .module(moduleName, [
            AdhDocumentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhIdeaCollectionModule.moduleName,
            AdhMappingModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhNamesModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[processType] = "<adh-meinberlin-alexanderplatz-workbench " +
                "data-process-properties=\"processProperties\"></adh-meinberlin-alexanderplatz-workbench>";
            adhProcessProvider.processProperties[processType] = {
                hasLocation: true,
                proposalClass: RIGeoProposal,
                proposalVersionClass: RIGeoProposalVersion
            };
        }])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider, adhConfig) => {
            var processType = RIAlexanderplatzProcess.content_type;
            var processHeaderSlot = adhConfig.pkg_path + AdhIdeaCollectionWorkbench.pkgLocation + "/ProcessHeaderSlot.html";
            adhResourceAreaProvider.processHeaderSlots[processType] = processHeaderSlot;
            Workbench.registerRoutes(processType)(adhResourceAreaProvider);
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIAlexanderplatzProcess.content_type] = "TR__RESOURCE_ALEXANDERPLATZ";
            adhNamesProvider.names[RIGeoProposalVersion.content_type] = "TR__RESOURCE_PROPOSAL";
        }])
        .directive("adhMeinberlinAlexanderplatzWorkbench", ["adhConfig", "adhTopLevelState", Workbench.workbenchDirective])
        .directive("adhMeinberlinAlexanderplatzProcessColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", "adhHttp", Workbench.processDetailColumnDirective])
        .directive("adhMeinberlinAlexanderplatzDocumentDetailColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.documentDetailColumnDirective])
        .directive("adhMeinberlinAlexanderplatzProposalDetailColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.proposalDetailColumnDirective])
        .directive("adhMeinberlinAlexanderplatzDocumentCreateColumn", [
            "adhConfig", "adhHttp", "adhTopLevelState", Workbench.documentCreateColumnDirective])
        .directive("adhMeinberlinAlexanderplatzProposalCreateColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalCreateColumnDirective])
        .directive("adhMeinberlinAlexanderplatzDocumentEditColumn", [
            "adhConfig", "adhHttp", "adhTopLevelState", Workbench.documentEditColumnDirective])
        .directive("adhMeinberlinAlexanderplatzProposalEditColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalEditColumnDirective]);
};
