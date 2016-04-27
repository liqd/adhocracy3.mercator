/// <reference path="../../../lib2/types/jasmine.d.ts"/>

import * as AdhResourceUtil from "./ResourceUtil";


export var register = () => {
    describe("ResourceUtil", () => {
        var adhMetaApiMock;

        beforeEach(() => {
            adhMetaApiMock = jasmine.createSpyObj("adhMetaApi", ["field", "fieldExists"]);
            adhMetaApiMock.field.and.callFake((sheetName, fieldName) => {
                if (fieldName[0] === "r") {
                    return {valuetype: "adhocracy_core.schema.AbsolutePath"};
                } else {
                    return {valuetype: "something else"};
                }
            });
            adhMetaApiMock.fieldExists.and.returnValue(true);
        });

        describe("getReferences", () => {
            it("returns the list of all fields from all sheets that have valuetype AbsolutePath", () => {
                var actual = AdhResourceUtil.getReferences(<any>{
                    path: "r1",
                    data: {
                        "sheet1": {
                            "noref1": "value1",
                            "ref2": "value2",
                        },
                        "sheet2": {
                            "ref3": "value3",
                            "ref4": "value4",
                        }
                    }
                }, adhMetaApiMock);

                expect(actual).toEqual(["value2", "value3", "value4"]);
            });
        });

        describe("sortResourcesTopologically", () => {
            var r1, r2, r3, r4, r5;
            var adhPreliminaryNamesMock;

            beforeEach(() => {
                r1 = <any>{
                    path: "r1",
                    data: {}
                };
                r2 = <any>{
                    path: "r2",
                    data: {
                        "somesheet": {
                            "ref": "r1"
                        }
                    }
                };
                r3 = <any>{
                    path: "r3",
                    data: {
                        "somesheet": {
                            "ref": "r2"
                        }
                    }
                };
                r4 = <any>{
                    path: "r4",
                    data: {
                        "somesheet": {
                            "ref1": "r1",
                            "ref2": "r3"
                        }
                    }
                };

                spyOn(AdhResourceUtil, "getReferences").and.callThrough();
                adhPreliminaryNamesMock = jasmine.createSpyObj("adhPreliminaryNames", ["isPreliminary"]);
                adhPreliminaryNamesMock.isPreliminary.and.returnValue(true);
            });

            it("should call getReferences on all given resources", () => {
                AdhResourceUtil.sortResourcesTopologically([r2, r3, r4, r1], adhPreliminaryNamesMock, adhMetaApiMock);
                expect(AdhResourceUtil.getReferences).toHaveBeenCalledWith(r1, adhMetaApiMock);
                expect(AdhResourceUtil.getReferences).toHaveBeenCalledWith(r2, adhMetaApiMock);
                expect(AdhResourceUtil.getReferences).toHaveBeenCalledWith(r3, adhMetaApiMock);
                expect(AdhResourceUtil.getReferences).toHaveBeenCalledWith(r4, adhMetaApiMock);
            });

            it("should return the references sorted topologically", () => {
                var result = AdhResourceUtil.sortResourcesTopologically([r2, r3, r4, r1], adhPreliminaryNamesMock, adhMetaApiMock);
                expect(result).toEqual([r1, r2, r3, r4]);
            });

            it("doesn't matter if there are duplicate refernces", () => {
                r4.data.somesheet = {
                    "ref1": "r1",
                    "ref2": "r3",
                    "ref3": "r1"
                };
                var result = AdhResourceUtil.sortResourcesTopologically([r2, r3, r4, r1], adhPreliminaryNamesMock, adhMetaApiMock);
                expect(result).toEqual([r1, r2, r3, r4]);
            });

            it("considers parent as just another reference", () => {
                r5 = {
                    path: "r5",
                    parent: "r4",
                    data: {}
                };

                var result = AdhResourceUtil.sortResourcesTopologically([r2, r3, r4, r5, r1], adhPreliminaryNamesMock, adhMetaApiMock);
                expect(result).toEqual([r1, r2, r3, r4, r5]);
            });
        });

        describe("derive", () => {
            var oldResource;
            var resource;
            var testResource = function(settings) {
                this.data = {};
                this.content_type = "test.resource";
            };
            var testSheet = function(settings) {
                this.foo = "bar";
            };

            beforeEach(() => {
                oldResource = new testResource({});
                oldResource.path = "/old/path";
                oldResource.data["test.sheet"] = new testSheet({});
                resource = AdhResourceUtil.derive(oldResource, {});
            });

            it("sets the right content type", () => {
                expect(resource.content_type).toBe("test.resource");
            });

            it("clones all sheets", () => {
                expect(resource.data["test.sheet"]).toBeDefined();
                expect(resource.data["test.sheet"].foo).toBe("bar");
            });

            it("creates a follos entry referencing the old version", () => {
                expect(resource.data["adhocracy_core.sheets.versions.IVersionable"].follows).toEqual(["/old/path"]);
            });
        });
    });
};
