/// <reference path="../../../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/jquery/jquery.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>

import _ = require("lodash");

import Resources = require("../../Resources");
import ResourcesBase = require("../../ResourcesBase");
import Util = require("../Util/Util");
import MetaApi = require("../MetaApi/MetaApi");
import PreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhTransaction = require("./Transaction");
import AdhError = require("./Error");
import AdhConvert = require("./Convert");
import AdhConfig = require("../Config/Config");

// re-exports
export interface ITransactionResult extends AdhTransaction.ITransactionResult {};
export interface IBackendError extends AdhError.IBackendError {};
export interface IBackendErrorItem extends AdhError.IBackendErrorItem {};
export var logBackendError : (response : ng.IHttpPromiseCallbackArg<IBackendError>) => void = AdhError.logBackendError;


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
export class Service<Content extends Resources.Content<any>> {
    constructor(
        private $http : ng.IHttpService,
        private $q : ng.IQService,
        private $timeout : ng.ITimeoutService,
        private adhMetaApi : MetaApi.MetaApiQuery,
        private adhPreliminaryNames : PreliminaryNames,
        private adhConfig : AdhConfig.Type
    ) {}

    public getRaw(path : string, params ?: { [key : string] : string }) : ng.IHttpPromise<any> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-get preliminary path: " + path;
        }
        if (path.lastIndexOf("/", 0) === 0 && typeof this.adhConfig.rest_url !== "undefined") {
            path = this.adhConfig.rest_url + path;
        }
        return this.$http
            .get(path, { params : params });
    }

    public get(path : string, params ?: { [key : string] : string }) : ng.IPromise<Content> {
        return this.getRaw(path, params)
            .then(
                (response) => AdhConvert.importContent(<any>response, this.adhMetaApi, this.adhPreliminaryNames),
                AdhError.logBackendError);
    }

    public putRaw(path : string, obj : Content) : ng.IHttpPromise<any> {
        if (this.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-put preliminary path: " + path;
        }
        if (path.lastIndexOf("/", 0) === 0 && typeof this.adhConfig.rest_url !== "undefined") {
            path = this.adhConfig.rest_url + path;
        }
        return this.$http
            .put(path, AdhConvert.exportContent(this.adhMetaApi, obj));
    }

    public put(path : string, obj : Content) : ng.IPromise<Content> {
        return this.putRaw(path, obj)
            .then(
                (response) => AdhConvert.importContent(<any>response, this.adhMetaApi, this.adhPreliminaryNames),
                AdhError.logBackendError);
    }

    public postRaw(path : string, obj : Content) : ng.IHttpPromise<any> {
        var _self = this;

        if (_self.adhPreliminaryNames.isPreliminary(path)) {
            throw "attempt to http-post preliminary path: " + path;
        }
        if (path.lastIndexOf("/", 0) === 0 && typeof _self.adhConfig.rest_url !== "undefined") {
            path = _self.adhConfig.rest_url + path;
        }
        return _self.$http
            .post(path, AdhConvert.exportContent(_self.adhMetaApi, obj));
    }

    public post(path : string, obj : Content) : ng.IPromise<Content> {
        var _self = this;

        return _self.postRaw(path, obj)
            .then(
                (response) => AdhConvert.importContent(<any>response, _self.adhMetaApi, _self.adhPreliminaryNames),
                AdhError.logBackendError);
    }

    /**
     * For resources that do not support fork: Return the unique head
     * version provided by the LAST tag.  If there is no or more than
     * one version in LAST, throw an exception.
     */
    public getNewestVersionPathNoFork(path : string) : ng.IPromise<string> {
        return this.get(path + "/LAST")
            .then((tag) => {
                var heads = tag.data["adhocracy_core.sheets.tags.ITag"].elements;
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

        var sortedResources : ResourcesBase.Resource[] = ResourcesBase.sortResourcesTopologically(resources, this.adhPreliminaryNames);

        // post stuff
        return this.withTransaction((transaction) : ng.IPromise<ResourcesBase.Resource[]> => {
            _.forEach(sortedResources, (resource) => {
                transaction.post(resource.parent, resource);
            });

            return transaction.commit();
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

        var dagPath = Util.parentPath(oldVersionPath);
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

            _obj.data["adhocracy_core.sheets.versions.IVersionable"] = {
                follows: [nextOldVersionPath]
            };

            var handleSuccess = (content) => {
                return { value: content, parentChanged: parentChanged };
            };

            var handleConflict = (msg) => {
                // re-throw all exception lists other than ["no-fork"].
                if (msg.hasOwnProperty("length") &&
                    msg.length === 1 &&
                    msg[0].name === "data.adhocracy.sheets.versions.IVersionable.follows" &&
                    msg[0].location === "body" &&
                    msg[0].description === "No fork allowed"
                   ) {
                    // double waitms (fuzzed for avoiding network congestion).
                    waitms *= 2 * (1 + (Math.random() / 2 - 0.25));

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
        return callback(new AdhTransaction.Transaction(this, this.adhMetaApi, this.adhPreliminaryNames, this.adhConfig));
    }
}
