/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import Config = require("../Config/Config");

import CrossWindowMessaging = require("./CrossWindowMessaging");


export var register = () => {

    describe("CrossWindowMessaging", () => {
        var windowMock;
        var rootScopeMock;
        var adhUserMock;

        beforeEach(() => {
            windowMock = <any>jasmine.createSpyObj("windowMock", ["addEventListener"]);
            rootScopeMock = <any>jasmine.createSpyObj("rootScopeMock", ["$watch"]);
            adhUserMock = <any>jasmine.createSpyObj("adhUserMock", ["loggedIn"]);
        });

        describe("Service", () => {
            var postMessageMock;
            var service;

            beforeEach(() => {
                postMessageMock = <any>jasmine.createSpy("postMessageMock");
                service = new CrossWindowMessaging.Service(postMessageMock, windowMock, rootScopeMock, ["http://trusted.lan"], adhUserMock);
            });

            describe("registerMessageHandler", () => {
                var callbackMock;
                var args;

                beforeEach(() => {
                    callbackMock = jasmine.createSpy("callbackMock");
                    service.registerMessageHandler("test", callbackMock);

                    args = windowMock.addEventListener.calls.mostRecent().args;
                });

                it("registers a message event handler", () => {
                    expect(args[0]).toBe("message");
                });

                it("calls callback with message.data when event is triggered", () => {
                    var data = {x: "y"};
                    var message = {
                        name: "test",
                        data: data
                    };
                    var event = {
                        origin: "*",
                        data: JSON.stringify(message)
                    };

                    args[1](event);
                    expect(callbackMock).toHaveBeenCalledWith(data);
                });
            });

            describe("postMessage", () => {
                it("calls window.postMessage with given resize parameters", () => {

                    service.postResize(280);
                    var args = postMessageMock.calls.mostRecent().args;
                    expect(JSON.parse(args[0])).toEqual({
                        name: "resize",
                        data: {height: 280}
                    });
                });
            });

            describe("sendAuthMessages", () => {
                it("returns true if embedderOrigin is trusted", () => {
                    service.setup({embedderOrigin: "http://trusted.lan"});
                    var sendAuth = service.sendAuthMessages();
                    expect(sendAuth).toBe(true);
                });

                it("returns false if embedderOrigin is trusted", () => {
                    service.setup({embedderOrigin: "http://untrusted.lan"});
                    var sendAuth = service.sendAuthMessages();
                    expect(sendAuth).toBe(false);
                });
            });

            describe("setup", () => {
                it("sets up the service", () => {
                    var embedderOrigin = "http://embedder.lan";
                    service.setup({embedderOrigin: embedderOrigin});
                    expect(service.embedderOrigin).toBe(embedderOrigin);
                });
                it("ignores subsequent calls", () => {
                    var embedderOrigin1 = "http://embedder.lan";
                    var embedderOrigin2 = "http://evil.lan";
                    service.setup({embedderOrigin: embedderOrigin1});
                    service.setup({embedderOrigin: embedderOrigin2});
                    expect(service.embedderOrigin).toBe(embedderOrigin1);
                });
                it("registers watch on $rootScope that calls postMessage on login if embedder ist trusted", () => {
                    service.setup({embedderOrigin: "http://trusted.lan"});
                    var args = rootScopeMock.$watch.calls.mostRecent().args;
                    args[1]("login");
                    expect(postMessageMock).toHaveBeenCalled();
                });
                it("registers watch on $rootScope that calls postMessage on logout if embedder ist trusted", () => {
                    service.setup({embedderOrigin: "http://trusted.lan"});
                    var args = rootScopeMock.$watch.calls.mostRecent().args;
                    args[1]("logout");
                    expect(postMessageMock).toHaveBeenCalled();
                });

            });

            describe("manageResize", () => {
                beforeEach(() => {
                    windowMock.document = {body: {clientHeight: 0}};
                });

                it("registers a resize event listener on $window that calls postMessage", () => {
                    var args = windowMock.addEventListener.calls.mostRecent().args;
                    expect(args[0]).toBe("resize");
                    args[1]();
                    expect(postMessageMock).toHaveBeenCalled();
                });

                it("registers a listener on $rootScope that calls postMessage", () => {
                    var args = rootScopeMock.$watch.calls.mostRecent().args;
                    args[1]();
                    expect(postMessageMock).toHaveBeenCalled();
                });
            });
        });

        describe("Dummy", () => {
            var dummy;

            beforeEach(() => {
                dummy = new CrossWindowMessaging.Dummy();
            });

            it("has a property 'dummy'", () => {
                expect(dummy.dummy).toBeDefined();
            });

            describe("registerMessageHandler", () => {
                it("can be called", () => {
                    expect(() => dummy.registerMessageHandler()).not.toThrow();
                });
            });
            describe("postResize", () => {
                it("can be called", () => {
                    expect(() => dummy.postResize()).not.toThrow();
                });
            });
        });

        describe("factory", () => {
            var service;
            var config : Config.Type;

            beforeEach(() => {
                config = <any>{
                    pkg_path: "mock",
                    rest_url: "mock",
                    rest_platform_path: "mock",
                    ws_url: "mock",
                    embedded: true,
                    trusted_domains: []
                };
                windowMock.parent = <any>jasmine.createSpyObj("parentMock", ["postMessage"]);
            });

            it("returns a service instance", () => {
                service = CrossWindowMessaging.factory(config, windowMock, rootScopeMock);
                expect(service).toBeDefined();
            });
            it("returns a dummy service when not embedded", () => {
                config.embedded = false;
                service = CrossWindowMessaging.factory(config, windowMock, rootScopeMock);
                expect(service.dummy).toBeDefined();
            });
            it("returns a service instance that uses $window.parent.postMessage", () => {
                var name = "test";
                var data = {x: "y"};
                service = CrossWindowMessaging.factory(config, windowMock, rootScopeMock);
                service.postMessage(name, data);
                expect(windowMock.parent.postMessage).toHaveBeenCalled();
            });
        });
    });
};
