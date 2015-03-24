/// <reference path="../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/lodash/lodash.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/modernizr/modernizr.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/moment/moment.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/leaflet/leaflet.d.ts"/>
/// <reference path="./_all.d.ts"/>

import angular = require("angular");

import angularAnimate = require("angularAnimate");  if (angularAnimate) { ; };
import angularAria = require("angularAria");  if (angularAria) { ; };
import angularMessages = require("angularMessages");  if (angularMessages) { ; };
import angularCache = require("angularCache");  if (angularCache) { ; };
import angularTranslate = require("angularTranslate");  if (angularTranslate) { ; };
import angularTranslateLoader = require("angularTranslateLoader");  if (angularTranslateLoader) { ; };
import angularElastic = require("angularElastic");  if (angularElastic) { ; };

import modernizr = require("modernizr");
import moment = require("moment");
import webshim = require("polyfiller");
import leaflet = require("leaflet");

import AdhAbuse = require("./Packages/Abuse/Abuse");
import AdhConfig = require("./Packages/Config/Config");
import AdhComment = require("./Packages/Comment/Comment");
import AdhCrossWindowMessaging = require("./Packages/CrossWindowMessaging/CrossWindowMessaging");
import AdhDateTime = require("./Packages/DateTime/DateTime");
import AdhDocumentWorkbench = require("./Packages/DocumentWorkbench/DocumentWorkbench");
import AdhDone = require("./Packages/Done/Done");
import AdhEmbed = require("./Packages/Embed/Embed");
import AdhEventManager = require("./Packages/EventManager/EventManager");
import AdhHttp = require("./Packages/Http/Http");
import AdhInject = require("./Packages/Inject/Inject");
import AdhListing = require("./Packages/Listing/Listing");
import AdhLocale = require("./Packages/Locale/Locale");
import AdhLocalSocket = require("./Packages/LocalSocket/LocalSocket");
import AdhMapping = require("./Packages/Mappting/Mapping");
import AdhMovingColumns = require("./Packages/MovingColumns/MovingColumns");
import AdhPermissions = require("./Packages/Permissions/Permissions");
import AdhPreliminaryNames = require("./Packages/PreliminaryNames/PreliminaryNames");
import AdhProcess = require("./Packages/Process/Process");
import AdhProposal = require("./Packages/Proposal/Proposal");
import AdhRate = require("./Packages/Rate/Rate");
import AdhAngularHelpers = require("./Packages/AngularHelpers/AngularHelpers");
import AdhResourceArea = require("./Packages/ResourceArea/ResourceArea");
import AdhResourceWidgets = require("./Packages/ResourceWidgets/ResourceWidgets");
import AdhShareSocial = require("./Packages/ShareSocial/ShareSocial");
import AdhSticky = require("./Packages/Sticky/Sticky");
import AdhTopLevelState = require("./Packages/TopLevelState/TopLevelState");
import AdhTracking = require("./Packages/Tracking/Tracking");
import AdhUser = require("./Packages/User/User");
import AdhUserViews = require("./Packages/User/Views");
import AdhWebSocket = require("./Packages/WebSocket/WebSocket");
import AdhTemplates = require("adhTemplates");  if (AdhTemplates) { ; };

webshim.setOptions("basePath", "/static/lib/webshim/js-webshim/minified/shims/");
webshim.setOptions("forms-ext", {"replaceUI": true});
webshim.setOptions({"waitReady": false});
webshim.polyfill("forms forms-ext");

var loadComplete = () : void => {
    var w = (<any>window);
    w.adhocracy = w.adhocracy || {};
    w.adhocracy.loadState = "complete";
};


export var init = (config : AdhConfig.IService, meta_api) => {
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
        "angular-data.DSCacheFactory",
        AdhComment.moduleName,
        AdhDocumentWorkbench.moduleName,
        AdhDone.moduleName,
        AdhCrossWindowMessaging.moduleName,
        AdhEmbed.moduleName,
        AdhResourceArea.moduleName,
        AdhProposal.moduleName,
        AdhSticky.moduleName,
        AdhTracking.moduleName,
        AdhUserViews.moduleName
    ];

    if (config.cachebust) {
        appDependencies.push("templates");
    }

    var app = angular.module("a3", appDependencies);

    app.config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
        adhTopLevelStateProvider
            .when("", ["$location", ($location) : AdhTopLevelState.IAreaInput => {
                $location.replace();
                $location.path("/r/adhocracy/");
                return {
                    skip: true
                };
            }])
            .otherwise(() : AdhTopLevelState.IAreaInput => {
                return {
                    template: "<adh-page-wrapper><h1>404 - Not Found</h1></adh-page-wrapper>"
                };
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
            }]
        });
        $translateProvider.preferredLanguage(config.locale);
        $translateProvider.fallbackLanguage("en");
    }]);
    app.config(["$ariaProvider", ($ariaProvider) => {
        $ariaProvider.config({
            tabindex: false
        });
    }]);

    app.value("angular", angular);
    app.value("Modernizr", modernizr);
    app.value("moment", moment);
    app.value("leaflet", leaflet);

    app.filter("signum", () => (n : number) : string => n > 0 ? "+" + n.toString() : n.toString());

    // register our modules
    app.value("adhConfig", config);
    AdhAbuse.register(angular);
    AdhComment.register(angular);
    AdhCrossWindowMessaging.register(angular, config.trusted_domains === []);
    AdhDateTime.register(angular);
    AdhDocumentWorkbench.register(angular);
    AdhDone.register(angular);
    AdhEmbed.register(angular);
    AdhEventManager.register(angular);
    AdhHttp.register(angular, config, meta_api);
    AdhInject.register(angular);
    AdhListing.register(angular);
    AdhLocale.register(angular);
    AdhLocalSocket.register(angular);
    AdhMapping.register(angular);
    AdhMovingColumns.register(angular);
    AdhPermissions.register(angular);
    AdhPreliminaryNames.register(angular);
    AdhProposal.register(angular);
    AdhProcess.register(angular);
    AdhRate.register(angular);
    AdhAngularHelpers.register(angular);
    AdhResourceArea.register(angular);
    AdhResourceWidgets.register(angular);
    AdhShareSocial.register(angular);
    AdhSticky.register(angular);
    AdhTopLevelState.register(angular);
    AdhTracking.register(angular);
    AdhUser.register(angular);
    AdhUserViews.register(angular);
    AdhWebSocket.register(angular);

    // force-load some services
    var injector = angular.bootstrap(document, ["a3"], {strictDi: true});
    injector.get("adhCrossWindowMessaging");

    loadComplete();
};
