require.config({
    baseUrl: "/static/js/",
% if url_args:
    urlArgs: "${url_args}",
% endif
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
% if minify:
        Adhocracy: "./Adhocracy.min",
% else:
        Adhocracy: "./Adhocracy",
        adhTemplates: "./templates",
% endif
        text: "../lib/requirejs-text/text",
        jquery: "../lib/jquery/dist/jquery",
        angular: "../lib/angular/angular.min",
        angularAnimate: "../lib/angular-animate/angular-animate.min",
        angularAria: "../lib/angular-aria/angular-aria.min",
        angularCache: "../lib/angular-cache/dist/angular-cache.min",
        angularTranslate: "../lib/angular-translate/angular-translate.min",
        angularTranslateLoader: "../lib/angular-translate-loader-static-files/angular-translate-loader-static-files.min",
        angularElastic: "../lib/angular-elastic/elastic",
        angularScroll: "../lib/angular-scroll/angular-scroll.min",
        angularFlow: "../lib/ng-flow/dist/ng-flow.min",
        angularMessages: "../lib/angular-messages/angular-messages.min",
        flow: "../lib/flow.js/dist/flow.min",
        lodash: "../lib/lodash/lodash.min",
        q: "../lib/q/q",
        modernizr: "../lib2/modernizr/modernizr-2.8.3.min",
        moment: "../lib/moment/min/moment-with-locales.min",
        sticky: "../lib/relatively-sticky/jquery.relatively-sticky.min",
        socialSharePrivacy: "../lib/jquery.socialshareprivacy/jquery.socialshareprivacy.min",
        adhTemplates: "./templates",
        polyfiller: "../lib/webshim/js-webshim/minified/polyfiller"
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
        angularCache: {
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
        }
    }
});
