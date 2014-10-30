/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import AdhComment = require("../Comment/Comment");
import AdhConfig = require("../Config/Config");
import AdhProposal = require("../Proposal/Proposal");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhUser = require("../User/User");

import RIBasicPool = require("../../Resources_/adhocracy_core/resources/pool/IBasicPool");
import RIProposal = require("../../Resources_/adhocracy_core/resources/sample_proposal/IProposal");
import RIUser = require("../../Resources_/adhocracy_core/resources/principal/IUser");
import RIUsersService = require("../../Resources_/adhocracy_core/resources/principal/IUsersService");


var pkgLocation = "/DocumentWorkbench";

interface IDocumentWorkbenchScope extends ng.IScope {
    path : string;
    user : AdhUser.Service;
    websocketTestPaths : string;
    contentType : string;
}

export class DocumentWorkbench {
    public static templateUrl : string = pkgLocation + "/DocumentWorkbench.html";

    public createDirective(adhConfig : AdhConfig.IService) {
        var _self = this;
        var _class = (<any>_self).constructor;

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + _class.templateUrl,
            controller: ["adhUser", "$scope", (
                adhUser : AdhUser.Service,
                $scope : IDocumentWorkbenchScope
            ) : void => {
                $scope.path = adhConfig.rest_url + adhConfig.rest_platform_path;
                $scope.contentType = RIProposal.content_type;
                $scope.user = adhUser;
                $scope.websocketTestPaths = JSON.stringify([$scope.path]);
            }]
        };
    }
}


export var moduleName = "adhDocumentWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhComment.moduleName,
            AdhProposal.moduleName,
            AdhResourceArea.moduleName,
            AdhUser.moduleName
        ])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .when(RIBasicPool.content_type, {
                     space: "content",
                     movingColumns: "is-show-show-hide"
                })
                .when(RIUser.content_type, {
                     space: "user",
                     movingColumns: "is-show-show-hide"
                })
                .when(RIUsersService.content_type, {
                     space: "user",
                     movingColumns: "is-show-show-hide"
                });
        }])
        .directive("adhDocumentWorkbench", ["adhConfig", (adhConfig) =>
            new DocumentWorkbench().createDirective(adhConfig)]);
};
