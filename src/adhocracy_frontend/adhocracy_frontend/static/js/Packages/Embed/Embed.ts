/// <reference path="../../../lib2/types/angular.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";


var metaParams = [
    "autoresize",
    "initialUrl",
    "locale",
    "nocenter",
    "noheader"
];

export class Provider implements angular.IServiceProvider {
    protected directives : string[];
    protected contexts : string[];
    protected contextAliases : {[key : string]: string};
    protected directiveAliases : {[key : string]: string};
    public contextHeaders : {[key : string]: string};
    public $get;

    /**
     * List of directive names that can be embedded.  names must be in
     * lower-case with dashes, but without 'adh-' prefix.  (example:
     * 'document-workbench' for directive DocumentWorkbench.)
     */
    constructor() {
        this.directives = [
            "empty"
        ];
        this.directiveAliases = {};

        this.contexts = [
            "plain"
        ];
        this.contextAliases = {};
        this.contextHeaders = {};

        this.$get = ["adhConfig", (adhConfig) => new Service(this, adhConfig)];
    }

    public registerDirective(name : string, aliases : string[] = []) : Provider {
        this.directives.push(name);
        var i = aliases.length;
        while (i--) {
            this.directiveAliases[aliases[i]] = name;
        }
        return this;
    }

    public normalizeDirective(name : string) : string {
        return this.directiveAliases[name] || name;
    }

    public hasDirective(name : string) {
        return _.includes(this.directives,  name);
    }

    public registerContext(name : string, aliases : string[] = []) : Provider {
        this.contexts.push(name);
        var i = aliases.length;
        while (i--) {
            this.contextAliases[aliases[i]] = name;
        }
        return this;
    }

    public normalizeContext(name : string) : string {
        return this.contextAliases[name] || name;
    }

    public hasContext(name : string) {
        return _.includes(this.contexts,  name);
    }
}

export class Service {
    private widget : string;
    public initialUrl : string = "";

    constructor(
        protected provider : Provider,
        protected adhConfig : AdhConfig.IService
    ) {/* pass */}

    private location2template(widget : string, search) {
        var attrs = [];

        if (widget === "empty") {
            return "";
        }
        for (var key in search) {
            if (search.hasOwnProperty(key) && metaParams.indexOf(key) === -1) {
                attrs.push(AdhUtil.formatString("data-{0}=\"{1}\"", _.escape(key), _.escape(search[key])));
            }
        }
        return AdhUtil.formatString("<adh-{0} {1}></adh-{0}>", _.escape(widget), attrs.join(" "));
    }

    public isEmbedded() : boolean {
        return typeof this.widget !== "undefined";
    }

    public getContext() : string {
        if (!this.isEmbedded() || this.widget === "plain") {
            return "";
        } else {
            return this.widget;
        }
    }

    public getContextHeader() : string {
        var context = this.getContext();
        var template = this.provider.contextHeaders[context];

        return template || "<adh-default-header></adh-default-header>";
    }

    public route($location : angular.ILocationService) : AdhTopLevelState.IAreaInput {
        var widget : string = $location.path().split("/")[2];
        var search = $location.search();

        var directiveName = this.provider.normalizeDirective(widget);
        var contextName = this.provider.normalizeContext(widget);

        this.adhConfig.custom["hide_header"] = this.adhConfig.custom["hide_header"] || search.hasOwnProperty("noheader");

        if (this.provider.hasDirective(directiveName)) {
            this.widget = directiveName;
            var template = this.location2template(directiveName, search);

            if (!search.hasOwnProperty("nocenter")) {
                template = "<div class=\"l-center m-embed\">" + template + "</div>";
            }

            template = "<adh-header></adh-header>" + template;

            return {
                template: template
            };
        } else if (this.provider.hasContext(contextName)) {
            this.widget = contextName;
            this.initialUrl = search.initialUrl;
            $location.url(search.initialUrl || "/");
            $location.replace();

            return {
                skip: true
            };
        } else {
            throw "unknown widget: " + widget;
        }
    }
}


export var normalizeInternalUrl = (url : string, $location : angular.ILocationService) => {
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


export var isInternalUrl = (url : string, $location : angular.ILocationService) => {
    return normalizeInternalUrl(url, $location)[0] === "/";
};


export var hrefDirective = (adhConfig : AdhConfig.IService, $location, $rootScope) => {
    return {
        restrict: "A",
        link: (scope, element, attrs) => {
            if (element[0].nodeName === "A") {
                scope.$watch(() => attrs.href, (orig) => {
                    // remove any handlers that were registered in previous runs
                    element.off("click.adh_href");

                    if (orig && orig[0] !== "#") {
                        orig = normalizeInternalUrl(orig, $location);

                        if (isInternalUrl(orig, $location)) {
                            // set href to canonical url while preserving click behavior
                            element.attr("href", adhConfig.canonical_url + orig);
                            element.on("click.adh_href", (event) => {
                                if (event.button === 0) {
                                    _.defer(() => $rootScope.$apply(() => {
                                        $location.url(orig);
                                    }));
                                    event.preventDefault();
                                }
                            });
                        }
                    }
                });
            }
        }
    };
};


export var headerDirective = (adhEmbed : Service) => {
    return {
        restrict: "E",
        template: () => {
            return adhEmbed.getContextHeader();
        },
        scope: {}
    };
};


export var canonicalUrl = (adhConfig : AdhConfig.IService) => {
    return (internalUrl : string) : string => {
        return adhConfig.canonical_url + internalUrl;
    };
};
