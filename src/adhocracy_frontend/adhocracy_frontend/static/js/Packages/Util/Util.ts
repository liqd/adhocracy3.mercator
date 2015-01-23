/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import _ = require("lodash");


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
 * Remove last hierarchy level from path (uris or directory paths). If given
 * url has a trailing slash, the returned url will also have a trailing slash.
 */
export function parentPath(url : string) : string {
    "use strict";

    var result;

    if (url[url.length - 1] === "/") {
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
 * Convert a any string to a valid name
 */
export function normalizeName(name: string) : string {
    "use strict";

    // FIXME: This does work well for german.
    // For languages with non-ascii character sets (diacritics,
    // cyrillic, chinese, ...) this will almost certainly return "".

    return name
        // common non-ascii chars
        .replace("ä", "ae")
        .replace("Ä", "Ae")
        .replace("ö", "oe")
        .replace("Ö", "Oe")
        .replace("ü", "ue")
        .replace("Ü", "Ue")
        .replace("ß", "ss")
        // whitespace
        .replace(/\s/, "_")
        // everything else
        .replace(/[^a-zA-Z0-9_\-.]/g, "");
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
 * Given a list of version paths this function returns a list of corresponding
 * items, but each item only once.
 */
export function eachItemOnce(refs : string[]) : string[] {
    "use strict";

    return _.uniq(_.map(refs, parentPath));
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


/**
 * String ending comparison from http://stackoverflow.com/a/2548133/201743
 *
 * Could also be done with underscore.string.
 */
export function endsWith(str, suffix) {
    "use strict";

    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


/**
 * Very much like $q.all().
 *
 * The only real difference is that it skips rejected promises instead of rejecting the whole result.
 */
export var qFilter = (promises : ng.IPromise<any>[], $q : ng.IQService) : ng.IPromise<any[]> => {
    // unique marker
    var empty = new Object();

    var count = promises.length;
    var results = [];

    var deferred = $q.defer();

    if (count === 0) {
        deferred.resolve(results);
    } else {
        _.forEach(promises, (promise : ng.IPromise<any>, i : number) => {
            results.push(empty);

            promise
                .then((result) => results[i] = result)
                .finally(() => {
                    count -= 1;
                    if (count === 0) {
                        results = results.filter((e) => e !== empty);
                        deferred.resolve(results);
                    }
                });
        });
    }

    return deferred.promise;
};
