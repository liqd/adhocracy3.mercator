import * as AdhAbuseModule from "../../Abuse/Module";
import * as AdhCommentModule from "../../Comment/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhMovingColumnsModule from "../../MovingColumns/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";

import * as AdhMeinberlinBuergerhaushaltProcessModule from "../Buergerhaushalt/Process/Module";
import * as AdhMeinberlinProposalModule from "../../Proposal/Module";

import * as AdhProcess from "../../Process/Process";

import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";

import * as IdeaCollection from "./IdeaCollection";


export var moduleName = "adhMeinberlinIdeaCollection";

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
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider, adhConfig) => {
            var processType = RIBuergerhaushaltProcess.content_type;
            var customHeader = adhConfig.pkg_path + IdeaCollection.pkgLocation + "/CustomHeader.html";
            adhResourceAreaProvider.customHeader(processType, customHeader);
            IdeaCollection.registerRoutes(processType)(adhResourceAreaProvider);
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[RIBuergerhaushaltProcess.content_type] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-meinberlin-idea-collection-workbench></adh-meinberlin-idea-collection-workbench>");
            }];
        }])
        .directive("adhMeinberlinIdeaCollectionWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", IdeaCollection.workbenchDirective])
        .directive("adhMeinberlinIdeaCollectionProposalDetailColumn", [
            "adhConfig", "adhPermissions", IdeaCollection.proposalDetailColumnDirective])
        .directive("adhMeinberlinIdeaCollectionProposalCreateColumn", [
            "adhConfig", IdeaCollection.proposalCreateColumnDirective])
        .directive("adhMeinberlinIdeaCollectionProposalEditColumn", ["adhConfig", IdeaCollection.proposalEditColumnDirective])
        .directive("adhMeinberlinIdeaCollectionDetailColumn", ["adhConfig", IdeaCollection.detailColumnDirective])
        .directive("adhMeinberlinIdeaCollectionAddProposalButton", [
            "adhConfig", "adhPermissions", "adhTopLevelState", IdeaCollection.addProposalButtonDirective]);
};
