/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhEmbed = require("./Embed");

export var register = () => {
    describe("Embed", () => {
        var $locationMock;
        var $compileMock;

        beforeEach(() => {
            $locationMock = jasmine.createSpyObj("$location", ["path", "search", "host", "port", "protocol"]);
            $locationMock.host.and.returnValue("example.com");
            $locationMock.port.and.returnValue("");
            $locationMock.protocol.and.returnValue("http");
            $locationMock.path.and.returnValue("/embed/document-workbench");
            $locationMock.search.and.returnValue({
                path: "/this/is/a/path",
                test: "\"'&"
            });
            $compileMock = jasmine.createSpy("$compileMock")
                .and.returnValue(() => undefined);
        });

        describe("location2template", () => {
            it("compiles a template from the parameters given in $location", () => {
                var expected = "<adh-document-workbench data-path=\"/this/is/a/path\" " +
                    "data-test=\"&quot;&#39;&amp;\"></adh-document-workbench>";
                expect(AdhEmbed.location2template($locationMock)).toBe(expected);
            });
            it("does not include meta params as attributes", () => {
                var expected = "<adh-document-workbench data-path=\"/this/is/a/path\"></adh-document-workbench>";
                $locationMock.search.and.returnValue({
                    path: "/this/is/a/path",
                    noheader: "",
                    nocenter: "",
                    locale: "de"
                });
                expect(AdhEmbed.location2template($locationMock)).toBe(expected);
            });
            it("returns '' if widget is 'empty'", () => {
                var expected = "";
                $locationMock.path.and.returnValue("/embed/empty");
                expect(AdhEmbed.location2template($locationMock)).toBe(expected);
            });
            it("throws if $location does not specify a widget", () => {
                $locationMock.path.and.returnValue("/embed/");
                expect(() => AdhEmbed.location2template($locationMock)).toThrow();
            });
            it("throws if the requested widget is not available for embedding", () => {
                $locationMock.path.and.returnValue("/embed/do-not-embed");
                expect(() => AdhEmbed.location2template($locationMock)).toThrow();
            });
        });

        describe("normalizeInternalUrl", () => {
            it("does not change relative URLs", () => {
                var url = "/foo/bar";
                var actual = AdhEmbed.normalizeInternalUrl(url, $locationMock);
                expect(actual).toEqual(url);
            });
            it("preserves query arguments on relative URLs", () => {
                var url = "/foo/bar?foo=1&bar=baz";
                var actual = AdhEmbed.normalizeInternalUrl(url, $locationMock);
                expect(actual).toEqual(url);
            });
            it("removes the host from absolute URLs", () => {
                var url = "http://example.com/foo/bar";
                var actual = AdhEmbed.normalizeInternalUrl(url, $locationMock);
                expect(actual).toEqual("/foo/bar");
            });
            it("removes the host from absolute URLs if host has a non-standard port", () => {
                $locationMock.port.and.returnValue("1234");
                var url = "http://example.com:1234/foo/bar";
                var actual = AdhEmbed.normalizeInternalUrl(url, $locationMock);
                expect(actual).toEqual("/foo/bar");
            });
            it("does not change external URLs", () => {
                var url = "http://external.com/foo/bar";
                var actual = AdhEmbed.normalizeInternalUrl(url, $locationMock);
                expect(actual).toEqual(url);
            });
        });

        describe("isInternalUrl", () => {
            it("returns True for relative URLs", () => {
                var url = "/foo/bar";
                var actual = AdhEmbed.isInternalUrl(url, $locationMock);
                expect(actual).toBe(true);
            });
            it("returns true for internal absolute URLs", () => {
                var url = "http://example.com/foo/bar";
                var actual = AdhEmbed.isInternalUrl(url, $locationMock);
                expect(actual).toBe(true);
            });
            it("returns true for internal absolute URLs if host has a non-standard port", () => {
                $locationMock.port.and.returnValue("1234");
                var url = "http://example.com:1234/foo/bar";
                var actual = AdhEmbed.isInternalUrl(url, $locationMock);
                expect(actual).toBe(true);
            });
            it("return false for external URLs", () => {
                var url = "http://external.com/foo/bar";
                var actual = AdhEmbed.isInternalUrl(url, $locationMock);
                expect(actual).toBe(false);
            });
        });
    });
};
