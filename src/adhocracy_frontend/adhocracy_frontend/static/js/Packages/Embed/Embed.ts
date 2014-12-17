/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular-route.d.ts"/>

import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUtil = require("../Util/Util");

/**
 * List of directive names that can be embedded.  names must be in
 * lower-case with dashes, but without 'adh-' prefix.  (example:
 * 'document-workbench' for directive DocumentWorkbench.)
 */
var embeddableDirectives = [
    "document-workbench",
    "paragraph-version-detail",
    "comment-listing",
    "create-or-show-comment-listing",
    "login",
    "register",
    "user-indicator",
    "empty"
];

var metaParams = [
    "autoresize",
    "locale",
    "nocenter",
    "noheader"
];

export var location2template = ($location : ng.ILocationService) => {
    var widget : string = $location.path().split("/")[2];
    var search = $location.search();

    var attrs = [];
    if (!AdhUtil.isArrayMember(widget, embeddableDirectives)) {
        throw "unknown widget: " + widget;
    }

    if (widget === "empty") {
        return "";
    }
    for (var key in search) {
        if (search.hasOwnProperty(key) && metaParams.indexOf(key) === -1) {
            attrs.push(AdhUtil.formatString("data-{0}=\"{1}\"", _.escape(key), _.escape(search[key])));
        }
    }
    return AdhUtil.formatString("<adh-{0} {1}></adh-{0}>", _.escape(widget), attrs.join(" "));
};


export var normalizeInternalUrl = (url : string, $location : ng.ILocationService) => {
    var host = $location.protocol() + "://" + $location.host();
    var port = $location.port();
    if (port && (port !== 80) && (port !== 443)) {
        host = host + ":" + port;
    }
    if (url.lastIndexOf(host, 0) === 0) {
        url = url.substring(host.length);
    }
    return url;
};


export var isInternalUrl = (url : string, $location : ng.ILocationService) => {
    return normalizeInternalUrl(url, $location)[0] === "/";
};


export var hrefDirective = (adhConfig : AdhConfig.IService, $location, $rootScope) => {
    return {
        restrict: "A",
        link: (scope, element, attrs) => {
            if (element[0].nodeName === "A" && adhConfig.canonical_url) {
                scope.$watch(() => attrs.href, (orig) => {
                    if (orig && orig[0] !== "#") {
                        orig = normalizeInternalUrl(orig, $location);

                        if (isInternalUrl(orig, $location)) {
                            // set href to canonical url while preserving click behavior
                            element.attr("href", adhConfig.canonical_url + orig);
                            element.click((event) => {
                                _.defer(() => $rootScope.$apply(() => {
                                    $location.url(orig);
                                }));
                                event.preventDefault();
                            });
                        }
                    }
                });
            }
        }
    };
};


export var moduleName = "adhEmbed";

export var register = (angular) => {
    angular
        .module(moduleName, [
            "pascalprecht.translate",
            AdhTopLevelState.moduleName
        ])
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("embed", ["$location", ($location : ng.ILocationService) : AdhTopLevelState.IAreaInput => {
                    var params = $location.search();
                    var template = location2template($location);

                    if (!params.hasOwnProperty("nocenter")) {
                        template = "<div class=\"l-center\">" + template + "</div>";
                    }

                    if (!params.hasOwnProperty("noheader")) {
                        template = "<header class=\"l-header main-header\">" +
                        "<div class=\"l-header-wrapper\"><div class=\"l-header-right\">" +
                        "<adh-user-indicator></adh-user-indicator>" +
                        "</div></div></header>" + template;
                    }
                    return {
                        template: template
                    };
                }]);
        }])
        .run(["$location", "$translate", ($location, $translate) => {
            // Note: This works despite the routing removing the locale search
            // parameter immediately after. This is a bit awkward though.
            var params = $location.search();
            if (params.hasOwnProperty("locale")) {
                $translate.use(params.locale);
            }
        }])
        .directive("href", ["adhConfig", "$location", "$rootScope", hrefDirective]);
};
