import AdhMeinBerlinAlexanderplatzWorkbench = require("./Workbench/Workbench");
import AdhMeinBerlinAlexanderplatzContext = require("./Context/Context");
import AdhMeinBerlinAlexanderplatzProcess = require("./Process/Process");


export var moduleName = "adhMeinBerlinAlexanderplatz";

export var register = (angular) => {
	AdhMeinBerlinAlexanderplatzContext.register(angular);
    AdhMeinBerlinAlexanderplatzProcess.register(angular);
    AdhMeinBerlinAlexanderplatzWorkbench.register(angular);

    angular
        .module(moduleName, [
        	AdhMeinBerlinAlexanderplatzContext.moduleName,
        	AdhMeinBerlinAlexanderplatzProcess.moduleName,
            AdhMeinBerlinAlexanderplatzWorkbench.moduleName
        ]);
};
