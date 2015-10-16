import * as _ from "lodash";

import * as AdhAngularHelpersModule from "../AngularHelpers/Module";
import * as AdhBadgeModule from "../Badge/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhLocaleModule from "../Locale/Module";
import * as AdhMovingColumnsModule from "../MovingColumns/Module";
import * as AdhPermissionsModule from "../Permissions/Module";
import * as AdhResourceAreaModule from "../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhCredentialsModule from "./CredentialsModule";
import * as AdhUserModule from "./Module";

import * as AdhHttp from "../Http/Http";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

import * as AdhUserViews from "./Views";


export var moduleName = "adhUserViews";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAngularHelpersModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhCredentialsModule.moduleName,
            AdhLocaleModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhHttpModule.moduleName,
            AdhTopLevelStateModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhUserModule.moduleName
        ])
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("login", () : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/Login.html"
                    };
                })
                .when("password_reset", () : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/PasswordReset.html",
                        reverse: (data) => {
                            return {
                                path: data["_path"],
                                search: {
                                    path: data["path"]
                                }
                            };
                        }
                    };
                })
                .when("create_password_reset", () : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/CreatePasswordReset.html"
                    };
                })
                .when("register", ["adhHttp", (adhHttp : AdhHttp.Service<any>) : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/Register.html",
                        route: (path, search) => {
                            return adhHttp.options("/principals/users").then((options) => {
                                if (!options.POST) {
                                    throw 401;
                                } else {
                                    var data = _.clone(search);
                                    data["_path"] = path;
                                    return data;
                                }
                            });
                        }
                    };
                }])
                .when("activate", ["adhConfig", "adhUser", "adhDone", "$rootScope", "$location", AdhUserViews.activateArea]);
        }])
        .config(["adhResourceAreaProvider", AdhUserViews.registerRoutes()])
        .directive("adhListUsers", ["adhCredentials", "adhConfig", AdhUserViews.userListDirective])
        .directive("adhUserListItem", ["adhConfig", AdhUserViews.userListItemDirective])
        .directive("adhUserProfile", [
            "adhConfig",
            "adhCredentials",
            "adhHttp",
            "adhPermissions",
            "adhTopLevelState",
            "adhUser",
            "adhGetBadges",
            AdhUserViews.userProfileDirective])
        .directive("adhLogin", ["adhConfig", "adhUser", "adhTopLevelState", "adhPermissions", "adhShowError", AdhUserViews.loginDirective])
        .directive("adhPasswordReset", [
            "adhConfig", "adhHttp", "adhUser", "adhTopLevelState", "adhShowError", AdhUserViews.passwordResetDirective])
        .directive("adhCreatePasswordReset", [
            "adhConfig",
            "adhCredentials",
            "adhHttp",
            "adhUser",
            "adhTopLevelState",
            "adhShowError",
            AdhUserViews.createPasswordResetDirective])
        .directive("adhRegister", [
            "adhConfig", "adhCredentials", "adhUser", "adhTopLevelState", "adhShowError", AdhUserViews.registerDirective])
        .directive("adhUserIndicator", [
            "adhConfig", "adhResourceArea", "adhTopLevelState", "adhPermissions", "$location", AdhUserViews.indicatorDirective])
        .directive("adhUserMeta", ["adhConfig", "adhResourceArea", "adhGetBadges", AdhUserViews.metaDirective])
        .directive("adhUserMessage", ["adhConfig", "adhHttp", AdhUserViews.userMessageDirective])
        .directive("adhUserDetailColumn", ["adhPermissions", "adhConfig", AdhUserViews.userDetailColumnDirective])
        .directive("adhUserListingColumn", ["adhConfig", AdhUserViews.userListingColumnDirective])
        .directive("adhUserManagementHeader", ["adhConfig", AdhUserViews.adhUserManagementHeaderDirective])
        .directive("adhUserActivityOverview", ["adhConfig", "adhHttp", AdhUserViews.adhUserActivityOverviewDirective]);
};
