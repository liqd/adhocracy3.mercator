/**
 * TopLevelState service for managing top level state.
 *
 * This service is used to interact with the general state of the
 * application.  It also takes care of reflecting this state in the
 * URI by the means of areas.
 *
 * An area consists of a routing function (which translates URI to
 * state), a reverse routing function (which translates state to URI),
 * and a template.
 *
 * The application can interact with this service via the functions
 * get(), set(), and on().
 *
 * This service very much resembles ngRoute, especially in the way
 * the areas are configured.  It differs from ngRoute in that it can
 * change paths without a reload and in being more flexibel.
 */

/// <reference path="../../../lib2/types/angular.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhCredentials from "../User/Credentials";
import * as AdhEventManager from "../EventManager/EventManager";
import * as AdhTracking from "../Tracking/Tracking";

var pkgLocation = "/TopLevelState";


export interface IAreaInput {
    /**
     * Convert (ng) location to (a3 top-level) state: Take a path and
     * a search query dictionary, and promise a state dictionary that
     * can be sored stored in a 'TopLevelState'.
     *
     * This is the reverse of 'this.reverse'.
     */
    route? : (path : string, search : {[key : string] : string}) => angular.IPromise<{[key : string] : string}> | {[key : string] : string};
    /**
     * Convert (a3 top-level) state to (ng) location: Take a
     * 'TopLevelState' and return a path and a search query
     * dictionary.
     *
     * This is the reverse of 'this.route'.
     */
    reverse? : (data : {[key : string] : string}) => {
        path : string;
        search : {[key : string] : string};
    };
    template? : string;
    templateUrl? : string;
    skip? : boolean;
}


export interface IArea {
    prefix : string;
    route : (path : string, search : {[key : string] : string}) => angular.IPromise<{[key : string] : string}>;
    reverse : (data : {[key : string] : string}) => {
        path : string;
        search : {[key : string] : string};
    };
    template : string;
    skip : boolean;
}


/** should be roughly equivalent to HTTP status codes, e.g. 404 Not Found */
export interface IRoutingError {
    code : number;
    message? : string;
}


export class Provider implements angular.IServiceProvider {
    public areas : {[key : string]: any};
    public default : any;
    public $get;

    constructor() {
        var self = this;

        this.areas = {};
        this.default = () => {
            return {
                template: "<h1>404 Not Found</h1>"
            };
        };

        this.$get = [
            "adhEventManagerClass", "adhTracking", "adhCredentials",
            "$location", "$rootScope", "$q", "$injector", "$templateRequest",
            (adhEventManagerClass, adhTracking, adhCredentials, $location, $rootScope, $q, $injector, $templateRequest) => {
                return new Service(
                    self, adhEventManagerClass, adhTracking, adhCredentials, $location, $rootScope, $q, $injector, $templateRequest);
            }
        ];
    }

    public when(prefix : string, factory : (...args : any[]) => IAreaInput);
    public when(prefix : string, factory : any[]);
    public when(prefix, factory) : Provider {
        this.areas[prefix] = factory;
        return this;
    }

    public otherwise(factory : (...args : any[]) => IAreaInput);
    public otherwise(factory : any[]);
    public otherwise(factory) : Provider {
        this.default = factory;
        return this;
    }

    public getArea(prefix : string) : any {
        return this.areas.hasOwnProperty(prefix) ? this.areas[prefix] : this.default;
    }
}


export class Service {
    private eventManager : AdhEventManager.EventManager;
    private area : IArea;
    private blockTemplate : boolean;
    private lock : boolean;

    // NOTE: data and on could be replaced by a scope and $watch, respectively.
    private data : {[key : string] : string};

    constructor(
        private provider : Provider,
        adhEventManagerClass : typeof AdhEventManager.EventManager,
        private adhTracking : AdhTracking.Service,
        private adhCredentials : AdhCredentials.Service,
        private $location : angular.ILocationService,
        private $rootScope : angular.IScope,
        private $q : angular.IQService,
        private $injector : angular.auto.IInjectorService,
        private $templateRequest : angular.ITemplateRequestService
    ) {
        var self : Service = this;

        this.eventManager = new adhEventManagerClass();
        this.data = {};

        this.lock = false;

        this.$rootScope.$watch(() => self.$location.absUrl(), () => {
            if (!self.lock) {
                self.fromLocation();
            }
        });
    }

    private getArea() : IArea {
        var self = this;

        var defaultRoute = (path, search) => {
            var data = _.clone(search);
            data["_path"] = path;
            return self.$q.when(data);
        };

        var defaultReverse = (data) => {
            var ret = {
                path: data["_path"],
                search: _.clone(data)
            };
            delete ret.search["_path"];
            return ret;
        };

        var prefix : string = this.$location.path().split("/")[1];

        if (typeof this.area === "undefined" || prefix !== this.area.prefix) {
            this.blockTemplate = true;
            var fn = this.provider.getArea(prefix);
            var areaInput : IAreaInput = this.$injector.invoke(fn);
            var area : IArea = {
                prefix: prefix,
                route: typeof areaInput.route === "undefined" ? defaultRoute : (path, search) => {
                    return this.$q.when(areaInput.route(path, search));
                },
                reverse: typeof areaInput.reverse !== "undefined" ? areaInput.reverse.bind(areaInput) : defaultReverse,
                template: "",
                skip: !!areaInput.skip
            };

            if (typeof areaInput.template !== "undefined") {
                area.template = areaInput.template;
            } else if (typeof areaInput.templateUrl !== "undefined") {
                // NOTE: we do not wait for the template to be loaded
                this.$templateRequest(areaInput.templateUrl).then((template) => {
                    area.template = template;
                });
            }

            this.area = area;
        }

        return this.area;
    }

    public getTemplate() : string {
        if (!this.blockTemplate) {
            var area = this.getArea();
            return area.template;
        } else {
            return "";
        }
    }

    private fromLocation() : angular.IPromise<void> {
        var area = this.getArea();
        var absUrl = this.$location.absUrl();
        var path = this.$location.path().replace("/" + area.prefix, "");
        var search = this.$location.search();

        if (area.skip) {
            return this.$q.when();
        } else {
            this.lock = true;

            return area.route(path, search)
                .catch((error) => this.handleRoutingError(error))
                .then((data) => {
                    if (absUrl !== this.$location.absUrl()) {
                        return this.fromLocation();
                    }

                    for (var key in this.data) {
                        if (!data.hasOwnProperty(key)) {
                            this._set(key, undefined);
                        }
                    }
                    for (var key2 in data) {
                        if (data.hasOwnProperty(key2)) {
                            this._set(key2, data[key2]);
                        }
                    }

                    if (data["space"] !== "error") {
                        // normalize location
                        this.$location.replace();
                        this.toLocation();
                    }

                    this.blockTemplate = false;
                })
                .finally(() => {
                    this.lock = false;
                });
        }
    }

    /**
     * Take action on 'benevolent' routing errors like "not logged in".
     * This method may return a state object or (re-)throw an exception.
     */
    private handleRoutingError(error) : {[key : string]: string} {
        error = this.fillRoutingError(error);
        console.log(error);

        switch (error.code) {
            case 401:
                if (this.adhCredentials.loggedIn) {
                    return this.handleRoutingError({
                        code: 403,
                        message: error.message
                    });
                } else {
                    this.setCameFromAndGo("/login");
                }
                break;
            default:
                return {
                    space: "error",
                    code: error.code.toString(),
                    message: error.message
                };
        }

        throw error;
    }

    private fillRoutingError(error : IRoutingError) : IRoutingError;
    private fillRoutingError(error : number) : IRoutingError;
    private fillRoutingError(error : string) : IRoutingError;
    private fillRoutingError(error) {
        var messages = {
            "400": "TR__ERROR_HTTP_BAD_REQUEST",
            "403": "TR__ERROR_HTTP_FORBIDDEN",
            "404": "TR__ERROR_HTTP_NOT_FOUND",
            "410": "TR__ERROR_HTTP_GONE"
        };

        if (error.hasOwnProperty("code")) {
            if (!error.hasOwnProperty("message")) {
                error.message = messages[error.code.toString()];
            }
            return error;
        } else if (typeof error === "number") {
            return {
                code: error,
                message: messages[error.toString()]
            };
        } else {
            return {
                code: 500,
                message: error
            };
        }
    }

    private toLocation() : void {
        var area = this.getArea();
        var search = this.$location.search();
        var ret = area.reverse(this.data);

        this.$location.path("/" + area.prefix + ret.path);

        for (var key in search) {
            if (search.hasOwnProperty(key)) {
                this.$location.search(key, ret.search[key]);
            }
        }
        for (var key2 in ret.search) {
            if (ret.search.hasOwnProperty(key2)) {
                this.$location.search(key2, ret.search[key2]);
            }
        }
        this.adhTracking.trackPageView(this.$location.absUrl());
    }

    private _set(key : string, value) : boolean {
        if (this.get(key) !== value) {
            if (typeof value === "undefined") {
                delete this.data[key];
            } else {
                this.data[key] = value;
            }
            this.eventManager.trigger(key, value);
            return true;
        } else {
            return false;
        }
    }

    public set(key : string, value) : void {
        var updated : boolean = this._set(key, value);
        if (updated) {
            this.toLocation();
        }
    }

    public get(key : string) {
        return this.data[key];
    }

    public on(key : string, fn) : () => void {
        // initially trigger callback
        fn(this.get(key));
        return this.eventManager.on(key, fn);
    }

    public bind(key : string, context : {[k : string]: any}, keyInContext? : string) : Function {
        return this.on(key, (value : string) => {
            context[keyInContext || key] = value;
        });
    }

    // FIXME: There currently is no real concept for cameFrom

    private cameFrom : string;

    public setCameFrom(url? : string) : boolean {
        if (typeof url === "undefined") {
            url = this.$location.url();
        }

        var denylist = [
            "/login",
            "/register",
            "/password_reset",
            "/create_password_reset",
            "/activate"
        ];

        if (!_.includes(denylist, url)) {
            this.cameFrom = url;
            return true;
        } else {
            return false;
        }
    }

    public getCameFrom() : string {
        return this.cameFrom;
    }

    public clearCameFrom() : void {
        this.cameFrom = undefined;
    }

    public goToCameFrom(_default : string, replace = false) : void {
        if (replace) {
            this.$location.replace();
        }
        var cameFrom = this.getCameFrom();
        if (typeof cameFrom !== "undefined") {
            this.$location.url(cameFrom);
        } else if (typeof _default !== "undefined") {
            this.$location.url(_default);
        }
    }

    public setCameFromAndGo(url : string, replace = false) : void {
        if (replace) {
            this.$location.replace();
        }
        this.setCameFrom();
        this.$location.url(url);
    }
}


export var spaceDirective = (adhTopLevelState : Service) => {
    return {
        restrict: "E",
        transclude: true,
        scope: {
            key: "@"
        },
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("space", scope, "currentSpace"));
        },
        template: "<div data-ng-if=\"currentSpace === key\">" +
            "    <adh-inject></adh-inject>" +
            "</div>"
    };
};


export var defaultHeaderDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/defaultHeader.html",
        scope: {},
        link: (scope) => {
            scope.hideHeader = adhConfig.custom["hide_header"];
            scope.$on("$destroy", adhTopLevelState.bind("areaHeader", scope));
        }
    };
};


export var viewFactory = (adhTopLevelState : Service, $compile : angular.ICompileService) => {
    return {
        restrict: "E",
        link: (scope, element) => {
            var childScope : angular.IScope;

            scope.$watch(() => adhTopLevelState.getTemplate(), (template) => {
                if (childScope) {
                    childScope.$destroy();
                }
                childScope = scope.$new();
                element.html(template);
                $compile(element.contents())(childScope);
            });
        }
    };
};


export var routingErrorDirective = (adhConfig  : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/" + "Error.html",
        scope: {},
        controller: ["adhTopLevelState", "$scope", (adhTopLevelState : Service, $scope) => {
            $scope.$on("$destroy", adhTopLevelState.bind("code", $scope));
            $scope.$on("$destroy", adhTopLevelState.bind("message", $scope));
        }]
    };
};
