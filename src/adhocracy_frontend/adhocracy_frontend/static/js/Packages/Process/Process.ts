/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import _ = require("lodash");
import AdhConfig = require("../Config/Config");
import AdhTabs = require("../Tabs/Tabs");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");

var pkgLocation = "/MeinBerlin/Kiezkassen/Context";

export class Provider implements angular.IServiceProvider {
    public templateFactories : {[processType : string]: any};
    public $get;

    constructor () {
        this.templateFactories = {};

        this.$get = ["$injector", ($injector) => {
            return new Service(this, $injector);
        }];
    }
}

export class Service {
    constructor(
        private provider : Provider,
        private $injector : angular.auto.IInjectorService
    ) {}

    public getTemplate(processType : string) : angular.IPromise<string> {
        if (!this.provider.templateFactories.hasOwnProperty(processType)) {
            throw "No template for process type \"" + processType + "\" has been configured.";
        }

        var fn = this.provider.templateFactories[processType];
        return this.$injector.invoke(fn);
    }
}

export var processViewDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhProcess : Service,
    $compile : angular.ICompileService
) => {
    return {
        restrict: "E",
        link: (scope, element) => {
            var childScope : angular.IScope;

            adhTopLevelState.on("processType", (processType) => {
                if (typeof processType !== "undefined") {
                    adhProcess.getTemplate(processType).then((template) => {
                        if (childScope) {
                            childScope.$destroy();
                        }
                        childScope = scope.$new();
                        element.html(template);
                        $compile(element.contents())(childScope);
                    });
                }
            });
        }
    };
};

export var processHeaderDirective = (adhConfig : AdhConfig.IService, $translate) => {
    return {
        restrict: "E",
        link: (scope, element) => {
            // FIXME: Dummy data
            var currentPhase = 1;
            scope.tabs = [];
            _([0, 1, 2, 3]).forEach(function(n) {
                // FIXME : lodash can probably do this much tidier
                scope.tabs[n] = {};
                scope.tabs[n].heading = $translate.instant("TR__MEINBERLIN_PHASE" + (n + 1) + "_HEADING");
                scope.tabs[n].content = $translate.instant("TR__MEINBERLIN_PHASE" + (n + 1) + "_CONTENT");
            }).value();

            scope.tabs[currentPhase].classes = "is-current-phase";
            scope.processHeader = true;
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/header.html"
    };
};

export var phasesTabsController = (scope, element, document) => {
    element.find(".tabset-panes-wrapper").height(0);
    document.on("click", ".mein-berlin-keizkassen-context-header .tab", () => {
        element.find(".tabset-panes-wrapper").height(element.find(".tabset-panes").outerHeight());
    });
    var tabsScope = element.find(".tabset-tabs").scope();
    tabsScope.processHeader = true;
};

export var moduleName = "adhProcess";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhTopLevelState.moduleName,
            AdhTabs.moduleName
        ])
        .provider("adhProcess", Provider)
        .directive("adhProcessView", ["adhTopLevelState", "adhProcess", "$compile", processViewDirective])
        .directive("adhProcessHeader", ["adhConfig", "$translate", processHeaderDirective])
        .controller("phasesTabsController", ["$scope", "$element", "$document", phasesTabsController]);
};
