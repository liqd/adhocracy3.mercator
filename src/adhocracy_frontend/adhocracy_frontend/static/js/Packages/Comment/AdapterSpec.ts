/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import * as JasmineHelpers from "../../JasmineHelpers";

import * as AdhCommentAdapter from "./Adapter";

import RICommentVersion from "../../Resources_/adhocracy_core/resources/comment/ICommentVersion";


export var register = () => {
    describe("CommentAdapter", () => {
        describe("CommentAdapter", () => {
            var resource;
            var adapter;
            var adhPreliminaryNamesMock;

            beforeEach(() => {
                adhPreliminaryNamesMock = jasmine.createSpyObj("adhPreliminaryNames", ["isPreliminary", "nextPreliminary"]);

                resource = {
                    data: {
                        "adhocracy_core.sheets.comment.IComment": {
                            refers_to: "refersTo",
                            content: "content"
                        },
                        "adhocracy_core.sheets.metadata.IMetadata": {
                            creator: "creator",
                            item_creation_date: "creationDate",
                            modification_date: "modificationDate"
                        },
                        "adhocracy_core.sheets.comment.ICommentable": {
                            comments: ["foo/VERSION_0000001", "bar/VERSION_0000001"]
                        }
                    }
                };
                adapter = new AdhCommentAdapter.CommentAdapter();
            });

            describe("create", () => {
                beforeEach(() => {
                    resource = adapter.create({preliminaryNames: adhPreliminaryNamesMock, follows: "@foo"});
                });

                it("returns an adhocracy_core.resources.comment.ICommentVersion resource", () => {
                    expect(resource.content_type).toBe(RICommentVersion.content_type);
                });

                it("creates an empty adhocracy_core.sheets.comment.IComment sheet", () => {
                    expect(resource.data["adhocracy_core.sheets.comment.IComment"]).toBeDefined();
                });

                it("creates an adhocracy_core.sheets.versions.IVersionable sheet with the right follows field", () => {
                    expect(resource.data["adhocracy_core.sheets.versions.IVersionable"]).toBeDefined();
                    expect(resource.data["adhocracy_core.sheets.versions.IVersionable"].follows).toBe("@foo");
                });
            });

            describe("createItem", () => {
                beforeEach(() => {
                    resource = adapter.createItem({preliminaryNames: adhPreliminaryNamesMock});
                });

                it("returns an adhocracy_core.resources.comment.IComment resource", () => {
                    expect(resource.content_type).toBe("adhocracy_core.resources.comment.IComment");
                });
            });

            describe("content", () => {
                it("gets content from adhocracy_core.sheets.comment.IComment", () => {
                    expect(adapter.content(resource)).toBe("content");
                });
                it("sets content from adhocracy_core.sheets.comment.IComment", () => {
                    adapter.content(resource, "content2");
                    expect(resource.data["adhocracy_core.sheets.comment.IComment"].content).toBe("content2");
                });
                it("returns resource when used as a setter", () => {
                    var result = adapter.content(resource, "content2");
                    expect(result.data["adhocracy_core.sheets.comment.IComment"].content).toBe("content2");
                });
            });

            describe("refersTo", () => {
                it("gets refers_to from adhocracy_core.sheets.comment.IComment", () => {
                    expect(adapter.refersTo(resource)).toBe("refersTo");
                });
                it("sets refers_to from adhocracy_core.sheets.comment.IComment", () => {
                    adapter.refersTo(resource, "refersTo2");
                    expect(resource.data["adhocracy_core.sheets.comment.IComment"].refers_to).toBe("refersTo2");
                });
                it("returns resource when used as a setter", () => {
                    var result = adapter.refersTo(resource, "refersTo2");
                    expect(result.data["adhocracy_core.sheets.comment.IComment"].refers_to).toBe("refersTo2");
                });
            });

            describe("creator", () => {
                it("gets creator from adhocracy_core.sheets.metadata.IMetadata", () => {
                    expect(adapter.creator(resource)).toBe("creator");
                });
            });

            describe("creationDate", () => {
                it("gets creationDate from adhocracy_core.sheets.metadata.IMetadata", () => {
                    expect(adapter.creationDate(resource)).toBe("creationDate");
                });
            });

            describe("modificationDate", () => {
                it("gets modificationDate from adhocracy_core.sheets.metadata.IMetadata", () => {
                    expect(adapter.modificationDate(resource)).toBe("modificationDate");
                });
            });

            describe("elemRefs", () => {
                var generateResource = () => {
                    return {
                        data: {
                            "adhocracy_core.sheets.comment.ICommentable": {
                                comments: [
                                    "/asd/version2",
                                    "/asd/version3",
                                    "/foo/version1",
                                    "/bar/version1",
                                    "/asd/version1",
                                    "/foo/version2"
                                ]
                            }
                        }
                    };

                };

                it("returns the refered comment items from the adhocracy_core.sheets.comment.ICommentable sheet", () => {
                    jasmine.addMatchers(JasmineHelpers.customMatchers);

                    var resource = generateResource();
                    var result = adapter.elemRefs(resource);
                    (<any>expect(result)).toSetEqual(["/asd", "/foo", "/bar"]);
                });

                it("does not modify the resource", () => {
                    var resource = generateResource();
                    adapter.elemRefs(resource);
                    expect(resource).toEqual(generateResource());
                });
            });

            describe("poolPath", () => {
                it("returns the post_pool of the container path", () => {
                    var resource = {
                        path: "some/path/parent",
                        data: {
                            "adhocracy_core.sheets.comment.ICommentable": {
                                post_pool: "some/path"
                            }
                        }
                    };

                    expect(adapter.poolPath(resource)).toEqual("some/path");
                });
            });
        });
    });
};
