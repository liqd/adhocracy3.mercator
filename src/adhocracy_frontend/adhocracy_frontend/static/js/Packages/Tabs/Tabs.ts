/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import _ = require("lodash");

import AdhConfig = require("../Config/Config");

var pkgLocation = "/Tabs";


export interface ITabScope extends angular.IScope {
    active : boolean;
    heading : string;
    classes : string;
    select() : void;
    height : number;
}

export interface ITabsetScope extends angular.IScope {
    tabs : ITabScope[];
    fullWidth? : boolean;
    closedByDefault : boolean;
}

export class TabSetController {
    private unregister : Function;

    constructor(private $scope : ITabsetScope, private $element, private $timeout : angular.ITimeoutService) {
        this.$scope.tabs = [];
    }

    private updateTabWidth() {
        if (this.$scope.fullWidth) {
            var value = this.$scope.tabs.length;
            if (value !== 0) {
                var tabWidth = Math.floor(100 / value);
                this.$timeout(() => {
                    this.$element.find(".tab").css("width", tabWidth + "%");
                });
            }
        }
    }

    public select(selectedTab? : ITabScope) {
        _.forEach(this.$scope.tabs, (tab : ITabScope) => {
            if (tab.active && tab !== selectedTab) {
                tab.active = false;
            }
        });

        if (typeof this.unregister !== "undefined") {
            this.unregister();
        }

        if (typeof selectedTab !== "undefined") {
            selectedTab.active = true;

            this.unregister = selectedTab.$watch("height", (height) => {
                this.$element.find(".tabset-panes").css("height", height);
            });
        } else {
            this.$element.find(".tabset-panes").css("height", 0);
        }
    }

    public addTab(tab : ITabScope) {
        this.$scope.tabs.push(tab);

        // we can"t run the select function on the first tab
        // since that would select it twice
        if (this.$scope.tabs.length === 1) {
            if (!this.$scope.closedByDefault) {
                tab.active = true;
            }
        } else if (tab.active) {
            this.select(tab);
        }

        this.updateTabWidth();
    }

    public removeTab(tab : ITabScope) {
        var index = this.$scope.tabs.indexOf(tab);

        // Select a new tab if the tab to be removed is selected and not destroyed
        if (tab.active && this.$scope.tabs.length > 1) {
            // If this is the last tab, select the previous tab. else, the next tab.
            var newActiveIndex = (index === this.$scope.tabs.length - 1) ? index - 1 : index + 1;
            this.select(this.$scope.tabs[newActiveIndex]);
        }
        this.$scope.tabs.splice(index, 1);

        this.updateTabWidth();
    }
}

export var tabsetDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        scope: {
            fullWidth: "=?",
            closedByDefault: "=?"
        },
        transclude: true,
        templateUrl: adhConfig.pkg_path + pkgLocation + "/tabset.html",
        controller: ["$scope", "$element", "$timeout", TabSetController]
    };
};

export var tabDirective = (adhConfig : AdhConfig.IService) => {
    return {
        require: "^tabset",
        restrict: "E",
        transclude: true,
        templateUrl: adhConfig.pkg_path + pkgLocation + "/tab.html",
        scope: {
            active: "=?",
            heading: "@",
            classes: "@"
        },
        link: (scope : ITabScope, element, attrs, tabsetCtrl : TabSetController) => {
            scope.height = 0;
            scope.$watch(() => element.find(".tab-pane").outerHeight(), (value : number) => {
                if (value !== 0) {
                    scope.height = value;
                }
            });

            scope.select = () => {
                if (scope.active) {
                    tabsetCtrl.select();
                } else {
                    tabsetCtrl.select(scope);
                }
            };

            tabsetCtrl.addTab(scope);

            if (scope.active) {
                tabsetCtrl.select(scope);
            }

            scope.$on("$destroy", () => {
                tabsetCtrl.removeTab(scope);
            });
        }
    };
};


export var moduleName = "adhTabs";

export var register = (angular) => {
    angular
        .module(moduleName, [])
        .directive("tabset", ["adhConfig", tabsetDirective])
        .directive("tab", ["adhConfig", tabDirective]);
};
