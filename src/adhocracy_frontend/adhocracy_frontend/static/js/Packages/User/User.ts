import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhCache = require("../Http/Cache");
import AdhLocale = require("../Locale/Locale");

import SIPasswordAuthentication = require("../../Resources_/adhocracy_core/sheets/principal/IPasswordAuthentication");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");
import SIUserExtended = require("../../Resources_/adhocracy_core/sheets/principal/IUserExtended");


export interface IUserBasic {
    name? : string;
    tzname? : string;
}


export interface IRegisterResponse {}


export class Service {
    public loggedIn : boolean;
    public ready : ng.IPromise<any>;
    public data : IUserBasic;
    public token : string;
    public userPath : string;

    constructor(
        private adhConfig : AdhConfig.IService,
        private adhHttp : AdhHttp.Service<any>,
        private adhCache : AdhCache.Service,
        private $q : ng.IQService,
        private $http : ng.IHttpService,
        private $rootScope : ng.IScope,
        private $window : Window,
        private angular : ng.IAngularStatic,
        private Modernizr
    ) {
        var _self : Service = this;

        var deferred = $q.defer();
        _self.ready = deferred.promise;
        var unwatch = this.$rootScope.$watch(() => _self.loggedIn, ((loggedIn) => {
            if (typeof loggedIn !== "undefined") {
                deferred.resolve(null);
                unwatch();
            }
        }));

        if (_self.Modernizr.localstorage) {
            var win = _self.angular.element(_self.$window);
            win.on("storage", (event) => {
                var storageEvent = <any>event.originalEvent;
                if (storageEvent.key === "user-session") {
                    _self.updateSessionFromStorage(storageEvent.newValue);
                }
            });
            var sessionValue = _self.$window.localStorage.getItem("user-session");
            _self.updateSessionFromStorage(sessionValue);
        } else {
            _self.loggedIn = false;
        }
    }

    private updateSessionFromStorage(sessionValue) : ng.IPromise<boolean> {
        var _self : Service = this;

        var deferred = _self.$q.defer();

        if (sessionValue) {
            try {
                var session = JSON.parse(sessionValue);
                var path = session["user-path"];
                var token = session["user-token"];
                this.$http.head(this.adhConfig.rest_url, {
                    headers: {
                        "X-User-Token": token,
                        "X-User-Path": path
                    }
                }).then((response) => {
                    _self.enableToken(token, path);
                    deferred.resolve(true);
                }, (msg) => {
                    console.log("Expired or invalid session deleted");
                    _self.deleteToken();
                    deferred.resolve(false);
                });
            } catch (e) {
                console.log("Invalid session deleted");
                _self.deleteToken();
            }
        } else {
            // $apply is necessary here to trigger a UI
            // update.  the need for _.defer is explained
            // here: http://stackoverflow.com/a/17958847
            _.defer(() => _self.$rootScope.$apply(() => {
                _self.deleteToken();
                deferred.resolve(false);
            }));
        }

        return deferred.promise;
    }

    private loadUser(userPath) {
        var _self : Service = this;

        return _self.adhHttp.get(userPath)
            .then((resource) => {
                _self.data = resource.data[SIUserBasic.nick];
                _self.loggedIn = true;
                _self.adhCache.invalidateAll();
            }, (reason) => {
                // The user resource that was returned by the server could not be accessed.
                // This may happen e.g. with a network disconnect
                _self.deleteToken();
                throw "failed to fetch user resource";
            });
    }

    private enableToken(token : string, userPath : string) : ng.IPromise<void> {
        var _self : Service = this;

        _self.token = token;
        _self.userPath = userPath;
        _self.$http.defaults.headers.common["X-User-Token"] = token;
        _self.$http.defaults.headers.common["X-User-Path"] = userPath;

        return _self.loadUser(userPath);
    }

    private storeAndEnableToken(token : string, userPath : string) : ng.IPromise<void> {
        var _self : Service = this;

        if (_self.Modernizr.localstorage) {
            _self.$window.localStorage.setItem("user-session", JSON.stringify({
                "user-path": userPath,
                "user-token": token
            }));
        } else {
            console.log("session could not be persisted");
        }

        return _self.enableToken(token, userPath);
    }

    private deleteToken() : void {
        var _self : Service = this;

        if (_self.Modernizr.localstorage) {
            _self.$window.localStorage.removeItem("user-session");
        }
        delete _self.$http.defaults.headers.common["X-User-Token"];
        delete _self.$http.defaults.headers.common["X-User-Path"];
        _self.token = undefined;
        _self.userPath = undefined;
        _self.data = undefined;
        _self.loggedIn = false;

        _self.adhCache.invalidateAll();
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
            "name": username
        };
        resource.data[SIUserExtended.nick] = {
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


export var moduleName = "adhUser";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
            AdhLocale.moduleName,
        ])
        .service("adhUser", ["adhConfig", "adhHttp", "adhCache", "$q", "$http", "$rootScope", "$window", "angular", "Modernizr", Service]);
};
