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
            "$timeout", "adhHttp", "adhPermissions", "adhConfig", AdhResourceActions.resourceActionsDirective])
        .directive("adhReportAction", [AdhResourceActions.reportActionDirective])
        .directive("adhShareAction", [AdhResourceActions.shareActionDirective])
        .directive("adhHideAction", [
            "adhHttp", "adhTopLevelState", "adhResourceUrlFilter", "$translate", "$window", AdhResourceActions.hideActionDirective])
        .directive("adhAssignBadgesAction", [AdhResourceActions.assignBadgesActionDirective])
        .directive("adhResourceWidgetDeleteAction", [AdhResourceActions.resourceWidgetDeleteActionDirective])
        .directive("adhEditAction", ["adhTopLevelState", "adhResourceUrlFilter", "$location", AdhResourceActions.editActionDirective])
        .directive("adhModerateAction", [
            "adhTopLevelState", "adhResourceUrlFilter", "$location", AdhResourceActions.moderateActionDirective])
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
