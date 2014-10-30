/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhEmbed = require("./Embed");

export var register = () => {
    describe("Embed", () => {
        var $locationMock;
        var $compileMock;

        beforeEach(() => {
            $locationMock = jasmine.createSpyObj("$location", ["path", "search"]);
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
            it("throws if $location does not specify a widget", () => {
                $locationMock.path.and.returnValue("/embed/");
                expect(() => AdhEmbed.location2template($locationMock)).toThrow();
            });
            it("throws if the requested widget is not available for embedding", () => {
                $locationMock.path.and.returnValue("/embed/do-not-embed");
                expect(() => AdhEmbed.location2template($locationMock)).toThrow();
            });
        });
    });
};
