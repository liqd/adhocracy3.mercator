/// <reference path="../../../lib2/types/angular.d.ts"/>

import * as _ from "lodash";


export interface IBackendError {
    status : string;
    errors : IBackendErrorItem[];
}

export interface IBackendBatchError {
    updated_resources : string[];
    responses : {
        code : number;
        body? : IBackendError;
    }[];
}

export interface IBackendErrorItem {
    name : string;
    location : string;
    description : string;
    code : number;
}

var extractErrorItems = (code : number, error : IBackendError) : IBackendErrorItem[] => {
    if (code === 410) {
        return [{
            location: "url",
            name: "GET",
            description: (<any>error).reason,
            code: code
        }];
    } else if (!error) {
        return [{
            location: "client",
            name: "abort",
            description: "the request was aborted before it could reach the server",
            code: code
        }];
    } else {
        _.forEach(error.errors, (item) => {
            item.code = code;
        });
        return error.errors;
    }
};

export var logBackendError = (response : angular.IHttpPromiseCallbackArg<IBackendError>) : void => {
    "use strict";

    console.log(response);

    throw extractErrorItems(response.status, response.data);
};

/**
 * batch requests recive an array of responses.  each response matches
 * one request that was actually processed in the backend.  Since the
 * first error makes batch processing stop, all responses up to the
 * last one are successes.  If this function is called, the error is
 * contained in the last element of the array.  All other elements are
 * ignored by this function.
 *
 * NOTE: See documentation of `importBatchResources`.
 */
export var logBackendBatchError = (
    response : angular.IHttpPromiseCallbackArg<IBackendBatchError>) : void => {
    "use strict";

    console.log(response);

    if (response.data) {
        var lastResponse = _.last(response.data.responses);
        throw extractErrorItems(lastResponse.code, lastResponse.body);
    } else {
        throw extractErrorItems(response.status, null);
    }
};


export var formatError = (error : IBackendErrorItem) : string => {
    if (error.location === "internal") {
        return "Internal Error";
    } else {
        return error.description;
    }
};
