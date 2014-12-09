/**
 * Similar to ng-show, but sets `visibility: hidden` instead of `display: none`.
 */

var factory = () => {
    return {
        restrict: "A",
        link: (scope, element, attr) => {
            scope.$watch(attr.adhVisible, (value) => {
                if (value) {
                    element.css("visibility", "visible");
                    element.attr("aria-visible", "true");
                } else {
                    element.css("visibility", "hidden");
                    element.attr("aria-visible", "false");
                }
            });
        }
    };
};


export var moduleName = "adhVisible";

export var register = (angular) => {
    angular
        .module(moduleName, [])
        .directive("adhVisible", factory);
};
