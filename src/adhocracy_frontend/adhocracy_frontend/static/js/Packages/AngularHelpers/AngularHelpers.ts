/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../_all.d.ts"/>

import AdhHttp = require("../Http/Http");


export var recursionHelper = ($compile) => {
    return {
        /**
         * Manually compiles the element, fixing the recursion loop.
         * @param element
         * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
         * @returns An object containing the linking functions.
         */
        compile: (element, link) => {
            // Normalize the link parameter
            if (jQuery.isFunction(link)) {
                link = {post: link};
            }

            // Break the recursion loop by removing the contents
            var contents = element.contents().remove();
            var compiledContents;
            return {
                pre: (link && link.pre) ? link.pre : null,
                /**
                 * Compiles and re-adds the contents
                 */
                post: (scope, element) => {
                    // Compile the contents
                    if (!compiledContents) {
                        compiledContents = $compile(contents);
                    }
                    // Re-add the compiled contents to the element
                    compiledContents(scope, (clone) => {
                        element.append(clone);
                    });

                    // Call the post-linking function, if any
                    if (link && link.post) {
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
};


export var lastVersion = (
    $compile : ng.ICompileService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        scope: {
            itemPath: "@"
        },
        transclude: true,
        template: "<adh-inject></adh-inject>",
        link: (scope) => {
            adhHttp.getNewestVersionPathNoFork(scope.itemPath).then(
                (versionPath) => {
                    scope.versionPath = versionPath;
                });
        }
    };
};


/**
 * Recompiles children on every change of `value`. `value` is available in
 * child scope as `key`.
 *
 * Example:
 *
 *     <adh-recompile-on-change data-value="{{proposalPath}}" data-key="path">
 *         <adh-proposal path="{{path}}"></adh-proposal>
 *     </adh-recompile-on-change>
 */
export var recompileOnChange = ($compile : ng.ICompileService) => {
    return {
        restrict: "E",
        compile: (element, link) => {
            if (jQuery.isFunction(link)) {
                link = {post: link};
            }

            var contents = element.contents().remove();
            var compiledContents;
            var innerScope : ng.IScope;

            return {
                pre: (link && link.pre) ? link.pre : null,
                post: (scope : ng.IScope, element, attrs) => {
                    if (!compiledContents) {
                        compiledContents = $compile(contents);
                    }

                    scope.$watch(() => attrs["value"], (value) => {
                        if (typeof innerScope !== "undefined") {
                            innerScope.$destroy();
                            element.contents().remove();
                        }

                        innerScope = scope.$new();
                        innerScope[attrs["key"]] = value;

                        compiledContents(innerScope, (clone) => {
                            element.append(clone);
                        });
                    });

                    if (link && link.post) {
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
};


/**
 * Like ngIf, but does not remove the directive when
 * the condition switches back to false.
 *
 * NOTE: for simplicity, this can currently only used
 * as a wrapper element (not as attibute).
 */
export var waitForCondition = () => {
    return {
        restrict: "E",
        scope: {
            condition: "="
        },
        transclude: true,
        template: "<ng-transclude data-ng-if=\"wasTrueOnce\"></ng-transclude>",
        link: (scope, element, attrs) => {
            scope.$watch("condition", (value) => {
                if (value) {
                    scope.wasTrueOnce = true;
                }
            });
        }
    };
};


export var moduleName = "adhAngularHelpers";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName
        ])
        .factory("adhRecursionHelper", ["$compile", recursionHelper])
        .directive("adhRecompileOnChange", ["$compile", recompileOnChange])
        .directive("adhLastVersion", ["$compile", "adhHttp", lastVersion])
        .directive("adhWait", waitForCondition);
};
