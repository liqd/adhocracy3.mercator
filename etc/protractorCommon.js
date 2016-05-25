var exec = require("sync-exec");
var fs = require("fs");
var ini = require("ini");

exports.config = {
    getPageTimeout: 30000,
    directConnect: true,
    suites: {
        // FIXME: mercator tests fail on travis
        //current: "../src/current/current/tests/acceptance/*Spec.js",
        core: "../src/adhocracy_frontend/adhocracy_frontend/tests/acceptance/*Spec.js"
    },
    baseUrl: "http://localhost:9090",
    beforeLaunch: function() {
        exec("bin/supervisord");
        exec("bin/supervisorctl restart  adhocracy_test:test_zeo test_backend_with_ws adhocracy_test:test_autobahn adhocracy_test:test_frontend");
        exec("src/current/current/tests/acceptance/setup_tests.sh");
    },
    afterLaunch: function() {
        exec("bin/supervisorctl stop adhocracy_test:test_zeo test_backend_with_ws adhocracy_test:test_autobahn adhocracy_test:test_frontend");
        exec("rm -rf var/db/test/Data.fs* var/db/test/blobs/* var/mail/new/* ");
    },
    onPrepare: function() {
        var getMailQueuePath = function() {
            var testConf = ini.parse(fs.readFileSync("etc/test_with_ws.ini", "utf-8"));
            return testConf["app:main"]["mail.queue_path"]
                   .replace("%(here)s", process.cwd() + "/etc");
        };

        browser.params.mail = {
            queue_path: getMailQueuePath()
        }
    },
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 30000,
        isVerbose: true,
        includeStackTrace: true
    }
}
