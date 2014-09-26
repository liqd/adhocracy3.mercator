/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import q = require("q");

import Util = require("../Util/Util");
import AdhHttp = require("./Http");
import Error = require("./Error");
import AdhConvert = require("./Convert");
import PreliminaryNames = require("../PreliminaryNames/PreliminaryNames");

import RIParagraph = require("../../Resources_/adhocracy_core/resources/sample_paragraph/IParagraph");
import SITag = require("../../Resources_/adhocracy_core/sheets/tags/ITag");

var mkHttpMock = (adhPreliminaryNames : PreliminaryNames) => {
    var mock = jasmine.createSpyObj("$httpMock", ["get", "post", "put"]);

    var response = new RIParagraph({ preliminaryNames: adhPreliminaryNames });

    mock.get.and.returnValue(q.when({ data: response }));
    mock.post.and.returnValue(q.when({ data: response }));
    mock.put.and.returnValue(q.when({ data: response }));
    return mock;
};

var mkTimeoutMock = () => {
    return jasmine.createSpy("timeoutMock").and.callFake((fn, ms, invokeApply) => fn());
};

var mkAdhMetaApiMock = () => {
    var mock = {
        objBefore: {
            content_type: "",
            data: {
                readWriteSheet: {
                    readOnlyField: 3,
                    readWriteField: 8
                },
                readOnlySheet: {
                    readOnlyField2: 9,
                }
            }
        },

        objAfter: {
            content_type: "",
            data: {
                readWriteSheet: {
                    readWriteField: 8
                }
            }
        },

        // used by exportContent.
        field: (sheet, field) => {
            switch (sheet + "/" + field) {
            case "readWriteSheet/readOnlyField":
                return { editable: false };
            case "readWriteSheet/readWriteField":
                return { editable: true };
            case "readOnlySheet/readOnlyField2":
                return { editable: false };
            default:
                return { editable: true };  // by default, don't delete anything.
            }
        }
    };

    spyOn(mock, "field").and.callThrough();

    return mock;
};


export var register = () => {
    describe("Http", () => {
        describe("Service", () => {
            var adhPreliminaryNames;
            var $httpMock;
            var $timeoutMock;
            var adhMetaApiMock;
            var adhConfigMock;
            var adhHttp : AdhHttp.Service<any>;

            beforeEach(() => {
                adhPreliminaryNames = new PreliminaryNames();
                $httpMock = mkHttpMock(adhPreliminaryNames);
                $timeoutMock = mkTimeoutMock();
                adhMetaApiMock = mkAdhMetaApiMock();
                adhConfigMock = {};
                adhHttp = new AdhHttp.Service($httpMock, q, $timeoutMock, adhMetaApiMock, adhPreliminaryNames, adhConfigMock);
            });

            describe("get", () => {
                it("calls $http.get", (done) => {
                    adhHttp.get("/some/path").then(
                        () => {
                            expect($httpMock.get).toHaveBeenCalled();
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });
            });
            describe("post", () => {
                it("calls $http.post", (done) => {
                    adhHttp.post("/some/path", {data: {}}).then(
                        () => {
                            expect($httpMock.post).toHaveBeenCalled();
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });
            });
            describe("put", () => {
                it("calls $http.put", (done) => {
                    adhHttp.put("/some/path", {data: {}}).then(
                        () => {
                            expect($httpMock.put).toHaveBeenCalled();
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });
            });
            describe("getNewestVersionPathNoFork", () => {
                it("promises the unique path from the LAST tag", (done) => {
                    var path = "path";
                    var returnPath1 = "path1";

                    var dag = new RIParagraph({ preliminaryNames: adhPreliminaryNames });
                    dag.data["adhocracy_core.sheets.tags.ITag"] = new SITag.AdhocracyCoreSheetsTagsITag({ elements: [returnPath1] });
                    $httpMock.get.and.returnValue(q.when({ data: dag }));

                    adhHttp.getNewestVersionPathNoFork(path).then(
                        (ret) => {
                            expect(ret).toBe(returnPath1);
                            expect($httpMock.get).toHaveBeenCalledWith(path + "/LAST", { params: undefined });
                            done();
                        },
                        (msg) => {
                            // on exception: report the error and fail.
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });
                it("throws an exception if LAST.length !== 1", (done) => {
                    $httpMock.get.and.returnValue(q.when({
                        data: {
                            "adhocracy_core.sheets.tags.ITag": {
                                elements: []
                            }
                        }
                    }));

                    adhHttp.getNewestVersionPathNoFork("anypath").then(
                        () => { expect(true).toBe(false); done(); },
                        () => { expect(true).toBe(true); done(); }
                    );

                    $httpMock.get.and.returnValue(q.when({
                        data: {
                            "adhocracy_core.sheets.tags.ITag": {
                                elements: ["p1", "p2"]
                            }
                        }
                    }));

                    adhHttp.getNewestVersionPathNoFork("anypath").then(
                        () => { expect(true).toBe(false); done(); },
                        () => { expect(true).toBe(true); done(); }
                    );
                });
            });
            describe("postNewVersionNoFork", () => {
                var noForkError = {
                    description: "No fork allowed",
                    location: "body",
                    name: "data.adhocracy.sheets.versions.IVersionable.follows"
                };

                it("posts to parent pool, adds IVersionable sheet with correct follows field", (done) => {
                    adhHttp.postNewVersionNoFork("/ome/path", {data: {}}).then(
                        (resource) => {
                            expect($httpMock.post).toHaveBeenCalledWith("/ome", {
                                data: {
                                    "adhocracy_core.sheets.versions.IVersionable": {
                                        follows: ["/ome/path"]
                                    }
                                }
                            });
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });

                it("catches single \"no-fork\" exceptions and retries 4 more times.", (done) => {
                    var error = {
                        status: "error",
                        errors: [noForkError]
                    };
                    $httpMock.post.and.returnValue(q.reject({ data: error }));

                    adhHttp.getNewestVersionPathNoFork = (<any>jasmine.createSpy("getNewestVersionPathNoForkSpy"))
                        .and.returnValue(q.when("next_head"));

                    adhHttp.postNewVersionNoFork("/somee/path", {data: {}}).then(
                        () => {
                            expect("postNewVersionNoFork should have failed!").toBe(false);
                            done();
                        },
                        (msg) => {
                            expect($httpMock.post.calls.count()).toEqual(5);
                            done();
                        }
                    );
                });

                it("does NOT catch any other (lists of) exceptions (more precisely: rethrows them).", (done) => {
                    var error = {
                        status: "error",
                        errors: [{name: "i am not a no-fork error", location: "", description: ""}]
                    };
                    $httpMock.post.and.returnValue(q.reject({ data: error }));

                    adhHttp.postNewVersionNoFork("/somee/path", {data: {}}).then(
                        () => {
                            expect("postNewVersionNoFork should have failed!").toBe(false);
                            done();
                        },
                        (msg) => {
                            expect($httpMock.post.calls.count()).toEqual(1);
                            done();
                        }
                    );
                });

                it("adds a root_versions field if rootVersions is passed", (done) => {
                    adhHttp.postNewVersionNoFork("/somee/path", {data: {}}, ["foo", "bar"]).then(
                        () => {
                            expect($httpMock.post).toHaveBeenCalledWith("/somee", {
                                data: {
                                    "adhocracy_core.sheets.versions.IVersionable": {
                                        follows: ["/somee/path"]
                                    }
                                },
                                root_versions: ["foo", "bar"]
                            });
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });

                it("Calls timeout; then calls post again with new HEAD as predecessor version.", (done) => {
                    var error = {
                        status: "error",
                        errors: [noForkError]
                    };

                    var newHead = "new_head";
                    var dag = new RIParagraph({ preliminaryNames: adhPreliminaryNames });
                    dag.data["adhocracy_core.sheets.tags.ITag"] = new SITag.AdhocracyCoreSheetsTagsITag({ elements: [newHead] });

                    var postResponses = [q.reject({ data: error }), q.when({ data: dag })].reverse();

                    $httpMock.post.and.callFake(() => postResponses.pop());
                    $httpMock.get.and.returnValue(q.when({ data: dag }));

                    spyOn(adhHttp, "getNewestVersionPathNoFork").and.callThrough();

                    adhHttp.postNewVersionNoFork("/somee/path", {data: {}}).then(
                        () => {
                            expect($httpMock.post.calls.count()).toEqual(2);

                            var extractFollowsRef = (resource) => {
                                try {
                                    var follows = resource.data["adhocracy_core.sheets.versions.IVersionable"].follows;
                                    if (follows.length !== 1) {
                                        throw "blä!";
                                    }
                                    return follows[0];
                                } catch (e) {
                                    return false;
                                }
                            };
                            expect(extractFollowsRef($httpMock.post.calls.argsFor(1)[1])).toEqual(newHead);
                            expect($httpMock.get.calls.count()).toEqual(1);
                            expect(adhHttp.getNewestVersionPathNoFork).toHaveBeenCalledWith("/somee");
                            expect($timeoutMock.calls.count()).toEqual(1);
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });
            });

            describe("postToPool", () => {
                it("calls $http.post", (done) => {
                    adhHttp.postToPool("/some/path", {data: {}}).then(
                        () => {
                            expect($httpMock.post).toHaveBeenCalled();
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        }
                    );
                });
            });
            describe("resolve", () => {
                it("gets the resource if called with a path", (done) => {
                    var path = "/some/path";
                    var content = {
                        content_type: "mock2",
                        data: {}
                    };
                    adhHttp.get = <any>(jasmine.createSpy("adhHttp.get")
                        .and.returnValue(q.when(content)));

                    adhHttp.resolve(path).then((ret) => {
                        expect(ret).toEqual(content);
                        expect(adhHttp.get).toHaveBeenCalledWith(path);
                        done();
                    });
                });
                it("promises the resource if called with a resource", (done) => {
                    var content = {
                        content_type: "mock2",
                        data: {}
                    };

                    adhHttp.resolve(content).then((ret) => {
                        expect(ret).toEqual(content);
                        done();
                    });
                });
            });
            describe("withTransaction", () => {
                var get;
                var put;
                var post1;
                var post2;
                var get2;
                var request;
                var response;
                var _httpTrans;

                beforeEach((done) => {
                    $httpMock.post.and.returnValue(q.when({data: [
                        {body: {content_type: "adhocracy_core.resources.pool.IBasicPool", path: "get response"}},
                        {body: {content_type: "adhocracy_core.resources.pool.IBasicPool", path: "put response"}},
                        {body: {content_type: "adhocracy_core.resources.pool.IBasicPool", path: "post1 response"}},
                        {body: {content_type: "adhocracy_core.resources.pool.IBasicPool", path: "post2 response"}},
                        {body: {content_type: "adhocracy_core.resources.pool.IBasicPool", path: "get2 response"}}
                    ]}));

                    adhHttp.withTransaction((httpTrans) => {
                        _httpTrans = httpTrans;

                        get = httpTrans.get("/get/path");
                        put = httpTrans.put("/put/path", <any>{
                            content_type: "content_type"
                        });
                        post1 = httpTrans.post("/post/path/1", <any>{
                            content_type: "content_type"
                        });
                        post2 = httpTrans.post("/post/path/2", <any>{
                            content_type: "content_type"
                        });
                        get2 = httpTrans.get(post1.path);
                        return httpTrans.commit();
                    }).then(
                        (_response) => {
                            response = _response;
                            done();
                        },
                        (error) => {
                            expect(false).toBe(true);
                            done();
                        }
                    );
                });

                it("posts to /batch", () => {
                    expect($httpMock.post).toHaveBeenCalled();
                    var args = $httpMock.post.calls.mostRecent().args;
                    expect(args[0]).toBe("/batch");
                    request = args[1];
                });

                it("assigns different preliminary paths to different post requests", () => {
                    expect(post1.path).not.toEqual(post2.path);
                });

                it("assigns preliminary first_version_paths on post requests", () => {
                    expect(post1.first_version_path).toBeDefined();
                });

                it("prefixes preliminary paths with a single '@'", () => {
                    expect(post1.path[0]).toBe("@");
                    expect(post1.path[1]).not.toBe("@");
                });

                it("prefixes preliminary first_version_paths with a single '@'", () => {
                    expect(post1.first_version_path[0]).toBe("@");
                    expect(post1.first_version_path[1]).not.toBe("@");
                });

                it("adds a result_path to post requests", () => {
                    expect(request[post1.index].result_path).toBeDefined();
                    expect(request[post1.index].result_path).toBe(post1.path);

                    expect(request[post2.index].result_path).toBeDefined();
                    expect(request[post2.index].result_path).toBe(post2.path);
                });

                it("maps preliminary data to responses via `index`", () => {
                    expect(response[get.index].path).toBe("get response");
                    expect(response[put.index].path).toBe("put response");
                    expect(response[post1.index].path).toBe("post1 response");
                    expect(response[post2.index].path).toBe("post2 response");
                    expect(response[get2.index].path).toBe("get2 response");
                });

                it("throws if you try to use the transaction after commit", () => {
                    expect(() => _httpTrans.get("/some/path")).toThrow();
                });
            });
        });

        describe("importContent", () => {
            it("returns response.data if it is an object", () => {
                var obj = {
                    content_type: "adhocracy_core.resources.pool.IBasicPool",
                    path: "p",
                    data: {}
                };
                var response = {
                    data: obj
                };
                var adhMetaApiMock = mkAdhMetaApiMock();
                var adhPreliminaryNames = new PreliminaryNames();
                var imported = () => AdhConvert.importContent(response, <any>adhMetaApiMock, adhPreliminaryNames);
                expect(imported().path).toBe(obj.path);
            });
            it("throws if response.data is not an object", () => {
                var obj = <any>"foobar";
                var response = {
                    data: obj
                };
                var adhMetaApiMock = mkAdhMetaApiMock();
                var adhPreliminaryNames = new PreliminaryNames();
                var imported = () => AdhConvert.importContent(response, <any>adhMetaApiMock, adhPreliminaryNames);
                expect(imported).toThrow();
            });
        });

        describe("exportContent", () => {
            var adhMetaApiMock;

            beforeEach(() => {
                adhMetaApiMock = mkAdhMetaApiMock();
            });

            it("deletes the path", () => {
                expect(AdhConvert.exportContent(adhMetaApiMock, {content_type: "", data: {}, path: "test"}))
                    .toEqual({content_type: "", data: {}});
            });
            it("deletes read-only properties", () => {
                var x = AdhConvert.exportContent(adhMetaApiMock, adhMetaApiMock.objBefore);
                var y = adhMetaApiMock.objAfter;
                expect(Util.deepeq(x, y)).toBe(true);
                expect(adhMetaApiMock.field).toHaveBeenCalled();
            });
        });

        var _logBackendError = (name, fn, wrap) => {
            describe(name, () => {
                var origConsoleLog;

                beforeEach(() => {
                    origConsoleLog = console.log;
                    spyOn(console, "log").and.callThrough();
                });

                it("always throws an exception", () => {
                    var backendError = {
                        status: "error",
                        errors: []
                    };
                    expect(() => fn(wrap(backendError))).toThrow();
                });

                it("logs the raw backend error to console", () => {
                    var backendError = {
                        status: "error",
                        errors: []
                    };
                    expect(() => fn(wrap(backendError))).toThrow();
                    expect(console.log).toHaveBeenCalledWith(backendError);
                });

                it("logs all individual errors to console", () => {
                    var backendError = {
                        status: "error",
                        errors: [
                            { name: "where0.0", location: "where0.1", description: "what0" },
                            { name: "where1.0", location: "where1.1", description: "what1" }
                        ]
                    };
                    expect(() => fn(wrap(backendError))).toThrow();
                    expect(console.log).toHaveBeenCalledWith("error #0");
                    expect(console.log).toHaveBeenCalledWith("where: where0.0, where0.1");
                    expect(console.log).toHaveBeenCalledWith("what:  what0");
                    expect(console.log).toHaveBeenCalledWith("error #1");
                    expect(console.log).toHaveBeenCalledWith("where: where1.0, where1.1");
                    expect(console.log).toHaveBeenCalledWith("what:  what1");
                });

                afterEach(() => {
                    console.log = origConsoleLog;
                });
            });
        };

        _logBackendError(
            "logBackendError",
            AdhHttp.logBackendError,
            (error) => {
                return { data: error };
            }
        );
        _logBackendError(
            "logBackendBatchError",
            Error.logBackendBatchError,
            (error) => {
                return { data: [ {body: error} ]};
            }
        );
    });
};
