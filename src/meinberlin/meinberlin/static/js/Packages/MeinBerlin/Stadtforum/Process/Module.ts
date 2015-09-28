import * as AdhHttpModule from "../../../Http/Module";
import * as AdhMovingColumnsModule from "../../../MovingColumns/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhTabsModule from "../../../Tabs/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhMeinBerlinPhaseModule from "../../Phase/Module";

import * as Process from "./Process";


export var moduleName = "adhMeinBerlinStadtforumProcess";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttpModule.moduleName,
            AdhMeinBerlinPhaseModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhTabsModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .directive("adhMeinBerlinStadtforumPhaseHeader", ["adhConfig", "adhHttp", "adhTopLevelState", Process.phaseHeaderDirective])
        .directive("adhMeinBerlinStadtforumDetail", ["adhConfig", "adhHttp", "adhPermissions", Process.detailDirective])
        .directive("adhMeinBerlinStadtforumEdit", [
            "adhConfig", "adhHttp", "adhShowError", "adhSubmitIfValid", "moment", Process.editDirective]);
};
