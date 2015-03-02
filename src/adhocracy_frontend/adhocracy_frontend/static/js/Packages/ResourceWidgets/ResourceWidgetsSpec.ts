/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import q = require("q");

import AdhResourceWidgets = require("./ResourceWidgets");


var getArgsByFirst = (spy, needle) => {
    var haystack = spy.calls.allArgs();
    return haystack.filter((args) => args[0] === needle);
};

export var register = () => {
    describe("ResourceWidgets", () => {
        describe("resourceWrapper", () => {
            var directive;

            beforeEach(() => {
                directive = AdhResourceWidgets.resourceWrapper();
            });

            describe("controller", () => {
                var scopeMock;
                var attrsMock;
                var parseMock;
                var controller;
                var eventManagerClassMock = function() {
                    this.on = jasmine.createSpy("on");
                    this.off = jasmine.createSpy("off");
                    this.trigger = jasmine.createSpy("trigger");
                };
                var adhHttpMock;

                beforeEach(() => {
                    scopeMock = {
                        $parent: {}
                    };
                    attrsMock = {
                        onCancel: "onCancel()",
                        onSubmit: "onSubmitX()"
                    };
                    parseMock = jasmine.createSpy("$parse").and.returnValue(() => null);
                    adhHttpMock = jasmine.createSpyObj("adhHttpMock", ["deepPost"]);
                    controller = new directive.controller[6](scopeMock, attrsMock, q, parseMock, eventManagerClassMock, adhHttpMock);
                });

                it("does not pollute the scope", () => {
                    expect(scopeMock).toEqual({
                        $parent: jasmine.any(Object)
                    });
                });

                describe("registerResourceDirective", () => {
                    xit("stores the passed promise", () => {
                        throw "untestable";
                    });
                });

                describe("triggerSubmit", () => {
                    beforeEach((done) => {
                        controller.triggerSubmit().then(done);
                    });

                    it("triggers a 'submit' event on eventManager", () => {
                        expect(controller.eventManager.trigger).toHaveBeenCalledWith("submit");
                    });

                    it("calls onSubmit callback", () => {
                        expect(parseMock).toHaveBeenCalledWith("onSubmitX()");
                    });

                    // FIXME
                });

                describe("triggerCancel", () => {
                    beforeEach(() => {
                        controller.triggerCancel();
                    });

                    it("triggers a 'cancel' event on eventManager", () => {
                        expect(controller.eventManager.trigger).toHaveBeenCalledWith("cancel");
                    });

                    it("calls onCancel callback", () => {
                        expect(parseMock).toHaveBeenCalledWith("onCancel()");
                    });
                });

                describe("triggerSetMode", () => {
                    it("triggers a 'setMode' event with mode as first parameter on eventManager", () => {
                        controller.triggerSetMode("mode");
                        expect(controller.eventManager.trigger).toHaveBeenCalledWith("setMode", "mode");
                    });
                });
            });
        });

        describe("ResourceWidget", () => {
            var adhHttpMock;
            var adhPreliminaryNamesMock;
            var resourceWidget;
            var instanceMock;
            var eventOff;

            beforeEach(() => {
                adhHttpMock = jasmine.createSpyObj("adhHttp", ["get"]);
                adhHttpMock.get.and.returnValue(q.when());

                adhPreliminaryNamesMock = jasmine.createSpyObj("adhPreliminaryNames", ["isPreliminary"]);
                adhPreliminaryNamesMock.isPreliminary.and.returnValue(false);

                instanceMock = {
                    scope: jasmine.createSpyObj("scope", ["$emit"]),
                    wrapper: jasmine.createSpyObj("wrapper", ["registerResourceDirective", "triggerSubmit", "triggerCancel",
                        "triggerSetMode"]),
                    deferred: q.defer()
                };
                eventOff = jasmine.createSpy("eventOff");
                instanceMock.wrapper.eventManager = jasmine.createSpyObj("eventManager", ["on", "trigger"]);
                instanceMock.wrapper.eventManager.on.and.returnValue(eventOff);
                instanceMock.wrapper.triggerSubmit.and.returnValue(q.when());

                resourceWidget = new AdhResourceWidgets.ResourceWidget(adhHttpMock, adhPreliminaryNamesMock, <any>q);
            });

            describe("createDirective", () => {
                var directive;

                beforeEach(() => {
                    resourceWidget.templateUrl = "templateUrl";
                    directive = resourceWidget.createDirective();
                });

                it("sets the templateUrl", () => {
                    expect(directive.templateUrl).toBe("templateUrl");
                });

                describe("link", () => {
                    var scopeMock;
                    var instance;

                    beforeEach(() => {
                        scopeMock = jasmine.createSpyObj("scope", ["$on", "$emit"]);
                        scopeMock.mode = "mode";

                        resourceWidget.update = jasmine.createSpy("update").and.returnValue(q.when());
                        resourceWidget.setMode = jasmine.createSpy("setMode");
                        resourceWidget._handleDelete = jasmine.createSpy("_handleDelete").and.returnValue(q.when());
                        resourceWidget.provide = jasmine.createSpy("provide").and.returnValue(q.when());

                        directive.link(scopeMock, undefined, undefined, [instanceMock.wrapper]);

                        // instance is private, but we can get it via this hack
                        instance = resourceWidget.update.calls.mostRecent().args[0];
                    });

                    it("calls setMode", () => {
                        expect(resourceWidget.setMode).toHaveBeenCalledWith(instance, "mode");
                    });
                    it("calls update", () => {
                        expect(resourceWidget.update).toHaveBeenCalled();
                    });

                    describe("on $destroy", () => {
                        beforeEach(() => {
                            var fn = getArgsByFirst(scopeMock.$on, "$destroy")[0][1];
                            instance.deferred.resolve = jasmine.createSpy("resolve");
                            fn("event");
                        });

                        it("resolves the promise that is registered with resourceWrapper with an empty list", () => {
                            expect(instance.deferred.resolve).toHaveBeenCalledWith([]);
                        });

                        it("unregisters all listeners on wrapper.eventManager", () => {
                            expect(eventOff.calls.count()).toBe(4);
                        });
                    });

                    describe("on submit", () => {
                        it("calls provide and resolves the promise with the result", (done) => {
                            var fn = getArgsByFirst(instance.wrapper.eventManager.on, "submit")[0][1];
                            resourceWidget.provide.and.returnValue(q.when("provided"));

                            fn().then(() => {
                                expect(resourceWidget.provide).toHaveBeenCalled();

                                instance.deferred.promise.then((promised) => {
                                    expect(promised).toBe("provided");
                                    done();
                                });
                            });
                        });
                    });

                    describe("on cancel", () => {
                        var fn;

                        beforeEach(() => {
                            fn = getArgsByFirst(instance.wrapper.eventManager.on, "cancel")[0][1];
                        });

                        it("resets scope and sets mode to display if scope.mode is edit", (done) => {
                            scopeMock.mode = AdhResourceWidgets.Mode.edit;
                            fn().then(() => {
                                expect(resourceWidget.update.calls.count()).toBe(2);
                                expect(resourceWidget.setMode).toHaveBeenCalled();
                                done();
                            });
                        });

                        it("does not call update and does not change mode if mode is not edit", (done) => {
                            scopeMock.mode = "foo";
                            fn().then(() => {
                                // both have already been called once by link()
                                expect(resourceWidget.update.calls.count()).toBe(1);
                                expect(resourceWidget.setMode.calls.count()).toBe(1);
                                done();
                            });
                        });
                    });

                    describe("on setMode", () => {
                        it("calls setMode with first parameter", () => {
                            var fn = getArgsByFirst(instance.wrapper.eventManager.on, "setMode")[0][1];
                            fn("event", "mode");
                            expect(resourceWidget.setMode).toHaveBeenCalledWith(instance, "mode");
                        });
                    });

                    describe("on triggerDelete", () => {
                        it("calls _handleDelete with first parameter", () => {
                            var fn = getArgsByFirst(scopeMock.$on, "triggerDelete")[0][1];
                            fn("event", "path");
                            expect(resourceWidget._handleDelete).toHaveBeenCalledWith(instance, "path");
                        });
                    });

                    describe("edit", () => {
                        it("calls wrapper.triggerSetMode with Mode.edit", () => {
                            scopeMock.edit();
                            expect(instanceMock.wrapper.triggerSetMode).toHaveBeenCalledWith(AdhResourceWidgets.Mode.edit);
                        });
                    });

                    describe("submit", () => {
                        it("calls wrapper.triggerSubmit", () => {
                            scopeMock.submit();
                            expect(instanceMock.wrapper.triggerSubmit).toHaveBeenCalled();
                        });
                    });

                    describe("cancel", () => {
                        it("calls wrapper.triggerCancel", () => {
                            scopeMock.cancel();
                            expect(instanceMock.wrapper.triggerCancel).toHaveBeenCalled();
                        });
                    });

                    describe("delete", () => {
                        it("emits a 'triggerDelete' event with scope.path as first parameter", () => {
                            scopeMock.path = "/some/path";
                            scopeMock.delete();
                            expect(scopeMock.$emit).toHaveBeenCalledWith("triggerDelete", "/some/path");
                        });
                    });
                });
            });

            describe("setMode", () => {
                it("sets scope.mode", () => {
                    resourceWidget.setMode(instanceMock, 15);
                    expect((<any>instanceMock.scope).mode).toBe(15);
                });

                it("allows to set mode by string", () => {
                    resourceWidget.setMode(instanceMock, "edit");
                    expect((<any>instanceMock.scope).mode).toBe(1);
                });

                it("defults to display mode", () => {
                    resourceWidget.setMode(instanceMock);
                    expect((<any>instanceMock.scope).mode).toBe(0);
                });

                it("resolves the promise that is registered with resourceWrapper with an empty list", () => {
                    instanceMock.deferred.resolve = jasmine.createSpy("resolve");
                    resourceWidget.setMode(instanceMock, AdhResourceWidgets.Mode.display);
                    expect(instanceMock.deferred.resolve).toHaveBeenCalledWith([]);
                });

                it("creates a new promise and registers it with resourceWrapper using a 'registerResourceDirective' event", () => {
                    spyOn(q, "defer").and.callThrough();
                    resourceWidget.setMode(instanceMock, AdhResourceWidgets.Mode.edit);
                    expect(q.defer).toHaveBeenCalled();
                    expect(instanceMock.wrapper.registerResourceDirective).toHaveBeenCalled();
                });
            });

            describe("update", () => {
                beforeEach(() => {
                    resourceWidget._update = jasmine.createSpy("_update");
                });

                it("does not call adhHttp.get or _update when scope.path is preliminary", (done) => {
                    adhPreliminaryNamesMock.isPreliminary.and.returnValue(true);
                    resourceWidget.update(instanceMock).then(() => {
                        expect(adhHttpMock.get).not.toHaveBeenCalled();
                        expect(resourceWidget._update).not.toHaveBeenCalled();
                        done();
                    });
                });

                it("does get scope.path from server and feed it to _update", (done) => {
                    adhPreliminaryNamesMock.isPreliminary.and.returnValue(false);
                    instanceMock.scope.path = "/some/path";
                    resourceWidget.update(instanceMock).then(() => {
                        expect(adhHttpMock.get).toHaveBeenCalledWith("/some/path");
                        expect(resourceWidget._update).toHaveBeenCalled();

                        done();
                    });
                });
            });

            describe("provide", () => {
                var instanceMock;

                beforeEach(() => {
                    instanceMock = {
                        scope: {
                            path: "/some/path"
                        }
                    };
                    spyOn(resourceWidget, "_create").and.returnValue(q.when());
                    spyOn(resourceWidget, "_edit").and.returnValue(q.when());
                });

                it("calls _create if path is preliminary", (done) => {
                    adhPreliminaryNamesMock.isPreliminary.and.returnValue(true);

                    resourceWidget.provide(instanceMock).then(() => {
                        expect(resourceWidget._create).toHaveBeenCalled();
                        done();
                    });
                });

                it("gets the current resource from the server and passes it to _edit", (done) => {
                    adhPreliminaryNamesMock.isPreliminary.and.returnValue(false);
                    adhHttpMock.get.and.returnValue(q.when("huhu"));

                    resourceWidget.provide(instanceMock).then(() => {
                        expect(adhHttpMock.get).toHaveBeenCalledWith("/some/path");
                        expect(resourceWidget._edit).toHaveBeenCalledWith(jasmine.any(Object), "huhu");
                        done();
                    });
                });
            });

            describe("_handleDelete", () => {
                it("raises an 'not implemented' exception", () => {
                    expect(() => resourceWidget._handleDelete({}, "path")).toThrow();
                });
            });

            describe("_update", () => {
                it("raises an 'not implemented' exception", () => {
                    expect(() => resourceWidget._update({}, "path")).toThrow();
                });
            });

            describe("_create", () => {
                it("raises an 'not implemented' exception", () => {
                    expect(() => resourceWidget._create({})).toThrow();
                });
            });

            describe("_edit", () => {
                it("raises an 'not implemented' exception", () => {
                    expect(() => resourceWidget._edit({}, {})).toThrow();
                });
            });
        });
    });
};
