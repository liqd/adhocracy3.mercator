import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";

import * as Process from "./Process";


export var moduleName = "adhIdeaCollectionProcess";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhPermissionsModule.moduleName
        ])
        .directive("adhIdeaCollectionDetail", ["adhConfig", "adhEmbed", "adhHttp", "adhPermissions", "$q", Process.detailDirective]);
};
