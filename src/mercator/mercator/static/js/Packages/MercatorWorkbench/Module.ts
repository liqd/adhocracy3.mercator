import * as AdhAbuseModule from "../Abuse/Module";
import * as AdhCommentModule from "../Comment/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhListingModule from "../Listing/Module";
import * as AdhMercatorProposalModule from "../MercatorProposal/Module";
import * as AdhMovingColumnsModule from "../MovingColumns/Module";
import * as AdhPermissionsModule from "../Permissions/Module";
import * as AdhResourceActionsModule from "../ResourceActions/Module";
import * as AdhResourceAreaModule from "../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";
import * as AdhUserModule from "../User/Module";

import RIProcess from "../../Resources_/adhocracy_mercator/resources/mercator/IProcess";

import * as MercatorWorkbench from "./MercatorWorkbench";


export var moduleName = "adhMercatorWorkbench";

export var register = (angular) => {
    var processType = RIProcess.content_type;

    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhListingModule.moduleName,
            AdhMercatorProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhResourceActionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName,
            AdhUserModule.moduleName
        ])
        .config(["adhResourceAreaProvider", MercatorWorkbench.registerRoutes(RIProcess.content_type)])
        .config(["adhProcessProvider", (adhProcessProvider) => {
            adhProcessProvider.templateFactories[processType] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-mercator-workbench></adh-mercator-workbench>");
            }];
        }])
        .directive("adhMercatorWorkbench", ["adhConfig", "adhTopLevelState", MercatorWorkbench.mercatorWorkbenchDirective])
        .directive("adhMercatorProposalCreateColumn", [
            "adhConfig", "adhResourceUrlFilter", "$location", MercatorWorkbench.mercatorProposalCreateColumnDirective])
        .directive("adhMercatorProposalDetailColumn", [
            "$window", "adhTopLevelState", "adhPermissions", "adhConfig", MercatorWorkbench.mercatorProposalDetailColumnDirective])
        .directive("adhMercatorProposalEditColumn", [
            "adhConfig", "adhResourceUrlFilter", "$location", MercatorWorkbench.mercatorProposalEditColumnDirective])
        .directive("adhMercatorProposalListingColumn",
            ["adhConfig", "adhHttp", "adhTopLevelState", MercatorWorkbench.mercatorProposalListingColumnDirective]);
};
