/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import q = require("q");

import AdhResourceArea = require("./ResourceArea");


export var register = () => {
    describe("ResourceArea", () => {
        describe("Service", () => {
            var providerMock;
            var adhHttpMock;
            var adhConfigMock;
            var service;

            beforeEach(() => {
                providerMock = jasmine.createSpyObj("provider", ["get"]);
                providerMock.get.and.returnValue({});

                adhHttpMock = jasmine.createSpyObj("adhHttp", ["get"]);
                adhHttpMock.get.and.returnValue(q.when({
                    content_type: "content_type"
                }));

                adhConfigMock = {
                    rest_url: "rest_url"
                };

                service = new AdhResourceArea.Service(providerMock, adhHttpMock, adhConfigMock);
            });

            describe("route", () => {
                it("sets 'content2Url' to rest_url + path if path consists of more than the platform", (done) => {
                    service.route("/platform/asd", {}).then((data) => {
                        expect(data["content2Url"]).toBe("rest_url/platform/asd");
                        done();
                    });
                });

                it("does not set 'content2Url' if path consists ONLY of the platform", (done) => {
                    service.route("/platform", {}).then((data) => {
                        expect(data["content2Url"]).not.toBeDefined();
                        done();
                    });
                });

                it("does not set 'content2Url' if path consists ONLY of the platform plus trailing '/'", (done) => {
                    service.route("/platform/", {}).then((data) => {
                        expect(data["content2Url"]).not.toBeDefined();
                        done();
                    });
                });
            });
        });
    });
};
