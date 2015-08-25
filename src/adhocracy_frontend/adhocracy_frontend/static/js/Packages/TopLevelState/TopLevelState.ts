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
 * There is a special key called "space" which can be used to create
 * states that you can later jump back to.  The only perceivable
 * difference is that you can set() a space which will load the
 * complete state you left the space in (but without triggering on()
 * callbacks). The default space is "".
 *
 * This service very much resembles ngRoute, especially in the way
 * the areas are configured.  It differs from ngRoute in that it can
 * change paths without a reload and in being more flexibel.
 */

import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhCredentials = require("../User/Credentials");
import AdhEventManager = require("../EventManager/EventManager");
import AdhTracking = require("../Tracking/Tracking");

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


export class Provider {
    public areas : {[key : string]: any};
    public default : any;
    public spaceDefaults : {[space : string]: {[key : string]: string}};
    public $get;

    constructor() {
        var self = this;

        this.areas = {};
        this.default = () => {
            return {
                template: "<h1>404 Not Found</h1>"
            };
        };
        this.spaceDefaults = {};

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

    public space(space : string, data : {[key : string]: string}) : Provider {
        this.spaceDefaults[space] = data;
        return this;
    }

    public getArea(prefix : string) : any {
        return this.areas.hasOwnProperty(prefix) ? this.areas[prefix] : this.default;
    }

    public getSpaceDefaults(name : string) : {[key : string]: string} {
        return _.clone(this.spaceDefaults[name]);
    }
}


export class Service {
    private eventManager : AdhEventManager.EventManager;
    private area : IArea;
    private currentSpace : string;
    private blockTemplate : boolean;
    private lock : boolean;

    // NOTE: data and on could be replaced by a scope and $watch, respectively.
    private data : {[space : string]: {[key : string] : string}};

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
        this.currentSpace = "";
        this.data = {"": <any>{}};

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

                    if (search.cameFrom) {
                        this.setCameFrom(search.cameFrom);
                    }

                    this._set("space", data["space"] || "");
                    delete data["space"];

                    for (var key in this.data[this.currentSpace]) {
                        if (!data.hasOwnProperty(key)) {
                            this._set(key, undefined);
                        }
                    }
                    for (var key2 in data) {
                        if (data.hasOwnProperty(key2)) {
                            this._set(key2, data[key2]);
                        }
                    }

                    if (this.currentSpace !== "error") {
                        // normalize location
                        this.$location.replace();
                        this.toLocation();
                    }

                    this.blockTemplate = false;
                })
                .finally<void>(() => {
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
        var ret = area.reverse(this.data[this.currentSpace]);

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
            if (key === "space") {
                this.currentSpace = value;
                this.data[this.currentSpace] = this.data[this.currentSpace] || this.provider.getSpaceDefaults(this.currentSpace) || {};
                this.eventManager.trigger(key, value);
            } else {
                if (typeof value === "undefined") {
                    delete this.data[this.currentSpace][key];
                } else {
                    this.data[this.currentSpace][key] = value;
                }
                this.eventManager.trigger(this.currentSpace + ":" + key, value);
            }
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

    public get(key : string, space? : string) {
        if (key === "space") {
            return this.currentSpace;
        } else if (typeof space !== "undefined") {
            this.data[space] = this.data[space] || this.provider.getSpaceDefaults(space) || {};
            return this.data[space][key];
        } else {
            return this.data[this.currentSpace][key];
        }
    }

    public on(key : string, fn, space? : string) : () => void {
        // initially trigger callback
        fn(this.get(key, space));

        if (key === "space") {
            return this.eventManager.on(key, fn);
        } else if (typeof space !== "undefined") {
            return this.eventManager.on(space + ":" + key, fn);
        } else {
            return this.eventManager.on(this.currentSpace + ":" + key, fn);
        }
    }

    public bind(key : string, context : {[k : string]: any}, keyInContext? : string, space? : string) : Function {
        return this.on(key, (value : string) => {
            context[keyInContext || key] = value;
        }, space);
    }

    // FIXME: There currently is no real concept for cameFrom

    private cameFrom : string;

    public setCameFrom(path? : string) : boolean {
        if (typeof path === "undefined") {
            path = this.$location.path();
        }

        var denylist = [
            "/login",
            "/register",
            "/password_reset",
            "/create_password_reset",
            "/activate"
        ];

        // FIXME: DefinitelyTyped
        if (!(<any>_).includes(denylist, path)) {
            this.cameFrom = path;
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

    public goToSpaceHome(space) : void {
        // FIXME : This only works in resource area, needs to be refactored
        var spaceDefaults = this.provider.getSpaceDefaults(space);
        var area = this.getArea();
        this.$location.url("/" + area.prefix + spaceDefaults["resourceUrl"]);
    }
}


/**
 * adhTopLevelState.on() refers to the current space. So directives
 * that call adhTopLevelState.on() in their initialization should only be
 * rendered when the space they are on is currently active.
 */
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
        template: "<adh-wait data-condition=\"currentSpace === key\" data-ng-show=\"currentSpace === key\">" +
            "    <adh-inject></adh-inject>" +
            "</adh-wait>"
    };
};


export var spaceSwitch = (
    adhTopLevelState : Service,
    adhConfig  : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/" + "SpaceSwitch.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("space", scope, "currentSpace"));
            scope.setSpace = (space : string) => {
                if (scope.currentSpace === space) {
                    adhTopLevelState.goToSpaceHome(space);
                } else {
                    adhTopLevelState.set("space", space);
                }
            };
        }
    };
};


export var pageWrapperDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        transclude: true,
        templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/" + "Wrapper.html",
        link: (scope) => {
            scope.headerTemplateUrl = adhConfig.pkg_path + pkgLocation + "/templates/" + "Header.html";
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


export var moduleName = "adhTopLevelState";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhCredentials.moduleName,
            AdhEventManager.moduleName,
            AdhTracking.moduleName
        ])
        .provider("adhTopLevelState", Provider)
        .directive("adhPageWrapper", ["adhConfig", pageWrapperDirective])
        .directive("adhRoutingError", ["adhConfig", routingErrorDirective])
        .directive("adhSpace", ["adhTopLevelState", spaceDirective])
        .directive("adhSpaceSwitch", ["adhTopLevelState", "adhConfig", spaceSwitch])
        .directive("adhView", ["adhTopLevelState", "$compile", viewFactory]);
};
