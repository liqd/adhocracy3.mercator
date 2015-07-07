/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import AdhConfig = require("../Config/Config");
import AdhEmbed = require("../Embed/Embed");

export var parseMarkdown = (adhConfig : AdhConfig.IService, markdownit) => {
    return {
        scope: {
            parsetext: "="
        },
        restrict: "E",
        link: (scope, element) => {
            var md = new markdownit();
            var mdEl = angular.element("<div class=\"markdown-rendered\"></div>");

            scope.$watch("parsetext", (newValue) => {
                var mdElPrev = angular.element(element[0].querySelector(".markdown-rendered"));
                if (mdElPrev) {
                    mdElPrev.remove();
                }
                mdEl.append(md.render(newValue));
                element.append(mdEl);
            });
        }
    };
};

export var testMarkdown = (adhConfig: AdhConfig.IService) => {
    return {
        restrict: "E",
        template: "<textarea ng-model=\"data.parsetext\" cols=\"50\" rows=\"10\"></textarea>" +
        "<adh-parse-markdown ng-if=\"data.parsetext\" parsetext=\"data.parsetext\"></adh-parse-markdown>",
        link: (scope) => {
            scope.data = {};
        }
    };
};

export var moduleName = "adhMarkdown";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbed.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider.registerEmbeddableDirectives(["test-parse-markdown"]);
        }])
        .directive("adhParseMarkdown", ["adhConfig", "markdownit", parseMarkdown])
        .directive("adhTestParseMarkdown", ["adhConfig", testMarkdown]);
};
