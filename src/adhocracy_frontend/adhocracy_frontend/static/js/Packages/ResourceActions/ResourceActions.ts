import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhMovingColumns from "../MovingColumns/MovingColumns";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import RIComment from "../../Resources_/adhocracy_core/resources/comment/IComment";

var pkgLocation = "/ResourceActions";


class Modals {
    public overlay : string;
    public alerts : {[id : number]: {message : string, mode : string}};
    private lastId : number;

    constructor(protected $timeout) {
        this.lastId = 0;
        this.alerts = {};
    }

    public alert(message : string, mode : string = "info", duration : number = 3000) : void {
        var id = this.lastId++;
        this.$timeout(() => this.removeAlert(id), duration);

        this.alerts[id] = {
            message: message,
            mode: mode
        };
    }

    public removeAlert(id : number) : void {
        delete this.alerts[id];
    }

    public showOverlay(key : string) : void {
        this.overlay = key;
    }

    public hideOverlay(key? : string) : void {
        if (typeof key === "undefined" || this.overlay === key) {
            this.overlay = undefined;
        }
    }

    public toggleOverlay(key : string, condition? : boolean) : void {
        if (condition || (typeof condition === "undefined" && this.overlay !== key)) {
            this.overlay = key;
        } else if (this.overlay === key) {
            this.overlay = undefined;
        }
    }
}

export var resourceActionsDirective = (
    $timeout : angular.ITimeoutService,
    adhPermissions : AdhPermissions.Service,
    adhConfig: AdhConfig.IService
) => {
    return {
        restrict: "E",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            deleteRedirectUrl: "@?",
            contentType: "@?",
            share: "=?",
            hide: "=?",
            resourceWidgetDelete: "=?",
            print: "=?",
            report: "=?",
            cancel: "=?",
            edit: "=?",
            moderate: "=?",
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ResourceActions.html",
        link: (scope, element) => {
            var path = scope.parentPath ? AdhUtil.parentPath(scope.resourcePath) : scope.resourcePath;
            scope.modals = new Modals($timeout);
            adhPermissions.bindScope(scope, path, "options");
        }
    };
};

export var reportActionDirective = () => {
    return {
        restrict: "E",
        template: "<a data-ng-if=\"!commentTemplate\" class=\"{{class}}\" href=\"\" data-ng-click=\"report();\">" +
            "{{ 'TR__REPORT' | translate }}</a><a data-ng-if=\"commentTemplate\" class=\"comment-header-link\" href=\"\"" +
            "data-ng-click=\"report();\"><i class=\"comment-header-icon icon-flag\"></i></a>",
        scope: {
            class: "@",
            contentType: "@?",
            modals: "=",
        },
        link: (scope) => {
            scope.commentTemplate = scope.contentType === RIComment.content_type;
            scope.report = () => {
                scope.modals.toggleOverlay("abuse");
            };
        }
    };
};

export var shareActionDirective = () => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"share();\">{{ 'TR__SHARE' | translate }}</a>",
        scope: {
            class: "@",
            modals: "=",
        },
        link: (scope) => {
            scope.share = () => {
                scope.modals.toggleOverlay("share");
            };
        }
    };
};

export var hideActionDirective = (
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrlFilter,
    $translate,
    $window : Window
) => {
    return {
        restrict: "E",
        template: "<a data-ng-if=\"!commentTemplate\" class=\"{{class}}\" href=\"\" data-ng-click=\"hide();\">" +
            "{{ 'TR__HIDE' | translate }}</a><a data-ng-if=\"commentTemplate\" class=\"comment-header-link\" href=\"\"" +
            "data-ng-click=\"hide();\"><i class=\"comment-header-icon icon-x\"></i></a>",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            class: "@",
            contentType: "@?",
            redirectUrl: "@?",
        },
        link: (scope, element) => {
            scope.commentTemplate = scope.contentType === RIComment.content_type;
            scope.hide = () => {
                return $translate("TR__ASK_TO_CONFIRM_HIDE_ACTION").then((question) => {
                    var path = scope.parentPath ? AdhUtil.parentPath(scope.resourcePath) : scope.resourcePath;
                    if ($window.confirm(question)) {
                        return adhHttp.hide(path).then(() => {
                            var url = scope.redirectUrl;
                            if (!url) {
                                var processUrl = adhTopLevelState.get("processUrl");
                                url = processUrl ? adhResourceUrlFilter(processUrl) : "/";
                            }
                            adhTopLevelState.goToCameFrom(url);
                        });
                    }
                });
            };
        }
    };
};

export var resourceWidgetDeleteActionDirective = () => {
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
        require: "?^adhMovingColumn",
        scope: {
            class: "@"
        },
        link: (scope, element, attrs, column? : AdhMovingColumns.MovingColumnController) => {
            scope.print = () => {
                if (column) {
                    // only the focused column is printed
                    column.focus();
                }
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
