import * as AdhAbuseModule from "../../Abuse/Module";
import * as AdhBadgeModule from "../../Badge/Module";
import * as AdhCommentModule from "../../Comment/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhIdeaCollectionProcessModule from "../Process/Module";
import * as AdhIdeaCollectionProposalModule from "../Proposal/Module";
import * as AdhMovingColumnsModule from "../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceActionsModule from "../../ResourceActions/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as Workbench from "./Workbench";

export var moduleName = "adhIdeaCollectionWorkbench";

export var register = (angular) => {
    AdhIdeaCollectionProcessModule.register(angular);
    AdhIdeaCollectionProposalModule.register(angular);

    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhIdeaCollectionProcessModule.moduleName,
            AdhIdeaCollectionProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceActionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .directive("adhIdeaCollectionWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", Workbench.workbenchDirective])
        .directive("adhIdeaCollectionProposalDetailColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalDetailColumnDirective])
        .directive("adhIdeaCollectionProposalCreateColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalCreateColumnDirective])
        .directive("adhIdeaCollectionProposalEditColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalEditColumnDirective])
        .directive("adhIdeaCollectionProposalImageColumn", [
            "adhConfig", "adhTopLevelState", "adhResourceUrlFilter", "adhParentPathFilter", Workbench.proposalImageColumnDirective])
        .directive("adhIdeaCollectionDetailColumn", ["adhConfig", "adhTopLevelState", Workbench.detailColumnDirective])
        .directive("adhIdeaCollectionAddProposalButton", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.addProposalButtonDirective]);
};
