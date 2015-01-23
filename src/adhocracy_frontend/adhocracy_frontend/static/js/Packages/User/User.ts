import _ = require("lodash");

import AdhHttp = require("../Http/Http");

import SIPasswordAuthentication = require("../../Resources_/adhocracy_core/sheets/principal/IPasswordAuthentication");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");


export interface IUserBasic {
    name? : string;
    email? : string;
    tzname? : string;
}


export interface IRegisterResponse {}


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
            // clear cache.  this is to give the user a way to work
            // around shortcomings of websockets: log out, log in
            // again, and the data can be trusted to be up to date.
            this.adhHttp.invalidate();

            return _self.storeAndEnableToken(response.data.user_token, response.data.user_path);
        };

        return promise
            .then(success, AdhHttp.logBackendError);
    }

    public logOut() : void {
        var _self : Service = this;

        // clear cache.  see `logIn` above for motivation.
        this.adhHttp.invalidate();

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


export var moduleName = "adhUser";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
        ])
        .service("adhUser", ["adhHttp", "$q", "$http", "$rootScope", "$window", "angular", "Modernizr", Service]);
};
