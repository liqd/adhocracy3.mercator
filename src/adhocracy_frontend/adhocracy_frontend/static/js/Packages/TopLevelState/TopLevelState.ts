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
import AdhEventHandler = require("../EventHandler/EventHandler");
import AdhUser = require("../User/User");

var pkgLocation = "/TopLevelState";


export interface IAreaInput {
    /**
     * Convert (ng) location to (a3 top-level) state: Take a path and
     * a search query dictionary, and promise a state dictionary that
     * can be sored stored in a 'TopLevelState'.
     *
     * This is the reverse of 'this.reverse'.
     */
    route? : (path : string, search : {[key : string] : string}) => ng.IPromise<{[key : string] : string}>;
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
    route : (path : string, search : {[key : string] : string}) => ng.IPromise<{[key : string] : string}>;
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

        this.$get = ["adhEventHandlerClass", "adhUser", "$location", "$rootScope", "$http", "$q", "$injector", "$templateRequest",
            (adhEventHandlerClass, adhUser, $location, $rootScope, $http, $q, $injector, $templateRequest) => {
                return new Service(self, adhEventHandlerClass, adhUser, $location, $rootScope, $http, $q, $injector,
                                   $templateRequest);
            }];
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
    private eventHandler : AdhEventHandler.EventHandler;
    private area : IArea;
    private currentSpace : string;
    private blockTemplate : boolean;
    private locationHasChanged : boolean;
    private lock : boolean;

    // NOTE: data and on could be replaced by a scope and $watch, respectively.
    private data : {[space : string]: {[key : string] : string}};

    constructor(
        private provider : Provider,
        adhEventHandlerClass : typeof AdhEventHandler.EventHandler,
        private adhUser : AdhUser.Service,
        private $location : ng.ILocationService,
        private $rootScope : ng.IScope,
        private $http : ng.IHttpService,
        private $q : ng.IQService,
        private $injector : ng.auto.IInjectorService,
        private $templateRequest : ng.ITemplateRequestService
    ) {
        var self : Service = this;

        this.eventHandler = new adhEventHandlerClass();
        this.currentSpace = "";
        this.data = {"": <any>{}};

        this.locationHasChanged = false;
        this.lock = false;

        this.$rootScope.$watch(() => self.$location.absUrl(), () => {
            self.locationHasChanged = true;

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
                route: typeof areaInput.route !== "undefined" ? areaInput.route.bind(areaInput) : defaultRoute,
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

    private fromLocation() : ng.IPromise<void> {
        var area = this.getArea();
        var path = this.$location.path().replace("/" + area.prefix, "");
        var search = this.$location.search();

        this.locationHasChanged = false;

        if (area.skip) {
            return this.$q.when();
        } else {
            this.lock = true;

            // FIXME: finally seems to be broken in DefinitlyTyped, so <any>
            return <any>area.route(path, search)
                .catch((error) => this.handleRoutingError(error))
                .then((data) => {
                    if (this.locationHasChanged) {
                        return this.fromLocation();
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
                if (this.adhUser.loggedIn) {
                    return this.handleRoutingError({
                        code: 403,
                        message: error.message
                    });
                } else {
                    this.redirectToLogin();
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
        if (error.hasOwnProperty("code")) {
            return error;
        } else if (typeof error === "number") {
            return {
                code: error
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
    }

    private _set(key : string, value) : boolean {
        if (this.get(key) !== value) {
            if (key === "space") {
                this.currentSpace = value;
                this.data[this.currentSpace] = this.data[this.currentSpace] || this.provider.getSpaceDefaults(this.currentSpace) || {};
                this.eventHandler.trigger(key, value);
            } else {
                if (typeof value === "undefined") {
                    delete this.data[this.currentSpace][key];
                } else {
                    this.data[this.currentSpace][key] = value;
                }
                this.eventHandler.trigger(this.currentSpace + ":" + key, value);
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

    public get(key : string) {
        if (key === "space") {
            return this.currentSpace;
        } else {
            return this.data[this.currentSpace][key];
        }
    }

    public on(key : string, fn) : void {
        if (key === "space") {
            this.eventHandler.on(key, fn);
        } else {
            this.eventHandler.on(this.currentSpace + ":" + key, fn);
        }

        // initially trigger callback
        fn(this.get(key));
    }

    public isSpaceInitialized(space : string) : boolean {
        return this.data.hasOwnProperty(space);
    }

    // FIXME: {set,get}CameFrom should be worked into the class
    // doc-comment, but I don't feel I understand that comment well
    // enough to edit it.  (also, the entire toplevelstate thingy will
    // be refactored soon in order to get state mgmt with link support
    // right.  see /docs/source/api/frontend-state.rst)
    //
    // Open problem: if the user navigates away from the, say, login,
    // and the cameFrom stack will never be cleaned up...  how do we
    // clean it up?

    private cameFrom : string;

    public setCameFrom(path : string) : void {
        this.cameFrom = path;
    }

    public getCameFrom() : string {
        return this.cameFrom;
    }

    public clearCameFrom() : void {
        this.cameFrom = undefined;
    }

    public redirectToCameFrom(_default? : string) : void {
        var cameFrom = this.getCameFrom();
        if (typeof cameFrom !== "undefined") {
            this.$location.url(cameFrom);
        } else if (typeof _default !== "undefined") {
            this.$location.url(_default);
        }
    }

    public redirectToLogin() : void {
        this.setCameFrom(this.$location.path());
        this.$location.replace();
        this.$location.url("/login");
    }
}


/**
 * Note that topLevelState.on() refers to the current space. So directives
 * that call topLevelState.on() in their initialization should only be
 * rendered when the space they are on is currently active.
 */
export var spaces = (
    topLevelState : Service
) => {
    return {
        restrict: "E",
        transclude: true,
        template: "<adh-inject></adh-inject>",
        link: (scope) => {
            topLevelState.on("space", (space : string) => {
                scope.currentSpace = space;
            });
            scope.isSpaceInitialized = (space : string) => topLevelState.isSpaceInitialized(space);
        }
    };
};


export var spaceSwitch = (
    topLevelState : Service,
    adhConfig  : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/" + "SpaceSwitch.html",
        link: (scope) => {
            topLevelState.on("space", (space) => {
                 scope.currentSpace = space;
            });
            scope.setSpace = (space : string) => {
                topLevelState.set("space", space);
            };
        }
    };
};


export var pageWrapperDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        transclude: true,
        templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/" + "Wrapper.html"
    };
};


export var viewFactory = (adhTopLevelState : Service, $compile : ng.ICompileService) => {
    return {
        restrict: "E",
        link: (scope, element) => {
            scope.$watch(() => adhTopLevelState.getTemplate(), (template) => {
                element.html(template);
                $compile(element.contents())(scope);
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
            adhTopLevelState.on("code", (code) => {
                $scope.code = code;
            });
            adhTopLevelState.on("message", (message) => {
                $scope.message = message;
            });
        }]
    };
};


export var moduleName = "adhTopLevelState";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEventHandler.moduleName,
            AdhUser.moduleName
        ])
        .provider("adhTopLevelState", Provider)
        .directive("adhPageWrapper", ["adhConfig", pageWrapperDirective])
        .directive("adhRoutingError", ["adhConfig", routingErrorDirective])
        .directive("adhSpaces", ["adhTopLevelState", spaces])
        .directive("adhSpaceSwitch", ["adhTopLevelState", "adhConfig", spaceSwitch])
        .directive("adhView", ["adhTopLevelState", "$compile", viewFactory]);
};
