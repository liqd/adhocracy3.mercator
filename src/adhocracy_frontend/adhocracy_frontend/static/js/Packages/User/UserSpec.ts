/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

// FIXME: DefinitelyTyped is not yet compatible with jasmine 2.0.0
declare var beforeEach : (any) => void;

import AdhUser = require("./User");
import q = require("q");

export var register = () => {
    describe("User", () => {
        var locationMock;

        beforeEach(() => {
            locationMock = <any>jasmine.createSpyObj("locationMock", ["path", "url"]);
        });

        describe("User", () => {
            var adhUser;
            var adhHttpMock;
            var httpMock;
            var rootScopeMock;
            var windowMock;
            var elementMock;
            var angularMock;
            var modernizrMock;

            beforeEach(() => {
                adhHttpMock = <any>jasmine.createSpyObj("adhHttpMock", ["get", "post", "postRaw"]);
                adhHttpMock.post.and.returnValue(q.when({}));
                adhHttpMock.get.and.returnValue(q.when({
                    data: {
                        "adhocracy_core.sheets.user.IUserBasic": {}
                    }
                }));

                httpMock = <any>jasmine.createSpyObj("httpMock", ["post"]);
                httpMock.defaults = {
                    headers: {
                        common: {}
                    }
                };
                httpMock.post.and.returnValue(q.when({data: {}}));

                rootScopeMock = jasmine.createSpyObj("rootScope", ["$apply"]);

                windowMock = {
                    localStorage: <any>jasmine.createSpyObj("localStorage", ["getItem", "setItem", "removeItem"])
                };
                windowMock.localStorage.getItem.and.returnValue(null);

                elementMock = jasmine.createSpyObj("element", ["on"]);
                angularMock = jasmine.createSpyObj("angular", ["element"]);
                angularMock.element.and.returnValue(elementMock);

                modernizrMock = {
                    localstorage: true
                };

                adhUser = new AdhUser.User(adhHttpMock, q, httpMock, rootScopeMock, windowMock, angularMock, modernizrMock);
            });

            it("registers a handler on 'storage' DOM events", () => {
                expect(elementMock.on).toHaveBeenCalledWith("storage", jasmine.any(Function));
            });

            describe("on storage", () => {
                var fn;

                beforeEach(() => {
                    spyOn(adhUser, "enableToken");
                    spyOn(adhUser, "deleteToken");

                    var args = elementMock.on.calls.mostRecent().args;
                    expect(args[0]).toBe("storage");
                    fn = <any>args[1];
                });

                it("calls 'enableToken' if 'user-token' and 'user-path' exist in storage", () => {
                    windowMock.localStorage.getItem.and.returnValue("huhu");
                    fn();
                    expect(adhUser.enableToken).toHaveBeenCalledWith("huhu", "huhu");
                });

                it("calls 'deleteToken' if neither 'user-token' nor 'user-path' exist in storage", (done) => {
                    windowMock.localStorage.getItem.and.returnValue(null);
                    fn();
                    _.defer(() => {
                        expect(rootScopeMock.$apply).toHaveBeenCalled();
                        var callback = rootScopeMock.$apply.calls.mostRecent().args[0];
                        callback();
                        expect(adhUser.deleteToken).toHaveBeenCalled();
                        done();
                    });
                });
            });

            describe("login", () => {
                beforeEach(() => {
                    adhHttpMock.postRaw.and.returnValue(q.when({
                        data: {
                            status: "success",
                            user_path: "user1_path",
                            user_token: "user1_tok"
                        }
                    }));

                    expect(adhUser.loggedIn).toBe(false);
                    expect(adhUser.data).not.toBeDefined();
                });

                var testLogin = () => {
                    it("sets loggedIn to true", () => {
                        expect(adhUser.loggedIn).toBe(true);
                    });
                    it("sets data to the user resource", () => {
                        // FIXME: Use actual user schema
                        expect(adhUser.data).toBeDefined();
                    });
                    it("sets token to the session token", () => {
                        expect(adhUser.token).toBe("user1_tok");
                    });
                    it("sets default http headers for the http service", () => {
                        expect(httpMock.defaults.headers.common["X-User-Token"]).toBe("user1_tok");
                        expect(httpMock.defaults.headers.common["X-User-Path"]).toBe("user1_path");
                    });
                };

                describe("happy login flow with username and password", () => {
                    beforeEach((done) => {
                        adhUser.logIn("user1", "user1_pass").then(done);
                    });

                    testLogin();

                    it("requests the API endpoint /login_username", () => {
                        expect(adhHttpMock.postRaw).toHaveBeenCalledWith("/login_username", {
                            name: "user1",
                            password: "user1_pass"
                        });
                    });

                    it("stores user token and user path in localstorage", () => {
                        expect(windowMock.localStorage.setItem).toHaveBeenCalledWith("user-token", "user1_tok");
                        expect(windowMock.localStorage.setItem).toHaveBeenCalledWith("user-path", "user1_path");
                    });
                });

                describe("happy login flow with email and password", () => {
                    beforeEach((done) => {
                        adhUser.logIn("user1@somedomain", "user1_pass").then(done);
                    });

                    testLogin();

                    it("requests the API endpoint /login_email", () => {
                        expect(adhHttpMock.postRaw).toHaveBeenCalledWith("/login_email", {
                            email: "user1@somedomain",
                            password: "user1_pass"
                        });
                    });

                    it("stores user token and user path in localstorage", () => {
                        expect(windowMock.localStorage.setItem).toHaveBeenCalledWith("user-token", "user1_tok");
                        expect(windowMock.localStorage.setItem).toHaveBeenCalledWith("user-path", "user1_path");
                    });
                });

                describe("localstorage unavailable", () => {
                    beforeEach((done) => {
                        modernizrMock.localstorage = false;
                        adhUser.logIn("user1", "user1_pass").then(done);
                    });

                    testLogin();
                });

                describe("request fails", () => {
                    var _reason;

                    var logInErrorDetails = [
                        { name: "flurg", location: "grompf", description: "chrrgl" }
                    ];

                    var fullError = {
                        data: {
                            status: "",
                            errors: logInErrorDetails
                        }
                    };

                    beforeEach((done) => {
                        adhUser.adhHttp.postRaw.and.returnValue(q.reject(fullError));
                        adhUser.logIn("user1", "user1_wrong_pass").then(
                            done,
                            (reason) => {
                                _reason = reason;
                                done();
                            }
                        );
                    });

                    it("rejects the login attempt", () => {
                        expect(_reason).toBe(logInErrorDetails);
                        expect(adhUser.loggedIn).toBe(false);
                        expect(adhUser.data).not.toBeDefined();
                        expect(adhUser.token).not.toBeDefined();
                        expect(httpMock.defaults.headers.common["X-User-Token"]).not.toBeDefined();
                        expect(httpMock.defaults.headers.common["X-User-Path"]).not.toBeDefined();
                    });
                });
            });

            describe("logOut", () => {
                var testLogout = (_beforeEach : (done : () => void) => void) => {
                    beforeEach((done) => {
                        adhHttpMock.postRaw.and.returnValue(q.when({
                            data: {
                                status: "success",
                                user_path: "user1_path",
                                user_token: "user1_tok"
                            }
                        }));
                        adhUser.logIn("user1", "user1_pass").then(() => {
                            adhUser.logOut();
                            _beforeEach(done);
                        });
                    });

                    it("sets loggedIn to false", () => {
                        expect(adhUser.loggedIn).toBe(false);
                    });
                    it("unsets data on the user resource", () => {
                        expect(adhUser.data).not.toBeDefined();
                    });
                    it("unsets token", () => {
                        expect(adhUser.token).not.toBeDefined();
                    });
                    it("unsets default http headers for the http service", () => {
                        expect(httpMock.defaults.headers.common["X-User-Token"]).not.toBeDefined();
                        expect(httpMock.defaults.headers.common["X-User-Path"]).not.toBeDefined();
                    });
                };

                describe("localStorage available", () => {
                    testLogout((done) => {
                        done();
                    });

                    it("removes user token and user path from localstorage", () => {
                        expect(windowMock.localStorage.removeItem).toHaveBeenCalledWith("user-token");
                        expect(windowMock.localStorage.removeItem).toHaveBeenCalledWith("user-path");
                    });
                });

                describe("localStorage unavailable", () => {
                    testLogout((done) => {
                        adhUser.Modernizr.localstorage = false;
                        done();
                    });
                });
            });

            describe("register", () => {
                beforeEach((done) => {
                    adhUser.register("username", "email", "password", "passwordRepeat").then(done);
                });

                it("posts to '/principals/users/'", () => {
                    var args = adhHttpMock.post.calls.mostRecent().args;
                    expect(args[0]).toBe("/principals/users/");
                });
                it("posts a valid user resource", () => {
                    var data = adhHttpMock.post.calls.mostRecent().args[1].data;
                    expect(data["adhocracy_core.sheets.user.IUserBasic"].name).toBe("username");
                    expect(data["adhocracy_core.sheets.user.IUserBasic"].email).toBe("email");
                    expect(data["adhocracy_core.sheets.user.IPasswordAuthentication"].password).toBe("password");
                });
            });
        });

        describe("loginDirective", () => {
            var directive;
            var adhConfigMock;

            beforeEach(() => {
                adhConfigMock = {
                    pkg_path: "mock",
                    root_path: "mock",
                    ws_url: "mock",
                    embedded: true
                };
                directive = AdhUser.loginDirective(adhConfigMock);
            });

            describe("controller", () => {
                var controller;
                var $scopeMock;
                var adhUserMock;
                var adhTopLevelStateMock;

                beforeEach(() => {
                    $scopeMock = {};
                    adhUserMock = <any>jasmine.createSpyObj("adhUserMock", ["logIn"]);
                    adhUserMock.logIn.and.returnValue(q.when(undefined));
                    adhTopLevelStateMock = <any>jasmine.createSpyObj("adhTopLevelStateMock", ["getCameFrom", "setCameFrom"]);
                    controller = <any>(directive.controller[4]);
                    controller(adhUserMock, adhTopLevelStateMock, $scopeMock, locationMock);
                });

                it("creates an empty credentials object in scope", () => {
                    expect($scopeMock.credentials).toEqual({nameOrEmail: "", password: ""});
                });

                describe("resetCredentials", () => {
                    it("cresets scope.credentials to empty strings", () => {
                        $scopeMock.credentials.nameOrEmail = "foo";
                        $scopeMock.credentials.password = "bar";

                        $scopeMock.resetCredentials();

                        expect($scopeMock.credentials).toEqual({nameOrEmail: "", password: ""});
                    });
                });

                describe("logIn", () => {
                    beforeEach(() => {
                        $scopeMock.credentials.nameOrEmail = "foo";
                        $scopeMock.credentials.password = "bar";
                    });

                    it("calls adhUser.logIn with scope.nameOrEmail and scope.password", (done) => {
                        $scopeMock.logIn().then(() => {
                            expect(adhUserMock.logIn).toHaveBeenCalledWith("foo", "bar");
                            done();
                        });
                    });
                    it("redirects to TopLevelState.getCameFrom() if everything goes well", (done) => {
                        var navigateToPath : string = "/osty";
                        adhTopLevelStateMock.getCameFrom.and.returnValue(navigateToPath);
                        $scopeMock.logIn().then(() => {
                            expect(locationMock.url).toHaveBeenCalledWith(navigateToPath);
                            done();
                        });
                    });
                    it("redirects to '/' if everything goes well, but getCameFrom() is undefined", (done) => {
                        $scopeMock.logIn().then(() => {
                            expect(locationMock.url).toHaveBeenCalledWith("/");
                            done();
                        });
                    });
                    it("charges $scope.errors if something goes wrong", (done) => {
                        adhUserMock.logIn.and.returnValue(q.reject([{description: "error"}]));
                        $scopeMock.logIn().then(() => {
                            expect($scopeMock.errors.length).toBe(1);
                            done();
                        });
                    });
                    it("resets password if something goes wrong", (done) => {
                        adhUserMock.logIn.and.returnValue(q.reject([{description: "error"}]));
                        $scopeMock.logIn().then(() => {
                            expect($scopeMock.credentials.password).toBe("");
                            done();
                        });
                    });
                });
            });
        });

        describe("registerDirective", () => {
            var directive;
            var adhConfigMock;

            beforeEach(() => {
                adhConfigMock = {
                    pkg_path: "mock",
                    root_path: "mock",
                    ws_url: "mock",
                    embedded: true
                };

                directive = AdhUser.registerDirective(adhConfigMock);
            });

            describe("controller", () => {
                var controller;
                var $scopeMock;
                var adhUserMock;
                var adhTopLevelStateMock;

                beforeEach(() => {
                    $scopeMock = {};
                    adhUserMock = <any>jasmine.createSpyObj("adhUserMock", ["register", "logIn"]);
                    adhUserMock.register.and.returnValue(q.when(undefined));
                    adhUserMock.logIn.and.returnValue(q.when(undefined));
                    adhTopLevelStateMock = <any>jasmine.createSpyObj("adhTopLevelStateMock", ["getCameFrom", "setCameFrom"]);
                    controller = <any>(directive.controller[4]);
                    controller(adhUserMock, adhTopLevelStateMock, $scopeMock, locationMock);
                });

                it("creates an empty input object in scope", () => {
                    expect($scopeMock.input).toEqual({
                        username: "",
                        email: "",
                        password: "",
                        passwordRepeat: ""
                    });
                });

                describe("register", () => {
                    it("calls adhUser.register with data from scope.input", (done) => {
                        $scopeMock.input.username = "username";
                        $scopeMock.input.email = "email";
                        $scopeMock.input.password = "password";
                        $scopeMock.input.passwordRepeat = "passwordRepeat";

                        $scopeMock.register().then(() => {
                            expect(adhUserMock.register).toHaveBeenCalledWith("username", "email", "password", "passwordRepeat");
                            done();
                        });
                    });
                    it("logs user in after register ", (done) => {
                        $scopeMock.register().then(() => {
                            expect(adhUserMock.logIn).toHaveBeenCalled();
                            done();
                        });
                    });
                    it("redirects to the root page after register ", (done) => {
                        $scopeMock.register().then(() => {
                            expect(locationMock.path).toHaveBeenCalledWith("/");
                            done();
                        });
                    });
                    it("clear $scope.errors if everything goes well", (done) => {
                        $scopeMock.errors = ["error"];
                        $scopeMock.register().then(() => {
                            expect($scopeMock.errors.length).toBe(0);
                            done();
                        });
                    });
                    it("charges $scope.errors if something goes wrong", (done) => {
                        adhUserMock.register.and.returnValue(q.reject([{description: "error"}]));
                        $scopeMock.register().then(() => {
                            expect($scopeMock.errors.length).toBe(1);
                            done();
                        });
                    });
                    it("navigates to TopLevelState.getCameFrom() after success", (done) => {
                        var navigateToPath : string = "/osty";
                        adhTopLevelStateMock.getCameFrom.and.returnValue(navigateToPath);
                        $scopeMock.register().then(() => {
                            expect(locationMock.path).toHaveBeenCalledWith(navigateToPath);
                            done();
                        });
                    });
                });
            });
        });

        describe("indicatorDirective", () => {
            var directive;
            var adhConfigMock;

            beforeEach(() => {
                adhConfigMock = {
                    pkg_path: "mock",
                    root_path: "mock",
                    ws_url: "mock",
                    embedded: true
                };
                directive = AdhUser.indicatorDirective(adhConfigMock);
            });

            describe("controller", () => {
                var controller;
                var $scopeMock;
                var adhUserMock;

                beforeEach(() => {
                    $scopeMock = {};
                    adhUserMock = <any>jasmine.createSpyObj("adhUserMock", ["logOut"]);
                    controller = <any>(directive.controller[2]);
                    controller(adhUserMock, $scopeMock);
                });

                describe("logOut", () => {
                    it("calls adhUser.logOut", () => {
                        $scopeMock.logOut();
                        expect(adhUserMock.logOut).toHaveBeenCalled();
                    });
                });
            });
        });
    });
};
