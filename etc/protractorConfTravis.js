var exec = require("sync-exec");
var fs = require("fs");
var ini = require("ini");

exports.config = {
    suites: {
        mercator: "../src/mercator/mercator/tests/acceptance/*Spec.js",
        core: "../src/adhocracy_frontend/adhocracy_frontend/tests/acceptance/*Spec.js"
    },
    baseUrl: "http://localhost:9090",
    getPageTimeout: 30000,
    directConnect: true,
    capabilities: {
      "browserName": "firefox"
    },
    beforeLaunch: function() {
        exec("bin/supervisord");
        exec("bin/supervisorctl restart adhocracy_test:test_zeo test_backend_with_ws adhocracy_test:test_autobahn adhocracy_test:test_frontend");
    },
    afterLaunch: function() {
        exec("bin/supervisorctl stop adhocracy_test:test_zeo test_backend_with_ws adhocracy_test:test_autobahn adhocracy_test:test_frontend");
        exec("rm -rf var/test_zeodata/Data.fs* var/test_zeodata/blobs");
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
