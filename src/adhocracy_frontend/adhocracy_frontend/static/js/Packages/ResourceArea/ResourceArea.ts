import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");


export interface Dict {
    [key : string]: string;
}


export class Provider implements ng.IServiceProvider {
    public $get;
    private data : {[resourceType : string]: Dict};
    private template : string;

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

    public getTemplate() : string {
        return this.template;
    }

    public setTemplate(template : string) : void {
        this.template = template;
    }
}


export class Service implements AdhTopLevelState.IAreaInput {
    public template : string;

    constructor(
        private provider : Provider,
        private adhHttp : AdhHttp.Service<any>,
        private adhConfig : AdhConfig.IService
    ) {
        this.template = this.provider.getTemplate();
        if (typeof this.template === "undefined") {
            throw "please set a template for ResourceArea.";
        }
    }

    public route(path : string, search : Dict) : ng.IPromise<Dict> {
        var self : Service = this;
        var resourceUrl = this.adhConfig.rest_url + path;

        return this.adhHttp.get(resourceUrl).then((resource) => {
            var data = self.provider.get(resource.content_type);

            for (var key in search) {
                if (search.hasOwnProperty(key)) {
                    data[key] = search[key];
                }
            }
            return data;
        });
    }

    public reverse(data : Dict) {
        var defaults = {
            space: "content",
            movingColumns: "is-show-show-hide",
            content2Url: ""
        };

        return {
            path: "/adhocracy",
            search: _.transform(data, (result, value : string, key : string) => {
                if (defaults.hasOwnProperty(key) && value !== defaults[key]) {
                    result[key] = value;
                }
            })
        };
    }
}


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
        .provider("adhResourceArea", Provider);
};
