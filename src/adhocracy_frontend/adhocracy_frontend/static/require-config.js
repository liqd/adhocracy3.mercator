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
        angularRoute: "../lib/angular-route/angular-route",
        angularAnimate: "../lib/angular-animate/angular-animate",
        angularTranslate: "../lib/angular-translate/angular-translate",
        angularTranslateLoader: "../lib/angular-translate-loader-static-files/angular-translate-loader-static-files",
        angularElastic: "../lib/angular-elastic/elastic",
        angularUiSelect: "../lib/angular-ui-select/dist/select",
        lodash: "../lib/lodash/dist/lodash",
        q: "../lib/q/q",
        modernizr: "../lib2/modernizr/modernizr-2.8.3.min",
        moment: "../lib/moment/min/moment-with-locales"
    },
    shim: {
        jquery: {
            exports: "$"
        },
        angular: {
            exports: "angular"
        },
        angularRoute: {
            deps: ["angular"]
        },
        angularAnimate: {
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
        angularUiSelect: {
            deps: ["angular"]
        },
        underscore: {
            exports: "_"
        },
        modernizr: {
            exports: "Modernizr"
        }
    }
});
