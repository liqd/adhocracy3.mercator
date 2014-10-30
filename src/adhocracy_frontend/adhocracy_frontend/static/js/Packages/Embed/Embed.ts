/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular-route.d.ts"/>

import _ = require("lodash");

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
    "create-or-show-comment-listing"
];

export var location2template = ($location : ng.ILocationService) => {
    var widget : string = $location.path().split("/")[2];
    var search = $location.search();

    var attrs = [];
    if (!AdhUtil.isArrayMember(widget, embeddableDirectives)) {
        throw "unknown widget: " + widget;
    }
    for (var key in search) {
        if (search.hasOwnProperty(key) && key !== "locale") {
            attrs.push(AdhUtil.formatString("data-{0}=\"{1}\"", _.escape(key), _.escape(search[key])));
        }
    }
    return AdhUtil.formatString("<adh-{0} {1}></adh-{0}>", _.escape(widget), attrs.join(" "));
};


export var moduleName = "adhEmbed";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhTopLevelState.moduleName
        ])
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("embed", ["$translate", "$location", ($translate, $location : ng.ILocationService) : AdhTopLevelState.IAreaInput => {
                    var params = $location.search();
                    if (params.hasOwnProperty("locale")) {
                        $translate.use(params.locale);
                    }

                    return {
                        template:  "<header class=\"l-header main-header\">" +
                        "<adh-user-indicator></adh-user-indicator>" +
                        "</header>" +
                        location2template($location)
                    };
                }]);
        }]);
};
