import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhMovingColumns from "../MovingColumns/MovingColumns";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import * as SIBadge from "../../Resources_/adhocracy_core/sheets/badge/IBadge";
import * as SIBadgeable from "../../Resources_/adhocracy_core/sheets/badge/IBadgeable";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";

var pkgLocation = "/ResourceActions";


export class Modals {
    public modal : string;
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

    public showModal(key : string) : void {
        this.modal = key;
    }

    public hideModal(key? : string) : void {
        if (typeof key === "undefined" || this.modal === key) {
            this.modal = undefined;
        }
    }

    public toggleModal(key : string, condition? : boolean) : void {
        if (condition || (typeof condition === "undefined" && this.modal !== key)) {
            this.modal = key;
        } else if (this.modal === key) {
            this.modal = undefined;
        }
    }

    public clear() : void {
        this.alerts = {};
        this.modal = undefined;
    }
}

export var resourceActionsDirective = (
    $timeout : angular.ITimeoutService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhConfig: AdhConfig.IService
) => {
    return {
        restrict: "E",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            resourceWithBadgesUrl: "@?",
            deleteRedirectUrl: "@?",
            assignBadges: "=?",
            share: "=?",
            hide: "=?",
            resourceWidgetDelete: "=?",
            print: "=?",
            report: "=?",
            cancel: "=?",
            edit: "=?",
            moderate: "=?",
            modals: "=?"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ResourceActions.html",
        link: (scope, element) => {
            var path = scope.parentPath ? AdhUtil.parentPath(scope.resourcePath) : scope.resourcePath;
            scope.modals = new Modals($timeout);
            adhPermissions.bindScope(scope, path, "options");

            if (scope.assignBadges) {
                var badgeAssignmentPoolPath;
                scope.$watch("resourcePath", (resourcePath) => {
                    if (resourcePath) {
                        adhHttp.get(resourcePath).then((badgeable) => {
                            badgeAssignmentPoolPath = badgeable.data[SIBadgeable.nick].post_pool;
                        });
                    }
                });
                adhPermissions.bindScope(scope, () => badgeAssignmentPoolPath, "badgeAssignmentPoolOptions");
                var params = {
                    depth: 4,
                    content_type: SIBadge.nick
                };
                adhHttp.get(scope.resourceWithBadgesUrl, params).then((response) => {
                    scope.badgesExist = response.data[SIPool.nick].count > 0;
                });
            }

            scope.$watch("resourcePath", () => {
                scope.modals.clear();
            });
        }
    };
};

export var reportActionDirective = () => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"report();\">{{ 'TR__REPORT' | translate }}</a>",
        scope: {
            class: "@",
            modals: "=",
        },
        link: (scope) => {
            scope.report = () => {
                scope.modals.toggleModal("abuse");
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
                scope.modals.toggleModal("share");
            };
        }
    };
};

export var assignBadgesActionDirective = () => {
    return {
        restrict: "E",
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"assignBadges();\">{{ 'TR__MANAGE_BADGE_ASSIGNMENTS' | translate }}</a>",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            class: "@",
            modals: "=",
        },
        link: (scope) => {
            scope.assignBadges = () => {
                scope.modals.toggleModal("badges");
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
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"hide();\">{{ 'TR__HIDE' | translate }}</a>",
        scope: {
            resourcePath: "@",
            parentPath: "=?",
            class: "@",
            redirectUrl: "@?",
        },
        link: (scope, element) => {
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
                adhTopLevelState.setCameFrom();
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
