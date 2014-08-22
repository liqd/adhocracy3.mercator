/// <reference path="../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/underscore/underscore.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/modernizr/modernizr.d.ts"/>
/// <reference path="./_all.d.ts"/>

import angular = require("angular");
import angularRoute = require("angularRoute");  if (angularRoute) { return; };
// (since angularRoute does not export any objects or types we would
// want to use, the extra mention of the module name is needed to keep
// tsc from purging this import entirely.  which would have undesired
// runtime effects.)

import angularAnimate = require("angularAnimate");  if (angularAnimate) { return; };

import modernizr = require("modernizr");

import AdhHttp = require("./Packages/Http/Http");
import AdhWebSocket = require("./Packages/WebSocket/WebSocket");
import AdhUser = require("./Packages/User/User");
import AdhDone = require("./Packages/Done/Done");
import AdhCrossWindowMessaging = require("./Packages/CrossWindowMessaging/CrossWindowMessaging");
import AdhRecursionHelper = require("./Packages/RecursionHelper/RecursionHelper");
import AdhInject = require("./Packages/Inject/Inject");
import AdhMetaApi = require("./Packages/MetaApi/MetaApi");
import AdhEventHandler = require("./Packages/EventHandler/EventHandler");
import AdhTopLevelState = require("./Packages/TopLevelState/TopLevelState");
import AdhComment = require("./Packages/Comment/Comment");
import AdhCommentAdapter = require("./Packages/Comment/Adapter");

import Listing = require("./Packages/Listing/Listing");
import DocumentWorkbench = require("./Packages/DocumentWorkbench/DocumentWorkbench");
import AdhProposal = require("./Packages/Proposal/Proposal");
import Embed = require("./Packages/Embed/Embed");


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

    var app = angular.module("adhocracy3SampleFrontend", ["ngRoute", "ngAnimate"]);

    app.config(["$routeProvider", "$locationProvider", ($routeProvider, $locationProvider) => {
        $routeProvider
            .when("/frontend_static/root.html", {
                templateUrl: "/frontend_static/js/templates/Wrapper.html"
            })
            .when("/register", {
                template: "<adh-register></adh-register>"
            })
            .when("/embed/:widget", {
                template: "<adh-embed></adh-embed>"
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
    }]);

    app.value("Modernizr", modernizr);

    app.service("adhProposal", AdhProposal.Service);
    app.service("adhUser", ["adhHttp", "$q", "$http", "$window", "Modernizr", AdhUser.User]);
    app.directive("adhLogin", ["adhConfig", AdhUser.loginDirective]);
    app.directive("adhRegister", ["adhConfig", "$location", AdhUser.registerDirective]);
    app.directive("adhUserIndicator", ["adhConfig", AdhUser.indicatorDirective]);
    app.directive("adhUserMeta", ["adhConfig", AdhUser.metaDirective]);
    app.value("adhConfig", config);
    app.factory("adhMetaApi", () => new AdhMetaApi.MetaApiQuery(meta_api));
    app.value("adhDone", AdhDone.done);
    app.value("adhEventHandlerClass", AdhEventHandler.EventHandler);

    app.service("adhTopLevelState", AdhTopLevelState.TopLevelState);
    app.directive("adhMovingColumns", ["adhTopLevelState", AdhTopLevelState.movingColumns]);
    app.directive("adhFocusSwitch", ["adhTopLevelState", AdhTopLevelState.adhFocusSwitch]);

    app.factory("recursionHelper", ["$compile", AdhRecursionHelper.factory]);
    app.directive("inject", AdhInject.factory);
    app.service("adhHttp", ["$http", "$q", "adhMetaApi", AdhHttp.Service]);
    app.factory("adhWebSocket", ["Modernizr", "adhConfig", AdhWebSocket.factory]);

    app.factory("adhCrossWindowMessaging", ["adhConfig", "$window", "$rootScope", AdhCrossWindowMessaging.factory]);

    app.directive("adhEmbed", ["$compile", "$route", Embed.factory]);

    app.directive("adhListing",
        ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
            new Listing.Listing(new Listing.ListingPoolAdapter()).createDirective(adhConfig, adhWebSocket)]);

    app.directive("adhCommentListing",
        ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
            new Listing.Listing(new AdhComment.ListingCommentableAdapter()).createDirective(adhConfig, adhWebSocket)]);

    app.directive("adhWebSocketTest",
        ["$timeout", "adhConfig", "adhWebSocket", ($timeout, adhConfig, adhWebSocket) =>
            new AdhWebSocket.WebSocketTest().createDirective($timeout, adhConfig, adhWebSocket)]);


    // application-specific (local) directives

    // adhCrossWindowMessaging does work by itself. We only need to inject in anywhere in order to instantiate it.
    app.directive("adhDocumentWorkbench",
        ["adhConfig", "adhCrossWindowMessaging", (adhConfig) =>
            new DocumentWorkbench.DocumentWorkbench().createDirective(adhConfig)]);

    app.directive("adhCommentCreate", ["adhConfig", (adhConfig) => {
        var adapter = new AdhCommentAdapter.CommentAdapter();
        var widget = new AdhComment.CommentCreate(adapter);
        return widget.createDirective(adhConfig);
    }]);
    app.directive("adhCommentDetail", ["adhConfig", "recursionHelper", (adhConfig, recursionHelper) => {
        var adapter = new AdhCommentAdapter.CommentAdapter();
        var widget = new AdhComment.CommentDetail(adapter);
        return widget.createDirective(adhConfig, recursionHelper);
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


    // get going

    angular.bootstrap(document, ["adhocracy3SampleFrontend"]);
    loadComplete();
};
