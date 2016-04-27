import * as _ from "lodash";

import * as ResourcesBase from "../../ResourcesBase";

import * as AdhConfig from "../Config/Config";
import * as AdhEmbed from "../Embed/Embed";
import * as AdhHttp from "../Http/Http";
import * as AdhHttpError from "../Http/Error";
import * as AdhMetaApi from "../MetaApi/MetaApi";
import * as AdhResourceUtil from "../Util/ResourceUtil";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";
import * as AdhCredentials from "../User/Credentials";

import RIProcess from "../../Resources_/adhocracy_core/resources/process/IProcess";
import * as SITags from "../../Resources_/adhocracy_core/sheets/tags/ITags";
import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";
import * as SIWorkflowAssignment from "../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";

var pkgLocation = "/ResourceArea";


export interface Dict {
    [key : string]: string;
}


export class Provider implements angular.IServiceProvider {
    public $get;
    public defaults : {[key : string]: Dict};
    public specifics : {[key : string]: {
        factory : (resource) => any;  // values return either Dict or angular.IPromise<Dict>
        type? : string;
    }};
    public templates : {[embedContext : string]: any};
    public customHeaders : {[processType : string]: string};

    constructor() {
        var self = this;
        this.defaults = {};
        this.specifics = {};
        this.templates = {};
        this.customHeaders = {};
        this.$get = [
            "$q",
            "$injector",
            "$location",
            "adhHttp",
            "adhConfig",
            "adhCredentials",
            "adhEmbed",
            "adhMetaApi",
            "adhResourceUrlFilter",
            (...args) => AdhUtil.construct(Service, [self].concat(args))];
    }

    public default(
        resourceType : ResourcesBase.IResourceClass,
        view : string,
        processType : string,
        embedContext : string,
        defaults : Dict
    ) : Provider {
        var key : string = resourceType.content_type + "@" + view + "@" + processType + "@" + embedContext;
        this.defaults[key] = defaults;
        return this;
    }

    public specific(
        resourceType : ResourcesBase.IResourceClass,
        view : string,
        processType : string,
        embedContext : string,
        factory : any,
        type? : string
    ) : Provider {
        var key : string = resourceType.content_type + "@" + view + "@" + processType + "@" + embedContext;
        this.specifics[key] = {
            factory: factory,
            type: type
        };
        return this;
    }

    /**
     * Shortcut to call `default()` for both an itemType and a versionType.
     */
    public defaultVersionable(
        itemType : ResourcesBase.IResourceClass,
        versionType : ResourcesBase.IResourceClass,
        view : string,
        processType : string,
        embedContext : string,
        defaults : Dict
    ): Provider {
        return this
            .default(itemType, view, processType, embedContext, defaults)
            .default(versionType, view, processType, embedContext, defaults);
    }

    /**
     * Shortcut to call `specific()` for both an itemType and a versionType.
     *
     * The callback will not only receive a single resource. Instead it will
     * receive an item, a version, and whether the current route points to the
     * item or the version.  If the route points to an item, newest version will
     * be used.
     */
    public specificVersionable(
        itemType : ResourcesBase.IResourceClass,
        versionType : ResourcesBase.IResourceClass,
        view : string,
        processType : string,
        embedContext : string,
        factory : any
    ) : Provider {
        return this
            .specific(itemType, view, processType, embedContext, factory, "item")
            .specific(versionType, view, processType, embedContext, factory, "version");
    }

    public template(embedContext : string, templateFn : any) : Provider {
        this.templates[embedContext] = templateFn;
        return this;
    }

    public customHeader(processType : string, templateUrl : string) : Provider {
        this.customHeaders[processType] = templateUrl;
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
 * Additionally, resources typically belong to a specific *process*. resourceArea
 * automatically finds that process and extracts it `processType`. If a resource is
 * not part of a process, `processType` defaults to `""`.
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
 *     resourceAreaProvider.default("<contentType>", "<view>", "<processType>", {
 *         key: "value",
 *         foo: "bar"
 *     });
 *
 * Specifics are also configured per contentType/view/processType combination. But they
 * are not provided as a plain object. Instead, they are provided in form of a injectable
 * factory that returns a function that takes the actual resource as a parameter and
 * returns the specifics (that may optionally be wrapped in a promise). This sounds
 * complex, but it allows for a great deal of flexibility. Specifics can be configured
 * like this:
 *
 *     resourceAreaProvider.specific("<contentType>", "<view>", "<processType>", ["adhHttp", (adhHttp) => {
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
    public template : string;
    private hasRun : boolean;
    private templateDeferred;

    constructor(
        private provider : Provider,
        private $q : angular.IQService,
        private $injector : angular.auto.IInjectorService,
        private $location : angular.ILocationService,
        private adhHttp : AdhHttp.Service<any>,
        private adhConfig : AdhConfig.IService,
        private adhCredentials : AdhCredentials.Service,
        private adhEmbed : AdhEmbed.Service,
        private adhMetaApi : AdhMetaApi.Service,
        private adhResourceUrlFilter
    ) {
        this.template = "<adh-resource-area></adh-resource-area>";
        this.hasRun = false;
        this.templateDeferred = this.$q.defer();
    }

    private getDefaults(resourceType : string, view : string, processType : string, embedContext : string) : Dict {
        var key : string = resourceType + "@" + view + "@" + processType + "@" + embedContext;
        return <Dict>_.extend({}, this.provider.defaults[key]);
    }

    private getSpecifics(resource, view : string, processType : string, embedContext : string, process?) : angular.IPromise<Dict> {
        var key : string = resource.content_type + "@" + view + "@" + processType + "@" + embedContext;
        var specifics;

        if (this.provider.specifics.hasOwnProperty(key)) {
            var factory = this.provider.specifics[key].factory;
            var type = this.provider.specifics[key].type;
            var fn = this.$injector.invoke(factory);

            if (type === "version") {
                specifics = this.adhHttp.get(AdhUtil.parentPath(resource.path)).then((item) => {
                    return fn(item, resource, false, process);
                });
            } else if (type === "item") {
                specifics = this.adhHttp.getNewestVersionPathNoFork(resource.path).then((versionPath) => {
                    return this.adhHttp.get(versionPath).then((version) => {
                        return fn(resource, version, true, process);
                    });
                });
            } else {
                specifics = fn(resource);
            }
        } else {
            specifics = {};
        }

        // fn may return a promise
        return this.$q.when(specifics)
            .then((data : Dict) => _.clone(data));
    }

    /**
     * Promise the next ancestor process.
     *
     * If the passed path is a process, it is returned itself.
     *
     * If `fail` is false, it promises undefined instead of failing.
     */
    public getProcess(resourceUrl : string, fail = true) : angular.IPromise<ResourcesBase.IResource> {
        var paths = [];
        var path = resourceUrl;

        // FIXME: This if-Statement was added for the special case that resourceUrl is a URL,
        // not a relative path. It should be erased when the archived Stadtforum processes go offline.
        if (path.substr(0, 4) === "http") {
            path = path.substr(this.adhConfig.rest_url.length);
        }

        while (path !== AdhUtil.parentPath(path)) {
            paths.push(path);
            path = AdhUtil.parentPath(path);
        }

        return this.$q.all(_.map(paths, (path) => {
            return this.adhHttp.get(this.adhConfig.rest_url + path);
        })).then((resources : ResourcesBase.IResource[]) => {
            for (var i = 0; i < resources.length; i++) {
                if (AdhResourceUtil.isInstanceOf(resources[i], RIProcess.content_type, this.adhMetaApi)) {
                    return resources[i];
                }
            }
            if (fail) {
                throw "no process found";
            }
        });
    }

    private conditionallyRedirectVersionToLast(resourceUrl : string, view? : string) : angular.IPromise<boolean> {
        var self : Service = this;

        return self.$q.all([
            self.adhHttp.get(resourceUrl),
            self.adhHttp.get(AdhUtil.parentPath(resourceUrl))
        ]).then((args : ResourcesBase.IResource[]) => {
            var version = args[0];
            var item = args[1];
            if (version.data.hasOwnProperty(SIVersionable.nick) && item.data.hasOwnProperty(SITags.nick)) {
                var lastUrl = item.data[SITags.nick].LAST;
                if (lastUrl === resourceUrl) {
                    return false;
                } else {
                    self.$location.path(self.adhResourceUrlFilter(lastUrl, view));
                    return true;
                }
            } else {
                return false;
            }
        });
    }

    private resolveTemplate(embedContext) : void {
        var templateFn;
        if (this.provider.templates.hasOwnProperty(embedContext)) {
            templateFn = this.provider.templates[embedContext];
        } else {
            var templateUrl = this.adhConfig.pkg_path + pkgLocation + "/ResourceArea.html";
            templateFn = ["$templateRequest", ($templateRequest) => $templateRequest(templateUrl)];
        }

        if (typeof templateFn === "string") {
            var templateString = templateFn;
            templateFn = () => templateString;
        }

        this.$q.when(this.$injector.invoke(templateFn)).then((template) => {
            this.templateDeferred.resolve(template);
        }, (reason) => {
            this.templateDeferred.reject(reason);
        });
    }

    public getTemplate() : angular.IPromise<string> {
        return this.templateDeferred.promise;
    }

    public has(resourceType : string, view : string = "", processType : string = "") : boolean {
        var embedContext = this.adhEmbed.getContext();
        var key : string = resourceType + "@" + view + "@" + processType + "@" + embedContext;
        return this.provider.defaults.hasOwnProperty(key) || this.provider.specifics.hasOwnProperty(key);
    }

    public route(path : string, search : Dict) : angular.IPromise<Dict> {
        var self : Service = this;
        var segs : string[] = path.replace(/\/+$/, "").split("/");

        if (path === "/") {
            segs = ["", ""];
        }

        if (segs.length < 2 || segs[0] !== "") {
            throw "bad path: " + path;
        }

        var view : string = "";
        var embedContext = this.adhEmbed.getContext();

        if (!this.hasRun) {
            this.hasRun = true;
            this.resolveTemplate(embedContext);
        }

        // if path has a view segment
        if (_.last(segs).match(/^@/)) {
            view = segs.pop().replace(/^@/, "");
        }

        var resourceUrl : string = this.adhConfig.rest_url + (segs.join("/") + "/").replace(/\/+$/, "/");

        return self.$q.all([
            self.adhHttp.get(resourceUrl),
            self.getProcess(resourceUrl, false),
            self.conditionallyRedirectVersionToLast(resourceUrl, view)
        ]).then((values : any[]) => {
            var resource : ResourcesBase.Resource = values[0];
            var process : ResourcesBase.Resource = values[1];
            var hasRedirected : boolean = values[2];

            var processType = process ? process.content_type : "";
            var processUrl = process ? process.path : "/";
            var processState = process ? process.data[SIWorkflowAssignment.nick].workflow_state : "";

            if (hasRedirected) {
                return;
            }

            return self.getSpecifics(resource, view, processType, embedContext, process).then((specifics : Dict) => {
                var defaults : Dict = self.getDefaults(resource.content_type, view, processType, embedContext);

                var meta : Dict = {
                    customHeader: self.provider.customHeaders[processType],
                    embedContext: embedContext,
                    processType: processType,
                    processUrl: processUrl,
                    processState: processState,
                    platformUrl: self.adhConfig.rest_url + "/" + segs[1],
                    contentType: resource.content_type,
                    resourceUrl: resourceUrl,
                    view: view
                };

                return _.extend(defaults, meta, specifics, search);
            });
        }, (errors : AdhHttpError.IBackendErrorItem[]) => {

            _.forEach(errors, (error) => {
                if (error.code === 403) {
                    if (self.adhCredentials.loggedIn) {
                        throw 403;
                    } else {
                        throw 401;
                    }
                }
            });
            throw 404;
        });
    }

    public reverse(data : Dict) : { path : string; search : Dict; } {
        var defaults = this.getDefaults(data["contentType"], data["view"], data["processType"], data["embedContext"]);
        var path = path = data["resourceUrl"].replace(this.adhConfig.rest_url, "");

        if (path.substr(-1) !== "/") {
            path += "/";
        }

        if (data["view"]) {
            path += "@" + data["view"];
        }

        return {
            path: path,
            search: <Dict>_.transform(data, (result, value : string, key : string) => {
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


export var directive = (adhResourceArea : Service, $compile : angular.ICompileService) => {
    return {
        restrict: "E",
        link: (scope : angular.IScope, element) => {
            adhResourceArea.getTemplate().then((template : string) => {
                var childScope = scope.$new();
                element.html(template);
                $compile(element.contents())(childScope);
            });
        }
    };
};
