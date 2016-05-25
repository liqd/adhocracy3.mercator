var exec = require("sync-exec");
var fs = require("fs");
var ini = require("ini");
var pr = process.env.TRAVIS_PULL_REQUEST;
var name = ((pr === "false") ? "" : "#" + pr + " ") + process.env.TRAVIS_COMMIT;

exports.config = {
    suites: {
        // FIXME: mercator tests fail on travis
        //current: "../src/current/current/tests/acceptance/*Spec.js",
        core: "../src/adhocracy_frontend/adhocracy_frontend/tests/acceptance/*Spec.js"
    },
    baseUrl: "http://localhost:9090",
    sauceUser: "liqd",
    sauceKey: "77600374-1617-4d7b-b1b6-9fd82ddfe89c",

    capabilities: {
        browserName: "chrome",
        "tunnel-identifier": process.env.TRAVIS_JOB_NUMBER,
        build: process.env.TRAVIS_BUILD_NUMBER,
        name: name
    },
    beforeLaunch: function() {
        exec("bin/supervisord");
        exec("bin/supervisorctl restart adhocracy_test:");
        exec("src/current/current/tests/acceptance/setup_test.sh");
    },
    afterLaunch: function() {
        exec("bin/supervisorctl stop adhocracy_test:");
        exec("rm -rf var/db/test/Data.fs* var/db/test/blobs/* var/mail/new/* ");
    },
    onPrepare: function() {
        var getMailQueuePath = function() {
            var testConf = ini.parse(fs.readFileSync("etc/test.ini", "utf-8"));
            return testConf["app:main"]["mail.queue_path"]
                   .replace("%(here)s", process.cwd() + "/etc");
        };

        browser.params.mail = {
            queue_path: getMailQueuePath()
        }
    },
    getPageTimeout: 30000,
    framework: "jasmine",
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 60000,
        isVerbose: true,
        includeStackTrace: true
    }
}
