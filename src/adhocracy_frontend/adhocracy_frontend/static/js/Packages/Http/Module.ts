import * as AdhCredentialsModule from "../User/CredentialsModule";
import * as AdhMetaApiModule from "../MetaApi/Module";
import * as AdhPreliminaryNamesModule from "../PreliminaryNames/Module";
import * as AdhWebSocketModule from "../WebSocket/Module";

import * as AdhCache from "./Cache";
import * as AdhError from "./Error";
import * as AdhHttp from "./Http";


export var moduleName = "adhHttp";

export var register = (angular, config) => {
    angular
        .module(moduleName, [
            AdhCredentialsModule.moduleName,
            AdhMetaApiModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhWebSocketModule.moduleName,
            "angular-cache",
        ])
        .config(["$httpProvider", ($httpProvider) => {
            $httpProvider.interceptors.push(["adhHttpBusy", (adhHttpBusy : AdhHttp.Busy) => adhHttpBusy.createInterceptor()]);
        }])
        .service("adhHttpBusy", ["$q", AdhHttp.Busy])
        .directive("adhHttpBusy", ["adhConfig", "adhHttpBusy", AdhHttp.busyDirective])
        .service("adhHttp", [
            "$http", "$q", "$timeout", "adhCredentials", "adhMetaApi", "adhPreliminaryNames", "adhConfig", "adhCache", AdhHttp.Service])
        .service("adhCache", ["$q", "adhConfig", "adhWebSocket", "CacheFactory", AdhCache.Service])
        .filter("adhFormatError", () => AdhError.formatError);
};
