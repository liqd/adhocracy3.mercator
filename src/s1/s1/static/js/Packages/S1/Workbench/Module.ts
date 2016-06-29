import * as AdhCommentModule from "../../Comment/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhProcessModule from "../../Process/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhProcess from "../../Process/Process";

import RIS1Process from "../../../Resources_/adhocracy_s1/resources/s1/IProcess";

import * as Workbench from "./Workbench";


export var moduleName = "adhS1Workbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhCommentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", Workbench.registerRoutes(RIS1Process.content_type)])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templates[RIS1Process.content_type] = "<adh-s1-workbench></adh-s1-workbench>";
        }])
        .directive("adhS1Workbench", ["adhConfig", "adhTopLevelState", Workbench.s1WorkbenchDirective])
        .directive("adhS1Landing", ["$translate", "adhConfig", "adhTopLevelState", Workbench.s1LandingDirective])
        .directive("adhS1CurrentColumn", ["adhConfig", "adhHttp", "adhTopLevelState", Workbench.s1CurrentColumnDirective])
        .directive("adhS1NextColumn", ["adhConfig", "adhHttp", "adhTopLevelState", Workbench.s1NextColumnDirective])
        .directive("adhS1ArchiveColumn", ["adhConfig", "adhHttp", "adhTopLevelState", Workbench.s1ArchiveColumnDirective])
        .directive("adhS1ProposalDetailColumn", [
            "adhConfig", "adhPermissions", "adhTopLevelState", Workbench.s1ProposalDetailColumnDirective])
        .directive("adhS1ProposalCreateColumn", ["adhConfig", "adhTopLevelState", Workbench.s1ProposalCreateColumnDirective])
        .directive("adhS1ProposalEditColumn", ["adhConfig", "adhTopLevelState", Workbench.s1ProposalEditColumnDirective]);
};
