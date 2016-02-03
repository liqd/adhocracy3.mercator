/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhCredentials from "../User/Credentials";
import * as AdhHttp from "../Http/Http";
import * as AdhMovingColumns from "../MovingColumns/MovingColumns";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import RIBadgeAssignment from "../../Resources_/adhocracy_core/resources/badge/IBadgeAssignment";
import * as SIBadgeable from "../../Resources_/adhocracy_core/sheets/badge/IBadgeable";
import * as SIBadgeAssignment from "../../Resources_/adhocracy_core/sheets/badge/IBadgeAssignment";
import * as SIDescription from "../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIHasBadgesPool from "../../Resources_/adhocracy_core/sheets/badge/IHasBadgesPool";
import * as SIName from "../../Resources_/adhocracy_core/sheets/name/IName";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SITitle from "../../Resources_/adhocracy_core/sheets/title/ITitle";

var pkgLocation = "/Badge";

export interface IBadge {
    title : string;
    description : string;
    name : string;
    path : string;
}

export interface IGetBadges {
    (resource : SIBadgeable.HasSheet) : angular.IPromise<IBadge[]>;
}

export var getBadgesFactory = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) : IGetBadges => (
    resource : SIBadgeable.HasSheet,
    includeParent? : boolean
) : angular.IPromise<IBadge[]> => {
    if (typeof includeParent === "undefined") {
        includeParent = !!resource.content_type.match(/Version$/);
    }

    var assignmentPaths = resource.data[SIBadgeable.nick].assignments;

    var getBadge = (assignmentPath : string) => {
        return adhHttp.get(assignmentPath).then((assignment : RIBadgeAssignment) => {
            var badgePath = assignment.data[SIBadgeAssignment.nick].badge;
            return adhHttp.get(badgePath).then((badge) => {
                return {
                    title: badge.data[SITitle.nick].title,
                    name: badge.data[SIName.nick].name,
                    description: assignment.data[SIDescription.nick].description,
                    path: assignmentPath
                };
            });
        });
    };

    if (includeParent) {
        var parentPath = AdhUtil.parentPath(resource.path);

        return adhHttp.get(parentPath).then((parentResource) => {
            var parentAssignments = parentResource.data[SIBadgeable.nick].assignments;
            assignmentPaths = assignmentPaths.concat(parentAssignments);
            return $q.all(_.map(assignmentPaths, getBadge));
        });
    } else {
        return $q.all(_.map(assignmentPaths, getBadge));
    }
};


export var bindPath = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
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
    } else {
        adhHttp.get(scope.badgeablePath).then((badgeable) => {
            scope.poolPath = badgeable.data[SIBadgeable.nick].post_pool;
        });
    }
};

export var fill = (resource, scope, userPath : string) => {
    var clone = _.cloneDeep(resource);
    clone.data[SIDescription.nick] = {
        description: scope.data.description
    };
    clone.data[SIBadgeAssignment.nick] = {
        badge: scope.data.badge,
        object: scope.badgeablePath,
        subject: userPath
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
            badgeablePath: "@",
            showDescription: "=?",
            onSubmit: "=?",
            onCancel: "=?"
        },
        link: (scope, element) => {
            bindPath(adhHttp, $q)(scope);

            scope.submit = () => {
                var postdata = {
                    content_type: RIBadgeAssignment.content_type,
                    data: {}
                };
                return adhHttp.post(scope.poolPath, fill(postdata, scope, adhCredentials.userPath))
                    .then((response) => {
                        scope.serverError = null;
                        if (scope.onSubmit) {
                            scope.onSubmit();
                        }
                    }, (response) => {
                        scope.serverError = response[0].description;
                    });
            };

            scope.cancel = () => {
                if (scope.onCancel) {
                    scope.onCancel();
                }
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
            badgesPath: "@",
            showDescription: "=?",
            onSubmit: "=?",
            onCancel: "=?"
        },
        link: (scope, element) => {
            bindPath(adhHttp, $q)(scope, "path");

            scope.delete = () => {
                return adhHttp.delete(scope.path, RIBadgeAssignment.content_type)
                    .then(() => {
                        scope.serverError = null;
                        if (scope.onSubmit) {
                            scope.onSubmit();
                        }
                    }, (response) => {
                        scope.serverError = response[0].description;
                    });
            };

            scope.submit = () => {
                var resource = scope.resource;
                return adhHttp.put(resource.path, fill(resource, scope, adhCredentials.userPath))
                    .then((response) => {
                        scope.serverError = null;
                        if (scope.onSubmit) {
                            scope.onSubmit();
                        }
                    }, (response) => {
                        scope.serverError = response[0].description;
                    });
            };

            scope.cancel = () => {
                if (scope.onCancel) {
                    scope.onCancel();
                }
            };
        }
    };
};

export var badgeAssignmentDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Wrapper.html",
        require: "^adhMovingColumn",
        scope: {
            path: "@",
            showDescription: "=?",
            onSubmit: "=?",
            onCancel: "=?"
        },
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            scope.badgeablePath = scope.path;
            scope.data = {};

            var processUrl = adhTopLevelState.get("processUrl");
            var promise1 = adhHttp.get(processUrl).then((resource) => {
                scope.badgesPath = resource.data[SIHasBadgesPool.nick].badges_pool;
            });

            var promise2 = adhHttp.get(scope.path).then((proposal) => {
                return adhGetBadges(proposal).then((assignments : IBadge[]) => {
                    scope.assignments = assignments;
                });
            });

            $q.all([promise1, promise2]).then(() => {
                scope.ready = true;
            });

            scope.submit = () => {
                column.hideOverlay("badges");
                column.alert("TR__BADGE_ASSIGNMENT_UPDATED", "success");
                if (scope.onSubmit) {
                    scope.onSubmit();
                }
            };

            scope.cancel = () => {
                column.hideOverlay("badges");
                if (scope.onCancel) {
                    scope.onCancel();
                }
            };
        }
    };
};
