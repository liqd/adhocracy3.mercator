import * as AdhCredentialsModule from "../User/Module";
import * as AdhEventManagerModule from "../EventManager/Module";
import * as AdhTrackingModule from "../Tracking/Module";

import * as AdhTopLevelState from "./TopLevelState";


export var moduleName = "adhTopLevelState";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhCredentialsModule.moduleName,
            AdhEventManagerModule.moduleName,
            AdhTrackingModule.moduleName
        ])
        .provider("adhTopLevelState", AdhTopLevelState.Provider)
        .directive("adhDefaultHeader", ["adhConfig", "adhTopLevelState", AdhTopLevelState.defaultHeaderDirective])
        .directive("adhRoutingError", ["adhConfig", AdhTopLevelState.routingErrorDirective])
        .directive("adhSpace", ["adhTopLevelState", AdhTopLevelState.spaceDirective])
        .directive("adhView", ["adhTopLevelState", "$compile", AdhTopLevelState.viewFactory])
        .directive("adhGoToCameFrom", ["adhTopLevelState", AdhTopLevelState.goToCameFromDirective]);
};
