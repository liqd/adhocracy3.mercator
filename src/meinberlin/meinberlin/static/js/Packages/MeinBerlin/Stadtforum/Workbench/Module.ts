import * as AdhAbuseModule from "../../../Abuse/Module";
import * as AdhCommentModule from "../../../Comment/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhProcessModule from "../../../Process/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhMeinBerlinStadtforumProcessModule from "../Process/Module";
import * as AdhMeinBerlinProposalModule from "../../../Proposal/Module";

import * as AdhProcess from "../../../Process/Process";

// FIXME: import RIStadtforumProcess from "../../../../Resources_/adhocracy_meinberlin/resources/stadtforum/IProcess";

import * as Workbench from "./Workbench";


export var moduleName = "adhMeinBerlinStadtforumWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMeinBerlinStadtforumProcessModule.moduleName,
            AdhMeinBerlinProposalModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider) => {
            // FIXME: Workbench.registerRoutes(RIStadtforumProcess.content_type)(adhResourceAreaProvider);
        }])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            /* FIXME:
            adhProcessProvider.templateFactories[RIStadtforumProcess.content_type] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-mein-berlin-stadtforum-workbench></adh-mein-berlin-stadtforum-workbench>");
            }]; */
        }])
        .directive("adhMeinBerlinStadtforumWorkbench", [
            "adhTopLevelState", "adhConfig", "adhHttp", Workbench.stadtforumWorkbenchDirective])
        .directive("adhMeinBerlinStadtforumProposalDetailColumn", [
            "adhConfig", "adhPermissions", Workbench.stadtforumProposalDetailColumnDirective])
        .directive("adhMeinBerlinStadtforumProposalCreateColumn", ["adhConfig", Workbench.stadtforumProposalCreateColumnDirective])
        .directive("adhMeinBerlinStadtforumProposalEditColumn", ["adhConfig", Workbench.stadtforumProposalEditColumnDirective])
        .directive("adhMeinBerlinStadtforumDetailColumn", ["adhConfig", Workbench.stadtforumDetailColumnDirective])
        .directive("adhMeinBerlinStadtforumEditColumn", ["adhConfig", Workbench.stadtforumEditColumnDirective]);
};
