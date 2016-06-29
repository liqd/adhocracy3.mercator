import * as AdhAbuseModule from "../../../Abuse/Module";
import * as AdhCommentModule from "../../../Comment/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhListingModule from "../../../Listing/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhResourceActionsModule from "../../../ResourceActions/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";
import * as AdhUserModule from "../../../User/Module";

import RIProcess from "../../../../Resources_/adhocracy_mercator/resources/mercator/IProcess";

import * as AdhMercator2015ProposalModule from "../Proposal/Module";

import * as Workbench from "./Workbench";


export var moduleName = "adhMercator2015Workbench";

export var register = (angular) => {
    var processType = RIProcess.content_type;

    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhListingModule.moduleName,
            AdhMercator2015ProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhResourceActionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName,
            AdhUserModule.moduleName
        ])
        .config(["adhResourceAreaProvider", Workbench.registerRoutes(RIProcess.content_type)])
        .config(["adhProcessProvider", (adhProcessProvider) => {
            adhProcessProvider.templates[processType] =
                "<adh-mercator-2015-workbench></adh-mercator-2015-workbench>";
        }])
        .directive("adhMercator2015Workbench", ["adhConfig", "adhTopLevelState", Workbench.workbenchDirective])
        .directive("adhMercator2015ProposalCreateColumn", [
            "adhConfig", "adhTopLevelState", "adhResourceUrlFilter", "$location", Workbench.proposalCreateColumnDirective])
        .directive("adhMercator2015ProposalDetailColumn", [
            "adhTopLevelState", "adhPermissions", "adhConfig", Workbench.proposalDetailColumnDirective])
        .directive("adhMercator2015ProposalEditColumn", [
            "adhConfig", "adhTopLevelState", "adhResourceUrlFilter", "$location", Workbench.proposalEditColumnDirective])
        .directive("adhMercator2015ProposalListingColumn",
            ["adhConfig", "adhHttp", "adhTopLevelState", Workbench.proposalListingColumnDirective]);
};
