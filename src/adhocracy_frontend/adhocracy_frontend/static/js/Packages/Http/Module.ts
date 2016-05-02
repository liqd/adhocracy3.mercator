import * as AdhCredentialsModule from "../User/CredentialsModule";
import * as AdhPreliminaryNamesModule from "../PreliminaryNames/Module";
import * as AdhWebSocketModule from "../WebSocket/Module";

import * as AdhCache from "./Cache";
import * as AdhError from "./Error";
import * as AdhHttp from "./Http";
import * as AdhMetaApi from "./MetaApi";


export var moduleName = "adhHttp";

export var register = (angular, config, metaApi) => {
    angular
        .module(moduleName, [
            AdhCredentialsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhWebSocketModule.moduleName,
            "angular-cache",
        ])
        .config(["$httpProvider", ($httpProvider) => {
            $httpProvider.interceptors.push(["adhHttpBusy", (adhHttpBusy : AdhHttp.Busy) => adhHttpBusy.createInterceptor()]);
            $httpProvider.defaults.withCredentials = true;  // allow cookie authentication for SingleSignOn with admin interface
        }])
        .service("adhHttpBusy", ["$q", AdhHttp.Busy])
        .directive("adhHttpBusy", ["adhConfig", "adhHttpBusy", AdhHttp.busyDirective])
        .service("adhHttp", [
            "$http", "$q", "$timeout", "adhCredentials", "adhMetaApi", "adhPreliminaryNames", "adhConfig", "adhCache", AdhHttp.Service])
        .service("adhCache", ["$q", "adhConfig", "adhWebSocket", "CacheFactory", AdhCache.Service])
        .factory("adhMetaApi", () => new AdhMetaApi.MetaApiQuery(metaApi))
        .filter("adhFormatError", () => AdhError.formatError);
};
