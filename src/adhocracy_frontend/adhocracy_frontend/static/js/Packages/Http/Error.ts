/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

// Error responses in the Adhocracy REST API contain json objects in
// the body that have the following form:
export interface IBackendError {
    status: string;
    errors: IBackendErrorItem[];
}

export interface IBackendErrorItem {
    name : string;
    location : string;
    description : string;
}

var renderBackendError = (response : ng.IHttpPromiseCallbackArg<any>) : void => {
    // get rid of unrenderable junk (good for console log extraction with web driver).
    var sanitize = (x : any) : any => {
        try {
            return JSON.parse(JSON.stringify(x));
        } catch (e) {
            return x;
        }
    };

    if (response.status === 410) {
        return;
    }

    console.log("http response with error status: " + response.status);
    console.log("request (.config):", sanitize(response.config));
    if (typeof <any>response.headers !== "undefined") {
        console.log("headers (.headers()):", sanitize((<any>response).headers()));  // FIXME: need to update DefinitelyTyped...
    }
    console.log("response (.data):", sanitize(response.data));
};

export var logBackendError = (response : ng.IHttpPromiseCallbackArg<IBackendError>) : void => {
    "use strict";

    renderBackendError(response);

    if (response.data.hasOwnProperty("errors")) {
        var errors : IBackendErrorItem[] = response.data.errors;
        throw errors;
    } else {
        // FIXME: the backend currently responds with errors in HTML,
        // not in json, which provokes $http to throw an exception and
        // whipe the response object before passing it to the error
        // handler callback.  See #256 and disabled test "do not lose
        // error response status and body" in HttpIg.ts).
        //
        // the following line works around that.
        throw [{ name: "unknown", location: "unknown", description: "unknown" }];
    }
};

/**
 * batch requests recive an array of responses.  each response matches
 * one request that was actually processed in the backend.  Since the
 * first error makes batch processing stop, all responses up to the
 * last one are successes.  If this function is called, the error is
 * contained in the last element of the array.  All other elements are
 * ignored by this function.
 *
 * NOTE: See documentation of `importBatchContent`.
 */
export var logBackendBatchError = (
    response : ng.IHttpPromiseCallbackArg<{
        code : number;
        body : IBackendError;
    }[]>
) : void => {
    "use strict";

    renderBackendError(response);

    var lastBatchItemResponse : IBackendError = response.data[response.data.length - 1].body;
    var errors : IBackendErrorItem[] = lastBatchItemResponse.errors;
    throw errors;
};


export var formatError = (error : IBackendErrorItem) : string => {
    if (error.location === "internal") {
        return "Internal Error";
    } else {
        return error.description;
    }
};
