/// <reference path="../../../lib2/types/lodash.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhMetaApi from "../MetaApi/MetaApi";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";

import * as ResourcesBase from "../../ResourcesBase";

import * as AdhCache from "./Cache";
import * as AdhConvert from "./Convert";
import * as AdhError from "./Error";
import * as AdhHttp from "./Http";

export interface ITransactionResult {
    index : number;
    path : string;
    first_version_path? : string;
}


/**
 * Http Transaction.
 *
 * This should be used via adhHttp.withTransaction.
 */
export class Transaction {
    // FIXME: importResource, exportResource and logBackendError need yet to be
    // incorporated.

    private requests : any[];
    private committed : boolean;

    constructor(
        private adhHttp : AdhHttp.Service<any>,
        private adhCache : AdhCache.Service,
        private adhMetaApi : AdhMetaApi.Service,
        private adhPreliminaryNames : AdhPreliminaryNames.Service,
        private adhConfig : AdhConfig.IService
    ) {
        this.requests = [];
        this.committed = false;
    }

    private checkNotCommitted() : void {
        if (this.committed) {
            throw("Tried to use an already committed transaction");
        }
    }

    public get(path : string) : ITransactionResult {
        this.checkNotCommitted();
        this.requests.push({
            method: "GET",
            path: path
        });
        return {
            index: this.requests.length - 1,
            path: path
        };
    }

    public put(path : string, obj : ResourcesBase.IResource) : ITransactionResult {
        this.checkNotCommitted();
        this.requests.push({
            method: "PUT",
            path: path,
            body: AdhConvert.exportResource(this.adhMetaApi, obj)
        });
        return {
            index: this.requests.length - 1,
            path: path
        };
    }

    public post(path : string, obj : ResourcesBase.IResource) : ITransactionResult {
        this.checkNotCommitted();
        var preliminaryPath;
        if (typeof obj.path === "string") {
            preliminaryPath = obj.path;
        } else {
            preliminaryPath = this.adhPreliminaryNames.nextPreliminary();
        }
        var preliminaryFirstVersionPath;
        if (typeof obj.first_version_path === "string") {
            preliminaryFirstVersionPath = obj.first_version_path;
        } else {
            preliminaryFirstVersionPath = this.adhPreliminaryNames.nextPreliminary();
        }
        this.requests.push({
            method: "POST",
            path: path,
            body: AdhConvert.exportResource(this.adhMetaApi, obj),
            result_path: preliminaryPath,
            result_first_version_path: preliminaryFirstVersionPath
        });
        return {
            index: this.requests.length - 1,
            path: preliminaryPath,
            first_version_path: preliminaryFirstVersionPath
        };
    }

    public commit(config = {}) : angular.IPromise<ResourcesBase.IResource[]> {
        var _self = this;

        this.checkNotCommitted();
        this.committed = true;
        var conv = (request) => {
            if (request.hasOwnProperty("body")) {
                request.body = AdhConvert.exportResource(this.adhMetaApi, request.body);
            }
            return request;
        };

        return this.adhHttp.postRaw("/batch", this.requests.map(conv), config).then(
            (response) => {
                var imported = AdhConvert.importBatchResources(
                    response.data.responses, this.adhMetaApi, this.adhPreliminaryNames, this.adhCache);
                _self.adhCache.invalidateUpdated(response.data.updated_resources, <string[]>_.map(imported, "path"));
                return imported;
            },
            AdhError.logBackendBatchError);
    }
}
