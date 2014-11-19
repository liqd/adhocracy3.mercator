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

import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhEventHandler = require("../EventHandler/EventHandler");

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


export class Provider {
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

        this.$get = ["adhEventHandlerClass", "$location", "$rootScope", "$http", "$q", "$injector", "$templateRequest",
            (adhEventHandlerClass, $location, $rootScope, $http, $q, $injector, $templateRequest) => {
                return new Service(self, adhEventHandlerClass, $location, $rootScope, $http, $q, $injector,
                                   $templateRequest);
            }];
    }

    public when(prefix : string, factory : (...args : any[]) => IAreaInput);
    public when(prefix : string, factory : any[]);
    public when(prefix, factory) {
        this.areas[prefix] = factory;
        return this;
    }

    public otherwise(factory : (...args : any[]) => IAreaInput);
    public otherwise(factory : any[]);
    public otherwise(factory) {
        this.default = factory;
        return this;
    }

    public getArea(prefix : string) : any {
        return this.areas.hasOwnProperty(prefix) ? this.areas[prefix] : this.default;
    }

}


export class Service {
    private eventHandler : AdhEventHandler.EventHandler;
    private area : IArea;
    private blockTemplate : boolean;

    // NOTE: data and on could be replaced by a scope and $watch, respectively.
    private data : {[key : string] : string};

    constructor(
        private provider : Provider,
        adhEventHandlerClass : typeof AdhEventHandler.EventHandler,
        private $location : ng.ILocationService,
        private $rootScope : ng.IScope,
        private $http : ng.IHttpService,
        private $q : ng.IQService,
        private $injector : ng.auto.IInjectorService,
        private $templateRequest : ng.ITemplateRequestService
    ) {
        var self : Service = this;

        this.eventHandler = new adhEventHandlerClass();
        this.data = {};

        this.$rootScope.$watch(() => self.$location.absUrl(), () => {
            self.fromLocation();
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

        if (area.skip) {
            return this.$q.when();
        } else {
            return area.route(path, search).then((data) => {
                for (var key in this.data) {
                    if (!data.hasOwnProperty(key)) {
                        delete this.data[key];
                    }
                }
                for (var key2 in data) {
                    if (data.hasOwnProperty(key2)) {
                        this._set(key2, data[key2]);
                    }
                }

                // normalize location
                this.$location.replace();
                this.toLocation();

                this.blockTemplate = false;
            });
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
    }

    private _set(key : string, value) : boolean {
        if (this.get(key) !== value) {
            this.data[key] = value;
            this.eventHandler.trigger(key, value);
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

    public on(key : string, fn) : void {
        this.eventHandler.on(key, fn);

        // initially trigger callback
        fn(this.get(key));
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
}


export var movingColumns = (
    topLevelState : Service
) => {
    return {
        link: (scope, element, attrs) => {
            var cls;

            var move = (newCls) => {
                if (topLevelState.get("space") === attrs["space"]) {
                    if (newCls !== cls) {
                        element.removeClass(cls);
                        element.addClass(newCls);
                        cls = newCls;
                    }
                }
            };

            topLevelState.on("content2Url", (url : string) => {
                scope.content2Url = url;
            });
            topLevelState.on("proposalUrl", (url : string) => {
                scope.proposalUrl = url;
            });
            topLevelState.on("commentableUrl", (url : string) => {
                scope.commentableUrl = url;
            });

            topLevelState.on("movingColumns", move);
        }
    };
};


/**
 * A simple focus switcher that can be used until we have a proper widget for this.
 */
export var adhFocusSwitch = (topLevelState : Service) => {
    return {
        restrict: "E",
        template: "<a href=\"\" ng-click=\"switchFocus()\">X</a>",
        link: (scope) => {
            scope.switchFocus = () => {
                var currentState = topLevelState.get("movingColumns");

                if (currentState.split("-")[1] === "show") {
                    topLevelState.set("movingColumns", "is-collapse-show-show");
                } else {
                    topLevelState.set("movingColumns", "is-show-show-hide");
                }
            };
        }
    };
};


export var spaces = (
    topLevelState : Service
) => {
    return {
        restrict: "E",
        transclude: true,
        template: "<adh-inject></adh-inject>",
        link: (scope) => {
            // FIXME: also save content2Url
            // IDEA: getAll/setAll on TLS (getAll needs to clone), maybe also clear
            var movingColumns = {};
            topLevelState.on("space", (space : string) => {
                movingColumns[scope.currentSpace] = topLevelState.get("movingColumns");
                scope.currentSpace = space;
                if (typeof movingColumns[space] !== "undefined") {
                    topLevelState.set("movingColumns", movingColumns[space]);
                }
            });
            scope.currentSpace = topLevelState.get("space");
        }
    };
};


export var spaceSwitch = (
    topLevelState : Service
) => {
    return {
        restrict: "E",
        template: "<a href=\"\" data-ng-click=\"setSpace('content')\">Content</a>" +
            "<a href=\"\" data-ng-click=\"setSpace('user')\">User</a>",
        link: (scope) => {
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


export var moduleName = "adhTopLevelState";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEventHandler.moduleName
        ])
        .provider("adhTopLevelState", Provider)
        .directive("adhPageWrapper", ["adhConfig", pageWrapperDirective])
        .directive("adhMovingColumns", ["adhTopLevelState", movingColumns])
        .directive("adhFocusSwitch", ["adhTopLevelState", adhFocusSwitch])
        .directive("adhSpaces", ["adhTopLevelState", spaces])
        .directive("adhSpaceSwitch", ["adhTopLevelState", spaceSwitch])
        .directive("adhView", ["adhTopLevelState", "$compile", viewFactory]);
};
