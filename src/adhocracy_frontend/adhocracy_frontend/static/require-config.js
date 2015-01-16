require.config({
    baseUrl: "/static/js/",
    config: {
        text: {
            useXhr: function (url, protocol, hostname, port) {
                // we have CORS headers set for all text resources we load
                // through require.
                return true;
            }
        }
    },
    paths: {
        text: "../lib/requirejs-text/text",
        jquery: "../lib/jquery/dist/jquery",
        angular: "../lib/angular/angular",
        angularAnimate: "../lib/angular-animate/angular-animate",
        angularAria: "../lib/angular-aria/angular-aria",
        angularTranslate: "../lib/angular-translate/angular-translate",
        angularTranslateLoader: "../lib/angular-translate-loader-static-files/angular-translate-loader-static-files",
        angularElastic: "../lib/angular-elastic/elastic",
        angularScroll: "../lib/angular-scroll/angular-scroll.min",
        angularFlow: "../lib/ng-flow/dist/ng-flow",
        angularMessages: "../lib/angular-messages/angular-messages.min",
        flow: "../lib/flow.js/dist/flow",
        lodash: "../lib/lodash/dist/lodash",
        q: "../lib/q/q",
        modernizr: "../lib2/modernizr/modernizr-2.8.3.min",
        moment: "../lib/moment/min/moment-with-locales",
        sticky: "../lib/sticky-kit/jquery.sticky-kit",
        socialSharePrivacy: "../lib/jquery.socialshareprivacy/jquery.socialshareprivacy.min"
    },
    shim: {
        jquery: {
            exports: "$"
        },
        angular: {
            exports: "angular"
        },
        angularAnimate: {
            deps: ["angular"]
        },
        angularAria: {
            deps: ["angular"]
        },
        angularMessages: {
            deps: ["angular"]
        },
        angularTranslate: {
            deps: ["angular"]
        },
        angularTranslateLoader: {
            deps: ["angularTranslate"]
        },
        angularElastic: {
            deps: ["angular"]
        },
        angularScroll: {
            deps: ["angular"]
        },
        angularFlow: {
            deps: ["angular", "flow"]
        },
        modernizr: {
            exports: "Modernizr"
        },
        sticky: {
            deps: ["jquery"]
        },
    }
});
