/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import AdhConfig = require("../Config/Config");
import AdhWebSocket = require("./WebSocket");


var config: AdhConfig.IService = <any>{
    pkg_path: "mock",
    rest_url: "mock",
    rest_platform_path: "mock",
    ws_url: "mock",
    embedded: false,
    trusted_domains: []
};

export var register = () => {
    describe("WebSocket", () => {
        describe("Service", () => {
            var service;
            var adhEventManagerClassMock;
            var adhEventManagerMocks;
            var adhRawWebSocketMock;
            var eventOff;

            beforeEach(() => {
                eventOff = jasmine.createSpy("eventOff");
                adhEventManagerClassMock = function() {
                    this.on = jasmine.createSpy("adhEventManager.on").and.returnValue(eventOff);
                    this.trigger = jasmine.createSpy("adhEventManager.trigger");
                    adhEventManagerMocks.push(this);
                };
                adhRawWebSocketMock = jasmine.createSpyObj("adhRawWebSocketFactory", ["send", "addEventListener"]);
                adhEventManagerMocks = [];
                service = new AdhWebSocket.Service(config, adhEventManagerClassMock, () => adhRawWebSocketMock);
            });

            it("calls the send method of web socket on every register to different resources", () => {
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(0);
                service.register("/adhocracy", () => null);
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(1);
                service.register("/adhocracy/somethingelse", () => null);
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(2);
            });

            it("sends only one subscription for multiple registrations to same resource", () => {
                var resource = "/adhocracy/sidty";
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(0);
                service.register(resource, () => null);
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(1);
                service.register(resource, () => null);
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(1);
            });

            it("sends an unsubscription if all registrations have been unregistered", () => {
                var resource = "/adhocracy/sidty";
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(0);
                var off1 = service.register(resource, () => null);
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(1);
                var off2 = service.register(resource, () => null);
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(1);
                off1();
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(1);
                off2();
                expect(adhRawWebSocketMock.send.calls.count()).toEqual(2);
            });

            it("calls eventManager.trigger on event", () => {
                var resource = "/adhocracy/sidty";
                var msg = {
                    resource: resource,
                    event: "new_child",
                    child: resource + "/fiyudt8y"
                };

                adhRawWebSocketMock.onmessage({
                    data: JSON.stringify(msg)
                });
                expect(adhEventManagerMocks[0].trigger).toHaveBeenCalledWith(resource, msg);
            });

            it("throws an exception on error", () => {
                expect(() => adhRawWebSocketMock.onmessage({
                    data: JSON.stringify({
                        error: "some_error"
                    })
                })).toThrow();

                expect(() => adhRawWebSocketMock.onmessage({
                    data: JSON.stringify({
                        error: "unknown_action"
                    })
                })).toThrow();

                expect(adhEventManagerMocks[0].trigger).not.toHaveBeenCalled();
            });

            it("resends all subscriptions on WebSocket open", () => {
                var off1 = service.register("resource1", () => null);
                off1();
                service.register("resource2", () => null);
                service.register("resource2", () => null);

                var calls = adhRawWebSocketMock.send.calls.count();

                adhRawWebSocketMock.onopen();

                expect(adhRawWebSocketMock.send.calls.count()).toBe(calls + 1);
            });
        });
    });
};
