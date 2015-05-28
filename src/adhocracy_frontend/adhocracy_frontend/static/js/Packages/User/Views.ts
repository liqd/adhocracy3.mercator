import AdhAngularHelpers = require("../AngularHelpers/AngularHelpers");
import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhLocale = require("../Locale/Locale");
import AdhMovingColumns = require("../MovingColumns/MovingColumns");
import AdhPermissions = require("../Permissions/Permissions");
import AdhResourceArea = require("../ResourceArea/ResourceArea");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");

import AdhCredentials = require("./Credentials");
import AdhUser = require("./User");

import RIUser = require("../../Resources_/adhocracy_core/resources/principal/IUser");
import RIUsersService = require("../../Resources_/adhocracy_core/resources/principal/IUsersService");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");

var pkgLocation = "/User";


export interface IScopeLogin extends angular.IScope {
    user : AdhUser.Service;
    loginForm : angular.IFormController;
    credentials : {
        nameOrEmail : string;
        password : string;
    };
    errors : string[];
    supportEmail : string;

    resetCredentials : () => void;
    cancel : () => void;
    logIn : () => angular.IPromise<void>;
    showError;
}


export interface IScopeRegister extends angular.IScope {
    registerForm : angular.IFormController;
    input : {
        username : string;
        email : string;
        password : string;
        passwordRepeat : string;
    };
    loggedIn : boolean;
    userName : string;
    siteName : string;
    termsUrl : string;
    errors : string[];
    supportEmail : string;
    success : boolean;

    register : () => angular.IPromise<void>;
    cancel : () => void;
    showError;
    logOut : () => void;
    goBack : () => void;
}


var bindServerErrors = (
    $scope : {errors : string[]},
    errors : AdhHttp.IBackendErrorItem[]
) => {
    $scope.errors = [];
    if (!errors.length) {
        $scope.errors.push("Unknown error from server (no details provided)");
    } else {
        errors.forEach((e) => {
            $scope.errors.push(e.description);
        });
    }
};


export var activateArea = (
    adhConfig : AdhConfig.IService,
    adhUser : AdhUser.Service,
    adhDone,
    $scope,
    $location : angular.ILocationService
) : AdhTopLevelState.IAreaInput => {
    $scope.translationData = {
        supportEmail: adhConfig.support_email
    };
    $scope.success = false;
    $scope.ready = false;
    $scope.siteName = adhConfig.site_name;

    var key = $location.path().split("/")[2];
    var path = "/activate/" + key;

    adhUser.activate(path)
        .then(() => {
            $scope.success = true;
        })
        .finally(() => {
            $scope.ready = true;
            adhDone();
        });

    return {
        templateUrl: "/static/js/templates/Activation.html"
    };
};


export var loginDirective = (
    adhConfig : AdhConfig.IService,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Login.html",
        scope: {},
        link: (scope : IScopeLogin) => {
            scope.errors = [];
            scope.supportEmail = adhConfig.support_email;
            scope.showError = adhShowError;

            scope.credentials = {
                nameOrEmail: "",
                password: ""
            };

            scope.resetCredentials = () => {
                scope.credentials.nameOrEmail = "";
                scope.credentials.password = "";
            };

            scope.cancel = () => {
                 adhTopLevelState.redirectToCameFrom("/");
            };

            scope.logIn = () => {
                return adhUser.logIn(
                    scope.credentials.nameOrEmail,
                    scope.credentials.password
                ).then(() => {
                    adhTopLevelState.redirectToCameFrom("/");
                }, (errors) => {
                    bindServerErrors(scope, errors);
                    scope.credentials.password = "";
                });
            };
        }
    };
};


export var registerDirective = (
    adhConfig : AdhConfig.IService,
    adhCredentials : AdhCredentials.Service,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Register.html",
        scope: {},
        link: (scope : IScopeRegister) => {
            scope.siteName = adhConfig.site_name;
            scope.termsUrl = adhConfig.terms_url;
            scope.showError = adhShowError;

            scope.logOut = () => {
                adhUser.logOut();
            };

            scope.$watch(() => adhCredentials.loggedIn, (value) => {
                scope.loggedIn = value;
            });

            scope.$watch(() => adhUser.data, (value) => {
                if (value) {
                    scope.userName = value.name;
                }
            });

            scope.input = {
                username: "",
                email: "",
                password: "",
                passwordRepeat: ""
            };

            scope.cancel = scope.goBack = () => {
                 adhTopLevelState.redirectToCameFrom("/");
            };


            scope.errors = [];
            scope.supportEmail = adhConfig.support_email;

            scope.register = () : angular.IPromise<void> => {
                return adhUser.register(scope.input.username, scope.input.email, scope.input.password, scope.input.passwordRepeat)
                    .then((response) => {
                        scope.errors = [];
                        scope.success = true;
                    }, (errors) => bindServerErrors(scope, errors));
            };
        }
    };
};

export var passwordResetDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/PasswordReset.html",
        scope: {},
        link: (scope) => {
            scope.showError = adhShowError;
            scope.success = false;
            scope.siteName = adhConfig.site_name;

            scope.input = {
                password: "",
                passwordRepeat: ""
            };

            scope.cancel = () => {
                 adhTopLevelState.redirectToCameFrom("/");
            };

            scope.errors = [];

            scope.passwordReset = () => {
                return adhUser.passwordReset(adhTopLevelState.get("path"), scope.input.password)
                    .then(() => {
                        scope.success = true;
                    },
                    (errors) => bindServerErrors(scope, errors));
            };
        }
    };
};

export var createPasswordResetDirective = (
    adhConfig : AdhConfig.IService,
    adhCredentials : AdhCredentials.Service,
    adhHttp : AdhHttp.Service<any>,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/CreatePasswordReset.html",
        scope: {},
        link: (scope) => {
            scope.success = false;
            scope.showError = adhShowError;
            scope.siteName = adhConfig.site_name;

            scope.$watch(() => adhCredentials.loggedIn, (value) => {
                scope.loggedIn = value;
            });

            scope.input = {
                email: ""
            };

            scope.goBack = scope.cancel = () => {
                 adhTopLevelState.redirectToCameFrom("/");
            };

            scope.errors = [];

            scope.submit = () => {
                return adhHttp.postRaw(adhConfig.rest_url + "/create_password_reset", {
                    email: scope.input.email
                }).then(() => {
                    scope.success = true;
                }, AdhHttp.logBackendError)
                .catch((errors) => bindServerErrors(scope, errors));
            };
        }
    };
};


export var indicatorDirective = (
    adhConfig : AdhConfig.IService,
    adhResourceArea : AdhResourceArea.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Indicator.html",
        scope: {},
        controller: ["adhUser", "adhCredentials", "$scope", (
            adhUser : AdhUser.Service,
            adhCredentials : AdhCredentials.Service,
            $scope
        ) => {
            $scope.user = adhUser;
            $scope.credentials = adhCredentials;
            $scope.noLink = !adhResourceArea.has(RIUser.content_type);

            $scope.logOut = () => {
                adhUser.logOut();
            };

            $scope.logIn = () => {
                adhTopLevelState.setCameFrom($location.path());
                $location.url("/login");
            };

            $scope.register = () => {
                adhTopLevelState.setCameFrom($location.path());
                $location.url("/register");
            };
        }]
    };
};


export var metaDirective = (adhConfig : AdhConfig.IService, adhResourceArea : AdhResourceArea.Service) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Meta.html",
        scope: {
            path: "@",
            name: "@?"
        },
        controller: ["adhHttp", "$translate", "$scope", (adhHttp : AdhHttp.Service<any>, $translate, $scope) => {
            if ($scope.path) {
                adhHttp.resolve($scope.path)
                    .then((res) => {
                        $scope.userBasic = res.data[SIUserBasic.nick];
                        $scope.noLink = !adhResourceArea.has(RIUser.content_type);
                    });
            } else {
                $translate("TR__GUEST").then((translated) => {
                    $scope.userBasic = {
                        name: translated
                    };
                });
                $scope.noLink = true;
            }
        }]
    };
};


export var userListDirective = (adhCredentials : AdhCredentials.Service, adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserList.html",
        link: (scope) => {
            scope.credentials = adhCredentials;
            scope.initialLimit = 50;
            scope.frontendOrderPredicate = (id) => id;
            scope.frontendOrderReverse = true;
        }
    };
};


export var userListItemDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserListItem.html",
        scope: {
            path: "@",
            me: "=?"
        },
        controller: ["adhHttp", "$scope", "adhTopLevelState", (adhHttp : AdhHttp.Service<any>, $scope,
            adhTopLevelState : AdhTopLevelState.Service) => {
            if ($scope.path) {
                adhHttp.resolve($scope.path)
                    .then((res) => {
                        $scope.userBasic = res.data[SIUserBasic.nick];
                    });
            }
            $scope.$on("$destroy", adhTopLevelState.on("userUrl", (userUrl) => {
                if (!userUrl) {
                    $scope.selectedState = "";
                } else if (userUrl === $scope.path) {
                    $scope.selectedState = "is-selected";
                } else {
                    $scope.selectedState = "is-not-selected";
                }
            }));
        }]
    };
};


export var userProfileDirective = (
    adhConfig : AdhConfig.IService,
    adhCredentials : AdhCredentials.Service,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhUser : AdhUser.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserProfile.html",
        transclude: true,
        require: "^adhMovingColumn",
        scope: {
            path: "@"
        },
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            adhPermissions.bindScope(scope, adhConfig.rest_url + "/message_user", "messageOptions");

            scope.showMessaging = () => {
                if (scope.messageOptions.POST) {
                    column.showOverlay("messaging");
                } else if (!adhCredentials.loggedIn) {
                    adhTopLevelState.redirectToLogin();
                } else {
                    // FIXME
                }
            };

            if (scope.path) {
                adhHttp.resolve(scope.path)
                    .then((res) => {
                        scope.userBasic = res.data[SIUserBasic.nick];
                    });
            }
        }
    };
};


export var userMessageDirective = (adhConfig : AdhConfig.IService, adhHttp : AdhHttp.Service<any>) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserMessage.html",
        scope: {
            recipientUrl: "@"
        },
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column)  => {
            adhHttp.get(scope.recipientUrl).then((recipient : RIUser) => {
                scope.recipientName = recipient.data[SIUserBasic.nick].name;
            });

            scope.messageSend = () => {
                return adhHttp.postRaw(adhConfig.rest_url + "/message_user", {
                    recipient: scope.recipientUrl,
                    title: scope.message.title,
                    text: scope.message.text
                }).then(() => {
                    column.hideOverlay();
                    column.alert("TR__MESSAGE_STATUS_OK", "success");
                }, () => {
                    // FIXME
                });
            };

            scope.cancel = () => {
                column.hideOverlay();
            };
        }
    };
};


export var userDetailColumnDirective = (
    adhPermissions : AdhPermissions.Service,
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["userUrl"]);
            adhPermissions.bindScope(scope, adhConfig.rest_url + "/message_user", "messageOptions");
        }
    };
};


export var userListingColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserListingColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["userUrl"]);
        }
    };
};

export var adhUserManagementHeaderDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserManagementHeader.html"
    };
};

export var moduleName = "adhUserViews";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAngularHelpers.moduleName,
            AdhCredentials.moduleName,
            AdhLocale.moduleName,
            AdhMovingColumns.moduleName,
            AdhPermissions.moduleName,
            AdhTopLevelState.moduleName,
            AdhResourceArea.moduleName,
            AdhUser.moduleName
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
                .when("register", () : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/Register.html"
                    };
                })
                .when("activate", ["adhConfig", "adhUser", "adhDone", "$rootScope", "$location", activateArea]);
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider
                .default(RIUser, "", "", "", {
                    space: "user",
                    movingColumns: "is-show-show-hide"
                })
                .specific(RIUser, "", "", "", () => (resource : RIUser) => {
                    return {
                        userUrl: resource.path
                    };
                })
                .default(RIUsersService, "", "", "", {
                    space: "user",
                    movingColumns: "is-show-hide-hide",
                    userUrl: "",  // not used by default, but should be overridable
                    focus: "0"
                });
        }])
        .directive("adhListUsers", ["adhCredentials", "adhConfig", userListDirective])
        .directive("adhUserListItem", ["adhConfig", userListItemDirective])
        .directive("adhUserProfile", [
            "adhConfig", "adhCredentials", "adhHttp", "adhPermissions", "adhTopLevelState", "adhUser", userProfileDirective])
        .directive("adhLogin", ["adhConfig", "adhUser", "adhTopLevelState", "adhShowError", loginDirective])
        .directive("adhPasswordReset", ["adhConfig", "adhHttp", "adhUser", "adhTopLevelState", "adhShowError", passwordResetDirective])
        .directive("adhCreatePasswordReset", [
            "adhConfig", "adhCredentials", "adhHttp", "adhUser", "adhTopLevelState", "adhShowError", createPasswordResetDirective])
        .directive("adhRegister", ["adhConfig", "adhCredentials", "adhUser", "adhTopLevelState", "adhShowError", registerDirective])
        .directive("adhUserIndicator", ["adhConfig", "adhResourceArea", "adhTopLevelState", "$location", indicatorDirective])
        .directive("adhUserMeta", ["adhConfig", "adhResourceArea", metaDirective])
        .directive("adhUserMessage", ["adhConfig", "adhHttp", userMessageDirective])
        .directive("adhUserDetailColumn", ["adhPermissions", "adhConfig", userDetailColumnDirective])
        .directive("adhUserListingColumn", ["adhConfig", userListingColumnDirective])
        .directive("adhUserManagementHeader", ["adhConfig", adhUserManagementHeaderDirective]);
};
