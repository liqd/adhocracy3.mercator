/// <reference path="../../../lib2/types/jquery.d.ts"/>
/// <reference path="../../../lib2/types/angular.d.ts"/>
/// <reference path="../../../lib2/types/lodash.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhCredentials from "../User/Credentials";
import * as AdhMetaApi from "../MetaApi/MetaApi";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhResourceUtil from "../Util/ResourceUtil";
import * as AdhUtil from "../Util/Util";

import * as ResourcesBase from "../../ResourcesBase";

import * as SIMetadata from "../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SITags from "../../Resources_/adhocracy_core/sheets/tags/ITags";
import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";

import * as AdhCache from "./Cache";
import * as AdhConvert from "./Convert";
import * as AdhError from "./Error";
import * as AdhTransaction from "./Transaction";

// re-exports
export interface ITransactionResult extends AdhTransaction.ITransactionResult {};
export interface IBackendError extends AdhError.IBackendError {};
export interface IBackendErrorItem extends AdhError.IBackendErrorItem {};
export var logBackendError : (response : angular.IHttpPromiseCallbackArg<IBackendError>) => void = AdhError.logBackendError;


export interface IHttpConfig {
    noCredentials? : boolean;
    noExport? : boolean;
    anonymize? : boolean;
}

export interface IHttpOptionsConfig extends IHttpConfig {
    importOptions? : boolean;
}

export interface IHttpGetConfig extends IHttpConfig {
    warmupPoolCache? : boolean;
}

export interface IHttpPutConfig extends IHttpConfig {
    keepMetadata? : boolean;
}


export interface IOptions {
    OPTIONS : boolean;
    PUT : boolean;
    GET : boolean;
    POST : boolean;
    HEAD : boolean;
    DELETE : boolean;
    hide : boolean;
    canPost(contentType : string) : boolean;
    canPut(sheetNick : string) : boolean;
}


export var emptyOptions : IOptions = {
    OPTIONS: false,
    PUT: false,
    GET: false,
    POST: false,
    HEAD: false,
    DELETE: false,
    hide: false,
    canPost: (contentType) => false,
    canPut: (sheetNick) => false
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
export class Service {

    constructor(
        private $http : angular.IHttpService,
        private $q : angular.IQService,
        private $timeout : angular.ITimeoutService,
        private adhCredentials : AdhCredentials.Service,
        private adhMetaApi : AdhMetaApi.Service,
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

    private parseConfig(config : IHttpConfig) {
        var headers = {};
        if (config.noCredentials) {
            _.assign(headers, {
                "X-User-Token": undefined
            });
        }
        if (config.anonymize) {
            _.assign(headers, {
                // the header is non-empty so it doesn't get deleted by browsers
                "X-Anonymize": "X-Anonymize"
            });
        }
        return headers;
    }

    private importOptions(raw : angular.IHttpPromiseCallbackArg<any>) : IOptions {
        var metadata = AdhUtil.deepPluck(raw.data, ["PUT", "request_body", "data", SIMetadata.nick]);
        return {
            OPTIONS: !!raw.data.OPTIONS,
            PUT: !!raw.data.PUT,
            GET: !!raw.data.GET,
            POST: !!raw.data.POST,
            HEAD: !!raw.data.HEAD,
            DELETE: !!raw.data.DELETE,
            hide: !!metadata,
            canPost: (contentType : string) => {
                if (raw.data.POST) {
                    var postOptions = raw.data.POST.request_body;
                    return _.some(postOptions, { "content_type": contentType });
                } else {
                    return false;
                }
            },
            canPut: (sheetNick : string) => {
                if (raw.data.PUT) {
                    var putOptions = raw.data.PUT.request_body.data;
                    return _.has(putOptions, sheetNick);
                } else {
                    return false;
                }
            }
        };
    }

    public options(path : string, config : IHttpOptionsConfig = {}) : angular.IPromise<IOptions> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-options preliminary path: " + path;
        }
        path = this.formatUrl(path);
        var headers = this.parseConfig(config);

        return this.adhCache.memoize(path, "OPTIONS",
            () => this.adhCredentials.ready.then(
                () => this.$http({method: "OPTIONS", url: path, headers: <any>headers})
            )
        ).then((response) => {
            if (typeof config.importOptions === "undefined" || config.importOptions) {
                return this.importOptions(response);
            } else {
                return response;
            }
        }, AdhError.logBackendError);
    }

    public getRaw(path : string, params?, config : IHttpConfig = {}) : angular.IPromise<any> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-get preliminary path: " + path;
        }
        path = this.formatUrl(path);
        var headers = this.parseConfig(config);

        return this.adhCredentials.ready.then(() => this.$http.get(path, {
            params : params,
            headers : <any>headers
        }));
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
        params?,
        config : IHttpGetConfig = {}
    ) : angular.IPromise<any> {
        var query = (typeof params === "undefined") ? "" : "?" + $.param(params);

        var originalElements = (params || {}).elements || "omit";
        if (config.warmupPoolCache) {
            params["elements"] = "content";
        }

        return this.adhCache.memoize(path, query,
            () => this.getRaw(path, params, config).then(
                (response) => AdhConvert.importResource(
                    <any>response, this.adhMetaApi, this.adhPreliminaryNames, this.adhCache, config.warmupPoolCache, originalElements),
                AdhError.logBackendError));
    }

    public putRaw(path : string, obj : any, config : IHttpConfig = {}) : angular.IPromise<any> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-put preliminary path: " + path;
        }
        path = this.formatUrl(path);
        var headers = this.parseConfig(config);
        this.adhCache.invalidate(path);

        return this.adhCredentials.ready.then(() => this.$http.put(path, obj, {
            headers: <any>headers
        }));
    }

    public put(path : string, obj : any, config : IHttpPutConfig = {}) : angular.IPromise<any> {
        var _self = this;

        if (!config.noExport) {
            obj = AdhConvert.exportResource(_self.adhMetaApi, obj, config.keepMetadata);
        }

        return this.putRaw(path, obj, config)
            .then(
                (response) => {
                    _self.adhCache.invalidateUpdated(response.data.updated_resources);
                    return AdhConvert.importResource(<any>response, _self.adhMetaApi, _self.adhPreliminaryNames, this.adhCache);
                },
                AdhError.logBackendError);
    }

    public hide(path : string, config : IHttpConfig = {}) : angular.IPromise<any> {
        return this.get(path).then((resource) => {
            var obj = {
                content_type: resource.content_type,
                data: {}
            };
            obj.data[SIMetadata.nick] = {
                hidden: true
            };

            return this.put(path, <any>obj, _.extend({}, config, {keepMetadata: true}));
        });
    }

    public delete(path : string, config : IHttpConfig = {}) : angular.IPromise<any> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-delete preliminary path: " + path;
        }
        path = this.formatUrl(path);
        var headers = this.parseConfig(config);
        this.adhCache.invalidate(path);

        return this.adhCredentials.ready.then(() => this.$http.delete(path, {
            headers: <any>headers
        }));
    }

    public postRaw(path : string, obj : any, config : IHttpConfig = {}) : angular.IPromise<any> {
        var _self = this;

        if (_self.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-post preliminary path: " + path;
        }
        path = this.formatUrl(path);
        var headers = this.parseConfig(config);

        return this.adhCredentials.ready.then(() => {
            if (typeof FormData !== "undefined" && FormData.prototype.isPrototypeOf(obj)) {
                return _self.$http({
                    method: "POST",
                    url: path,
                    data: obj,
                    headers: <any>_.assign({"Content-Type": undefined}, headers),
                    transformRequest: undefined
                });
            } else {
                return _self.$http.post(path, obj, {
                    headers: <any>headers
                });
            }
        });
    }

    public post(path : string, obj : any, config : IHttpConfig = {}) : angular.IPromise<any> {
        var _self = this;

        if (!config.noExport) {
            obj = AdhConvert.exportResource(_self.adhMetaApi, obj);
        }

        return _self.postRaw(path, obj, config)
            .then(
                (response) => {
                    this.adhCache.invalidateUpdated(response.data.updated_resources);
                    return AdhConvert.importResource(<any>response, _self.adhMetaApi, _self.adhPreliminaryNames, this.adhCache);
                },
                AdhError.logBackendError);
    }

    /**
     * For resources that do not support fork: Return the unique head
     * version provided by the LAST tag.  If there is no or more than
     * one version in LAST, throw an exception.
     *
     * FIXME: rename to getLastVersionPathNoFork for consistency with
     * LAST tag.  (even though arguably
     * there is a difference between the LAST tag and this function.)
     */
    public getNewestVersionPathNoFork(path : string, config : IHttpGetConfig = {}) : angular.IPromise<string> {
        return this.get(path, undefined, config)
            .then((item) => {
                var head = item.data[SITags.nick].LAST;
                return head;
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
        resources : ResourcesBase.IResource[],
        config : IHttpConfig = {}
    ) : angular.IPromise<ResourcesBase.IResource[]> {

        var sortedResources : ResourcesBase.IResource[] = AdhResourceUtil.sortResourcesTopologically(
            resources, this.adhPreliminaryNames, this.adhMetaApi);

        // post stuff
        return this.withTransaction((transaction) : angular.IPromise<ResourcesBase.IResource[]> => {
            _.forEach(sortedResources, (resource) => {
                transaction.post(resource.parent, resource);
            });

            return transaction.commit(config).then(postedResources => {
                _.forEach(postedResources, (resource) => {
                    this.adhCache.invalidate(AdhUtil.parentPath(resource.path));
                });

                var preliminaryPaths = _.map(resources, "path");
                return _.sortBy(postedResources, (postedResource) => {
                    var index = _.indexOf(postedResources, postedResource);
                    var preliminaryPath = sortedResources[index].path;
                    return preliminaryPaths.indexOf(preliminaryPath);
                });
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
        obj : any,
        rootVersions? : string[],
        config? : IHttpOptionsConfig
    ) : angular.IPromise<{ value: any; parentChanged: boolean; }> {
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
        ) : angular.IPromise<{ value : any; parentChanged : boolean; }> => {
            if (roundsLeft === 0) {
                throw "Tried to post new version of " + dagPath + " " + timeoutRounds.toString() + " times, giving up.";
            }

            _obj.data[SIVersionable.nick] = {
                follows: [nextOldVersionPath]
            };

            var handleSuccess = (resource) => {
                return { value: resource, parentChanged: parentChanged };
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
                .post(dagPath, _obj, config)
                .then(handleSuccess, <any>handleConflict);
        };

        return retry(oldVersionPath, false, timeoutRounds);
    }

    public postToPool(poolPath : string, obj : any) : angular.IPromise<any> {
        return this.post(poolPath, obj);
    }

    /**
     * Resolve a path or resource to resource
     *
     * If you do not know if a reference is already resolved to the
     * corresponding resource you can use this function to be sure.
     */
    public resolve(path : string) : angular.IPromise<any>;
    public resolve(resource : any) : angular.IPromise<any>;
    public resolve(pathOrResource) {
        if (typeof pathOrResource === "string") {
            return this.get(pathOrResource);
        } else {
            return this.$q.when(pathOrResource);
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
    public withTransaction<Result>(
        callback : (httpTrans : AdhTransaction.Transaction) => angular.IPromise<Result>
    ) : angular.IPromise<Result> {
        return callback(new AdhTransaction.Transaction(this, this.adhCache, this.adhMetaApi, this.adhPreliminaryNames, this.adhConfig));
    }
}


export class Busy {
    public count : number;

    constructor(
        private $q : angular.IQService
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
