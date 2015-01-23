/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import JasmineHelpers = require("../../JasmineHelpers");

import q = require("q");

import AdhUtil = require("./Util");

export var register = () => {
    describe("Util", () => {
        describe("isArrayMember", () => {
            var isArrayMember = AdhUtil.isArrayMember;

            it("finds nothing in empty array.", () => {
                expect(isArrayMember(0, [])).toBe(false);
            });
            it("finds array members if they are present at pos [0].", () => {
                expect(isArrayMember("wef", ["wef", null, 3])).toBe(true);
            });
            it("finds array members if they are present at pos [end].", () => {
                expect(isArrayMember("wef", [null, "wef"])).toBe(true);
            });
            it("finds array members if they are present in between.", () => {
                expect(isArrayMember("wef", [true, "wef", null, 3])).toBe(true);
            });
            it("does not find array members if they are not present.", () => {
                expect(isArrayMember("wef", ["woff", null, 3])).toBe(false);
            });
            it("works on other base types.", () => {
                expect(isArrayMember(true, [true])).toBe(true);
                expect(isArrayMember(false, [true])).toBe(false);
                expect(isArrayMember(1, [1])).toBe(true);
                expect(isArrayMember(0, [1])).toBe(false);
            });
            it("works on null.", () => {
                expect(isArrayMember(null, [null])).toBe(true);
                expect(isArrayMember(null, [3])).toBe(false);
            });
            it("null is not member of ['null'].", () => {
                expect(isArrayMember(null, ["null"])).toBe(false);
            });
            it("returns false for array properties that are not array items (such as length)", () => {
                expect(AdhUtil.isArrayMember("length", ["hay", "stack"])).toBe(false);
                expect(AdhUtil.isArrayMember(0, ["hay", "stack"])).toBe(false);
            });
        });

        describe("parentPath", () => {
            it("returns '/foo' for '/foo/bar'", () => {
                expect(AdhUtil.parentPath("/foo/bar")).toBe("/foo");
            });
            it("returns '/foo/' for '/foo/bar/'", () => {
                expect(AdhUtil.parentPath("/foo/bar/")).toBe("/foo/");
            });
            it("returns '/' for '/'", () => {
                expect(AdhUtil.parentPath("/")).toBe("/");
            });
            it("returns '/' for 'bla'", () => {
                expect(AdhUtil.parentPath("bla")).toBe("/");
            });
            it("returns '/' for ''", () => {
                expect(AdhUtil.parentPath("")).toBe("/");
            });
        });

        describe("normalizeName", () => {
            it("is idempotent", () => {
                ["asdkj", "#!8 sajd ksalkjad\n", "foo bar", "Foo Bar", "foo_bar"].forEach((s) => {
                    var normalized = AdhUtil.normalizeName(s);
                    expect(AdhUtil.normalizeName(normalized)).toBe(normalized);
                });
            });

            it("preserves ascii", () => {
                expect(AdhUtil.normalizeName("asdASD123")).toBe("asdASD123");
            });

            it("replaces german umlauts", () => {
                expect(AdhUtil.normalizeName("äüÄÖß")).toBe("aeueAeOess");
            });

            it("replaces spaces by underscores", () => {
                expect(AdhUtil.normalizeName(" ")).toBe("_");
            });

            it("strips chars that are not allowed in an URI component", () => {
                expect(AdhUtil.normalizeName("$%&/?")).toBe("");
            });

            it("strips non-ascii", () => {
                expect(AdhUtil.normalizeName("…")).toBe("");
            });
        });

        describe("formatString", () => {
            it("formats a string", () => {
                expect(AdhUtil.formatString("Hello {0} from {1}", "World", "Bernd")).toBe("Hello World from Bernd");
            });
            it("does not replace {n} if there is no n-th parameter", () => {
                expect(AdhUtil.formatString("Hello {0} from {1}", "World")).toBe("Hello World from {1}");
            });
        });

        describe("eachItemOnce", () => {
            var testCase = [
                "/asd/version2",
                "/asd/version3",
                "/foo/version1",
                "/bar/version1",
                "/asd/version1",
                "/foo/version2"
            ];

            it("returns only the most recent versions from the adhocracy_core.sheets.comment.ICommentable sheet", () => {
                jasmine.addMatchers(JasmineHelpers.customMatchers);

                var result = AdhUtil.eachItemOnce(testCase);
                (<any>expect(result)).toSetEqual(["/asd", "/foo", "/bar"]);
            });

            it("does not alter the input list", () => {
                AdhUtil.eachItemOnce(testCase);
                expect(testCase).toEqual([
                    "/asd/version2",
                    "/asd/version3",
                    "/foo/version1",
                    "/bar/version1",
                    "/asd/version1",
                    "/foo/version2"
                ]);
            });
        });

        describe("sortDagTopologically", () => {

            it("sorts a given dag topologically", () => {
                var dag : AdhUtil.IDag<string> = {
                    "A": {
                        "content": "AA",
                        "incoming": [],
                        "outgoing": ["B", "D"],
                        "done": false
                    },
                    "B": {
                        "content": "BB",
                        "incoming": ["A"],
                        "outgoing": ["C"],
                        "done": false
                    },
                    "C": {
                        "content": "CC",
                        "incoming": ["B"],
                        "outgoing": ["D"],
                        "done": false
                    },
                    "D": {
                        "content": "DD",
                        "incoming": ["A", "C"],
                        "outgoing": [],
                        "done": false
                    }
                };

                var result = AdhUtil.sortDagTopologically(dag, ["A"]);
                expect(result).toEqual(["AA", "BB", "CC", "DD"]);
            });

            it("throws a cycle detected error if the given graph contains cycles", () => {
                var dag : AdhUtil.IDag<string> = {
                    "A": {
                        "content": "AA",
                        "incoming": [],
                        "outgoing": ["B"],
                        "done": false
                    },
                    "B": {
                        "content": "BB",
                        "incoming": ["A", "C"],
                        "outgoing": ["C"],
                        "done": false
                    },
                    "C": {
                        "content": "CC",
                        "incoming": ["B"],
                        "outgoing": ["B"],
                        "done": false
                    }
                };

                expect(() => AdhUtil.sortDagTopologically(dag, ["A"])).toThrow();
            });
        });

        describe("qFilter", () => {
            it("works mostly like $q.all", (done) => {
                AdhUtil.qFilter([q.when("a"), q.when("b"), q.when("c")], q)
                    .then((result) => {
                        expect(result).toEqual(["a", "b", "c"]);
                        done();
                    });
            });

            it("filters out any rejected promises", (done) => {
                AdhUtil.qFilter([q.when("a"), q.reject("b"), q.when("c")], q)
                    .then((result) => {
                        expect(result).toEqual(["a", "c"]);
                        done();
                    });
            });

            it("promises empty list if empty list was passed", (done) => {
                AdhUtil.qFilter([], q)
                    .then((result) => {
                        expect(result).toEqual([]);
                        done();
                    });
            });
        });
    });
};
