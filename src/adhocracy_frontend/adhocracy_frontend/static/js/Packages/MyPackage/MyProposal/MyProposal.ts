/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../../Config/Config";
import * as AdhHttp from "../../Http/Http";
import * as AdhPreliminaryNames from "../../PreliminaryNames/PreliminaryNames";

import RIProposal from "../../../Resources_/adhocracy_core/resources/proposal/IProposal";
import RIProposalVersion from "../../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";
import * as SIDescription from "../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SITitle from "../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../../Resources_/adhocracy_core/sheets/versions/IVersionable";

var pkgLocation = "/MyPackage/MyProposal";


export interface IScope extends angular.IScope {
    data : {
        title : string;
        description : string;
    };
}

export interface IFormScope extends IScope {
    poolPath : string;
    submit() : void;
}


var bindPath = (
    adhHttp : AdhHttp.Service<any>
) => (
    scope : IScope,
    pathKey : string = "path"
) => {
    scope.$watch(pathKey, (path : string) => {
        if (path) {
            adhHttp.get(path).then((resource) => {
                scope.data = {
                    title: resource.data[SITitle.nick].title,
                    description: resource.data[SIDescription.nick].description,
                };
            });
        }
    });
};

var postCreate = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    poolPath : string,
    scope : IScope
) : angular.IPromise<any> => {
    var item = new RIProposal({preliminaryNames: adhPreliminaryNames});
    item.parent = poolPath;
    var version = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
    version.parent = item.path;

    version.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [item.first_version_path]
    });
    version.data[SITitle.nick] = new SITitle.Sheet({
        title: scope.data.title
    });
    version.data[SIDescription.nick] = new SIDescription.Sheet({
        description: scope.data.description
    });

    return adhHttp.deepPost([item, version]).then((responses) => {
        var itemResponse = responses[0];
        return itemResponse.path;
    });
};


export var detailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp)(scope);
        }
    };
};

export var listItemDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        scope: {
            path: "@"
        },
        link: (scope : IScope) => {
            bindPath(adhHttp)(scope);
        }
    };
};

export var createDirective = (
    $location : angular.ILocationService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhResourceUrlFilter
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            poolPath: "@"
        },
        link: (scope : IFormScope) => {
            scope.submit = () => {
                postCreate(adhHttp, adhPreliminaryNames)(scope.poolPath, scope).then((path) => {
                    $location.path(adhResourceUrlFilter(path));
                });
            };
        }
    };
};
