/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import AdhComment = require("../Comment/Comment");
import AdhConfig = require("../Config/Config");
import AdhProposal = require("../Proposal/Proposal");
import AdhUser = require("../User/User");

import RIProposal = require("../../Resources_/adhocracy_mercator/resources/mercator/IMercatorProposal");

var pkgLocation = "/MercatorWorkbench";

interface IMercatorWorkbenchScope extends ng.IScope {
    path : string;
    user : AdhUser.Service;
    websocketTestPaths : string;
    contentType : string;
}

export class MercatorWorkbench {
    public static templateUrl : string = pkgLocation + "/MercatorWorkbench.html";

    public createDirective(adhConfig : AdhConfig.IService) {
        var _self = this;
        var _class = (<any>_self).constructor;

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + _class.templateUrl,
            controller: ["adhUser", "$scope", (
                adhUser : AdhUser.Service,
                $scope : IMercatorWorkbenchScope
            ) : void => {
                $scope.path = adhConfig.rest_url + adhConfig.rest_platform_path;
                $scope.contentType = RIProposal.content_type;
                $scope.user = adhUser;
                $scope.websocketTestPaths = JSON.stringify([$scope.path]);
            }]
        };
    }
}


export var moduleName = "adhMercatorWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhComment.moduleName,
            AdhProposal.moduleName,
            AdhUser.moduleName
        ])
        .directive("adhMercatorWorkbench", ["adhConfig", (adhConfig) =>
            new MercatorWorkbench().createDirective(adhConfig)]);
};
