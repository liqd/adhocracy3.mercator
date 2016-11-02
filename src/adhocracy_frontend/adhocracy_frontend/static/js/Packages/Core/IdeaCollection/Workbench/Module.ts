import * as AdhAbuseModule from "../../Abuse/Module";
import * as AdhBadgeModule from "../../Badge/Module";
import * as AdhCommentModule from "../../Comment/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhMovingColumnsModule from "../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceActionsModule from "../../ResourceActions/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as Workbench from "./Workbench";

export var moduleName = "adhIdeaCollectionWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceActionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        // the (document-focused) IdeaCollection is also registered under the directive name
        // "adhDebateWorkbench" such as not to break currently running embeds.
        .directive("adhDebateWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", Workbench.workbenchDirective])
        .directive("adhIdeaCollectionWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", Workbench.workbenchDirective])
        .directive("adhDocumentDetailColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.documentDetailColumnDirective])
        .directive("adhDocumentCreateColumn", [
            "adhConfig", "adhTopLevelState", Workbench.documentCreateColumnDirective])
        .directive("adhDocumentEditColumn", [
            "adhConfig", "adhTopLevelState", Workbench.documentEditColumnDirective])
        .directive("adhIdeaCollectionProposalDetailColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalDetailColumnDirective])
        .directive("adhIdeaCollectionProposalCreateColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalCreateColumnDirective])
        .directive("adhIdeaCollectionProposalEditColumn", [
            "adhConfig", "adhTopLevelState", Workbench.proposalEditColumnDirective])
        .directive("adhIdeaCollectionProposalImageColumn", [
            "adhConfig", "adhTopLevelState", "adhResourceUrlFilter", "adhParentPathFilter", Workbench.proposalImageColumnDirective])
        .directive("adhIdeaCollectionDetailColumn", ["adhConfig", "adhTopLevelState", Workbench.detailColumnDirective])
        .directive("adhIdeaCollectionAddDocumentButton", [
            "adhConfig", "adhHttp", "adhPermissions", "adhTopLevelState", Workbench.addDocumentButtonDirective])
        .directive("adhIdeaCollectionAddProposalButton", [
            "adhConfig", "adhHttp", "adhPermissions", "adhTopLevelState", Workbench.addProposalButtonDirective]);
};
