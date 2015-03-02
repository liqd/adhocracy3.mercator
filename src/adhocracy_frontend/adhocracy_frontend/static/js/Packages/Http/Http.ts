/* tslint:disable:variable-name */
/// <reference path="../../../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/jquery/jquery.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>

import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhResourceUtil = require("../Util/ResourceUtil");
import AdhUtil = require("../Util/Util");
import AdhWebSocket = require("../WebSocket/WebSocket");

import ResourcesBase = require("../../ResourcesBase");

import SIMetadata = require("../../Resources_/adhocracy_core/sheets/metadata/IMetadata");
import SITag = require("../../Resources_/adhocracy_core/sheets/tags/ITag");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");

import AdhCache = require("./Cache");
import AdhConvert = require("./Convert");
import AdhError = require("./Error");
import AdhMetaApi = require("./MetaApi");
import AdhTransaction = require("./Transaction");

// re-exports
export interface ITransactionResult extends AdhTransaction.ITransactionResult {};
export interface IBackendError extends AdhError.IBackendError {};
export interface IBackendErrorItem extends AdhError.IBackendErrorItem {};
export var logBackendError : (response : ng.IHttpPromiseCallbackArg<IBackendError>) => void = AdhError.logBackendError;


export interface IOptions {
    OPTIONS : boolean;
    PUT : boolean;
    GET : boolean;
    POST : boolean;
    HEAD : boolean;
    delete : boolean;
    hide : boolean;
}


export var emptyOptions : IOptions = {
    OPTIONS: false,
    PUT: false,
    GET: false,
    POST: false,
    HEAD: false,
    delete : false,
    hide : false
};


export interface IUpdated {
    changed_descendants : string[];
    created : string[];
    modified : string[];
    removed : string[];
}


export var nonResourcePaths : string[] = [
    "message_user"
];


/**
 * send and receive objects with adhocracy data model awareness
 *
 * this service only handles resources of the form {content_type: ...,
 * path: ..., data: ...}.  if you want to send other objects over the
 * wire (such as during user login), use $http.
 */

// FIXME: This service should be able to handle any type, not just subtypes of
// ``Resources.Content``.  Methods like ``postNewVersion`` may need additional
// constraints (e.g. by moving them to subclasses).
export class Service<Content extends ResourcesBase.Resource> {

    constructor(
        private $http : ng.IHttpService,
        private $q : ng.IQService,
        private $timeout : ng.ITimeoutService,
        private adhMetaApi : AdhMetaApi.MetaApiQuery,
        private adhPreliminaryNames : AdhPreliminaryNames.Service,
        private adhConfig : AdhConfig.IService,
        private adhCache? : AdhCache.Service
    ) {}

    private formatUrl(path) {
        if (!path) {
            throw "empty path!";
        }
        if (typeof this.adhConfig.rest_url === "undefined") {
            throw "no adhConfig.rest_url!";
        }

        if (path.lastIndexOf("/", 0) === 0) {
            return this.adhConfig.rest_url + path;
        } else {
            return path;
        }
    }

    private importOptions(raw : { data : any }) : IOptions {
        var metadata = AdhUtil.deepPluck(raw.data, ["PUT", "request_body", "data", SIMetadata.nick]);
        return {
            OPTIONS: !!raw.data.OPTIONS,
            PUT: !!raw.data.PUT,
            GET: !!raw.data.GET,
            POST: !!raw.data.POST,
            HEAD: !!raw.data.HEAD,
            delete: Boolean(metadata && _.has(metadata, "deleted")),
            hide: Boolean(metadata && _.has(metadata, "hidden"))
        };
    }

    public options(path : string) : ng.IPromise<IOptions> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-options preliminary path: " + path;
        }
        path = this.formatUrl(path);

        return this.adhCache.memoize(path, "OPTIONS",
            () => this.$http({method: "OPTIONS", url: path})
                .then(this.importOptions, AdhError.logBackendError));
    }

    public getRaw(path : string, params ?: { [key : string] : string }) : ng.IHttpPromise<any> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-get preliminary path: " + path;
        }
        path = this.formatUrl(path);

        return this.$http.get(path, { params : params });
    }

    /**
     * Send HTTP request to path with params and returns a promise of the
     * imported response.
     *
     * The optional parameter `warmupPoolCache` can be used on pool queries
     * in order to requests the IPool sheet to contain a list of resources
     * instead of only paths. The returned promise however has the same API
     * as if `warmupPoolCache` would be skipped.
     */
    public get(
        path : string,
        params ?: { [key : string] : string },
        warmupPoolCache ?: boolean
    ) : ng.IPromise<Content> {
        var query = (typeof params === "undefined") ? "" : "?" + $.param(params);

        if (warmupPoolCache) {
            if (_.has(params, "elements")) {
                throw "cannot use warmupPoolCache when elements is set";
            } else {
                params["elements"] = "content";
            }
        }

        return this.adhCache.memoize(path, query,
            () => this.getRaw(path, params).then(
                (response) => AdhConvert.importContent(
                    <any>response, this.adhMetaApi, this.adhPreliminaryNames, this.adhCache, warmupPoolCache),
                AdhError.logBackendError));
    }

    public putRaw(path : string, obj : Content) : ng.IHttpPromise<any> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-put preliminary path: " + path;
        }
        path = this.formatUrl(path);
        this.adhCache.invalidate(path);
        return this.$http
            .put(path, obj);
    }

    public put(path : string, obj : Content, keepMetadata : boolean = false) : ng.IPromise<Content> {
        var _self = this;

        return this.putRaw(path, AdhConvert.exportContent(this.adhMetaApi, obj, keepMetadata))
            .then(
                (response) => {
                    _self.adhCache.invalidateUpdated(response.data.updated_resources);
                    return AdhConvert.importContent(<any>response, _self.adhMetaApi, _self.adhPreliminaryNames, this.adhCache);
                },
                AdhError.logBackendError);
    }

    public postRaw(path : string, obj : Content) : ng.IHttpPromise<any> {
        var _self = this;

        if (_self.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-post preliminary path: " + path;
        }
        path = this.formatUrl(path);

        if (typeof FormData !== "undefined" && FormData.prototype.isPrototypeOf(obj)) {
            return _self.$http({
                method: "POST",
                url: path,
                data: obj,
                headers: {"Content-Type": undefined},
                transformRequest: undefined
            });
        } else {
            return _self.$http
                .post(path, obj);
        }
    }

    public post(path : string, obj : Content) : ng.IPromise<Content> {
        var _self = this;

        return _self.postRaw(path, AdhConvert.exportContent(_self.adhMetaApi, obj))
            .then(
                (response) => {
                    this.adhCache.invalidateUpdated(response.data.updated_resources);
                    return AdhConvert.importContent(<any>response, _self.adhMetaApi, _self.adhPreliminaryNames, this.adhCache);
                },
                AdhError.logBackendError);
    }

    /**
     * For resources that do not support fork: Return the unique head
     * version provided by the LAST tag.  If there is no or more than
     * one version in LAST, throw an exception.
     *
     * FIXME: rename to getLastVersionPathNoFork for consistency with
     * LAST tag and adh-last-version directive.  (even though arguably
     * there is a difference between the LAST tag and this function.)
     */
    public getNewestVersionPathNoFork(path : string) : ng.IPromise<string> {
        return this.get(path + "LAST/")
            .then((tag) => {
                var heads = tag.data[SITag.nick].elements;
                if (heads.length !== 1) {
                    throw ("Cannot handle this LAST tag: " + heads.toString());
                } else {
                    return heads[0];
                }
            });
    }

    /**
     * Post a reference graph of resources.
     *
     * Take an array of resources.  The array has set semantics and
     * may contain, e.g., a proposal to be posted and all of its
     * sub-resources.  All elements of the extended set are posted in
     * an order that avoids dangling references (referenced object
     * always occur before referencing object).
     *
     * Resources may contain preliminary paths created by the
     * PreliminaryNames service in places where
     * `adhocracy.schema.AbsolutePath` is expected.  These paths must
     * reference other items of the input array, and are converted to
     * real paths by the batch API server endpoint.
     *
     * This function does not handle unchanged resources any different
     * from changed ones, i.e. unchanged resources in the input array
     * will end up as duplicate versions on the server.  Therefore,
     * the caller should only pass resources that have changed. We
     * might want to handle this case in the future within the
     * deepPost function as well.
     *
     * *return value:* `deepPost` promises an array of the posted
     * objects (in original order).
     *
     * FIXME: It is not yet defined how errors (e.g. validation
     * errors) are passed back to the caller.
     */
    public deepPost(
        resources : ResourcesBase.Resource[]
    ) : ng.IPromise<ResourcesBase.Resource[]> {

        var sortedResources : ResourcesBase.Resource[] = AdhResourceUtil.sortResourcesTopologically(resources, this.adhPreliminaryNames);

        // post stuff
        return this.withTransaction((transaction) : ng.IPromise<ResourcesBase.Resource[]> => {
            _.forEach(sortedResources, (resource) => {
                transaction.post(resource.parent, resource);
            });

            return transaction.commit().then(postedResources => {
                _.forEach(postedResources, (resource) => {
                    this.adhCache.invalidate(AdhUtil.parentPath(resource.path));
                });

                return postedResources;
            });
        });
    }

    /**
     * For resources that do not support fork: Post a new version.  If
     * the backend responds with a "no fork allowed" error, fetch LAST
     * tag and try again.
     *
     * The return value is an object containing the resource from the
     * response, plus a flag whether the post resulted in an implicit
     * transplant (or change of parent).  If this flag is true, the
     * caller may want to take further action, such as notifying the
     * (two or more) users involved in the conflict.
     *
     * There is a max number of retries and a randomized and
     * exponentially growing sleep period between retries hard-wired
     * into the function.  If the max number of retries is exceeded,
     * an exception is thrown.
     */
    public postNewVersionNoFork(
        oldVersionPath : string,
        obj : Content, rootVersions? : string[]
    ) : ng.IPromise<{ value: Content; parentChanged: boolean; }> {
        var _self = this;

        var timeoutRounds : number = 5;
        var waitms : number = 250;

        var dagPath = AdhUtil.parentPath(oldVersionPath);
        var _obj = _.cloneDeep(obj);
        if (typeof rootVersions !== "undefined") {
            _obj.root_versions = rootVersions;
        }

        var retry = (
            nextOldVersionPath : string,
            parentChanged : boolean,
            roundsLeft : number
        ) : ng.IPromise<{ value : Content; parentChanged : boolean; }> => {
            if (roundsLeft === 0) {
                throw "Tried to post new version of " + dagPath + " " + timeoutRounds.toString() + " times, giving up.";
            }

            _obj.data[SIVersionable.nick] = {
                follows: [nextOldVersionPath]
            };

            var handleSuccess = (content) => {
                return { value: content, parentChanged: parentChanged };
            };

            var handleConflict = (msg) => {
                // re-throw all exception lists other than ["no-fork"].
                if (typeof msg === "object" && msg.hasOwnProperty("length") &&
                    msg.length === 1 &&
                    ( msg[0].name === "data." + SIVersionable.nick + ".follows" || msg[0].name === "root_version" ) &&
                    msg[0].location === "body" &&
                    msg[0].description.search("^No fork allowed.*") === 0
                   ) {
                    // double waitms (fuzzed for avoiding network congestion).
                    waitms *= 2 * (1 + (Math.random() / 2 - 0.25));

                    console.log("Posting version as follower of " + nextOldVersionPath + " failed.");

                    // wait then retry
                    return _self.$timeout(
                        () => _self.getNewestVersionPathNoFork(dagPath)
                            .then((nextOldVersionPath) => retry(nextOldVersionPath, true, roundsLeft - 1)),
                        waitms,
                        true);
                } else {
                    throw msg;
                }
            };

            return _self
                .post(dagPath, _obj)
                .then(handleSuccess, <any>handleConflict);
        };

        return retry(oldVersionPath, false, timeoutRounds);
    }

    public postToPool(poolPath : string, obj : Content) : ng.IPromise<Content> {
        return this.post(poolPath, obj);
    }

    /**
     * Resolve a path or content to content
     *
     * If you do not know if a reference is already resolved to the corresponding content
     * you can use this function to be sure.
     */
    public resolve(path : string) : ng.IPromise<Content>;
    public resolve(content : Content) : ng.IPromise<Content>;
    public resolve(pathOrContent) {
        if (typeof pathOrContent === "string") {
            return this.get(pathOrContent);
        } else {
            return this.$q.when(pathOrContent);
        }
    }

    /**
     * Call `withTransaction` with a callback that accepts a
     * transaction.  All calls to `transaction` within `trans` are
     * collected into a batch request.
     *
     * Note that the interface of the transaction differs
     * significantly from that of adhHttp. It can therefore not be
     * used as a drop-in.
     *
     * A transaction returns an object (not a promise!) containing
     * some information you might need in other requests within the
     * same transaction. Note that some of this information may be
     * preliminary and should therefore not be used outside of the
     * transaction.
     *
     * After all requests have been made you need to call
     * `transaction.commit()`.  After that, no further interaction
     * with `transaction` is possible and will throw exceptions.
     * `commit` promises a list of responses. You can easily
     * identify the index of each request via the `index` property
     * in the preliminary data.
     *
     * `withTransaction` simply returns the result of the callback.
     *
     * Arguably, `withTransaction` should implicitly call `commit`
     * after the callback returns, but this would only work in the
     * synchronous case.  On the other hand, the done()-idiom is not
     * any prettier than forcing the caller of `withTransaction` to
     * call `commit` manually.  On the plus side, this makes it easy
     * to do post-processing (such as discarding parts of the batch
     * request that have become uninteresting with the successful
     * batch post).
     *
     * Example:
     *
     *     var postVersion = (path : string, ...) => {
     *         return adhHttp.withTransaction((transaction) => {
     *             var resource = ...
     *             var resourcePost = transaction.post(path, resource);
     *
     *             var version = {
     *                 data: {
     *                     "adhocracy_core.sheets.versions.IVersionable": {
     *                         follows: resourcePost.first_version_path
     *                     },
     *                     ...
     *                 }
     *             };
     *             var versionPost = transaction.post(resourcePost.path, version);
     *             var versionGet = transaction.get(versionPost.path);
     *
     *             return transaction.commit()
     *                 .then((responses) => {
     *                     return responses[versionGet.index];
     *                 });
     *         });
     *     };
     */
    public withTransaction<Result>(callback : (httpTrans : AdhTransaction.Transaction) => ng.IPromise<Result>) : ng.IPromise<Result> {
        return callback(new AdhTransaction.Transaction(this, this.adhCache, this.adhMetaApi, this.adhPreliminaryNames, this.adhConfig));
    }
}


export class Busy {
    public count : number;

    constructor(
        private $q : ng.IQService
    ) {
        this.count = 0;
    }

    public createInterceptor() {
        return {
            request: (config) => {
                this.count += 1;
                return config;
            },
            response: (response) => {
                this.count -= 1;
                return response;
            },
            responseError: (rejection) => {
                this.count -= 1;
                return this.$q.reject(rejection);
            }
        };
    }
}


export var busyDirective = (adhConfig : AdhConfig.IService, adhBusy : Busy) => {
    return {
        restrict: "E",
        template: "<div class=\"busy-bar\" data-ng-show=\"busy.count > 0\">" +
            (adhConfig.debug ? "<span class=\"busy-count\"/>{{busy.count}}</span>" : "") + "</div>",
        link: (scope) => {
            scope.busy = adhBusy;
        }
    };
};


export var moduleName = "adhHttp";

export var register = (angular, config, metaApi) => {
    angular
        .module(moduleName, [
            AdhPreliminaryNames.moduleName,
            AdhWebSocket.moduleName,
            "angular-data.DSCacheFactory",
        ])
        .config(["$httpProvider", ($httpProvider) => {
            $httpProvider.interceptors.push(["adhHttpBusy", (adhHttpBusy : Busy) => adhHttpBusy.createInterceptor()]);
        }])
        .service("adhHttpBusy", ["$q", Busy])
        .directive("adhHttpBusy", ["adhConfig", "adhHttpBusy", busyDirective])
        .service("adhHttp", [
            "$http", "$q", "$timeout", "adhMetaApi", "adhPreliminaryNames", "adhConfig", "adhCache", Service])
        .service("adhCache", ["$q", "adhConfig", "adhWebSocket", "DSCacheFactory", AdhCache.Service])
        .factory("adhMetaApi", () => new AdhMetaApi.MetaApiQuery(metaApi))
        .filter("adhFormatError", () => AdhError.formatError);
};
