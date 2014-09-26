/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>
/// <reference path="../../_all.d.ts"/>

// This is only used at compile time and will be stripped by the compiler
import Config = require("../Config/Config");

import q = require("q");

// the module under test
import Listing = require("./Listing");


var config : Config.Type = <any>{
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
                adapter = new Listing.ListingPoolAdapter();
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
                expect(Listing.Listing.templateUrl).toBeDefined();
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

                var adhWebSocketMock = <any>jasmine.createSpyObj("WebSocketMock", ["register", "unregister"]);

                var adapter = <any>jasmine.createSpyObj("adapter", ["elemRefs", "poolPath"]);
                adapter.elemRefs.and.returnValue(elements);
                adapter.poolPath.and.returnValue(poolPath);

                var listing = new Listing.Listing(adapter);
                var directive: ng.IDirective = listing.createDirective(config, adhWebSocketMock);

                registerDirectiveSpec(directive);

                it("should transclude", () => {
                    expect(directive.transclude).toBe(true);
                });

                describe("controller", () => {
                    var adhHttpMock;
                    var adhPreliminaryNamesMock;
                    var scope;

                    beforeEach(() => {
                        adhHttpMock = createAdhHttpMock();
                        adhHttpMock.get.and.callFake(() => q.when(container));
                        adhPreliminaryNamesMock = jasmine.createSpyObj("adhPreliminaryNames", ["isPreliminary", "nextPreliminary"]);

                        scope = {
                            // arbitrary values
                            container: 3,
                            poolPath: 4,
                            elements: 2,
                            $watch: jasmine.createSpy("$watch")
                        };

                        var controller = directive.controller[3];
                        controller(scope, adhHttpMock, adhPreliminaryNamesMock);
                    });

                    it("defines scope.show", () => {
                        expect(scope.show).toBeDefined();
                    });

                    it("defines scope.show.createForm", () => {
                        expect(scope.show.createForm).toBeDefined();
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
                            expect(adhHttpMock.get).toHaveBeenCalledWith(path);
                            expect(scope.container).toBe(container);
                        });

                        it("updates scope.poolPath using adapter from container", () => {
                            expect(adapter.poolPath).toHaveBeenCalledWith(container);
                            expect(scope.poolPath).toBe(poolPath);
                        });

                        it("updates scope.elements using adapter from container", () => {
                            expect(adapter.elemRefs).toHaveBeenCalledWith(container);
                            expect(scope.elements).toBe(elements);
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
                            scope.poolPath = "pool/path";
                            scope.wshandle = "wshandle";
                            callback("");
                            expect(adhWebSocketMock.unregister).toHaveBeenCalledWith("pool/path", "wshandle");
                        });

                        it("registers new websocket when path changes", () => {
                            scope.poolPath = "pool/path";
                            callback("new/path");
                            updatePromise.then.calls.mostRecent().args[0]();
                            expect(adhWebSocketMock.register).toHaveBeenCalledWith("pool/path", scope.update);
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

                    it("intializes scope.show.createForm to false", () => {
                        expect(scope.show).toBeDefined();
                        expect(scope.show.createForm).toBeDefined();
                        expect(scope.show.createForm).toBe(false);
                    });

                    describe("showCreateForm", () => {
                        it("sets $scope.show.createForm to true", () => {
                            expect(scope.showCreateForm).toBeDefined();
                            scope.showCreateForm();
                            expect(scope.show.createForm).toBe(true);
                        });

                        it("sets $scope.createPath to a preliminary name", () => {
                            adhPreliminaryNamesMock.nextPreliminary.and.returnValue("preliminary name");
                            scope.showCreateForm();
                            expect(scope.createPath).toBe("preliminary name");
                        });
                    });

                    describe("hideCreateForm", () => {
                        it("sets $scope.show.createForm to false", () => {
                            expect(scope.hideCreateForm).toBeDefined();
                            scope.hideCreateForm();
                            expect(scope.show.createForm).toBe(false);
                        });
                    });
                });
            });
        });
    });
};
