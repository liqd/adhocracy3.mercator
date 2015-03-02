/// <reference path="../../../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>

import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhUtil = require("../Util/Util");
import AdhWebSocket = require("../WebSocket/WebSocket");

import AdhHttp = require("./Http");

export interface IHttpCacheItem {
    wsOff : Function;
    promises : {[query : string] : ng.IPromise<any>};
}


/**
 * HTTP Cache Service
 *
 * This implements a cache which allows to store and automatically invalidate
 * imported HTTP responses.
 *
 * It is currently very much tied to the requirements of the adhHttp service.
 */
export class Service {
    "use strict";

    private cache;
    private debug = false;

    private nonResourceUrls;

    constructor(
        private $q : ng.IQService,
        private adhConfig : AdhConfig.IService,
        private adhWebSocket : AdhWebSocket.Service,
        private DSCacheFactory
    ) {
        this.setupCache(DSCacheFactory, adhWebSocket);
        this.nonResourceUrls = _.map(AdhHttp.nonResourcePaths, (path) => adhConfig.rest_url + "/" + path + "/");
    }

    private setupCache(DSCacheFactory, adhWebSocket : AdhWebSocket.Service) : void {
        this.cache = DSCacheFactory("httpCache", {
            capacity: 10000,  // items
            maxAge: 5 * 60 * 1000,  // milliseconds
            deleteOnExpire: "aggressive",
            recycleFreq: 5000, // milliseconds
            onExpire: (key, value) => {
                value.wsOff();
            }
        });


        adhWebSocket.addEventListener("close", (msg) => {
            this.invalidateAll();
        });
    }

    public invalidate(path : string) : void {
        var cached = this.cache.get(path);
        if (typeof cached !== "undefined") {
            if (typeof cached.wsOff !== "undefined") {
                cached.wsOff();
            }
            this.cache.remove(path);
            if (this.debug) { console.log("invalidate: " + path); };
        }
    }

    public invalidateUpdated(updated : AdhHttp.IUpdated, posted? : string[]) : void {
        // FIXME: Use less naive invalidation strategy, which invalidates more carefully.
        var mustInvalidate = [
            updated.changed_descendants,
            updated.created,
            updated.modified,
            updated.removed,
            _.map(updated.created, AdhUtil.parentPath),
            _.map(updated.modified, AdhUtil.parentPath),
            _.map(updated.removed, AdhUtil.parentPath)
        ];
        if (typeof posted !== "undefined") {
            mustInvalidate.push(posted);
            mustInvalidate.push(_.map(posted, AdhUtil.parentPath));
        }
        _.forEach(<string[]>_.uniq(_.flatten(mustInvalidate)), (path) => {
            this.invalidate(path);
        });
    }

    public invalidateAll() : void {
        _.forEach(this.cache.keys(), (key : string) => {
            this.invalidate(key);
        });
    }

    private getOrSetCached(path : string) : IHttpCacheItem {
        // FIXME: normalize URLs everywhere
        path = path.replace(/\/*$/, "/");

        var cached = this.cache.get(path);
        if (typeof cached === "undefined") {
            var wsOff : Function;
            if (!_.contains(this.nonResourceUrls, path)) {
                wsOff = this.adhWebSocket.register(path, (msg) => {
                    this.invalidate(path);
                });
            }
            cached = {
                wsOff: wsOff,
                promises: {}
            };
            this.cache.put(path, cached);
        }
        return cached;
    }

    /**
     * If the cache already contains the combination of path and subkey, return
     * the cached value.
     *
     * Otherwise, execute the given closure, store the result in the cache and
     * return it.
     */
    public memoize(path : string, subkey : string, closure : Function) {
        if (this.adhWebSocket.isConnected()) {
            var cached = this.getOrSetCached(path);

            var promise = cached.promises[subkey];
            if (typeof promise === "undefined") {
                if (this.debug) { console.log("cache miss: " + path + " " + subkey); };
                promise = closure();
                cached.promises[subkey] = promise;
            } else {
                if (this.debug) { console.log("cache hit: " + path + " " + subkey); };
            }
            return promise;
        } else {
            return closure();
        }
    }

    /**
     * Force value into cache.
     */
    public putCached(path : string, subkey : string, value) {
        if (this.adhWebSocket.isConnected()) {
            var cached = this.getOrSetCached(path);
            cached.promises[subkey] = this.$q.when(value);
        }
    }
}
