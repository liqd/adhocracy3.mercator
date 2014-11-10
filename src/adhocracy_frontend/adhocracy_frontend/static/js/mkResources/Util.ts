/// <reference path="../../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>

/* tslint:disable:no-var-requires */
var _s : any = require("underscore.string");
/* tslint:enable:no-var-requires */

import _ = require("lodash");

import UtilA = require("../Packages/Util/Util");

export var mkThingList : <T>(things : T[], render : (T) => string, tab : string, separator : string) => string;
export var dotAndUnderscoreToCaml : (string) => string;
export var capitalizeHead : (string) => string;

export var injectNickDict : (dict : { [index : string] : any }) => void;
export var mkNickDict : (dict : { [index : string] : any }) => { [index : string] : string };
export var mkNickDictFromNames : (fullNames : string[]) => { [index : string] : string };
export var mkNickDictFromNamesX : (fullNames : string[][]) => { [index : string] : string };


/**
 * Example: takes a list [1, 2, 3] and a function render = (i) =>
 * i.toString(i), and produces the following output:
 *
 * thingList : string === tab + "1" + separator
 *                      + tab + "2" + separator
 *                      + tab + "3"
 */
mkThingList = <T>(things : T[], render : (T) => string, tab : string, separator : string) : string => {
    var os : string[] = [];
    for (var thing in things) {
        if (things.hasOwnProperty(thing)) {
            os.push(render(things[thing]));
        }
    }
    return (tab + UtilA.intercalate(os, separator + tab));
};

dotAndUnderscoreToCaml = (i : string) : string => {
    return i.replace(/[\._](.)/g, (matchAll, matchParen1) => matchParen1.toUpperCase());
};

capitalizeHead = (i : string) : string => {
    return i[0].toUpperCase() + i.substring(1);
};


/**
 * the haskell code for injectNickDict, mkNickDict, and
 * mkNickDictFromNames looks like this:
 *
 * | run :: [String] -> [String]
 * | run = map pack . join . map switch . sortGroupOn head . map unpack
 * |
 * | unpack :: String -> [String]
 * | unpack = reverse . extercalate '.'
 * |
 * | pack :: [String] -> String
 * | pack = UtilA.intercalate "." . reverse
 * |
 * | switch :: [[String]] -> [[String]]
 * | switch [(unique:_)] = [[unique]]
 * | switch x@((sharedHead:t):(map tail -> ts)) = fmap (sharedHead:) . join . map switch . sortGroupOn head $ t:ts
 *
 */
injectNickDict = (dict : { [index : string] : any }) : void => {
    var key : string;
    var nicks : { [index : string] : string };

    nicks = mkNickDict(dict);
    for (key in dict) {
        if (dict.hasOwnProperty(key)) {
            if (!nicks[key]) {
                throw "nick construction failed!\n    key:\n        " + key
                    + "\n    nick dict:\n" + JSON.stringify(nicks, null, 8);
            } else {
                dict[key].nick = nicks[key];
            }
        }
    }
};

mkNickDict = (dict : { [index : string] : any }) : { [index : string] : string } => {
    var fullNames : string[] = [];

    for (var key in dict) {
        if (dict.hasOwnProperty(key)) {
            fullNames.push(key);
        }
    };

    return mkNickDictFromNames(fullNames);
};

mkNickDictFromNames = (fullNames : string[]) : { [index : string] : string } =>
        mkNickDictFromNamesX(fullNames.map((fullName) => _s.words(fullName, ".").reverse()));

mkNickDictFromNamesX = (fullNames : string[][]) : { [index : string] : string } => {
    var nicksRec : { [index: string]: string } = {};
    var clashes : string[][] = [];

    var chopClashes = (clashes : string[][]) : string[][] => {
        var clashesX = _.cloneDeep(clashes);
        clashesX.forEach((fullName : string[]) => fullName.shift());
        return clashesX;
    };

    var flushClashes = () : void => {
        if (clashes.length === 1) {
            var nick = clashes[0][0];
            var full = UtilA.intercalate(_.cloneDeep(clashes[0]).reverse(), ".");
            nicksRec[full] = nick;
        } else {
            var chopOk : boolean = true;
            clashes.forEach((clash) => {
                if (clash.length === 0) {
                    throw "mkNickDictFromNames_: internal error";
                }
                if (clash.length === 1) {
                    chopOk = false;
                }
            });

            if (chopOk) {
                var sharedHead : string = clashes[0][0];
                var subDict : { [index: string]: string } = mkNickDictFromNamesX(chopClashes(clashes));

                for (var fullName in subDict) {
                    if (subDict.hasOwnProperty(fullName)) {
                        nicksRec[fullName + "." + sharedHead] = subDict[fullName] + "." + sharedHead;
                    }
                }
            } else {
                clashes.forEach((clash) => {
                    var n = UtilA.intercalate(_.cloneDeep(clash).reverse(), ".");
                    nicksRec[n] = n;
                });
            }
        }
        clashes = [];
    };

    fullNames.sort().forEach((fullName : string[], index : number) => {
        if (clashes.length > 0 && clashes[0][0] !== fullName[0]) {
            flushClashes();
        }
        clashes.push(fullName);
    });

    if (clashes.length > 0) {
        flushClashes();
    }

    return nicksRec;
};


/*

var quickAndDirtyUnitTest = () => {
    var ms = [
        "wef.asdf.0",
        "wef.asdf.487",
        "wef.asdf.431",
        "wef.487",
        "2wef.2asdf.431",
        "2wef.2fe.431",
        "poff.gna",
        "gna"
    ];

    var should = {
        "wef.asdf.0" : "0",
        "wef.asdf.487": "asdf.487",
        "wef.asdf.431": "asdf.431",
        "wef.487": "wef.487",
        "2wef.2asdf.431": "2asdf.431",
        "2wef.2fe.431": "2fe.431",
        "poff.gna": "poff.gna",
        "gna": "gna"
    };

    console.log(ms);
    console.log(should);
    console.log(mkNickDictFromNames(ms));
    console.log(Util.deepeq(should, mkNickDictFromNames(ms)));
};

quickAndDirtyUnitTest();

*/
