import * as AdhHttpModule from "../../../Http/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";

import * as Process from "./Process";


export var moduleName = "adhMeinberlinIdeaCollectionProcess";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttpModule.moduleName,
            AdhPermissionsModule.moduleName
        ])
        .directive("adhMeinberlinIdeaCollectionDetail", ["adhConfig", "adhHttp", "adhPermissions", "$q", Process.detailDirective])
        .directive("adhMeinberlinIdeaCollectionEdit", [
            "adhConfig", "adhHttp", "adhShowError", "adhSubmitIfValid", "moment", Process.editDirective]);
};
