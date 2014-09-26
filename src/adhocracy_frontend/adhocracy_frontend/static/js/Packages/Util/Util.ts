/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import _ = require("lodash");

/**
 * cut ranges out of an array - original by John Resig (MIT Licensed)
 */
export function cutArray(a : any[], from : number, to ?: number) : any[] {
    "use strict";
    var rest = a.slice((to || from) + 1 || a.length);
    a.length = from < 0 ? a.length + from : from;
    a.push.apply(a, rest);
    return a;
};


/**
 * isArrayMember could be inlined, but is not for two reasons: (1)
 * even though js developers are used to it, the inlined idiom is just
 * weird; (2) the test suite documents what can and cannot be done
 * with it.
 */
export function isArrayMember(member : any, array : any[]) : boolean {
    "use strict";
    return array.indexOf(member) > -1;
}


/**
 * Take a maximum delay time, an array of arguments and a function.
 * Generate random delays (in ms) for each and calls the function
 * asynchronously (out of order) on each element of the array.  Ignore
 * return values of f.
 *
 * Example:
 *
 * | trickle($timeout, 5000, paths, (path) => $scope.messages.push({ "event": "modified", "resource": path }));
 */
export var trickle = <T>($timeout: ng.ITimeoutService, maxdelay: number, xs: T[], f: (T) => void): void => {
    xs.map((x) => $timeout(() => f(x), Math.random() * maxdelay, true));
};


/**
 * Check whether str ends with suffix.
 */
export function endsWith(str : string, suffix : string) {
    "use strict";

    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};


/**
 * Remove last hierarchy level from path (uris or directory paths). If given
 * url has a trailing slash, the returned url will also have a trailing slash.
 */
export function parentPath(url : string) : string {
    "use strict";

    var result;

    if (endsWith(url, "/")) {
        result = url.substring(0, url.lastIndexOf("/", url.length - 2) + 1);
    } else {
        result = url.substring(0, url.lastIndexOf("/"));
    }

    if (result === "") {
        result = "/";
    }

    return result;
};


/**
 * replace space with _, make everything lower case.
 */
export function normalizeName(name: string) : string {
    "use strict";

    return name.toLowerCase().replace(/\ /g, "_");
}

/**
 * format strings
 *
 * Example:
 *   > formatString("Hello {0} from {1}", "World", "Bernd")
 *   "Hello World from Bernd"
 *
 * http://stackoverflow.com/questions/610406/4673436#4673436
 */
export function formatString(format : string, ...args : string[]) {
    "use strict";

    return format.replace(/{(\d+)}/g, function(match, number) {
        return (typeof args[number] !== "undefined") ? args[number] : match;
    });
}


/**
 * Escape angular expression.
 *
 * This is mainly used to prevent XSS.
 *
 * If you want to use the output of this in HTML, please remember
 * to escape it using _.escape.
 */
export function escapeNgExp(s : string) {
    "use strict";
    return "'" + s.replace(/'/g, "\\'") + "'";
}

/**
 * Filter a list of version paths to only contain the latests versions for each item.
 */
export function latestVersionsOnly(refs : string[]) : string[] {
    "use strict";

    var latestVersions : string[] = [];
    var lastCommentPath : string = undefined;

    _.cloneDeep(refs).sort().reverse().forEach((versionPath : string) => {
        var commentPath = parentPath(versionPath);
        if (commentPath !== lastCommentPath) {
            latestVersions.push(versionPath);
            lastCommentPath = commentPath;
        }
    });

    return latestVersions;
};


export interface IVertex<vertexType> {
    content : vertexType;
    incoming : string[];
    outgoing : string[];
    done : Boolean;
};


/**
 * Data structure which contains a DAG in a structure that is easy to work with.
 */
export interface IDag<vertexType> {
    [key : string] : IVertex<vertexType>;
}


/**
 * Sort a given IDag<any> topologically and return the sorted content items.
 *
 * This function has some assumptions which fit the current only use case:
 *
 * - It currently destroys the edges of the Dag.
 */
export function sortDagTopologically(dag : IDag<any>, sources : string[]) : any[] {
    "use strict";

    // getNext pops any possible candidate from
    // the DAG by modifying the dag object
    var getNext = (dag) => {
        var next = sources.pop();

        _.forEach((<IVertex<any>>dag[next]).outgoing, (key) => {
            // dag[key].incoming.deleteItem(next)
            dag[key].incoming.splice(_.indexOf(dag[key].incoming, next), 1);
            if (_.isEmpty(dag[key].incoming)) {
                sources.push(key);
            }
        });

        return next;
    };

    var sorted = [];

    while (!_.isEmpty(sources)) {
        var next = getNext(dag);
        sorted.push(dag[next].content);
        dag[next].done = true;
    }

    if (!_.all(_.pluck(dag, "done"))) {
        throw "cycle detected";
    }

    return sorted;
}
