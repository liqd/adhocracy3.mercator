import * as Config from "./Config";


export var moduleName = "AdhConfig";

export var register = (angular, data) => {
    angular
        .module(moduleName, [])
        .provider("adhConfig", [Config.Provider])
        .config(["adhConfigProvider", (provider) => {
            provider.config = data;
        }]);
};
