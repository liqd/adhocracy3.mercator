import * as AdhConfig from "../Config/Config";
import * as AdhMovingColumns from "../MovingColumns/MovingColumns";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

var pkgLocation = "/ResourceActions";

export var resourceActionsDirective = (
    adhPermissions : AdhPermissions.Service,
    adhConfig: AdhConfig.IService
) => {
    return {
        restrict: "E",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            share: "=?",
            delete: "=?",
            print: "=?",
            report: "=?",
            cancel: "=?",
            edit: "=?",
            moderate: "=?",
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ResourceActions.html",
        link: (scope, element) => {
            adhPermissions.bindScope(scope, scope.resourcePath, "proposalItemOptions");
        }
    };
};

export var reportActionDirective = () => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"report();\">{{ 'TR__REPORT' | translate }}</a>",
        require: "^adhMovingColumn",
        scope: {
            class: "@"
        },
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.report = () => {
                column.toggleOverlay("abuse");
            };
        }
    };
};

export var shareActionDirective = () => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"report();\">{{ 'TR__SHARE' | translate }}</a>",
        require: "^adhMovingColumn",
        scope: {
            class: "@"
        },
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.report = () => {
                column.toggleOverlay("share");
            };
        }
    };
};

export var deleteActionDirective = () => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"delete();\">{{ 'TR__DELETE' | translate }}</a>",
        require: "^adhMovingColumn",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            class: "@"
        },
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.delete = () => {
                column.$broadcast("triggerDelete", scope.resourcePath);
            };
        }
    };
};

export var printActionDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    $window : Window
) => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"print();\">{{ 'TR__PRINT' | translate }}</a>",
        scope: {
            class: "@"
        },
        link: (scope) => {
            scope.print = () => {
                // only the focused column is printed
                adhTopLevelState.set("focus", 1);
                $window.print();
            };
        }
    };
};

export var editActionDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"edit();\">{{ 'TR__EDIT' | translate }}</a>",
        require: "^adhMovingColumn",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            class: "@"
        },
        link: (scope) => {
            scope.edit = () => {
                var path = scope.parentPath ? AdhUtil.parentPath(scope.resourcePath) : scope.resourcePath;
                var url = adhResourceUrl(path, "edit");
                $location.url(url);
            };
        }
    };
};

export var moderateActionDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"moderate();\">{{ 'TR__MODERATE' | translate }}</a>",
        require: "^adhMovingColumn",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            class: "@"
        },
        link: (scope) => {
            scope.moderate = () => {
                var path = scope.parentPath ? AdhUtil.parentPath(scope.resourcePath) : scope.resourcePath;
                var url = adhResourceUrl(path, "moderate");
                $location.url(url);
            };
        }
    };
};

export var cancelActionDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl
) => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"cancel();\">{{ 'TR__CANCEL' | translate }}</a>",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            class: "@"
        },
        link: (scope) => {
            scope.cancel = () => {
                if (!scope.resourcePath) {
                    scope.resourcePath = adhTopLevelState.get("processUrl");
                }
                var path = scope.parentPath ? AdhUtil.parentPath(scope.resourcePath) : scope.resourcePath;
                var url = adhResourceUrl(path);
                adhTopLevelState.goToCameFrom(url);
            };
        }
    };
};
