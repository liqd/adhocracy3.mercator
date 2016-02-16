import * as AdhAbuseModule from "../Abuse/Module";
import * as AdhCommentModule from "../Comment/Module";
import * as AdhDocumentModule from "../Document/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhMovingColumnsModule from "../MovingColumns/Module";
import * as AdhPermissionsModule from "../Permissions/Module";
import * as AdhProcessModule from "../Process/Module";
import * as AdhResourceAreaModule from "../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhProcess from "../Process/Process";

import RIDigitalLebenProcess from "../../Resources_/adhocracy_spd/resources/digital_leben/IProcess";

import * as SpdWorkbench from "./spdWorkbench";


export var moduleName = "adhSPDWorkbench";

export var register = (angular) => {
    var processType = RIDigitalLebenProcess.content_type;

    angular
        .module(moduleName, [
            AdhAbuseModule.moduleName,
            AdhCommentModule.moduleName,
            AdhDocumentModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhProcessModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhProcessProvider", (adhProcessProvider : AdhProcess.Provider) => {
            adhProcessProvider.templateFactories[processType] = ["$q", ($q : angular.IQService) => {
                return $q.when("<adh-spd-workbench></adh-spd-workbench>");
            }];
        }])
        .config(["adhResourceAreaProvider", SpdWorkbench.registerRoutes(processType)])
        .directive("adhSpdWorkbench", ["adhConfig", "adhTopLevelState", SpdWorkbench.spdWorkbenchDirective])
        .directive("adhDocumentDetailColumn", ["adhConfig", "adhPermissions", SpdWorkbench.documentDetailColumnDirective])
        .directive("adhDocumentCreateColumn", ["adhConfig", SpdWorkbench.documentCreateColumnDirective])
        .directive("adhDocumentEditColumn", ["adhConfig", SpdWorkbench.documentEditColumnDirective])
        .directive("adhSpdProcessDetailColumn", ["adhConfig", "adhPermissions", SpdWorkbench.processDetailColumnDirective])
        .directive("adhSpdProcessDetailAnnounceColumn", ["adhConfig", SpdWorkbench.processDetailAnnounceColumnDirective]);
};
