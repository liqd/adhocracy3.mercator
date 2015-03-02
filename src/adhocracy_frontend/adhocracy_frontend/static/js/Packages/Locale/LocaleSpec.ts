// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhLocale = require("./Locale");


export var register = () => {
    describe("Locale", () => {
        var $interpolateMock;
        var adhWrap;

        beforeEach(() => {
            $interpolateMock = jasmine.createSpy("$interpolate")
                .and.callFake((template) => (values) => template.replace("{{content}}", values.content));
            adhWrap = new AdhLocale.Wrap($interpolateMock);
        });

        describe("Wrap", () => {
            describe("encode/decode", () => {
                it("encode first then decode does not have any effect", () => {
                    [
                        "foo",
                        "[foo]",
                        "[[foo]]",
                        "[[foo",
                        "[[foo[[",
                        "foo]]",
                        "]]foo]]",
                        "\\]\\]foo]\\]",
                        "]]foo]\\]"
                    ].forEach((msg) => {
                        expect(adhWrap.decode(adhWrap.encode(msg))).toBe(msg);
                    });
                });
            });

            describe("replace", () => {
                it("replaces [[:.*]]", () => {
                    expect(adhWrap.wrap("Hello [[:World]]!", {})).toBe("Hello World!");
                });
                it("replaces all [[:.*]]", () => {
                    expect(adhWrap.wrap("Hello [[:World]] and [[:everyone else]]!", {})).toBe("Hello World and everyone else!");
                });
                it("wraps strings in templates", () => {
                    expect(adhWrap.wrap("Hello [[link:World]]!", {
                        link: "<a>{{content}}</a>"
                    })).toBe("Hello <a>World</a>!");
                });
                it("wraps strings in different templates", () => {
                    expect(adhWrap.wrap("Hello [[link:World]], [[link:universe]] and [[strong:everything]]!", {
                        link: "<a>{{content}}</a>",
                        strong: "<strong>{{content}}</strong>"
                    })).toBe("Hello <a>World</a>, <a>universe</a> and <strong>everything</strong>!");
                });
                it("does not replace [[:.*]] in result", () => {
                    expect(adhWrap.wrap("Hello [[link:World]]!", {
                        link: "[[:{{content}}]]"
                    })).toBe("Hello [[:World]]!");
                });
                it("throws if there is no colon", () => {
                    expect(() => adhWrap.wrap("Hello [[World]]", {})).toThrow();
                });
                it("throws if there is no closing marker", () => {
                    expect(() => adhWrap.wrap("Hello [[:World]] and [[foo]", {})).toThrow();
                });
            });
        });
    });
};
