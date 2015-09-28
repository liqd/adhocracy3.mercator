import * as AdhMeinBerlinStadtforumContextModule from "./Context/Module";
import * as AdhMeinBerlinStadtforumProcessModule from "./Process/Module";
import * as AdhMeinBerlinStadtforumWorkbenchModule from "./Workbench/Module";


export var moduleName = "adhMeinBerlinStadtforum";

export var register = (angular) => {
    AdhMeinBerlinStadtforumContextModule.register(angular);
    AdhMeinBerlinStadtforumProcessModule.register(angular);
    AdhMeinBerlinStadtforumWorkbenchModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinBerlinStadtforumContextModule.moduleName,
            AdhMeinBerlinStadtforumProcessModule.moduleName,
            AdhMeinBerlinStadtforumWorkbenchModule.moduleName
        ]);
};
