import * as AdhEmbedModule from "../Embed/Module";
import * as AdhHomeModule from "../Home/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhNamesModule from "../Names/Module";
import * as AdhProcessModule from "../Process/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhNames from "../Names/Names";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import RIProcess from "../../Resources_/adhocracy_core/resources/process/IProcess";
import RIRootPool from "../../Resources_/adhocracy_core/resources/root/IRootPool";

import * as AdhResourceArea from "./ResourceArea";


export var moduleName = "adhResourceArea";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhHomeModule.moduleName,
            AdhHttpModule.moduleName,
            AdhNamesModule.moduleName,
            AdhProcessModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("r", ["adhResourceArea", (adhResourceArea : AdhResourceArea.Service) => adhResourceArea]);
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider.default(RIRootPool, "", "", "", {
                space: "overview"
            });
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIProcess.content_type] = "TR__RESOURCE_PROCESS";
        }])
        .provider("adhResourceArea", AdhResourceArea.Provider)
        .directive("adhResourceArea", ["adhResourceArea", "$compile", AdhResourceArea.directive])
        .filter("adhResourceName", ["adhNames", AdhResourceArea.nameFilter])
        .filter("adhParentPath", () => AdhUtil.parentPath)
        .filter("adhResourceUrl", ["adhConfig", AdhResourceArea.resourceUrl]);
};
