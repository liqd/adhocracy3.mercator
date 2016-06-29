import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

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
        link: (scope, element, attrs) => {
            var cls : string;
            var fontSize : number = parseInt(element.css("font-size"), 10);
            var maxWidth = 55;
            if (typeof attrs.maxWidth !== "undefined") {
                maxWidth = parseInt(attrs.maxWidth, 10);
            }
            var maxShowWidth = maxWidth * fontSize;
            var minShowWidth = 35 * fontSize;
            var collapseWidth = 2 * fontSize;
            var spacing = Math.ceil(0.3 * fontSize);
            if (typeof attrs.spacing !== "undefined") {
                spacing = parseInt(attrs.spacing, 10);
            }

            var clearStates = (element) => {
                element.removeClass("is-show");
                element.removeClass("is-collapse");
                element.removeClass("is-hide");
                element.removeClass("is-first-visible-child");
                element.removeClass("is-last-visible-child");
                element.removeClass("has-focus");
            };

            var getFocus = (cls : string) : number => {
                var parts = cls.split("-");
                var focus = parseInt(adhTopLevelState.get("focus"), 10);
                if (isNaN(focus)) {
                    focus = parts.lastIndexOf("show") - 1;
                }
                return focus;
            };

            // if there is not enough space, collapse all but one column.
            var responsiveClass = (cls : string) : string => {
                if ($($window).width() < 2 * minShowWidth + collapseWidth) {
                    var s = "is";
                    var focus = getFocus(cls);

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
                var focus = getFocus(cls);

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
                    if (i === focus) {
                        child.addClass("has-focus");
                    }
                    if (parts[i] !== "hide" && parts[i + 1] !== "hide") {
                        offset += spacing;
                    }
                }

                element.find(".moving-column:not(.is-hide):first-child").addClass("is-first-visible-child");
                element.find(".moving-column:not(.is-hide):last").addClass("is-last-visible-child");

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


export class MovingColumnController {
    constructor(
        protected adhTopLevelState : AdhTopLevelState.Service,
        public $scope : angular.IScope,
        protected $element : angular.IAugmentedJQuery
    ) {}

    public focus() : void {
        var index = this.$element.index();
        this.adhTopLevelState.set("focus", index);
    }

    public $broadcast(name : string, ...args : any[]) {
        return this.$scope.$broadcast.apply(this.$scope, arguments);
    }
}


export var movingColumnDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        scope: true,
        replace: true,
        transclude: true,
        templateUrl: adhConfig.pkg_path + pkgLocation + "/MovingColumn.html",
        controller: ["adhTopLevelState", "$scope", "$element", MovingColumnController]
    };
};
