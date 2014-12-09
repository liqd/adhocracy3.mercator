/// <reference path="../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/lodash/lodash.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/modernizr/modernizr.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/moment/moment.d.ts"/>
/// <reference path="./_all.d.ts"/>

import angular = require("angular");

import angularAnimate = require("angularAnimate");  if (angularAnimate) { ; };
import angularAria = require("angularAria");  if (angularAria) { ; };
import angularMessages = require("angularMessages");  if (angularMessages) { ; };
import angularTranslate = require("angularTranslate");  if (angularTranslate) { ; };
import angularTranslateLoader = require("angularTranslateLoader");  if (angularTranslateLoader) { ; };
import angularElastic = require("angularElastic");  if (angularElastic) { ; };
import angularScroll = require("angularScroll");  if (angularScroll) { ; };
import angularFlow = require("angularFlow");  if (angularFlow) { ; };

import modernizr = require("modernizr");
import moment = require("moment");

import AdhConfig = require("./Packages/Config/Config");
import AdhComment = require("./Packages/Comment/Comment");
import AdhCrossWindowMessaging = require("./Packages/CrossWindowMessaging/CrossWindowMessaging");
import AdhDateTime = require("./Packages/DateTime/DateTime");
import AdhDone = require("./Packages/Done/Done");
import AdhEmbed = require("./Packages/Embed/Embed");
import AdhEventHandler = require("./Packages/EventHandler/EventHandler");
import AdhHttp = require("./Packages/Http/Http");
import AdhInject = require("./Packages/Inject/Inject");
import AdhListing = require("./Packages/Listing/Listing");
import AdhMercatorProposal = require("./Packages/MercatorProposal/MercatorProposal");
import AdhMercatorWorkbench = require("./Packages/MercatorWorkbench/MercatorWorkbench");
import AdhMovingColumns = require("./Packages/MovingColumns/MovingColumns");
import AdhPermissions = require("./Packages/Permissions/Permissions");
import AdhPreliminaryNames = require("./Packages/PreliminaryNames/PreliminaryNames");
import AdhProposal = require("./Packages/Proposal/Proposal");
import AdhRate = require("./Packages/Rate/Rate");
import AdhRecursionHelper = require("./Packages/RecursionHelper/RecursionHelper");
import AdhResourceArea = require("./Packages/ResourceArea/ResourceArea");
import AdhResourceWidgets = require("./Packages/ResourceWidgets/ResourceWidgets");
import AdhSticky = require("./Packages/Sticky/Sticky");
import AdhTopLevelState = require("./Packages/TopLevelState/TopLevelState");
import AdhUser = require("./Packages/User/User");
import AdhVisible = require("./Packages/Visible/Visible");
import AdhWebSocket = require("./Packages/WebSocket/WebSocket");


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

    var app = angular.module("a3Mercator", [
        "monospaced.elastic",
        "pascalprecht.translate",
        "ngAnimate",
        "ngAria",
        "ngMessages",
        "duScroll",
        "flow",
        AdhComment.moduleName,
        AdhDone.moduleName,
        AdhCrossWindowMessaging.moduleName,
        AdhEmbed.moduleName,
        AdhMercatorProposal.moduleName,
        AdhMercatorWorkbench.moduleName,
        AdhResourceArea.moduleName,
        AdhProposal.moduleName,
        AdhSticky.moduleName
    ]);

    app.config(["adhTopLevelStateProvider", "$translateProvider", "$locationProvider", "$ariaProvider", (
        adhTopLevelStateProvider : AdhTopLevelState.Provider,
        $translateProvider,
        $locationProvider,
        $ariaProvider
    ) => {
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

        // Make sure HTML5 history API works.  (If support for older
        // browsers is required, we may have to study angular support
        // for conversion between history API and #!-URLs.  See
        // angular documentation for details.)
        $locationProvider.html5Mode(true);

        $translateProvider.useStaticFilesLoader({
            prefix: "/static/i18n/",
            suffix: ".json"
        });
        $translateProvider.preferredLanguage(config.locale);
        $translateProvider.fallbackLanguage("en");

        $ariaProvider.config({
            tabindex: false
        });
    }]);

    app.value("angular", angular);
    app.value("Modernizr", modernizr);
    app.value("moment", moment);

    app.filter("signum", () => (n : number) : string => n > 0 ? "+" + n.toString() : n.toString());

    // register our modules
    app.value("adhConfig", config);
    AdhComment.register(angular);
    AdhCrossWindowMessaging.register(angular, config.trusted_domains === []);
    AdhDateTime.register(angular);
    AdhDone.register(angular);
    AdhEmbed.register(angular);
    AdhEventHandler.register(angular);
    AdhHttp.register(angular, meta_api);
    AdhInject.register(angular);
    AdhListing.register(angular);
    AdhMercatorProposal.register(angular);
    AdhMercatorWorkbench.register(angular);
    AdhMovingColumns.register(angular);
    AdhPermissions.register(angular);
    AdhPreliminaryNames.register(angular);
    AdhProposal.register(angular);
    AdhRate.register(angular);
    AdhRecursionHelper.register(angular);
    AdhResourceArea.register(angular);
    AdhResourceWidgets.register(angular);
    AdhSticky.register(angular);
    AdhTopLevelState.register(angular);
    AdhUser.register(angular);
    AdhVisible.register(angular);
    AdhWebSocket.register(angular);

    // force-load some services
    var injector = angular.bootstrap(document, ["a3Mercator"]);
    injector.get("adhCrossWindowMessaging");

    loadComplete();
};
