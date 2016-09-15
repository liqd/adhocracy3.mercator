import * as AdhMeinberlinBuergerhaushaltModule from "./Buergerhaushalt/Module";
import * as AdhMeinberlinIdeaCollectionModule from "./IdeaCollection/Module";
import * as AdhMeinberlinKiezkasseModule from "./Kiezkasse/Module";
import * as AdhMeinberlinStadtforumModule from "./Stadtforum/Module";


export var moduleName = "adhMeinberlin";

export var register = (angular) => {
    AdhMeinberlinBuergerhaushaltModule.register(angular);
    AdhMeinberlinIdeaCollectionModule.register(angular);
    AdhMeinberlinKiezkasseModule.register(angular);
    AdhMeinberlinStadtforumModule.register(angular);

    angular
        .module(moduleName, [
            AdhMeinberlinBuergerhaushaltModule.moduleName,
            AdhMeinberlinIdeaCollectionModule.moduleName,
            AdhMeinberlinKiezkasseModule.moduleName,
            AdhMeinberlinStadtforumModule.moduleName
        ]);
};
