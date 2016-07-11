import * as AdhMeinberlinAlexanderplatzModule from "./Alexanderplatz/Module";
import * as AdhMeinberlinBplanModule from "./Bplan/Module";
import * as AdhMeinberlinBuergerhaushaltModule from "./Buergerhaushalt/Module";
import * as AdhMeinberlinDeModule from "./MeinberlinDe/Module";
import * as AdhMeinberlinIdeaCollectionModule from "./IdeaCollection/Module";
import * as AdhMeinberlinKiezkasseModule from "./Kiezkasse/Module";
import * as AdhMeinberlinStadtforumModule from "./Stadtforum/Module";


export var moduleName = "adhMeinberlin";

export var register = (angular) => {
    AdhMeinberlinAlexanderplatzModule.register(angular);
    AdhMeinberlinBplanModule.register(angular);
    AdhMeinberlinBuergerhaushaltModule.register(angular);
    AdhMeinberlinDeModule.register(angular);
    AdhMeinberlinIdeaCollectionModule.register(angular);
    AdhMeinberlinKiezkasseModule.register(angular);
    AdhMeinberlinStadtforumModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinberlinAlexanderplatzModule.moduleName,
            AdhMeinberlinBplanModule.moduleName,
            AdhMeinberlinBuergerhaushaltModule.moduleName,
            AdhMeinberlinDeModule.moduleName,
            AdhMeinberlinIdeaCollectionModule.moduleName,
            AdhMeinberlinKiezkasseModule.moduleName,
            AdhMeinberlinStadtforumModule.moduleName
        ]);
};
