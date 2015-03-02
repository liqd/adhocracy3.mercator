/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhEventManager = require("./EventManager");

export var register = () => {
    describe("EventManager", () => {
        var eventManager : AdhEventManager.EventManager;

        beforeEach(() => {
            eventManager = new AdhEventManager.EventManager();
        });

        it("allows to set handlers for events", () => {
            var spy = jasmine.createSpy("spy");
            eventManager.on("test", spy);
            eventManager.trigger("test");
            expect(spy).toHaveBeenCalled();
        });

        it("allow to pass a single argument on trigger", () => {
            var spy = jasmine.createSpy("spy");
            eventManager.on("test", spy);
            eventManager.trigger("test", "testArg");
            expect(spy).toHaveBeenCalledWith("testArg");
        });

        it("allows to unregister a single handler", () => {
            var spy1 = jasmine.createSpy("spy1");
            var spy2 = jasmine.createSpy("spy2");
            var off = eventManager.on("test", spy1);
            eventManager.on("test", spy2);
            off();
            eventManager.trigger("test");
            expect(spy1).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("allows to clear all handlers for a single event", () => {
            var spy1 = jasmine.createSpy("spy1");
            var spy2 = jasmine.createSpy("spy2");
            eventManager.on("test1", spy1);
            eventManager.on("test2", spy2);
            eventManager.off("test1");
            eventManager.trigger("test1");
            eventManager.trigger("test2");
            expect(spy1).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("allows to clear all handlers for all events", () => {
            var spy1 = jasmine.createSpy("spy1");
            var spy2 = jasmine.createSpy("spy2");
            eventManager.on("test1", spy1);
            eventManager.on("test2", spy2);
            eventManager.off();
            eventManager.trigger("test1");
            eventManager.trigger("test2");
            expect(spy1).not.toHaveBeenCalled();
            expect(spy2).not.toHaveBeenCalled();
        });
    });
};
