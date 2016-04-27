/// <reference path="../../../lib2/types/jasmine.d.ts"/>

import * as q from "q";

import * as AdhResourceArea from "./ResourceArea";


export var register = () => {
    describe("ResourceArea", () => {
        describe("Service", () => {
            var providerMock;
            var adhHttpMock;
            var adhConfigMock;
            var adhCredentialsMock;
            var adhEmbedMock;
            var $injectorMock;
            var $locationMock;
            var adhResourceUrlFilterMock;
            var service;

            beforeEach(() => {
                providerMock = {
                    defaults: {},
                    specifics: {},
                    templates: {},
                    customHeaders: {}
                };

                adhHttpMock = jasmine.createSpyObj("adhHttp", ["get", "withTransaction"]);
                adhHttpMock.get.and.returnValue(q.when({
                    content_type: "content_type",
                    data: {}
                }));
                adhHttpMock.withTransaction.and.returnValue(q.when([]));

                $injectorMock = jasmine.createSpyObj("$injector", ["invoke"]);

                $locationMock = jasmine.createSpyObj("$location", ["path"]);

                adhConfigMock = {
                    rest_url: "http://rest_url"
                };

                adhCredentialsMock = jasmine.createSpyObj("adhCredentialsMock", ["loggedIn"]);

                adhEmbedMock = jasmine.createSpyObj("adhEmbed", ["getContext"]);
                adhEmbedMock.getContext.and.returnValue("");

                adhResourceUrlFilterMock = (path) => path;

                service = new AdhResourceArea.Service(
                    providerMock,
                    <any>q,
                    $injectorMock,
                    $locationMock,
                    adhHttpMock,
                    adhConfigMock,
                    adhCredentialsMock,
                    adhEmbedMock,
                    null,
                    adhResourceUrlFilterMock);
            });

            describe("route", () => {
                beforeEach(() => {
                    spyOn(service, "getProcess").and.returnValue(q.when(""));
                    spyOn(service, "conditionallyRedirectVersionToLast").and.returnValue(q.when(false));
                });

                it("sets view field if specified", (done) => {
                    service.route("/platform/wlog/@blarg", {}).then((data) => {
                        expect(data["view"]).toBe("blarg");
                        done();
                    });
                    service.route("/platform/wlog/@blarg/", {}).then((data) => {
                        expect(data["view"]).toBe("blarg");
                        done();
                    });
                });

                it("does not set view field if not specified", (done) => {
                    service.route("/platform/blarg", {}).then((data) => {
                        expect(data["view"]).toBeFalsy();
                        done();
                    });
                    service.route("/platform/blarg/", {}).then((data) => {
                        expect(data["view"]).toBeFalsy();
                        done();
                    });
                });

                it("sets contentType", (done) => {
                    service.route("/platform/wlog/@blarg", {}).then((data) => {
                        expect(data["contentType"]).toBe("content_type");
                        done();
                    });
                });

                it("sets resourceUrl", (done) => {
                    service.route("/platform/wlog/@blarg", {}).then((data) => {
                        expect(data["resourceUrl"]).toBe("http://rest_url/platform/wlog/");
                        done();
                    });
                });
            });

            describe("reverse", () => {
                it("renders view correctly if specified", () => {
                    var answer = service.reverse({ resourceUrl: "http://rest_url/platform/wlog", view: "blarg" });
                    expect(answer.path).toMatch(/\/@blarg$/);
                });

                it("uses resourceUrl for path, but without http://rest_url", () => {
                    var answer = service.reverse({ resourceUrl: "http://rest_url/platform/wlog" });
                    expect(answer.path).toBe("/platform/wlog/");
                });
            });

            describe("getProcess", () => {
                // We here create a mock adhHttp Service object. We say an input string contains a process 
                // if it has 4 slashes. We wanted to verify that getProcess() worked both with URLs and paths.
                beforeEach(() => {
                    adhHttpMock.get.and.callFake((arg) => q.when({
                        isInstanceOf: () => arg.match(/\//g).length === 4,
                        arg: arg
                    }));
                });

                it("works with URLs", (done) => {
                    service.getProcess("http://rest_url/bla/fu/bar/bass").then((result) => {
                        expect(result.arg).toBe("http://rest_url/bla/fu");
                        done();
                    });
                });

                it("works with paths", (done) => {
                    service.getProcess("/bla/fu/bar/bass").then((result) => {
                        expect(result.arg).toBe("http://rest_url/bla/fu");
                        done();
                    });
                });
            });
        });
    });
};
