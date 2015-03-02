import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhMovingColumns = require("../MovingColumns/MovingColumns");
import AdhPermissions = require("../Permissions/Permissions");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");

import AdhUser = require("./User");

import RIUser = require("../../Resources_/adhocracy_core/resources/principal/IUser");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");

var pkgLocation = "/User";


export interface IScopeLogin {
    user : AdhUser.Service;
    credentials : {
        nameOrEmail : string;
        password : string;
    };
    errors : string[];
    supportEmail : string;

    resetCredentials : () => void;
    cancel : () => void;
    logIn : () => ng.IPromise<void>;
}


export interface IScopeRegister {
    input : {
        username : string;
        email : string;
        password : string;
        passwordRepeat : string;
    };
    siteName : string;
    termsUrl : string;
    errors : string[];
    supportEmail : string;
    success : boolean;

    register : () => ng.IPromise<void>;
    cancel : () => void;
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


export var activateController = (
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhDone,
    $location : ng.ILocationService
) : void => {
    var key = $location.path().split("/")[2];
    var path = "/activate/" + key;

    var success = () => {
        // FIXME show success message in UI
        // FIXME extract cameFrom from activation key (involves BE)
        adhTopLevelState.redirectToCameFrom("/");
    };

    var error = () => {
        $location.url("activation_error");
    };

    adhUser.activate(path)
        .then(success, error)
        .then(adhDone);
};


export var loginDirective = (
    adhConfig : AdhConfig.IService,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Login.html",
        scope: {},
        link: (scope : IScopeLogin) => {
            scope.errors = [];
            scope.supportEmail = adhConfig.support_email;

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
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Register.html",
        scope: {},
        link: (scope : IScopeRegister) => {
            scope.siteName = adhConfig.site_name;
            scope.termsUrl = adhConfig.terms_url;

            scope.input = {
                username: "",
                email: "",
                password: "",
                passwordRepeat: ""
            };

            scope.cancel = () => {
                 adhTopLevelState.redirectToCameFrom("/");
            };

            scope.errors = [];
            scope.supportEmail = adhConfig.support_email;

            scope.register = () : ng.IPromise<void> => {
                return adhUser.register(scope.input.username, scope.input.email, scope.input.password, scope.input.passwordRepeat)
                    .then((response) => {
                        scope.errors = [];
                        scope.success = true;
                    }, (errors) => bindServerErrors(scope, errors));
            };
        }
    };
};


export var indicatorDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Indicator.html",
        scope: {},
        controller: ["adhUser", "$scope", (adhUser : AdhUser.Service, $scope) => {
            $scope.user = adhUser;

            $scope.logOut = () => {
                adhUser.logOut();
            };
        }]
    };
};


export var metaDirective = (adhConfig : AdhConfig.IService) => {
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
                        $scope.isAnonymous = false;
                    });
            } else {
                $translate("TR__GUEST").then((translated) => {
                    $scope.userBasic = {
                        name: translated
                    };
                });
                $scope.isAnonymous = true;
            }
        }]
    };
};


export var userListDirective = (adhUser : AdhUser.Service, adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserList.html",
        link: (scope) => {
            scope.user = adhUser;
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
                } else if (!adhUser.loggedIn) {
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


export var moduleName = "adhUserViews";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhPermissions.moduleName,
            AdhTopLevelState.moduleName,
            AdhUser.moduleName
        ])
        .config(["adhTopLevelStateProvider", (adhTopLevelStateProvider : AdhTopLevelState.Provider) => {
            adhTopLevelStateProvider
                .when("login", () : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/Login.html"
                    };
                })
                .when("register", () : AdhTopLevelState.IAreaInput => {
                    return {
                        templateUrl: "/static/js/templates/Register.html"
                    };
                })
                .when("activate", ["adhUser", "adhTopLevelState", "adhDone", "$location",
                    (adhUser, adhTopLevelState, adhDone, $location) : AdhTopLevelState.IAreaInput => {
                        activateController(adhUser, adhTopLevelState, adhDone, $location);
                        return {
                            skip: true
                        };
                    }
                ])
                .when("activation_error", ["adhConfig", "$rootScope", (adhConfig, $scope) : AdhTopLevelState.IAreaInput => {
                    $scope.translationData = {
                        supportEmail: adhConfig.support_email
                    };
                    return {
                        templateUrl: "/static/js/templates/ActivationError.html"
                    };
                }]);
        }])
        .directive("adhListUsers", ["adhUser", "adhConfig", userListDirective])
        .directive("adhUserListItem", ["adhConfig", userListItemDirective])
        .directive("adhUserProfile", ["adhConfig", "adhHttp", "adhPermissions", "adhTopLevelState", "adhUser", userProfileDirective])
        .directive("adhLogin", ["adhConfig", "adhUser", "adhTopLevelState", loginDirective])
        .directive("adhRegister", ["adhConfig", "adhUser", "adhTopLevelState", registerDirective])
        .directive("adhUserIndicator", ["adhConfig", indicatorDirective])
        .directive("adhUserMeta", ["adhConfig", metaDirective])
        .directive("adhUserMessage", ["adhConfig", "adhHttp", userMessageDirective]);
};
