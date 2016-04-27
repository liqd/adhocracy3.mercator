import * as AdhMetaApi from "./MetaApi";


export var moduleName = "adhMetaApi";

export var register = (angular, metaApi) => {
    angular
        .module(moduleName, [])
        .provider("adhMetaApi", () => new AdhMetaApi.Service(metaApi));
};
