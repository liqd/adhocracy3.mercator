import * as AdhMeinBerlinKiezkassenModule from "./Kiezkassen/Module";
import * as AdhMeinBerlinBplaeneModule from "./Bplaene/Module";
import * as AdhMeinBerlinAlexanderplatzModule from "./Alexanderplatz/Module";
import * as AdhMeinBerlinBurgerhaushaltModule from "./Burgerhaushalt/Module";
import * as AdhMeinBerlinStadtforumModule from "./Stadtforum/Module";
import * as AdhMeinBerlinPhaseModule from "./Phase/Module";


export var moduleName = "adhMeinBerlin";

export var register = (angular) => {
    AdhMeinBerlinKiezkassenModule.register(angular);
    AdhMeinBerlinBplaeneModule.register(angular);
    AdhMeinBerlinAlexanderplatzModule.register(angular);
    AdhMeinBerlinBurgerhaushaltModule.register(angular);
    AdhMeinBerlinStadtforumModule.register(angular);
    AdhMeinBerlinPhaseModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinBerlinAlexanderplatzModule.moduleName,
            AdhMeinBerlinBplaeneModule.moduleName,
            AdhMeinBerlinKiezkassenModule.moduleName,
            AdhMeinBerlinStadtforumModule.moduleName,
            AdhMeinBerlinBurgerhaushaltModule.moduleName
        ]);
};
