import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");


export interface Dict {
    [key : string]: string;
}


export class Provider implements ng.IServiceProvider {
    public $get;
    public defaults : {[key : string]: Dict};
    public specifics : {[key : string]: (resource) => any};  // values return either Dict or ng.IPromise<Dict>

    constructor() {
        var self = this;
        this.defaults = {};
        this.specifics = {};
        this.$get = ["$q", "$injector", "adhHttp", "adhConfig",
            ($q, $injector, adhHttp, adhConfig) => new Service(self, $q, $injector, adhHttp, adhConfig)];
    }

    public default(resourceType : string, view : string, defaults : Dict) : Provider {
        this.defaults[resourceType + "@" + view] = defaults;
        return this;
    }

    public specific(resourceType : string, view : string, factory : Function) : Provider;
    public specific(resourceType : string, view : string, factory : any[]) : Provider;
    public specific(resourceType, view, factory) {
        this.specifics[resourceType + "@" + view] = factory;
        return this;
    }
}


/**
 * The resourceArea does not do much by itself. Just like topLevelState, it provides
 * an infrastructure that can be configured in a variety of ways.
 *
 * The general idea is that the path contains a path to a backend resource and
 * optionally a *view* which is preceded by "@". So the path
 *
 *     /adhocracy/proposal/VERSION_0000001/@edit
 *
 * would be mapped to a resource at `<rest_url>/adhocracy/proposal/VERSION_0000001`
 * and view `"edit"`. If no view is provided, it defaults to `""`.
 *
 * The state `data` object as used by resourceArea consists of three different parts:
 *
 * -   meta
 * -   defaults
 * -   specifics
 *
 * Meta values are used as a communication channel between `route()` and `reverse()`
 * and are generally not of interest outside of resourceArea.
 *
 * Defaults can be configured per contentType/view combination. They can be
 * overwritten in `search`. Any parameters from search that do not exists in defaults
 * are removed. Defaults can be configured like this:
 *
 *     resourceAreaProvider.default("<contentType>", "<view>", {
 *         key: "value",
 *         foo: "bar"
 *     });
 *
 * Specifics are also configured per contentType/view combination. But they are
 * not provided as a plain object. Instead, they are provided in form of a injectable
 * factory that returns a function that takes the actual resource as a parameter and
 * returns the specifics (that may optionally be wrapped in a promise). This sounds
 * complex, but it allows for a great deal of flexibility. Specifics can be configured
 * like this:
 *
 *     resourceAreaProvider.specific("<contentType>", "<view>", ["adhHttp", (adhHttp) => {
 *         return (resource) => {
 *             adhHttp.get(resource.data[<someSheet>.nick].reference).then((referencedResource) => {
 *                 return {
 *                     foo: referencedResource.name
 *                 };
 *             });
 *         };
 *     }]);
 *
 * As meta, defaults and specifics all exist in the same `data` object, name clashes are
 * possible. In those cases, search overwrites specifics overwrites meta overwrites defaults.
 */
export class Service implements AdhTopLevelState.IAreaInput {
    public template : string = "<adh-page-wrapper><adh-mercator-workbench></adh-mercator-workbench></adh-page-wrapper>";

    constructor(
        private provider : Provider,
        private $q : ng.IQService,
        private $injector : ng.auto.IInjectorService,
        private adhHttp : AdhHttp.Service<any>,
        private adhConfig : AdhConfig.IService
    ) {}

    private getDefaults(resourceType : string, view : string) : Dict {
        return <Dict>_.extend({}, this.provider.defaults[resourceType + "@" + view]);
    }

    private getSpecifics(resource, view : string) : ng.IPromise<Dict> {
        var key = resource.content_type + "@" + view;
        var specifics;

        if (this.provider.specifics.hasOwnProperty(key)) {
            var factory = this.provider.specifics[key];
            var fn = this.$injector.invoke(factory);
            specifics = fn(resource);
        } else {
            specifics = {};
        }

        // fn may return a promise
        return this.$q.when(specifics)
            .then((data : Dict) => _.clone(data));
    }

    public route(path : string, search : Dict) : ng.IPromise<Dict> {
        var self : Service = this;
        var segs : string[] = path.replace(/\/+$/, "").split("/");

        if (segs.length < 2 || segs[0] !== "") {
            throw "bad path: " + path;
        }

        var view : string = "";

        // if path has a view segment
        if (_.last(segs).match(/^@/)) {
            view = segs.pop().replace(/^@/, "");
        }

        var resourceUrl : string = this.adhConfig.rest_url + segs.join("/");

        return this.adhHttp.get(resourceUrl).then((resource) => {
            return self.getSpecifics(resource, view).then((specifics : Dict) => {
                var defaults : Dict = self.getDefaults(resource.content_type, view);

                var meta : Dict = {
                    platformUrl: self.adhConfig.rest_url + "/" + segs[1],
                    contentType: resource.content_type,
                    resourceUrl: resourceUrl,
                    view: view
                };

                return _.extend(defaults, meta, specifics, search);
            });
        });
    }

    public reverse(data : Dict) : { path : string; search : Dict; } {
        var defaults = this.getDefaults(data["contentType"], data["view"]);
        var path = path = data["resourceUrl"].replace(this.adhConfig.rest_url, "");

        if (path.substr(-1) !== "/") {
            path += "/";
        }

        if (data["view"]) {
            path += "@" + data["view"];
        }

        return {
            path: path,
            search: _.transform(data, (result, value : string, key : string) => {
                if (defaults.hasOwnProperty(key) && value !== defaults[key]) {
                    result[key] = value;
                }
            })
        };
    }
}


export var resourceUrl = (adhConfig : AdhConfig.IService) => {
    return (path : string, view? : string, search? : {[key : string]: any}) => {
        if (typeof path !== "undefined") {
            var url = "/r" + path.replace(adhConfig.rest_url, "");
            if (url.substr(-1) !== "/") {
                url += "/";
            }
            if (typeof view !== "undefined") {
                url += "@" + view;
            }
            if (typeof search !== "undefined") {
                url += "?" + _.map(search, (value, key : string) => {
                    return encodeURIComponent(key) + "=" + encodeURIComponent(value);
                }).join("&");
            }
            return url;
        }
    };
};


export var moduleName = "adhResourceArea";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
            AdhTopLevelState.moduleName
        ])
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("r", ["adhResourceArea", (adhResourceArea : Service) => adhResourceArea]);
        }])
        .provider("adhResourceArea", Provider)
        .filter("adhResourceUrl", ["adhConfig", resourceUrl]);
};
