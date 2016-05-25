var pr = process.env.TRAVIS_PULL_REQUEST;
var name = ((pr === "false") ? "" : "#" + pr + " ") + process.env.TRAVIS_COMMIT;

var common = require("./protractorCommon.js");

var local = {
    sauceUser: "liqd",
    sauceKey: "77600374-1617-4d7b-b1b6-9fd82ddfe89c",

    capabilities: {
        "browserName": "chrome",
        "tunnel-identifier": process.env.TRAVIS_JOB_NUMBER,
        "build": process.env.TRAVIS_BUILD_NUMBER,
        "name": name
    },
    allScriptsTimeout: 21000,
    getPageTimeout: 20000,
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 120000,
        isVerbose: true,
        includeStackTrace: true
    }
};

exports.config = Object.assign({}, common.config, local);
