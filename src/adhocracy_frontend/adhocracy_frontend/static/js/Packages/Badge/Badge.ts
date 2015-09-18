/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhCredentials from "../User/Credentials";
import * as AdhHttp from "../Http/Http";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

import RIBadgeAssignment from "../../Resources_/adhocracy_core/resources/badge/IBadgeAssignment";
import * as SIBadgeable from "../../Resources_/adhocracy_core/sheets/badge/IBadgeable";
import * as SIBadgeAssignment from "../../Resources_/adhocracy_core/sheets/badge/IBadgeAssignment";
import * as SIDescription from "../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIName from "../../Resources_/adhocracy_core/sheets/name/IName";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SITitle from "../../Resources_/adhocracy_core/sheets/title/ITitle";

var pkgLocation = "/Badge";

export interface IBadge {
    title : string;
    description : string;
    name : string;
}

export interface IGetBadges {
    (resource : SIBadgeable.HasSheet) : angular.IPromise<IBadge[]>;
}

export var getBadgesFactory = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) : IGetBadges => (
    resource : SIBadgeable.HasSheet
) : angular.IPromise<IBadge[]> => {
    var assignmentPaths = resource.data[SIBadgeable.nick].assignments;

    var getBadge = (assignmentPath : string) => {
        return adhHttp.get(assignmentPath).then((assignment : RIBadgeAssignment) => {
            var badgePath = assignment.data[SIBadgeAssignment.nick].badge;
            return adhHttp.get(badgePath).then((badge) => {
                return {
                    title: badge.data[SITitle.nick].title,
                    name: badge.data[SIName.nick].name,
                    description: assignment.data[SIDescription.nick].description
                };
            });
        });
    };

    return $q.all(_.map(assignmentPaths, getBadge));
};


export var bindPath = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService,
    adhTopLevelState? : AdhTopLevelState.Service
) => (
    scope,
    pathKey? : string
) : void => {
    scope.data = {
        badge: "",
        description: ""
    };

    var getBadge = (badge) => {
        return {
            title: badge.data[SITitle.nick].title,
            path: badge.path
        };
    };

    adhHttp.get(scope.badgesPath).then((badges) => {
        var badgelist : string[] = badges.data[SIPool.nick].elements;
        $q.all(_.map(badgelist, (b) => adhHttp.get(b))).then((result) => {
            scope.badges = _.map(result, getBadge);
        });
    });

    if (typeof pathKey !== "undefined") {
        scope.$watch(pathKey, (path : string) => {
            if (path) {
                adhHttp.get(path).then((resource) => {
                    scope.resource = resource;
                    scope.badgeablePath = resource.data[SIBadgeAssignment.nick].object;
                    scope.data = {
                        description: resource.data[SIDescription.nick].description,
                        badge: resource.data[SIBadgeAssignment.nick].badge
                    };
                });
            }
        });
    }
};

export var fill = (resource, scope, userPath : string) => {
    var clone = _.cloneDeep(resource);
    clone.data[SIDescription.nick] = {
        description: scope.data.description
    };
    clone.data[SIBadgeAssignment.nick] = {
        badge : scope.data.badge,
        object : scope.badgeablePath,
        subject : userPath
    };
    return clone;
};

export var badgeAssignmentCreateDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService,
    adhCredentials : AdhCredentials.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Assignment.html",
        scope: {
            badgesPath: "@",
            poolPath: "@",
            badgeablePath: "@"
        },
        link: (scope, element) => {
            bindPath(adhHttp, $q)(scope);

            scope.submit = () => {
                var postdata = {
                    content_type: RIBadgeAssignment.content_type,
                    data: {}
                };
                return adhHttp.post(scope.poolPath, fill(postdata, scope, adhCredentials.userPath));
            };
        }
    };
};

export var badgeAssignmentEditDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService,
    adhCredentials : AdhCredentials.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Assignment.html",
        scope: {
            path: "@",
            badgesPath: "@"
        },
        link: (scope, element) => {
            bindPath(adhHttp, $q)(scope, "path");

            scope.submit = () => {
                var resource = scope.resource;
                return adhHttp.put(resource.path, fill(resource, scope, adhCredentials.userPath));
            };
        }
    };
};

export var badgeAssignmentEditInlineDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService,
    adhCredentials : AdhCredentials.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/AssignmentInline.html",
        scope: {
            path: "@"
        },
        link: (scope, element) => {
            var processUrl = adhTopLevelState.get("processUrl");
            adhHttp.get(processUrl).then((resource) => {
                scope.badgesPath = resource.data["adhocracy_core.sheets.badge.IHasBadgesPool"].badges_pool;
                scope.badgeablePath = scope.path;
                bindPath(adhHttp, $q)(scope, "path");
            });

            scope.submit = () => {
                var resource = scope.resource;
                return adhHttp.put(resource.path, fill(resource, scope, adhCredentials.userPath));
            };
        }
    };
};
