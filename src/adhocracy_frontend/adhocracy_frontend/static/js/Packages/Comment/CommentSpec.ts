/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import q = require("q");

import AdhResourceUtil = require("../Util/ResourceUtil");

import AdhComment = require("./Comment");

var RESOURCE = {
    path: "path",
    content_type: "",
    data: {}
};


export var register = () => {
    describe("Comment", () => {
        var adhConfigMock;
        var adapterMock;
        var adhHttpMock;
        var originalDerive;

        beforeEach(() => {
            adhConfigMock = {
                pkg_path: "mock"
            };

            adapterMock = <any>jasmine.createSpyObj("adapterMock", ["create", "createItem", "content", "edited", "refersTo", "creator",
                "creationDate", "modificationDate", "commentCount", "elemRefs", "poolPath"]);
            adapterMock.create.and.returnValue(RESOURCE);
            adapterMock.createItem.and.returnValue(RESOURCE);

            originalDerive = AdhResourceUtil.derive;
            spyOn(AdhResourceUtil, "derive").and.returnValue(RESOURCE);

            adhHttpMock = <any>jasmine.createSpyObj("adhHttpMock", ["postToPool", "resolve", "postNewVersion", "getNewestVersionPathNoFork",
                "get"]);
            adhHttpMock.postToPool.and.returnValue(q.when(RESOURCE));
            adhHttpMock.resolve.and.returnValue(q.when(RESOURCE));
            adhHttpMock.postNewVersion.and.returnValue(q.when(RESOURCE));
            adhHttpMock.getNewestVersionPathNoFork.and.returnValue(q.when("newestVersion"));
            adhHttpMock.get.and.returnValue(q.when(RESOURCE));
        });

        afterEach(() => {
            AdhResourceUtil.derive = originalDerive;
        });

        describe("commentResource", () => {
            var widget;
            var wrapperMock;
            var instanceMock;
            var adhPermissionsMock;
            var adhPreliminaryNamesMock;
            var adhTopLevelStateMock;

            beforeEach(() => {
                adhPreliminaryNamesMock = jasmine.createSpyObj("adhPreliminaryNames", ["isPreliminary", "nextPreliminary"]);
                adhPermissionsMock = jasmine.createSpyObj("adhPermissions", ["bindScope"]);
                adhTopLevelStateMock = jasmine.createSpyObj("adhTopLevelState", ["on"]);
                widget = new AdhComment.CommentResource(
                    adapterMock, adhConfigMock, adhHttpMock, adhPermissionsMock, adhPreliminaryNamesMock, adhTopLevelStateMock, <any>q);

                wrapperMock = {
                    eventManager: jasmine.createSpyObj("eventManager", ["on", "off", "trigger"])
                };
                instanceMock = {
                    scope: jasmine.createSpyObj("scope", ["$on"]),
                    wrapper: wrapperMock
                };
            });

            it("sets 'templateUrl' on construction", () => {
                expect(widget.templateUrl).toBeDefined();
                expect(widget.templateUrl.indexOf("CommentDetail")).not.toBe(-1);
            });

            describe("createRecursionDirective", () => {
                var directive;
                var recursionHelperMock;

                beforeEach(() => {
                    recursionHelperMock = jasmine.createSpyObj("recursionHelper", ["compile"]);
                    directive = widget.createRecursionDirective(recursionHelperMock);
                });

                describe("compile", () => {
                    it("uses recursionHelper", () => {
                        directive.compile("element");
                        expect(recursionHelperMock.compile).toHaveBeenCalled();
                    });
                });
            });

            describe("link", () => {
                beforeEach(() => {
                    spyOn(widget, "update").and.returnValue(q.when());
                    spyOn(widget, "setMode");
                    widget.link(instanceMock.scope, "element", "attrs", [wrapperMock]);
                });

                describe("createComment", () => {
                    it("sets scope.show.createForm to true", () => {
                        instanceMock.scope.createComment();
                        expect(instanceMock.scope.show.createForm).toBe(true);
                    });

                    it("sets scope.createPath to a preliminary name", () => {
                        adhPreliminaryNamesMock.nextPreliminary.and.returnValue("preliminary name");
                        instanceMock.scope.createComment();
                        expect(instanceMock.scope.createPath).toBe("preliminary name");
                    });
                });

                describe("cancelCreateComment", () => {
                    it("sets scope.show.createForm to false", () => {
                        instanceMock.scope.cancelCreateComment();
                        expect(instanceMock.scope.show.createForm).toBe(false);
                    });
                });

                describe("afterCreateComment", () => {
                    beforeEach((done) => {
                        adapterMock.creator.and.returnValue("afterCreateCommentCreator");
                        instanceMock.scope.afterCreateComment().then(done);
                    });

                    it("updates the scope", () => {
                        expect(widget.update).toHaveBeenCalled();
                    });

                    it("sets scope.show.createForm to false", () => {
                        expect(instanceMock.scope.show.createForm).toBe(false);
                    });
                });
            });

            describe("_handleDelete", () => {
                xit("does nothing", () => undefined);
            });

            describe("_update", () => {
                var content = "content";
                var creator = "creator";
                var creationDate = "creationDate";
                var modificationDate = "modificationDate";
                var commentCount = 2;
                var elemRefs = ["foo", "bar"];
                var poolPath = "poolPath";

                beforeEach((done) => {
                    adapterMock.content.and.returnValue(content);
                    adapterMock.creator.and.returnValue(creator);
                    adapterMock.creationDate.and.returnValue(creationDate);
                    adapterMock.modificationDate.and.returnValue(modificationDate);
                    adapterMock.commentCount.and.returnValue(commentCount);
                    adapterMock.elemRefs.and.returnValue(elemRefs);
                    adapterMock.poolPath.and.returnValue(poolPath);

                    widget._update(instanceMock, {}).then(done);
                });

                it("reads content from adapter to scope", () => {
                    expect(instanceMock.scope.data.content).toBe(content);
                });
                it("reads creator from adapter to scope", () => {
                    expect(instanceMock.scope.data.creator).toBe(creator);
                });
                it("reads creationDate from adapter to scope", () => {
                    expect(instanceMock.scope.data.creationDate).toBe(creationDate);
                });
                it("reads modificationDate from adapter to scope", () => {
                    expect(instanceMock.scope.data.modificationDate).toBe(modificationDate);
                });
                it("reads commentCount from adapter to scope", () => {
                    expect(instanceMock.scope.data.commentCount).toBe(commentCount);
                });
                it("reads comments from adapter to scope", () => {
                    expect(instanceMock.scope.data.comments).toBe(elemRefs);
                });
                it("reads poolPath from adapter to scope", () => {
                    expect(instanceMock.scope.data.replyPoolPath).toBe(poolPath);
                });
            });

            describe("_create", () => {
                var result;
                var content = "content";
                var refersTo = "refersTo";

                beforeEach((done) => {
                    instanceMock.scope.data = {
                        content: content
                    };
                    instanceMock.scope.refersTo = refersTo;
                    instanceMock.scope.poolPath = "poolPath";
                    widget._create(instanceMock).then((_result) => {
                        result = _result;
                        done();
                    });
                });

                it("creates a new resource using the adapter", () => {
                    expect(adapterMock.create.calls.count()).toBe(1);
                    expect(adapterMock.createItem.calls.count()).toBe(1);
                    expect(adapterMock.content.calls.count()).toBe(1);
                    expect(adapterMock.refersTo.calls.count()).toBe(1);
                    expect(adapterMock.content.calls.first().args[1]).toBe(content);
                    expect(adapterMock.refersTo.calls.first().args[1]).toBe(refersTo);
                });

                it("sets parent properties on all resources", () => {
                    result.forEach((resource) => {
                        expect(resource.parent).toBeDefined();
                    });
                });

                it("creates a new item", () => {
                    expect(result.length).toBe(2);
                });
            });

            describe("_edit", () => {
                var result;
                var oldVersion;
                var content = "content";

                beforeEach((done) => {
                    oldVersion = RESOURCE;
                    instanceMock.scope.data = {
                        content: content
                    };
                    widget._edit(instanceMock, oldVersion).then((_result) => {
                        result = _result;
                        done();
                    });
                });

                it("creates a new resource using the adapter", () => {
                    expect((<any>AdhResourceUtil).derive.calls.count()).toBe(1);
                    expect(adapterMock.content.calls.count()).toBe(1);
                    expect(adapterMock.content.calls.first().args[1]).toBe(content);
                });

                it("sets parent properties on all resources", () => {
                    result.forEach((resource) => {
                        expect(resource.parent).toBeDefined();
                    });
                });

                it("does not create a new item", () => {
                    expect(result.length).toBe(1);
                });
            });
        });

        describe("CommentCreate", () => {
            var widget;

            beforeEach(() => {
                var adhPreliminaryNamesMock = jasmine.createSpyObj("adhPreliminaryNames", ["isPreliminary", "nextPreliminary"]);
                var adhPermissionsMock = jasmine.createSpyObj("adhPermissions", ["bindScope"]);
                var adhTopLevelStateMock = jasmine.createSpyObj("adhTopLevelState", ["on"]);
                widget = new AdhComment.CommentCreate(
                    adapterMock, adhConfigMock, adhHttpMock, adhPermissionsMock, adhPreliminaryNamesMock, adhTopLevelStateMock, <any>q);
            });

            it("sets 'templateUrl' on construction", () => {
                expect(widget.templateUrl).toBeDefined();
                expect(widget.templateUrl.indexOf("CommentCreate")).not.toBe(-1);
            });
        });
    });
};
