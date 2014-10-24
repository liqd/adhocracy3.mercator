/// <reference path="../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/lodash/lodash.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/modernizr/modernizr.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/moment/moment.d.ts"/>
/// <reference path="./_all.d.ts"/>

import angular = require("angular");
import angularRoute = require("angularRoute");  if (angularRoute) { ; };
// (since angularRoute does not export any objects or types we would
// want to use, the extra mention of the module name is needed to keep
// tsc from purging this import entirely.  which would have undesired
// runtime effects.)

import angularAnimate = require("angularAnimate");  if (angularAnimate) { ; };
import angularTranslate = require("angularTranslate");  if (angularTranslate) { ; };
import angularTranslateLoader = require("angularTranslateLoader");  if (angularTranslateLoader) { ; };
import angularElastic = require("angularElastic");  if (angularElastic) { ; };

import modernizr = require("modernizr");
import moment = require("moment");

import AdhCommentAdapter = require("./Packages/Comment/Adapter");
import AdhComment = require("./Packages/Comment/Comment");
import AdhCrossWindowMessaging = require("./Packages/CrossWindowMessaging/CrossWindowMessaging");
import AdhDateTime = require("./Packages/DateTime/DateTime");
import AdhDocumentWorkbench = require("./Packages/DocumentWorkbench/DocumentWorkbench");
import AdhDone = require("./Packages/Done/Done");
import AdhEmbed = require("./Packages/Embed/Embed");
import AdhEventHandler = require("./Packages/EventHandler/EventHandler");
import AdhHttp = require("./Packages/Http/Http");
import AdhMetaApi = require("./Packages/Http/MetaApi");
import AdhInject = require("./Packages/Inject/Inject");
import AdhListing = require("./Packages/Listing/Listing");
import AdhMercatorProposal = require("./Packages/MercatorProposal/MercatorProposal");
import AdhPermissions = require("./Packages/Permissions/Permissions");
import AdhPreliminaryNames = require("./Packages/PreliminaryNames/PreliminaryNames");
import AdhProposal = require("./Packages/Proposal/Proposal");
import AdhRateAdapter = require("./Packages/Rate/Adapter");
import AdhRate = require("./Packages/Rate/Rate");
import AdhRecursionHelper = require("./Packages/RecursionHelper/RecursionHelper");
import AdhResourceWidgets = require("./Packages/ResourceWidgets/ResourceWidgets");
import AdhRoute = require("./Packages/Route/Route");
import AdhTopLevelState = require("./Packages/TopLevelState/TopLevelState");
import AdhUser = require("./Packages/User/User");
import AdhWebSocket = require("./Packages/WebSocket/WebSocket");


var loadComplete = () : void => {
    var w = (<any>window);
    w.adhocracy = w.adhocracy || {};
    w.adhocracy.loadState = "complete";
};


export var init = (config, meta_api) => {
    "use strict";

    // detect wheter we are running in iframe
    config.embedded = (window !== top);
    if (config.embedded) {
        window.document.body.className += " is-embedded";
    }

    // FIXME: The functionality to set the locale is not yet done
    config.locale = "de";

    var app = angular.module("adhocracy3SampleFrontend", ["monospaced.elastic", "pascalprecht.translate", "ngRoute", "ngAnimate"]);

    app.config(["$translateProvider", "$routeProvider", "$locationProvider", (
        $translateProvider,
        $routeProvider,
        $locationProvider
    ) => {
        $routeProvider
            .when("/", {
                template: "",
                controller: ["adhConfig", "$location", (adhConfig, $location) => {
                    $location.path("/r" + adhConfig.rest_platform_path);
                }]
            })
            .when("/r/:path*", {
                controller: ["adhHttp", "adhConfig", "adhTopLevelState", "$routeParams", "$scope", AdhRoute.resourceRouter],
                templateUrl: "/static/js/templates/Wrapper.html",
                reloadOnSearch: false
            })
            .when("/login", {
                templateUrl: "/static/js/templates/Login.html"
            })
            .when("/register", {
                templateUrl: "/static/js/templates/Register.html"
            })
            .when("/activate/:key", {
                controller: ["adhUser", "adhTopLevelState", "adhDone", "$route", "$location", AdhUser.activateController],
                template: ""
            })
            .when("/mercator", {
                template: "<adh-resource-wrapper>" +
                    "<adh-mercator-proposal-create data-path=\"@preliminary\" data-mode=\"edit\" data-pool-path=\"{{path}}\">" +
                    "</adh-mercator-proposal-create></adh-resource-wrapper>",
                controller: ["adhConfig", "$scope", (adhConfig, $scope) => {
                    $scope.path = adhConfig.rest_url + adhConfig.rest_platform_path;
                }]
            })
            .when("/mercator-listing", {
                template: "<adh-mercator-proposal-listing data-path=\"{{path}}\">" +
                    "</adh-mercator-proposal-listing>",
                controller: ["adhConfig", "$scope", (adhConfig, $scope) => {
                    $scope.path = adhConfig.rest_url + adhConfig.rest_platform_path;
                }]
            })
            .when("/activation_error", {
                templateUrl: "/static/js/templates/ActivationError.html",
                controller: ["adhConfig", "$scope", (adhConfig, $scope) => {
                    $scope.translationData = {
                        supportEmail: adhConfig.support_email
                    };
                }]
            })
            .when("/embed/:widget", {
                template: "<adh-embed></adh-embed>",
                controller: ["$translate", "$route", ($translate, $route : ng.route.IRouteService) => {
                    var params = $route.current.params;
                    if (params.hasOwnProperty("locale")) {
                        $translate.use(params.locale);
                    }
                }]
            })
            .otherwise({
                // FIXME: proper error template
                template: "<h1>404 - not Found</h1>"
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
    }]);

    app.value("angular", angular);
    app.value("Modernizr", modernizr);
    app.value("moment", moment);

    app.filter("signum", () => (n : number) : string => n > 0 ? "+" + n.toString() : n.toString());

    app.service("adhProposal", ["adhHttp", "adhPreliminaryNames", "$q", AdhProposal.Service]);
    app.service("adhUser", ["adhHttp", "$q", "$http", "$rootScope", "$window", "angular", "Modernizr", AdhUser.Service]);
    app.directive("adhLogin", ["adhConfig", AdhUser.loginDirective]);
    app.directive("adhRegister", ["adhConfig", AdhUser.registerDirective]);
    app.directive("adhUserIndicator", ["adhConfig", AdhUser.indicatorDirective]);
    app.directive("adhUserMeta", ["adhConfig", AdhUser.metaDirective]);
    app.value("adhConfig", config);
    app.factory("adhMetaApi", () => new AdhMetaApi.MetaApiQuery(meta_api));
    app.value("adhDone", AdhDone.done);
    app.value("adhEventHandlerClass", AdhEventHandler.EventHandler);

    app.service("adhPermissions", ["adhHttp", "adhUser", AdhPermissions.Service]);
    app.service("adhTopLevelState", ["adhEventHandlerClass", "$location", "$rootScope", AdhTopLevelState.Service]);
    app.directive("adhMovingColumns", ["adhTopLevelState", AdhTopLevelState.movingColumns]);
    app.directive("adhFocusSwitch", ["adhTopLevelState", AdhTopLevelState.adhFocusSwitch]);

    app.factory("recursionHelper", ["$compile", AdhRecursionHelper.factory]);
    app.directive("inject", AdhInject.factory);
    app.service("adhPreliminaryNames", AdhPreliminaryNames);
    app.service("adhHttp", ["$http", "$q", "$timeout", "adhMetaApi", "adhPreliminaryNames", "adhConfig", AdhHttp.Service]);
    app.factory("adhWebSocket", ["Modernizr", "adhConfig", AdhWebSocket.factory]);

    if (config.trustedDomains === []) {
        app.factory("adhCrossWindowMessaging", ["adhConfig", "$window", "$rootScope", AdhCrossWindowMessaging.factory]);
    } else {
        app.factory("adhCrossWindowMessaging", ["adhConfig", "$window", "$rootScope", "adhUser", AdhCrossWindowMessaging.factory]);
    }

    app.directive("adhEmbed", ["$compile", "$route", AdhEmbed.factory]);

    app.directive("adhListing",
        ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
            new AdhListing.Listing(new AdhListing.ListingPoolAdapter()).createDirective(adhConfig, adhWebSocket)]);

    app.directive("adhCommentListingPartial",
        ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
            new AdhListing.Listing(new AdhCommentAdapter.ListingCommentableAdapter()).createDirective(adhConfig, adhWebSocket)]);

    app.directive("adhCommentListing", ["adhConfig", AdhComment.adhCommentListing]);
    app.directive("adhCreateOrShowCommentListing", ["adhConfig", AdhComment.adhCreateOrShowCommentListing]);

    app.directive("adhWebSocketTest",
        ["$timeout", "adhConfig", "adhWebSocket", ($timeout, adhConfig, adhWebSocket) =>
            new AdhWebSocket.WebSocketTest().createDirective($timeout, adhConfig, adhWebSocket)]);


    // application-specific (local) directives

    // adhCrossWindowMessaging does work by itself. We only need to inject in anywhere in order to instantiate it.
    app.directive("adhDocumentWorkbench",
        ["adhConfig", (adhConfig) =>
            new AdhDocumentWorkbench.DocumentWorkbench().createDirective(adhConfig)]);

    app.directive("adhResourceWrapper", AdhResourceWidgets.resourceWrapper);
    app.directive("adhCommentResource", ["adhConfig", "adhHttp", "adhPermissions", "adhPreliminaryNames", "recursionHelper", "$q",
        (adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, recursionHelper, $q) => {
            var adapter = new AdhCommentAdapter.CommentAdapter();
            var widget = new AdhComment.CommentResource(adapter, adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, $q);
            return widget.createRecursionDirective(recursionHelper);
        }]);
    app.directive("adhCommentCreate", ["adhConfig", "adhHttp", "adhPermissions", "adhPreliminaryNames", "recursionHelper", "$q",
        (adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, recursionHelper, $q) => {
            var adapter = new AdhCommentAdapter.CommentAdapter();
            var widget = new AdhComment.CommentCreate(adapter, adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, $q);
            return widget.createRecursionDirective(recursionHelper);
        }]);
    app.directive("adhProposalDetail", () => new AdhProposal.ProposalDetail().createDirective());
    app.directive("adhProposalVersionDetail",
        ["adhConfig", (adhConfig) => new AdhProposal.ProposalVersionDetail().createDirective(adhConfig)]);
    app.directive("adhProposalVersionNew",
        ["adhHttp", "adhConfig", "adhProposal", (adhHttp, adhConfig, adhProposal) =>
            new AdhProposal.ProposalVersionNew().createDirective(adhHttp, adhConfig, adhProposal)]);
    app.directive("adhSectionVersionDetail",
        ["adhConfig", "recursionHelper", (adhConfig, recursionHelper) =>
            new AdhProposal.SectionVersionDetail().createDirective(adhConfig, recursionHelper)]);
    app.directive("adhParagraphVersionDetail",
        ["adhConfig", (adhConfig) => new AdhProposal.ParagraphVersionDetail().createDirective(adhConfig)]);

    app.directive("adhTime", ["adhConfig", "moment", "$interval", AdhDateTime.createDirective]);

    app.directive("adhRate", ["$q", "adhConfig", "adhPreliminaryNames", ($q, adhConfig, adhPreliminaryNames) =>
        AdhRate.createDirective(
            new AdhRateAdapter.RateAdapter(),
            adhConfig
        )]);

    app.directive("adhMercatorProposal", ["adhConfig", "adhHttp", "adhPreliminaryNames", "$q",
        (adhConfig, adhHttp, adhPreliminaryNames, $q) => {
            var widget = new AdhMercatorProposal.Widget(adhConfig, adhHttp, adhPreliminaryNames, $q);
            return widget.createDirective();
        }]);

    app.directive("adhMercatorProposalCreate", ["adhConfig", "adhHttp", "adhPreliminaryNames", "$q",
        (adhConfig, adhHttp, adhPreliminaryNames, $q) => {
            var widget = new AdhMercatorProposal.CreateWidget(adhConfig, adhHttp, adhPreliminaryNames, $q);
            return widget.createDirective();
        }]);

    app.directive("adhMercatorProposalListing", ["adhConfig", AdhMercatorProposal.listing]);
    app.directive("adhRouteView", ["$compile", AdhRoute.viewFactory]);

    app.directive("adhLastVersion", ["$compile", "adhHttp", AdhMercatorProposal.lastVersion]);

    // get going

    var injector = angular.bootstrap(document, ["adhocracy3SampleFrontend"]);
    injector.get("adhCrossWindowMessaging");

    loadComplete();
};
