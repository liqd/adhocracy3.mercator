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

import * as AdhProcess from "../../Process/Process";
import * as AdhResourceArea from "../../ResourceArea/ResourceArea";

import * as AdhMeinberlinIdeaCollectionProcessModule from "./Process/Module";
import * as AdhMeinberlinProposalModule from "../Proposal/Module";

import * as IdeaCollection from "./IdeaCollection";

import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";

export var moduleName = "adhMeinberlinIdeaCollection";

export var register = (angular) => {
    AdhMeinberlinIdeaCollectionProcessModule.register(angular);

    var processType = RIIdeaCollectionProcess.content_type;

    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMeinberlinIdeaCollectionProcessModule.moduleName,
            AdhMeinberlinProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceActionsModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .directive("adhMeinberlinIdeaCollectionWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", IdeaCollection.workbenchDirective])
        .directive("adhMeinberlinIdeaCollectionProposalDetailColumn", [
            "adhConfig",
            "adhHttp",
            "adhPermissions",
            "adhTopLevelState",
            "$location",
            "$window",
            "$translate",
            IdeaCollection.proposalDetailColumnDirective])
        .directive("adhMeinberlinIdeaCollectionProposalCreateColumn", [
            "adhConfig", IdeaCollection.proposalCreateColumnDirective])
        .directive("adhMeinberlinIdeaCollectionProposalEditColumn", ["adhConfig", IdeaCollection.proposalEditColumnDirective])
        .directive("adhMeinberlinIdeaCollectionDetailColumn", ["adhConfig", IdeaCollection.detailColumnDirective])
        .directive("adhMeinberlinIdeaCollectionEditColumn", ["adhConfig", IdeaCollection.editColumnDirective])
        .directive("adhMeinberlinIdeaCollectionAddProposalButton", [
            "adhConfig", "adhPermissions", "adhTopLevelState", IdeaCollection.addProposalButtonDirective])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider: AdhResourceArea.Provider, adhConfig) => {
            var registerRoutes = IdeaCollection.registerRoutesFactory(processType);
            registerRoutes(processType)(adhResourceAreaProvider);

            var customHeader = adhConfig.pkg_path + IdeaCollection.pkgLocation + "/CustomHeader.html";
            adhResourceAreaProvider.customHeader(processType, customHeader);
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[processType] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-meinberlin-idea-collection-workbench>" +
                    "</adh-meinberlin-idea-collection-workbench>");
            }];
        }]);
};
