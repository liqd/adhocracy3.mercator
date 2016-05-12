import * as AdhAbuseModule from "../../Abuse/Module";
import * as AdhCommentModule from "../../Comment/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhMovingColumnsModule from "../../MovingColumns/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";

import * as AdhMeinberlinIdeaCollectionProcessModule from "./Process/Module";
import * as AdhMeinberlinProposalModule from "../Proposal/Module";

import * as AdhProcess from "../../Process/Process";

import RIBuergerhaushaltProcess from "../../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RIIdeaCollectionProcess from "../../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";
import RIKiezkasseProcess from "../../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";

import * as IdeaCollection from "./IdeaCollection";


export var moduleName = "adhMeinberlinIdeaCollection";

export var register = (angular) => {
    AdhMeinberlinIdeaCollectionProcessModule.register(angular);

    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMeinberlinIdeaCollectionProcessModule.moduleName,
            AdhMeinberlinProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", "adhConfig", (adhResourceAreaProvider, adhConfig) => {
            var buergerhaushaltType : string = RIBuergerhaushaltProcess.content_type;
            var ideaCollectionType: string = RIIdeaCollectionProcess.content_type;
            var kiezkasseType : string = RIKiezkasseProcess.content_type;
            var customHeader = adhConfig.pkg_path + IdeaCollection.pkgLocation + "/CustomHeader.html";

            adhResourceAreaProvider.customHeader(buergerhaushaltType, customHeader);
            IdeaCollection.registerRoutesFactory(buergerhaushaltType)(buergerhaushaltType)(adhResourceAreaProvider);

            adhResourceAreaProvider.customHeader(ideaCollectionType, customHeader);
            IdeaCollection.registerRoutesFactory(ideaCollectionType)(ideaCollectionType)(adhResourceAreaProvider);

            adhResourceAreaProvider.customHeader(kiezkasseType, customHeader);
            IdeaCollection.registerRoutesFactory(kiezkasseType)(kiezkasseType)(adhResourceAreaProvider);
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[RIBuergerhaushaltProcess.content_type] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-meinberlin-idea-collection-workbench data-is-buergerhaushalt=\"true\">" +
                    "</adh-meinberlin-idea-collection-workbench>");
            }];
            adhProcessProvider.templateFactories[RIIdeaCollectionProcess.content_type] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-meinberlin-idea-collection-workbench>" +
                    "</adh-meinberlin-idea-collection-workbench>");
            }];
            adhProcessProvider.templateFactories[RIKiezkasseProcess.content_type] = ["$q", ($q: angular.IQService) => {
                return $q.when("<adh-meinberlin-idea-collection-workbench data-is-kiezkasse=\"true\">" +
                    "</adh-meinberlin-idea-collection-workbench>");
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
        .directive("adhMeinberlinIdeaCollectionEditColumn", ["adhConfig", IdeaCollection.editColumnDirective])
        .directive("adhMeinberlinIdeaCollectionAddProposalButton", [
            "adhConfig", "adhPermissions", "adhTopLevelState", IdeaCollection.addProposalButtonDirective]);
};
