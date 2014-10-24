/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhTopLevelState = require("./TopLevelState");
var state = AdhTopLevelState.ColumnState;

export var register = () => {

    describe("TopLevelState", () => {
        describe("Service", () => {
            var adhTopLevelState : AdhTopLevelState.Service;
            var eventHandlerMockClass;
            var locationMock;
            var rootScopeMock;
            var trigger;
            var off;
            var on;

            beforeEach(() => {
                on = jasmine.createSpy("on");
                off = jasmine.createSpy("off");
                trigger = jasmine.createSpy("trigger");
                locationMock = jasmine.createSpyObj("locationMock", ["url", "search"]);
                rootScopeMock = jasmine.createSpyObj("rootScopeMock", ["$watch"]);

                eventHandlerMockClass = <any>function() {
                    this.on = on;
                    this.off = off;
                    this.trigger = trigger;
                };

                adhTopLevelState = new AdhTopLevelState.Service(eventHandlerMockClass, locationMock, rootScopeMock);
            });

            it("dispatches calls to setContent2Url to eventHandler", () => {
                adhTopLevelState.setContent2Url("some/path");
                expect(trigger).toHaveBeenCalledWith("setContent2Url", "some/path");
            });

            it("dispatches calls to onSetContent2Url to eventHandler", () => {
                var callback = (url) => undefined;
                adhTopLevelState.onSetContent2Url(callback);
                expect(on).toHaveBeenCalledWith("setContent2Url", callback);
            });

            describe("cameFrom", () => {
                it("getCameFrom reads what setCameFrom wrote", () => {
                    var msg : string;
                    msg = "wefoidsut";
                    adhTopLevelState.setCameFrom(msg);
                    expect(adhTopLevelState.getCameFrom()).toBe(msg);
                    msg = ".3587";
                    adhTopLevelState.setCameFrom(msg);
                    expect(adhTopLevelState.getCameFrom()).toBe(msg);
                    expect(adhTopLevelState.getCameFrom()).toBe(msg);
                });

                it("before first setCameFrom, getCameFrom reads 'undefined'", () => {
                    expect(typeof adhTopLevelState.getCameFrom()).toBe("undefined");
                });

                it("clearCameFrom clears the stored value", () => {
                    var msg : string;
                    msg = "wefoidsut";
                    adhTopLevelState.setCameFrom(msg);
                    adhTopLevelState.clearCameFrom();
                    expect(adhTopLevelState.getCameFrom()).not.toBeDefined();
                });

                describe("redirectToCameFrom", () => {
                    it("does nothing if neither cameFrom nor default are set", () => {
                        adhTopLevelState.redirectToCameFrom();
                        expect(locationMock.url).not.toHaveBeenCalled();
                    });

                    it("redirects to cameFrom if cameFrom is set and default is not", () => {
                        adhTopLevelState.setCameFrom("foo");
                        adhTopLevelState.redirectToCameFrom();
                        expect(locationMock.url).toHaveBeenCalledWith("foo");
                    });

                    it("redirects to cameFrom both if cameFrom and default are set", () => {
                        adhTopLevelState.setCameFrom("foo");
                        adhTopLevelState.redirectToCameFrom("bar");
                        expect(locationMock.url).toHaveBeenCalledWith("foo");
                    });

                    it("redirects to default if default is set but cameFrom not", () => {
                        adhTopLevelState.redirectToCameFrom("bar");
                        expect(locationMock.url).toHaveBeenCalledWith("bar");
                    });
                });
            });
        });

        describe("MovingColumns", () => {
            var directive;
            var topLevelStateMock;

            beforeEach(() => {
                topLevelStateMock = <any>jasmine.createSpyObj("topLevelStateMock",
                               ["onSetContent2Url", "getMovingColumns", "onMovingColumns", "movingColumns"]);
                topLevelStateMock.movingColumns = {
                    "0": state.HIDE,
                    "1": state.COLLAPS,
                    "2": state.SHOW
                };

                directive = AdhTopLevelState.movingColumns(topLevelStateMock);
            });

            describe("link", () => {
                var scopeMock;
                var elementMock;

                beforeEach(() => {
                    scopeMock = {};
                    elementMock = <any>jasmine.createSpyObj("elementMock", ["addClass", "removeClass"]);

                    var link = directive.link;
                    link(scopeMock, elementMock);
                });

                describe("onMovingColumns", () => {
                    var callback;

                    beforeEach(() => {
                        callback = topLevelStateMock.onMovingColumns.calls.mostRecent().args[0];
                    });

                    it("adds class 'is-collapsed-show-show' if state is collapsed-show-show", () => {
                        callback({"0": state.COLLAPS, "1": state.SHOW, "2": state.SHOW});
                        expect(elementMock.addClass).toHaveBeenCalledWith("is-collapsed-show-show");
                    });

                    it("removes class 'is-collapsed-show-show' if columns is show-show-hide", () => {
                        callback({"0": state.COLLAPS, "1": state.SHOW, "2": state.SHOW});
                        callback({"0": state.SHOW, "1": state.SHOW, "2": state.HIDE});
                        expect(elementMock.removeClass).toHaveBeenCalledWith("is-collapsed-show-show");
                    });

                    it("adds class 'is-show-show-hidden' if state is show-show-hide", () => {
                        callback({"0": state.SHOW, "1": state.SHOW, "2": state.HIDE});
                        expect(elementMock.addClass).toHaveBeenCalledWith("is-show-show-hidden");
                    });

                    it("removes class 'is-show-show-hidden' if columns is show-show-hide", () => {
                        callback({"0": state.SHOW, "1": state.SHOW, "2": state.HIDE});
                        callback({"0": state.COLLAPS, "1": state.SHOW, "2": state.SHOW});
                        expect(elementMock.removeClass).toHaveBeenCalledWith("is-show-show-hidden");
                    });


                });


                describe("onSetContent2Url", () => {
                    var callback;

                    beforeEach(() => {
                        callback = topLevelStateMock.onSetContent2Url.calls.mostRecent().args[0];
                    });

                    it("sets content2Url in scope", () => {
                        callback("some/path");
                        expect(scopeMock.content2Url).toBe("some/path");
                    });
                });
            });
        });
    });
};
