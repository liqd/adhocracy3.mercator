/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>
/// <reference path="../../_all.d.ts"/>

import q = require("q");

// This is only used at compile time and will be stripped by the compiler
import AdhConfig = require("../Config/Config");

// the module under test
import AdhListing = require("./Listing");


var config : AdhConfig.IService = <any>{
    pkg_path: "mock",
    rest_url: "mock",
    rest_platform_path: "mock",
    ws_url: "mock",
    embedded: false,
    trusted_domains: []
};

var createAdhHttpMock = () => {
    return <any>jasmine.createSpyObj("adhHttpMock", ["get"]);

    // FIXME: typescript should know from description file that
    // jasmine has this method!  (there are other instances of the
    // same issue further down.)
};

var registerDirectiveSpec = (directive: ng.IDirective): void => {
    it("has an isolated scope", () => {
        expect(directive.scope).toBeDefined();
    });
    it("is restricted to element", () => {
        expect(directive.restrict).toBe("E");
    });
};


export var register = () => {
    describe("Listing", () => {
        describe("ListingPoolAdapter", () => {
            var path = "some/path";
            var elements = ["foo", "bar", "baz"];
            var container;
            var adapter;

            beforeEach(() => {
                container = <any>{
                    path: path,
                    data: {
                        "adhocracy_core.sheets.pool.IPool": {
                            elements: elements
                        }
                    }
                };
                adapter = new AdhListing.ListingPoolAdapter();
            });

            describe("elemRefs", () => {
                it("returns the elements from the adhocracy_core.sheets.pool.IPool sheet", () => {
                    expect(adapter.elemRefs(container)).toEqual(elements);
                });
            });

            describe("poolPath", () => {
                it("returns the container path", () => {
                    expect(adapter.poolPath(container)).toBe("some/path");
                });
            });
        });

        describe("Listing", () => {
            it("has property 'templateUrl'", () => {
                expect(AdhListing.Listing.templateUrl).toBeDefined();
            });

            describe("createDirective", () => {
                var elements = ["foo", "bar", "baz"];
                var poolPath = "pool/path";
                var container = {
                    data: {
                        "adhocracy_core.sheets.pool.IPool": {
                            elements: elements
                        }
                    }
                };

                var adhWebSocketMock = <any>jasmine.createSpyObj("WebSocketMock", ["register"]);

                var adapter = <any>jasmine.createSpyObj("adapter", ["elemRefs", "poolPath"]);
                adapter.elemRefs.and.returnValue(elements);
                adapter.poolPath.and.returnValue(poolPath);

                var listing = new AdhListing.Listing(adapter);
                var directive: ng.IDirective = listing.createDirective(config, adhWebSocketMock);

                registerDirectiveSpec(directive);

                it("should transclude", () => {
                    expect(directive.transclude).toBe(true);
                });

                describe("controller", () => {
                    var filterMock = () => { ; };
                    var adhHttpMock;
                    var adhPreliminaryNamesMock;
                    var adhPermissionsMock;
                    var scope;

                    beforeEach(() => {
                        adhHttpMock = createAdhHttpMock();
                        adhHttpMock.get.and.callFake(() => q.when(container));
                        adhPreliminaryNamesMock = jasmine.createSpyObj("adhPreliminaryNames", ["isPreliminary", "nextPreliminary"]);
                        adhPermissionsMock = jasmine.createSpyObj("adhPermissionsMock", ["bindScope"]);
                        adhPermissionsMock.bindScope.and.returnValue(q.when());

                        scope = {
                            // arbitrary values
                            container: 3,
                            poolPath: 4,
                            elements: 2,
                            $watch: jasmine.createSpy("$watch")
                        };

                        var controller = directive.controller[5];
                        controller(filterMock, scope, adhHttpMock, adhPreliminaryNamesMock, adhPermissionsMock);
                    });

                    it("watches scope.path", () => {
                        expect(scope.$watch).toHaveBeenCalled();
                        expect(scope.$watch.calls.mostRecent().args[0]).toBe("path");
                    });

                    describe("scope.clear", () => {
                        it("clears scope.container", () => {
                            scope.clear();
                            expect(scope.container).not.toBeDefined();
                        });

                        it("clears scope.poolPath", () => {
                            scope.clear();
                            expect(scope.poolPath).not.toBeDefined();
                        });

                        it("clears scope.elements", () => {
                            scope.clear();
                            expect(scope.elements).toEqual([]);
                        });
                    });

                    describe("scope.update", () => {
                        var path = "some/path";

                        beforeEach((done) => {
                            scope.path = path;
                            scope.update().then(done);
                        });

                        it("updates scope.container from server", () => {
                            expect(adhHttpMock.get).toHaveBeenCalledWith(path, {}, undefined);
                            expect(scope.container).toBe(container);
                        });

                        it("updates scope.poolPath using adapter from container", () => {
                            expect(adapter.poolPath).toHaveBeenCalledWith(container);
                            expect(scope.poolPath).toBe(poolPath);
                        });

                        it("updates scope.elements using adapter from container", () => {
                            expect(adapter.elemRefs).toHaveBeenCalledWith(container);
                            expect(scope.elements).toEqual(elements);
                        });
                    });

                    describe("scope.update with content_type filter", () => {
                        var path = "some/path";

                        beforeEach((done) => {
                            scope.path = path;
                            scope.contentType = "some_content_type";
                            scope.update().then(done);
                        });

                        it("updates scope.container from server", () => {
                            expect(adhHttpMock.get).toHaveBeenCalledWith(path, {
                                content_type: "some_content_type"
                            }, undefined);
                            expect(scope.container).toBe(container);
                        });
                    });

                    describe("$watch(path)", () => {
                        var callback;
                        var updatePromise;

                        beforeEach(() => {
                            updatePromise = <any>jasmine.createSpyObj("updatePromise", ["then"]);
                            spyOn(scope, "update").and.returnValue(updatePromise);
                            spyOn(scope, "clear");
                            callback = scope.$watch.calls.mostRecent().args[1];
                        });

                        it("unregisters old websocket when path changes", () => {
                            var wsOff = jasmine.createSpy("wsOff");
                            scope.wsOff = wsOff;
                            callback("");
                            expect(wsOff).toHaveBeenCalled();
                            expect(scope.wsOff).not.toBeDefined();
                        });

                        it("registers new websocket when path changes", () => {
                            scope.poolPath = "pool/path";
                            callback("new/path");
                            updatePromise.then.calls.mostRecent().args[0]();
                            var wsArgs = adhWebSocketMock.register.calls.mostRecent().args;
                            expect(wsArgs[0]).toEqual("pool/path");
                            var updateCallCount = scope.update.calls.count();
                            wsArgs[1]();
                            expect(scope.update.calls.count()).toEqual(updateCallCount + 1);
                        });

                        it("calls scope.update on new path", () => {
                            callback("new/path");
                            expect(scope.update).toHaveBeenCalled();
                        });

                        it("calls scope.clear on path clear", () => {
                            callback("");
                            expect(scope.clear).toHaveBeenCalled();
                        });
                    });
                });
            });
        });
    });
};
