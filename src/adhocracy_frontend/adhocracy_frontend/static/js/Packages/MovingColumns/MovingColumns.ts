import _ = require("lodash");

import AdhPermissions = require("../Permissions/Permissions");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUtil = require("../Util/Util");


export var movingColumns = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhPermissions : AdhPermissions.Service,
    $timeout,
    $window
) => {
    return {
        link: (scope, element) => {
            var cls : string;
            var fontSize : number = parseInt(element.css("font-size"), 10);

            var maxShowWidth = 55 * fontSize;
            var minShowWidth = 35 * fontSize;
            var collapseWidth = 3 * fontSize;
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

                for (var i = 0; i < 3; i++) {
                    var child = element.children().eq(i);
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
                var transition = element.children().css("transition");
                element.children().css("transition", "none");
                resize();
                $timeout(() => {
                    element.children().css("transition", transition);
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

            // FIXME: these do not really belong here
            adhTopLevelState.bind("content2Url", scope);
            adhTopLevelState.bind("platformUrl", scope);
            adhTopLevelState.bind("proposalUrl", scope);
            adhTopLevelState.bind("commentableUrl", scope);
            adhTopLevelState.bind("userUrl", scope);
            adhPermissions.bindScope(scope, () => scope.proposalUrl && AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");

            adhTopLevelState.on("movingColumns", move);
            adhTopLevelState.on("focus", resize);
            adhTopLevelState.on("space", () => _.defer(resizeNoTransition));
        }
    };
};


export var moduleName = "adhMovingColumns";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhPermissions.moduleName,
            AdhTopLevelState.moduleName
        ])
        .directive("adhMovingColumns", ["adhTopLevelState", "adhPermissions", "$timeout", "$window", movingColumns]);
};
