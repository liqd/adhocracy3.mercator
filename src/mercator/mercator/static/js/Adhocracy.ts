/// <reference path="../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/lodash/lodash.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/modernizr/modernizr.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/moment/moment.d.ts"/>
/// <reference path="./_all.d.ts"/>

import * as angular from "angular";

import * as angularAnimate from "angularAnimate";  if (angularAnimate) { ; };
import * as angularAria from "angularAria";  if (angularAria) { ; };
import * as angularMessages from "angularMessages";  if (angularMessages) { ; };
import * as angularCache from "angularCache";  if (angularCache) { ; };
import * as angularTranslate from "angularTranslate";  if (angularTranslate) { ; };
import * as angularTranslateLoader from "angularTranslateLoader";  if (angularTranslateLoader) { ; };
import * as angularElastic from "angularElastic";  if (angularElastic) { ; };
import * as angularScroll from "angularScroll";  if (angularScroll) { ; };
import * as angularFlow from "angularFlow";  if (angularFlow) { ; };

import * as markdownit from "markdownit";
import * as modernizr from "modernizr";
import * as moment from "moment";
import * as webshim from "polyfiller";

import * as AdhAbuseModule from "./Packages/Abuse/Module";
import * as AdhAngularHelpersModule from "./Packages/AngularHelpers/Module";
import * as AdhBadgeModule from "./Packages/Badge/Module";
import * as AdhBlogModule from "./Packages/Blog/Module";
import * as AdhCommentModule from "./Packages/Comment/Module";
import * as AdhCrossWindowMessagingModule from "./Packages/CrossWindowMessaging/Module";
import * as AdhDateTimeModule from "./Packages/DateTime/Module";
import * as AdhDoneModule from "./Packages/Done/Module";
import * as AdhEmbedModule from "./Packages/Embed/Module";
import * as AdhEventManagerModule from "./Packages/EventManager/Module";
import * as AdhHttpModule from "./Packages/Http/Module";
import * as AdhImageModule from "./Packages/Image/Module";
import * as AdhInjectModule from "./Packages/Inject/Module";
import * as AdhListingModule from "./Packages/Listing/Module";
import * as AdhLocaleModule from "./Packages/Locale/Module";
import * as AdhLocalSocketModule from "./Packages/LocalSocket/Module";
import * as AdhMarkdownModule from "./Packages/Markdown/Module";
import * as AdhMercatorProposalModule from "./Packages/MercatorProposal/Module";
import * as AdhMercatorWorkbenchModule from "./Packages/MercatorWorkbench/Module";
import * as AdhMovingColumnsModule from "./Packages/MovingColumns/Module";
import * as AdhPermissionsModule from "./Packages/Permissions/Module";
import * as AdhPreliminaryNamesModule from "./Packages/PreliminaryNames/Module";
import * as AdhProcessModule from "./Packages/Process/Module";
import * as AdhRateModule from "./Packages/Rate/Module";
import * as AdhResourceActionsModule from "./Packages/ResourceActions/Module";
import * as AdhResourceAreaModule from "./Packages/ResourceArea/Module";
import * as AdhResourceWidgetsModule from "./Packages/ResourceWidgets/Module";
import * as AdhShareSocialModule from "./Packages/ShareSocial/Module";
import * as AdhStickyModule from "./Packages/Sticky/Module";
import * as AdhTopLevelStateModule from "./Packages/TopLevelState/Module";
import * as AdhTrackingModule from "./Packages/Tracking/Module";
import * as AdhUserModule from "./Packages/User/Module";
import * as AdhUserViewsModule from "./Packages/User/ViewsModule";
import * as AdhWebSocketModule from "./Packages/WebSocket/Module";

import * as AdhConfig from "./Packages/Config/Config";
import * as AdhTopLevelState from "./Packages/TopLevelState/TopLevelState";
import * as AdhTemplates from "adhTemplates";  if (AdhTemplates) { ; };

webshim.setOptions("basePath", "/static/lib/webshim/js-webshim/minified/shims/");
webshim.setOptions("forms-ext", {"replaceUI": true});
webshim.setOptions({"waitReady": false});
webshim.polyfill("forms forms-ext");

var loadComplete = () : void => {
    var w = (<any>window);
    w.adhocracy = w.adhocracy || {};
    w.adhocracy.loadState = "complete";
};


export var init = (config : AdhConfig.IService, metaApi) => {
    "use strict";

    // detect wheter we are running in iframe
    config.embedded = (window !== top);
    if (config.embedded) {
        window.document.body.className += " is-embedded";
    }

    var appDependencies = [
        "monospaced.elastic",
        "pascalprecht.translate",
        "ngAnimate",
        "ngAria",
        "ngMessages",
        "duScroll",
        "flow",
        AdhCommentModule.moduleName,
        AdhCrossWindowMessagingModule.moduleName,
        AdhEmbedModule.moduleName,
        AdhMercatorWorkbenchModule.moduleName,
        AdhResourceActionsModule.moduleName,
        AdhResourceAreaModule.moduleName,
        AdhTrackingModule.moduleName,
        AdhUserViewsModule.moduleName
    ];

    if (config.cachebust) {
        appDependencies.push("templates");
    }

    var app = angular.module("a3Mercator", appDependencies);

    app.config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
        adhTopLevelStateProvider
            .when("", ["$location", ($location) : AdhTopLevelState.IAreaInput => {
                $location.replace();
                $location.path("/r/mercator/");
                return {
                    skip: true
                };
            }])
            .otherwise(() : AdhTopLevelState.IAreaInput => {
                return {
                    template: "<adh-page-wrapper><h1>404 - Not Found</h1></adh-page-wrapper>"
                };
            })
            // FIXME: should be full urls. (but seems to work)
            .space("user", {
                resourceUrl: "/principals/users/"
            })
            .space("content", {
                resourceUrl: "/mercator/"
            });
    }]);
    app.config(["$compileProvider", ($compileProvider) => {
        $compileProvider.debugInfoEnabled(config.debug);
    }]);
    app.config(["$locationProvider", ($locationProvider) => {
        // Make sure HTML5 history API works.  (If support for older
        // browsers is required, we may have to study angular support
        // for conversion between history API and #!-URLs.  See
        // angular documentation for details.)
        $locationProvider.html5Mode(true);
    }]);
    app.config(["$translateProvider", ($translateProvider) => {
         $translateProvider.useStaticFilesLoader({
            files: [{
                prefix: "/static/i18n/core_",
                suffix: config.cachebust ? ".json?" + config.cachebust_suffix : ".json"
            }, {
                prefix: "/static/i18n/countries_",
                suffix: config.cachebust ? ".json?" + config.cachebust_suffix : ".json"
            }, {
                prefix: "/static/i18n/mercator_",
                suffix: config.cachebust ? ".json?" + config.cachebust_suffix : ".json"
            }]
        });
        $translateProvider.useSanitizeValueStrategy("escape");
        $translateProvider.preferredLanguage(config.locale);
        $translateProvider.fallbackLanguage("en");
    }]);
    app.config(["$ariaProvider", ($ariaProvider) => {
        $ariaProvider.config({
            tabindex: false
        });
    }]);

    app.value("angular", angular);
    app.value("markdownit", markdownit);
    app.value("modernizr", modernizr);
    app.value("moment", moment);

    // register our modules
    app.value("adhConfig", config);
    AdhAbuseModule.register(angular);
    AdhBadgeModule.register(angular);
    AdhBlogModule.register(angular);
    AdhCommentModule.register(angular);
    AdhCrossWindowMessagingModule.register(angular, config.trusted_domains !== []);
    AdhDateTimeModule.register(angular);
    AdhDoneModule.register(angular);
    AdhEmbedModule.register(angular);
    AdhEventManagerModule.register(angular);
    AdhHttpModule.register(angular, config, metaApi);
    AdhImageModule.register(angular);
    AdhInjectModule.register(angular);
    AdhListingModule.register(angular);
    AdhLocaleModule.register(angular);
    AdhLocalSocketModule.register(angular);
    AdhMarkdownModule.register(angular);
    AdhMercatorProposalModule.register(angular);
    AdhMercatorWorkbenchModule.register(angular);
    AdhMovingColumnsModule.register(angular);
    AdhPermissionsModule.register(angular);
    AdhPreliminaryNamesModule.register(angular);
    AdhProcessModule.register(angular);
    AdhRateModule.register(angular);
    AdhAngularHelpersModule.register(angular);
    AdhResourceActionsModule.register(angular);
    AdhResourceAreaModule.register(angular);
    AdhResourceWidgetsModule.register(angular);
    AdhShareSocialModule.register(angular);
    AdhStickyModule.register(angular);
    AdhTopLevelStateModule.register(angular);
    AdhTrackingModule.register(angular);
    AdhUserModule.register(angular);
    AdhUserViewsModule.register(angular);
    AdhWebSocketModule.register(angular);

    // force-load some services
    var injector = angular.bootstrap(document.body, ["a3Mercator"], {strictDi: true});
    injector.get("adhCrossWindowMessaging");

    loadComplete();
};
