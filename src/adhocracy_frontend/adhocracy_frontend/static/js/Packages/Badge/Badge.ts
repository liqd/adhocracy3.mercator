/// <reference path="../../../lib2/types/angular.d.ts"/>
/// <reference path="../../../lib2/types/lodash.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhCredentials from "../User/Credentials";
import * as AdhHttp from "../Http/Http";
import * as AdhListing from "../Listing/Listing";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhUtil from "../Util/Util";

import RIBadgeAssignment from "../../Resources_/adhocracy_core/resources/badge/IBadgeAssignment";
import * as SIBadge from "../../Resources_/adhocracy_core/sheets/badge/IBadge";
import * as SIBadgeable from "../../Resources_/adhocracy_core/sheets/badge/IBadgeable";
import * as SIBadgeAssignment from "../../Resources_/adhocracy_core/sheets/badge/IBadgeAssignment";
import * as SIDescription from "../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIName from "../../Resources_/adhocracy_core/sheets/name/IName";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SITitle from "../../Resources_/adhocracy_core/sheets/title/ITitle";

var pkgLocation = "/Badge";

export interface IBadgeAssignment {
    title : string;
    description : string;
    name : string;
    path : string;
    badgePath : string;
}

export interface IGetBadgeAssignments {
    (resource : SIBadgeable.HasSheet) : angular.IPromise<IBadgeAssignment[]>;
}

export interface IBadge {
    name : string;
    title? : string;
    path : string;
    groups? : string[];
}

export interface IBadgeGroup {
    name : string;
    title : string;
    path : string;
}

var extractBadge = (badge) : IBadge => {
    return {
        name: badge.data[SIName.nick].name,
        title: badge.data[SITitle.nick].title,
        path: badge.path,
        groups: badge.data[SIBadge.nick].groups
    };
};

var extractGroup = (group) : IBadgeGroup => {
    return {
        name: group.data[SIName.nick].name,
        title: group.data[SITitle.nick].title,
        path: group.path
    };
};

var collectBadgesByGroup = (groupPaths, badges) => {
    var badgesByGroup = {};
    _.forEach(groupPaths, (groupPath) => {
        badgesByGroup[groupPath] = [];
        _.forOwn(badges, (badge) => {
            if (_.includes(badge.groups, groupPath)) {
                badgesByGroup[groupPath].push(badge);
            }
        });
    });
    return badgesByGroup;
};

var createBadgeFacets = (badgeGroups, badges) : AdhListing.IFacetItem[] => {
    var groupPaths = _.map(badgeGroups, "path");
    var badgesByGroup = collectBadgesByGroup(groupPaths, badges);
    return _.map(badgeGroups, (group : any) => {
        return {
            key: "badge",
            name: group.title,
            items: _.map(badgesByGroup[group.path], (badge : any) => {
                return {
                    key: badge.name,
                    name: badge.title
                };
            })
        };
    });
};

export var getBadgeFacets = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) => (
    path : string
) : angular.IPromise<AdhListing.IFacetItem[]> => {
        var httpMap = (paths : string[], fn) : angular.IPromise<any[]> => {
            return $q.all(_.map(paths, (path) => {
                return adhHttp.get(path).then(fn);
            }));
        };

        var params = {
            elements: "content",
            depth: 4,
            content_type: SIBadge.nick
        };

        return adhHttp.get(path, params).then((response) => {
            var badgePaths = <string[]>_.map(response.data[SIPool.nick].elements, "path");
            return httpMap(badgePaths, extractBadge).then((badges) => {
                var groupPaths = _.union.apply(_, _.map(badges, "groups"));
                return httpMap(groupPaths, extractGroup).then((badgeGroups) => {
                    return createBadgeFacets(badgeGroups, badges);
                });
            });
        });
    };

export var getBadgesFactory = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) : IGetBadgeAssignments => (
    resource : SIBadgeable.HasSheet,
    includeParent? : boolean
) : angular.IPromise<IBadgeAssignment[]> => {
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
                    path: assignmentPath,
                    badgePath: badgePath
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

var bindPath = (
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    $q : angular.IQService
) => (
    scope
) : void => {
    scope.data = {
        badge: "",
        description: ""
    };

    var getAssignableBadges = (rawOptions) : angular.IPromise<any> => {
        if (!rawOptions) {
            return $q.when();
        }

        var requestBodyOptions : {content_type : string}[] = AdhUtil.deepPluck(rawOptions, [
            "data", "POST", "request_body"
        ]);

        var assignableBadgeOptions = _.find(
            requestBodyOptions,
            (body) => body.content_type === RIBadgeAssignment.content_type);

        var assignableBadgePaths : string[] = AdhUtil.deepPluck(assignableBadgeOptions, [
            "data", SIBadgeAssignment.nick, "badge"
        ]);

        return $q.all(_.map(assignableBadgePaths, (b) => adhHttp.get(b).then(extractBadge))).then((badges : any) => {
            scope.badges = _.keyBy(badges, "path");
            var groupPaths : string[]  = _.union.apply(_, _.map(badges, "groups"));
            return $q.all(_.map(groupPaths, (g) => adhHttp.get(g))).then((result) => {
                scope.badgeGroups = _.keyBy(_.map(result, extractGroup), "path");
                scope.badgesByGroup = collectBadgesByGroup(groupPaths, badges);
            });
        });
    };

    adhPermissions.bindScope(scope, scope.poolPath, "rawOptions", {importOptions: false});
    scope.$watch("rawOptions", getAssignableBadges);
};


export var badgeAssignment = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    $q : angular.IQService,
    adhCredentials : AdhCredentials.Service,
    adhGetBadges
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Assignment.html",
        scope: {
            modals: "=",
            path: "@",
            showDescription: "=?"
        },
        link: (scope) => {
            scope.badgeablePath = scope.path;
            scope.data = {};

            adhHttp.get(scope.path).then((proposal) => {
                scope.poolPath = proposal.data[SIBadgeable.nick].post_pool;

                return adhGetBadges(proposal).then((assignments : IBadgeAssignment[]) => {

                    bindPath(adhHttp, adhPermissions, $q)(scope);

                    adhHttp.get(scope.badgeablePath).then((proposal) => {
                        scope.poolPath = proposal.data[SIBadgeable.nick].post_pool;

                        scope.assignments = _.keyBy(assignments, "badgePath");
                        // The following object only contains the current assignments. In order to render the badge
                        // assignment UI, Assignment.html iterates over the available badges, though,
                        // and gives them the value checkboxes[badgePath], which is parsed to false when undefined.
                        scope.checkboxes = _.mapValues(scope.assignments, (v) => true);
                    });

                    scope.submit = () => {
                        adhHttp.withTransaction((transaction) => {
                            _.forOwn(scope.checkboxes, (checked, badgePath) => {
                                var assignmentExisted = scope.assignments.hasOwnProperty(badgePath);
                                if (checked && !assignmentExisted) {
                                    var assignment = new RIBadgeAssignment({ preliminaryNames : adhPreliminaryNames });
                                    assignment.data[SIBadgeAssignment.nick] = {
                                        badge: badgePath,
                                        object: scope.badgeablePath,
                                        subject: adhCredentials.userPath
                                    };
                                    transaction.post(scope.poolPath, assignment);
                                } else if (!checked && assignmentExisted) {
                                    transaction.delete(scope.assignments[badgePath].path);
                                }
                            });

                            return transaction.commit()
                                .then((responses) => {
                                    scope.modals.hideModal("badges");
                                    scope.modals.alert("TR__BADGE_ASSIGNMENT_UPDATED", "success");
                                }, (response) => {
                                    scope.serverError = response[0].description;
                                });
                        });
                    };

                    scope.cancel = () => {
                        scope.modals.hideModal("badges");
                    };
                });
            });

        }
    };
};
