import _ = require("lodash");

import AdhTopLevelState = require("../TopLevelState/TopLevelState");


export var movingColumns = (
    topLevelState : AdhTopLevelState.Service,
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

            var clearStates = (element) => {
                element.removeClass("is-show");
                element.removeClass("is-collapse");
                element.removeClass("is-hide");
            };

            // if there is not enough space, collapse all but one column.
            var responsiveClass = (cls : string) : string => {
                if ($($window).width() < 2 * minShowWidth + collapseWidth) {
                    var s = "";
                    var parts = cls.split("-");
                    var collapse = false;

                    for (var i = 3; i > 0; i--) {
                        if (collapse) {
                            s = "-collapse" + s;
                        } else {
                            s = "-" + parts[i] + s;
                        }

                        if (parts[i] === "show") {
                            collapse = true;
                        }
                    }

                    return "is" + s;
                } else {
                    return cls;
                }
            };

            var resize = () => {
                var parts = responsiveClass(cls).split("-");

                var collapseCount : number = parts.filter((v) => v === "collapse").length;
                var showCount : number = parts.filter((v) => v === "show").length;
                var totalWidth : number = element.width();
                var showWidth : number = (totalWidth - collapseCount * collapseWidth) / showCount;
                showWidth = Math.min(showWidth, maxShowWidth);

                var offset : number = (totalWidth - collapseCount * collapseWidth - showCount * showWidth) / 2;

                for (var i = 2; i >= 0; i--) {
                    var child = element.children().eq(i);
                    child.css({right: offset});
                    clearStates(child);
                    switch (parts[i + 1]) {
                        case "show":
                            child.addClass("is-show");
                            child.attr("aria-visible", "true");
                            child.width(showWidth);
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
            topLevelState.on("content2Url", (url : string) => {
                scope.content2Url = url;
            });
            topLevelState.on("platformUrl", (url : string) => {
                scope.platformUrl = url;
            });
            topLevelState.on("proposalUrl", (url : string) => {
                scope.proposalUrl = url;
            });
            topLevelState.on("commentableUrl", (url : string) => {
                scope.commentableUrl = url;
            });
            topLevelState.on("userUrl", (url : string) => {
                scope.userUrl = url;
            });

            topLevelState.on("movingColumns", move);
            topLevelState.on("space", () => _.defer(resizeNoTransition));
        }
    };
};


export var moduleName = "adhMovingColumns";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhTopLevelState.moduleName
        ])
        .directive("adhMovingColumns", ["adhTopLevelState", "$timeout", "$window", movingColumns]);
};
