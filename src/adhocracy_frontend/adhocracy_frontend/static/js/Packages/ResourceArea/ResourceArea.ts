import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUtil = require("../Util/Util");

import RIMercatorProposalVersion = require("../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposalVersion");
import RICommentVersion = require("../../Resources_/adhocracy_core/resources/comment/ICommentVersion");

import SIMercatorSubResources = require("../../Resources_/adhocracy_mercator/sheets/mercator/IMercatorSubResources");
import SIComment = require("../../Resources_/adhocracy_core/sheets/comment/IComment");


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

    public whenView(resourceType : string, view : string, defaults : Dict) : Provider {
        this.data[resourceType + "@" + view] = defaults;
        return this;
    }

    public get(resourceType : string, view? : string) : Dict {
        var defaults = _.clone(this.data[resourceType]);
        if (typeof view !== "undefined") {
            defaults = <Dict>_.extend(defaults, this.data[resourceType + "@" + view]);
        }
        return defaults;
    }
}


export class Service implements AdhTopLevelState.IAreaInput {
    public template : string = "<adh-page-wrapper><adh-platform></adh-platform></adh-page-wrapper>";

    constructor(
        private provider : Provider,
        private adhHttp : AdhHttp.Service<any>,
        private adhConfig : AdhConfig.IService
    ) {}

    public route(path : string, search : Dict) : ng.IPromise<Dict> {
        var self : Service = this;
        var segs : string[] = path.replace(/\/+$/, "").split("/");

        if (segs.length < 2 || segs[0] !== "") {
            throw "bad path: " + path;
        }

        var view : string;

        // if path has a view segment
        if (_.last(segs).match(/^@/)) {
            view = segs.pop().replace(/^@/, "");
        }

        var data : Dict = {};
        var resourceUrl : string = this.adhConfig.rest_url + segs.join("/");

        return this.adhHttp.get(resourceUrl)
            .then((resource) => {
                data = self.provider.get(resource.content_type, view);

                data["platform"] = segs[1];
                data["view"] = view;

                if (data["platform"] === "mercator") {
                    if (resource.content_type === RIMercatorProposalVersion.content_type) {
                        data["proposalUrl"] = resourceUrl;

                        if (view === "comments") {
                            if (typeof search["section"] !== "undefined") {
                                data["commentableUrl"] = resource.data[SIMercatorSubResources.nick][search["section"]];
                            } else {
                                data["commentableUrl"] = resource.path;
                            }
                        }
                    } else if (resource.content_type === RICommentVersion.content_type) {
                        data["commentUrl"] = resourceUrl;
                        data["commentableUrl"] = resource.data[SIComment.nick].refers_to;

                        return self.adhHttp.get(data["commentableUrl"]).then((commentable) => {
                            if (commentable.content_type === RIMercatorProposalVersion) {
                                data["proposalUrl"] = data["commentableUrl"];
                            } else {
                                var subResourceUrl = AdhUtil.parentPath(data["commentableUrl"]);
                                var proposalItemUrl = AdhUtil.parentPath(subResourceUrl);
                                return self.adhHttp.getNewestVersionPathNoFork(proposalItemUrl).then((proposalUrl) => {
                                    data["proposalUrl"] = proposalUrl;
                                });
                            }
                        });
                    }
                } else {
                    if (segs.length > 2) {
                        data["content2Url"] = resourceUrl;
                    }
                }
            })
            .then(() => {
                for (var key in search) {
                    if (search.hasOwnProperty(key)) {
                        data[key] = search[key];
                    }
                }
                return data;
            });
    }

    public reverse(data : Dict) : { path : string; search : Dict; } {
        var defaults = {
            space: "content",
            movingColumns: "is-show-show-hide",
            section: undefined
        };

        var path : string;

        if (data["platform"] === "mercator") {
            if (typeof data["commentUrl"] !== "undefined") {
                path = data["commentUrl"].replace(this.adhConfig.rest_url, "");
            } else if (typeof data["proposalUrl"] !== "undefined") {
                path = data["proposalUrl"].replace(this.adhConfig.rest_url, "");
            } else {
                path = "/" + data["platform"];
            }
        } else {
            if (data["content2Url"]) {
                path = data["content2Url"].replace(this.adhConfig.rest_url, "");
            } else {
                path = "/" + data["platform"];
            }
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


export var resourceUrl = (adhConfig : AdhConfig.IService) => {
    return (path : string, view? : string) => {
        if (typeof path !== "undefined") {
            var url = "/r" + path.replace(adhConfig.rest_url, "");
            if (typeof view !== "undefined") {
                url += "/@" + view;
            }
            return url;
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
        .provider("adhResourceArea", Provider)
        .filter("adhResourceUrl", ["adhConfig", resourceUrl]);
};
