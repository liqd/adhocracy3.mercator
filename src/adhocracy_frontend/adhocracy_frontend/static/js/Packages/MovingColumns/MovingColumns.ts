import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhShareSocial = require("../ShareSocial/ShareSocial");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");

export var pkgLocation = "/MovingColumns";


/**
 * Moving Columns directive
 *
 * taking care of showing, hiding and resizing the columns
 */
export var movingColumns = (
    adhTopLevelState : AdhTopLevelState.Service,
    $timeout,
    $window
) => {
    return {
        link: (scope, element) => {
            var cls : string;
            var fontSize : number = parseInt(element.css("font-size"), 10);

            var maxShowWidth = 55 * fontSize;
            var minShowWidth = 35 * fontSize;
            var collapseWidth = 2 * fontSize;
            var spacing = Math.ceil(0.3 * fontSize);

            var clearStates = (element) => {
                element.removeClass("is-show");
                element.removeClass("is-collapse");
                element.removeClass("is-hide");
            };

            // if there is not enough space, collapse all but one column.
            var responsiveClass = (cls : string) : string => {
                if ($($window).width() < 2 * minShowWidth + collapseWidth) {
                    var s = "is";
                    var parts = cls.split("-");

                    var focus = parseInt(adhTopLevelState.get("focus"), 10);
                    if (isNaN(focus)) {
                        focus = parts.lastIndexOf("show") - 1;
                    }

                    for (var i = 0; i < 3; i++) {
                        if (i > focus) {
                            s += "-hide";
                        } else if (i === focus) {
                            s += "-show";
                        } else {
                            s += "-collapse";
                        }
                    }

                    return s;
                } else {
                    return cls;
                }
            };

            var resize = () : void => {
                if (typeof cls === "undefined") {
                    return;
                }

                var parts = responsiveClass(cls).split("-");

                var collapseCount : number = parts.filter((v) => v === "collapse").length;
                var showCount : number = parts.filter((v) => v === "show").length;
                var totalWidth : number = element.outerWidth();
                var totalCollapseWidth : number = collapseCount * collapseWidth;
                var totalSpacingWidth : number = (collapseCount + showCount - 1) * spacing;
                var showWidth : number = (totalWidth - totalCollapseWidth - totalSpacingWidth) / showCount;
                showWidth = Math.min(showWidth, maxShowWidth);

                var totalShowWidthWithSpacing = showCount * showWidth + (showCount - 1) * spacing;
                var offset : number = (totalWidth - totalShowWidthWithSpacing) / 2 - collapseCount * (collapseWidth + spacing);
                offset = Math.max(offset, 0);

                var columns = element.find(".moving-column");

                for (var i = 0; i < 3; i++) {
                    var child = columns.eq(i);
                    child.css({left: offset});
                    clearStates(child);
                    switch (parts[i + 1]) {
                        case "show":
                            child.addClass("is-show");
                            child.attr("aria-visible", "true");
                            child.outerWidth(showWidth);
                            offset += showWidth;
                            break;
                        case "collapse":
                            child.addClass("is-collapse");
                            child.attr("aria-visible", "false");
                            child.width(collapseWidth);
                            offset += collapseWidth;
                            break;
                        case "hide":
                            child.addClass("is-hide");
                            child.attr("aria-visible", "false");
                            child.width(0);
                    }
                    if (parts[i] !== "hide" && parts[i + 1] !== "hide") {
                        offset += spacing;
                    }
                }
            };

            var resizeNoTransition = () => {
                var columns = element.find(".moving-column");
                var transition = columns.css("transition");
                columns.css("transition", "none");
                resize();
                $timeout(() => {
                    columns.css("transition", transition);
                }, 1);
            };

            $($window).resize(resizeNoTransition);

            var move = (newCls) => {
                if (newCls !== cls) {
                    element.removeClass(cls);
                    element.addClass(newCls);
                    cls = newCls;
                    resize();
                }
            };

            scope.$on("$destroy", adhTopLevelState.on("movingColumns", move));
            scope.$on("$destroy", adhTopLevelState.on("focus", resize));
            scope.$on("$destroy", adhTopLevelState.on("space", () => _.defer(resizeNoTransition)));
            scope.$watch(() => element.find(".moving-column").length, resize);
        }
    };
};


/**
 * Moving Column directive
 *
 * Every moving column should be wrapped in an instance of this directive.
 * It provides common functionality, e.g. alerts, sidebar and overlays
 * via a controller that can be required by subelements.
 *
 * Subelements can inject template code with the following transclusionIds
 * (see AdhInject):
 *
 * -   body
 * -   menu
 * -   collapsed
 * -   sidebar
 * -   overlays
 */
export interface IMovingColumnScope extends ng.IScope {
    // the controller with interfaces for alerts, overlays, ...
    ctrl : MovingColumnController;

    // an object that can be used to share data between different parts of the column.
    shared;

    // key of the currently active overlay or undefined
    overlay : string;

    // private
    _alerts : {[id : number]: {
        message : string;
        mode : string;
    }};
    _showSidebar : boolean;
}

export class MovingColumnController {
    private lastId : number;

    constructor(protected $timeout : ng.ITimeoutService, public $scope : IMovingColumnScope) {
        $scope.ctrl = this;
        $scope._alerts = {};
        $scope.shared = {};

        this.lastId = 0;
    }

    public clear() : void {
        this.$scope._alerts = {};
        this.$scope.overlay = undefined;
        this.$scope._showSidebar = false;
    }

    public alert(message : string, mode : string = "info", duration : number = 3000) : void {
        var id = this.lastId++;
        this.$timeout(() => this.removeAlert(id), duration);

        this.$scope._alerts[id] = {
            message: message,
            mode: mode
        };
    }

    public removeAlert(id : number) : void {
        delete this.$scope._alerts[id];
    }

    public showOverlay(key : string) : void {
        this.$scope.overlay = key;
    }

    public hideOverlay(key? : string) : void {
        if (typeof key === "undefined" || this.$scope.overlay === key) {
            this.$scope.overlay = undefined;
        }
    }

    public toggleOverlay(key : string, condition? : boolean) : void {
        if (condition || (typeof condition === "undefined" && this.$scope.overlay !== key)) {
            this.$scope.overlay = key;
        } else if (this.$scope.overlay === key) {
            this.$scope.overlay = undefined;
        }
    }

    public showSidebar() : void {
        this.toggleSidebar(true);
    }

    public hideSidebar() : void {
        this.toggleSidebar(false);
    }

    public toggleSidebar(condition? : boolean) : void {
        if (typeof condition === "undefined") {
            condition = !this.$scope._showSidebar;
        }
        this.$scope._showSidebar = condition;
    }
}


export var movingColumnDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        scope: true,
        transclude: true,
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MovingColumn.html",
        controller: ["$timeout", "$scope", MovingColumnController]
    };
};


export var moduleName = "adhMovingColumns";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhTopLevelState.moduleName,
            AdhShareSocial.moduleName
        ])
        .directive("adhMovingColumn", ["adhConfig", movingColumnDirective])
        .directive("adhMovingColumns", ["adhTopLevelState", "$timeout", "$window", movingColumns]);
};
