import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUtil = require("../Util/Util");


export interface Dict {
    [key : string]: string;
}


export class Provider implements ng.IServiceProvider {
    public $get;
    private data : {[resourceType : string]: Dict};

    constructor() {
        var self = this;
        this.data = {};
        this.$get = ["adhHttp", "adhConfig", (adhHttp, adhConfig) => new Service(self, adhHttp, adhConfig)];
    }

    public when(resourceType : string, defaults : Dict) : Provider {
        this.data[resourceType] = defaults;
        return this;
    }

    public get(resourceType : string) : Dict {
        return _.clone(this.data[resourceType]);
    }
}


export class Service implements AdhTopLevelState.IAreaInput {
    public template : string = "<adh-page-wrapper><adh-platform></adh-platform></adh-page-wrapper>";

    constructor(
        private provider : Provider,
        private adhHttp : AdhHttp.Service<any>,
        private adhConfig : AdhConfig.IService
    ) {}

    /**
     * Convert (ng) location to (a3 top-level) state: Take a path and
     * a search query dictionary, and promise a state dictionary that
     * can be sored stored in a 'TopLevelState'.
     *
     * This is the reverse of 'this.reverse'.
     */
    public route(path : string, search : Dict) : ng.IPromise<Dict> {
        var self : Service = this;
        var resourceUrl = this.adhConfig.rest_url + path;

        return this.adhHttp.get(resourceUrl).then((resource) => {
            var data = self.provider.get(resource.content_type);
            var segs : string[] = path.replace(/\/+$/, "").split("/");

            if (segs.length < 2 || segs[0] !== "") {
                throw "bad path: " + path;
            }

            data["platform"] = segs[1];

            // if path contains more than just the platform
            if (segs.length > 2) {
                data["content2Url"] = this.adhConfig.rest_url;

                // if path has a view segment
                if (_.last(segs).match(/^@/)) {
                    data["view"] = segs.pop().replace(/^@/, "");
                    data["content2Url"] += AdhUtil.intercalate(segs, "/");
                } else {
                    data["content2Url"] += AdhUtil.intercalate(segs, "/");
                }
            }

            for (var key in search) {
                if (search.hasOwnProperty(key)) {
                    data[key] = search[key];
                }
            }
            return data;
        });
    }

    /**
     * Convert (a3 top-level) state to (ng) location: Take a
     * 'TopLevelState' and return a path and a search query
     * dictionary.
     *
     * This is the reverse of 'this.route'.
     */
    public reverse(data : Dict) : { path : string; search : Dict; } {
        var defaults = {
            space: "content",
            movingColumns: "is-show-show-hide"
        };

        var path;

        if (data["content2Url"]) {
            path = data["content2Url"].replace(this.adhConfig.rest_url, "");
        } else {
            path = "/" + data["platform"];
        }

        if (data["view"]) {
            path += "/@" + data["view"];
        }

        return {
            path: path,
            search: _.transform(data, (result, value : string, key : string) => {
                if (defaults.hasOwnProperty(key) && value !== defaults[key]) {
                    result[key] = value;
                }
            })
        };
    }
}


export var platformDirective = (adhTopLevelState : AdhTopLevelState.Service) => {
    return {
        template:
            "<div data-ng-switch=\"platform\">" +
            "<div data-ng-switch-when=\"adhocracy\"><adh-document-workbench></div>" +
            // FIXME: move mercator specifics away
            "<div data-ng-switch-when=\"mercator\"><adh-mercator-workbench></div>" +
            "</div>",
        restrict: "E",
        link: (scope, element) => {
            adhTopLevelState.on("platform", (value : string) => {
                scope.platform = value;
            });
        }
    };
};


export var moduleName = "adhResourceArea";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
            AdhTopLevelState.moduleName
        ])
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("r", ["adhResourceArea", (adhResourceArea : Service) => adhResourceArea]);
        }])
        .directive("adhPlatform", ["adhTopLevelState", platformDirective])
        .provider("adhResourceArea", Provider);
};
