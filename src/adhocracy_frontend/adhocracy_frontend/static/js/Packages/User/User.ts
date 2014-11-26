import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");

import SIPasswordAuthentication = require("../../Resources_/adhocracy_core/sheets/principal/IPasswordAuthentication");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");

var pkgLocation = "/User";

export interface IUserBasic {
    name? : string;
    email? : string;
    tzname? : string;
}


export interface IScopeLogin {
    user : Service;
    credentials : {
        nameOrEmail : string;
        password : string;
    };
    errors : string[];
    supportEmail : string;

    resetCredentials : () => void;
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
    errors : string[];
    supportEmail : string;
    success : boolean;

    register : () => ng.IPromise<void>;
}


export interface IRegisterResponse {}


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


export class Service {
    public loggedIn : boolean;
    public data : IUserBasic;
    public token : string;
    public userPath : string;

    constructor(
        private adhHttp : AdhHttp.Service<any>,
        private $q : ng.IQService,
        private $http : ng.IHttpService,
        private $rootScope : ng.IScope,
        private $window : Window,
        private angular : ng.IAngularStatic,
        private Modernizr
    ) {
        var _self : Service = this;

        var updateTokenFromStorage = () => {
            if (_self.Modernizr.localstorage) {
                if (_self.$window.localStorage.getItem("user-token") !== null &&
                        _self.$window.localStorage.getItem("user-path") !== null) {
                    _self.enableToken(
                        _self.$window.localStorage.getItem("user-token"),
                        _self.$window.localStorage.getItem("user-path")
                    );
                } else if (_self.$window.localStorage.getItem("user-token") === null &&
                        _self.$window.localStorage.getItem("user-path") === null) {
                    // $apply is necessary here to trigger a UI
                    // update.  the need for _.defer is explained
                    // here: http://stackoverflow.com/a/17958847
                    _.defer(() => _self.$rootScope.$apply(() => {
                        _self.deleteToken();
                    }));
                }
            } else if (_self.loggedIn === undefined) {
                _self.loggedIn = false;
            }
        };

        var win = _self.angular.element(_self.$window);
        win.on("storage", updateTokenFromStorage);

        updateTokenFromStorage();
    }

    private enableToken(token : string, userPath : string) : ng.IPromise<void> {
        var _self : Service = this;

        _self.token = token;
        _self.userPath = userPath;
        _self.$http.defaults.headers.common["X-User-Token"] = token;
        _self.$http.defaults.headers.common["X-User-Path"] = userPath;

        return _self.adhHttp.get(userPath)
            .then((resource) => {
                _self.data = resource.data[SIUserBasic.nick];
                _self.loggedIn = true;
            }, (reason) => {
                // The user resource that was returned by the server could not be accessed.
                // This may happen e.g. with a network disconnect
                _self.deleteToken();
                throw "failed to fetch user resource";
            });
    }

    private storeAndEnableToken(token : string, userPath : string) : ng.IPromise<void> {
        var _self : Service = this;

        if (_self.Modernizr.localstorage) {
            _self.$window.localStorage.setItem("user-token", token);
            _self.$window.localStorage.setItem("user-path", userPath);
        } else {
            console.log("session could not be persisted");
        }

        return _self.enableToken(token, userPath);
    }

    private deleteToken() : void {
        var _self : Service = this;

        if (_self.Modernizr.localstorage) {
            _self.$window.localStorage.removeItem("user-token");
            _self.$window.localStorage.removeItem("user-path");
        }
        delete _self.$http.defaults.headers.common["X-User-Token"];
        delete _self.$http.defaults.headers.common["X-User-Path"];
        _self.token = undefined;
        _self.userPath = undefined;
        _self.data = undefined;
        _self.loggedIn = false;
    }

    public logIn(nameOrEmail : string, password : string) : ng.IPromise<void> {
        var _self : Service = this;
        var promise;

        if (nameOrEmail.indexOf("@") === -1) {
            promise = _self.adhHttp.postRaw("/login_username", {
                name: nameOrEmail,
                password: password
            });
        } else {
            promise = _self.adhHttp.postRaw("/login_email", {
                email: nameOrEmail,
                password: password
            });
        }

        var success = (response) => {
            return _self.storeAndEnableToken(response.data.user_token, response.data.user_path);
        };

        return promise
            .then(success, AdhHttp.logBackendError);
    }

    public logOut() : void {
        var _self : Service = this;

        // The server does not have a logout yet.
        _self.deleteToken();
    }

    public register(username : string, email : string, password : string, passwordRepeat : string) : ng.IPromise<IRegisterResponse> {
        var _self : Service = this;

        var resource = {
            "content_type": "adhocracy_core.resources.principal.IUser",
            "data": {}
        };
        resource.data[SIUserBasic.nick] = {
            "name": username,
            "email": email
        };
        resource.data[SIPasswordAuthentication.nick] = {
            "password": password
        };

        return _self.adhHttp.post("/principals/users/", resource);
    }

    public activate(path : string) : ng.IPromise<void> {
        var _self : Service = this;

        var success = (response) => {
            return _self.storeAndEnableToken(response.data.user_token, response.data.user_path);
        };

        return _self.adhHttp.postRaw("/activate_account", {path: path})
            .then(success, AdhHttp.logBackendError);
    }
}


export var activateController = (
    adhUser : Service,
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


export var loginController = (
    adhUser : Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhConfig : AdhConfig.IService,
    $scope : IScopeLogin
) : void => {
    $scope.errors = [];
    $scope.supportEmail = adhConfig.support_email;

    $scope.credentials = {
        nameOrEmail: "",
        password: ""
    };

    $scope.resetCredentials = () => {
        $scope.credentials.nameOrEmail = "";
        $scope.credentials.password = "";
    };

    $scope.logIn = () => {
        return adhUser.logIn(
            $scope.credentials.nameOrEmail,
            $scope.credentials.password
        ).then(() => {
            adhTopLevelState.redirectToCameFrom("/");
        }, (errors) => {
            bindServerErrors($scope, errors);
            $scope.credentials.password = "";
        });
    };
};


export var loginDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Login.html",
        scope: {},
        controller: ["adhUser", "adhTopLevelState", "adhConfig", "$scope", loginController]
    };
};


export var registerController = (
    adhUser : Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhConfig : AdhConfig.IService,
    $scope : IScopeRegister
) => {
    $scope.siteName = adhConfig.site_name;

    $scope.input = {
        username: "",
        email: "",
        password: "",
        passwordRepeat: ""
    };

    $scope.errors = [];
    $scope.supportEmail = adhConfig.support_email;

    $scope.register = () : ng.IPromise<void> => {
        return adhUser.register($scope.input.username, $scope.input.email, $scope.input.password, $scope.input.passwordRepeat)
            .then((response) => {
                $scope.errors = [];
                $scope.success = true;
            }, (errors) => bindServerErrors($scope, errors));
    };
};


export var registerDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Register.html",
        scope: {},
        controller: ["adhUser", "adhTopLevelState", "adhConfig", "$scope", registerController]
    };
};


export var indicatorDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Indicator.html",
        scope: {},
        controller: ["adhUser", "$scope", (adhUser : Service, $scope) => {
            $scope.user = adhUser;
            $scope.pkgUrl = adhConfig.pkg_path + pkgLocation;

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

                        if (typeof $scope.name !== "undefined") {
                            $scope.userBasic.name = $scope.name;
                        };
                    });
            } else {
                $translate("guest").then((translated) => {
                    $scope.userBasic = {
                        name: translated
                    };

                    if (typeof $scope.name !== "undefined") {
                        $scope.userBasic.name = $scope.name;
                    };
                });
                $scope.isAnonymous = true;
            }
        }]
    };
};

export var userListDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserList.html"
    };
};

export var userListItemDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserListItem.html",
        scope: {
            path: "@"
        },
        controller: ["adhHttp", "$scope", (adhHttp : AdhHttp.Service<any>, $scope) => {
            if ($scope.path) {
                adhHttp.resolve($scope.path)
                    .then((res) => {
                        $scope.userBasic = res.data[SIUserBasic.nick];
                    });
            }
        }]
    };
};

export var userProfileDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserProfile.html",
        scope: {
            path: "@"
        },
        controller: ["adhHttp", "adhUser", "$scope", "$rootScope", (adhHttp : AdhHttp.Service<any>, adhUser, $scope, $rootScope) => {
            if ($scope.path) {
                adhHttp.resolve($scope.path)
                    .then((res) => {
                        $scope.userBasic = $rootScope.userBasic = res.data[SIUserBasic.nick];
                    });
            } else {
                $scope.userBasic = $rootScope.userBasic = adhUser.data;
            }
        }]
    };
};


export var moduleName = "adhUser";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
            AdhTopLevelState.moduleName
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
        .service("adhUser", ["adhHttp", "$q", "$http", "$rootScope", "$window", "angular", "Modernizr", Service])
        .directive("adhListUsers", ["adhConfig", userListDirective])
        .directive("adhUserListItem", ["adhConfig", userListItemDirective])
        .directive("adhUserProfile", ["adhConfig", userProfileDirective])
        .directive("adhLogin", ["adhConfig", loginDirective])
        .directive("adhRegister", ["adhConfig", registerDirective])
        .directive("adhUserIndicator", ["adhConfig", indicatorDirective])
        .directive("adhUserMeta", ["adhConfig", metaDirective]);
};
