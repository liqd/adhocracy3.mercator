import * as AdhMovingColumnsModule from "../MovingColumns/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";
import * as AdhResourceAreaModule from "../ResourceArea/Module";

import * as AdhResourceActions from "./ResourceActions";

export var moduleName = "adhResourceActions";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhTopLevelStateModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhMovingColumnsModule.moduleName
        ])
        .directive("adhResourceActions", [
            "$timeout", "adhConfig", "adhPermissions", AdhResourceActions.resourceActionsDirective])
        .directive("adhResourceDropdown", [
            "$timeout", "adhConfig", "adhPermissions", AdhResourceActions.resourceDropdownDirective])
        .directive("adhModalAction", [AdhResourceActions.modalActionDirective])
        .directive("adhHideAction", [
            "adhHttp", "adhTopLevelState", "adhResourceUrlFilter", "$translate", "$window", AdhResourceActions.hideActionDirective])
        .directive("adhAssignBadgesAction", ["adhConfig", "adhHttp", "adhPermissions", AdhResourceActions.assignBadgesActionDirective])
        .directive("adhResourceWidgetDeleteAction", [AdhResourceActions.resourceWidgetDeleteActionDirective])
        .directive("adhViewAction", ["adhTopLevelState", "adhResourceUrlFilter", "$location", AdhResourceActions.viewActionDirective])
        .directive("adhPrintAction", ["adhTopLevelState", "$window", AdhResourceActions.printActionDirective])
        .directive("adhCancelAction", ["adhTopLevelState", "adhResourceUrlFilter", AdhResourceActions.cancelActionDirective])
        .animation(".modal", () => {
            return {
                enter: (element, done) => {
                    element.hide().slideDown(done);
                },
                leave: (element, done) => {
                    element.slideUp(done);
                }
            };
        });
};
