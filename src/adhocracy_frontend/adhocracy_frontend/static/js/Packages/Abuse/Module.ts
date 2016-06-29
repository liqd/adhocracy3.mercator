import * as AdhHttpModule from "../Http/Module";

import * as AdhAbuse from "./Abuse";


export var moduleName = "adhReportAbuse";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttpModule.moduleName,
        ])
        .directive("adhReportAbuse", ["adhHttp", "adhConfig", AdhAbuse.reportAbuseDirective]);
};
