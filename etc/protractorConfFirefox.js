var common = require("./protractorCommon.js");

var local = {
    capabilities: {
        browserName: "firefox"
    }
};

exports.config = Object.assign({}, common.config, local);
