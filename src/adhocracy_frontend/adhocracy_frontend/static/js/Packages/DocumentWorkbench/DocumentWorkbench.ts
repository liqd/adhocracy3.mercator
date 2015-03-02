/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import AdhComment = require("../Comment/Comment");
import AdhConfig = require("../Config/Config");
import AdhMovingColumns = require("../MovingColumns/MovingColumns");
import AdhProposal = require("../Proposal/Proposal");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhUser = require("../User/User");

import RIBasicPool = require("../../Resources_/adhocracy_core/resources/pool/IBasicPool");
import RIProposal = require("../../Resources_/adhocracy_core/resources/sample_proposal/IProposal");
import RIProposalVersion = require("../../Resources_/adhocracy_core/resources/sample_proposal/IProposalVersion");
import RIUser = require("../../Resources_/adhocracy_core/resources/principal/IUser");
import RIUsersService = require("../../Resources_/adhocracy_core/resources/principal/IUsersService");


var pkgLocation = "/DocumentWorkbench";

interface IDocumentWorkbenchScope extends ng.IScope {
    path : string;
    user : AdhUser.Service;
    websocketTestPaths : string;
    contentType : string;
}

export var documentWorkbench = (
    adhConfig : AdhConfig.IService
    adhUser : AdhUser.Service,
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/DocumentWorkbench.html",
        link: (scope : IDocumentWorkbenchScope) => {
            scope.path = adhConfig.rest_url + adhConfig.rest_platform_path;
            scope.contentType = RIProposal.content_type;
            scope.user = adhUser;
            scope.websocketTestPaths = JSON.stringify([scope.path]);
        }]
    };
};


export var moduleName = "adhDocumentWorkbench";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhComment.moduleName,
            AdhMovingColumns.moduleName,
            AdhProposal.moduleName,
            AdhResourceArea.moduleName,
            AdhUser.moduleName
        ])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .default(RIBasicPool.content_type, "", {
                    space: "content",
                    movingColumns: "is-show-show-hide",
                    content2Url: ""
                })
                .default(RIProposalVersion.content_type, "", {
                    space: "content",
                    movingColumns: "is-collapse-show-show"
                })
                .specific(RIProposalVersion.content_type, "", () => (resource : RIProposalVersion) => {
                    return {
                        content2Url: resource.path
                    };
                })
                .default(RIUser.content_type, "", {
                    space: "user",
                    movingColumns: "is-show-show-hide"
                })
                .default(RIUsersService.content_type, "", {
                    space: "user",
                    movingColumns: "is-show-show-hide"
                });
        }])
        .directive("adhDocumentWorkbench", ["adhConfig", "adhUser", documentWorkbench]);
};
