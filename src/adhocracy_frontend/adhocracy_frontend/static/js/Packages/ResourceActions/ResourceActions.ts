import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhMovingColumns from "../MovingColumns/MovingColumns";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

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
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service
) => {
    return {
        restrict: "E",
        scope: {
            resourcePath: "@",
            resourceWithBadgesUrl: "@?",
            deleteRedirectUrl: "@?",
            assignBadges: "=?",
            createDocument: "=?",
            share: "=?",
            hide: "=?",
            resourceWidgetDelete: "=?",
            print: "=?",
            report: "=?",
            cancel: "=?",
            edit: "=?",
            image: "=?",
            moderate: "=?",
            modals: "=?"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ResourceActions.html",
        link: (scope, element) => {
            scope.modals = new Modals($timeout);
            adhPermissions.bindScope(scope, scope.resourcePath, "options");

            scope.$watch("resourcePath", () => {
                scope.modals.clear();
            });
        }
    };
};

export var resourceDropdownDirective = (
    $timeout : angular.ITimeoutService,
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service
) => {
    return {
        restrict: "E",
        scope: {
            resourcePath: "@",
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
            image: "=?",
            moderate: "=?",
            modals: "=?"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ResourceDropdown.html",
        link: (scope, element) => {
            scope.data = {
                resourcePath: scope.resourcePath,
                resourceWithBadgesUrl: scope.resourceWithBadgesUrl,
                deleteRedirectUrl: scope.deleteRedirectUrl,
                assignBadges: scope.assignBadges,
                share: scope.share,
                hide: scope.hide,
                resourceWidgetDelete: scope.resourceWidgetDelete,
                print: scope.print,
                report: scope.report,
                cancel: scope.cancel,
                edit: scope.edit,
                image: scope.image,
                moderate: scope.moderate,
                modals: scope.modals
            };
            scope.data.modals = new Modals($timeout);
            adhPermissions.bindScope(scope, scope.data.resourcePath, "options");

            scope.$watch("resourcePath", () => {
                scope.data.modals.clear();
            });

            scope.data.toggleDropdown = () => {
                scope.isShowDropdown = !scope.isShowDropdown;
            };

            scope.data.isShowDropdownMenu = true;
            scope.$watch("data.modals.lastId", (id : number) => {
                if (id !== 0) {
                    scope.data.isShowDropdownMenu = false;
                    $timeout(() => scope.data.isShowDropdownMenu = true, 3000);
                }
            });

            scope.id = "resourceDropdown" + Math.random();

            // some jQuery that closes the dropdown when the user clicks somewhere else:
            element.focusout(() => {
                $timeout(() => {
                    if (!$.contains(element[0], document.activeElement)) {
                        scope.isShowDropdown = false;
                    }
                });
            });
            scope.$on("$delete", () => {
                element.off("focusout");
            });
        }
    };
};

export var modalActionDirective = () => {
    return {
        restrict: "E",
        transclude: true,
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"toggle();\">" +
            "<ng-transclude></ng-transclude> {{ label | translate }}</a>",
        scope: {
            class: "@",
            modals: "=",
            modal: "@",
            label: "@",
            toggleDropdown: "=?"
        },
        link: (scope) => {
            scope.toggle = () => {
                scope.modals.toggleModal(scope.modal);
            };
        }
    };
};

export var assignBadgesActionDirective = (
    adhConfig: AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service
) => {
    return {
        restrict: "E",
        transclude: true,
        template: "<a data-ng-if=\"badgesExist && badgeAssignmentPoolOptions.PUT\" class=\"{{class}}\" href=\"\"" +
            "data-ng-click=\"assignBadges();\"><ng-transclude></ng-transclude> " +
            "{{ 'TR__MANAGE_BADGE_ASSIGNMENTS' | translate }}</a>",
        scope: {
            resourcePath: "@",
            resourceWithBadgesUrl: "@?",
            class: "@",
            modals: "=",
            toggleDropdown: "=?"
        },
        link: (scope) => {
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

            scope.assignBadges = () => {
                scope.modals.toggleModal("badges");
                scope.toggleDropdown();
            };
        }
    };
};

export var hideActionDirective = (
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrlFilter,
    $translate,
    $window : Window
) => {
    return {
        restrict: "E",
        transclude: true,
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"hide();\"><ng-transclude></ng-transclude> " +
            "{{ 'TR__HIDE' | translate }}</a>",
        scope: {
            resourcePath: "@",
            class: "@",
            redirectUrl: "@?",
        },
        link: (scope, element) => {
            scope.hide = () => {
                return $translate("TR__ASK_TO_CONFIRM_HIDE_ACTION").then((question) => {
                    if ($window.confirm(question)) {
                        return adhHttp.hide(scope.resourcePath).then(() => {
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
        transclude: true,
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"delete();\"><ng-transclude></ng-transclude> " +
            "{{ 'TR__DELETE' | translate }}</a>",
        require: "^adhMovingColumn",
        scope: {
            resourcePath: "@",
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
        transclude: true,
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"print();\"><ng-transclude></ng-transclude> " +
            "{{ 'TR__PRINT' | translate }}</a>",
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

export var viewActionDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        transclude: true,
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"link();\"><ng-transclude></ng-transclude> {{ label | translate }}</a>",
        scope: {
            resourcePath: "@",
            class: "@",
            label: "@",
            view: "@",
        },
        link: (scope) => {
            scope.link = () => {
                adhTopLevelState.setCameFrom();
                var url = adhResourceUrl(scope.resourcePath, scope.view);
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
        transclude: true,
        template: "<a class=\"{{class}}\" href=\"\" data-ng-click=\"cancel();\"><ng-transclude></ng-transclude> " +
            "{{ 'TR__CANCEL' | translate }}</a>",
        scope: {
            resourcePath: "@",
            class: "@"
        },
        link: (scope) => {
            scope.cancel = () => {
                if (!scope.resourcePath) {
                    scope.resourcePath = adhTopLevelState.get("processUrl");
                }
                var url = adhResourceUrl(scope.resourcePath);
                adhTopLevelState.goToCameFrom(url);
            };
        }
    };
};
