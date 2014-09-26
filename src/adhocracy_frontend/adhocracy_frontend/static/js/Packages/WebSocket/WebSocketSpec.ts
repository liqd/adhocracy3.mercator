/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>

import Config = require("../Config/Config");
import WebSocket = require("../WebSocket/WebSocket");

export var register = () => {
    // FIXME: This should be ``describe("WebSocket")`` and should be wrapped in a
    // ``describe("Services")`` to mirror the module structure. This is not
    // currently possible because the script that generates AdhocracySpec.ts
    // includes all *Spec.ts modules.

    describe("WebSocket", () => {
        var config: Config.Type = <any>{
            pkg_path: "mock",
            rest_url: "mock",
            rest_platform_path: "mock",
            ws_url: "mock",
            embedded: false,
            trusted_domains: []
        };

        // constructor for a mock raw web socket that leaks the
        // constructee for inspection.
        var wsRaw: any;
        var constructRawWebSocket = (uri: string): WebSocket.IRawWebSocket => {
            wsRaw = <any>jasmine.createSpyObj("RawWebSocketMock", ["send", "onmessage", "onerror", "onopen", "onclose"]);
            return wsRaw;
        };
        var ws;

        beforeEach(() => {
            ws = WebSocket.factoryIService(config, constructRawWebSocket);
        });

        it("does not initially call the send method of web socket", () => {
            expect(wsRaw.send.calls.any()).toEqual(false);
        });

        it("returns '0' as callback handle on first registration", () => {
            expect(ws.register("/adhocracy", () => null)).toEqual("0");
        });

        it("returns '1' as callback handle on second registration", () => {
            ws.register("/adhocracy", () => null);
            expect(ws.register("/adhocracy/somethingelse", () => null)).toEqual("1");
        });

        it("calls the send method of web socket on every register to different resources", () => {
            expect(wsRaw.send.calls.count()).toEqual(0);
            ws.register("/adhocracy", () => null);
            expect(wsRaw.send.calls.count()).toEqual(1);
            ws.register("/adhocracy/somethingelse", () => null);
            expect(wsRaw.send.calls.count()).toEqual(2);
        });

        it("sends only one subscription for multiple registrations to same resource", () => {
            var resource = "/adhocracy/sidty";
            ws.register(resource, () => null);
            ws.register(resource, () => null);
            expect(wsRaw.send.calls.count()).toEqual(1);
            ws.register(resource, () => null);
            expect(wsRaw.send.calls.count()).toEqual(1);
        });

        it("calls callbacks only between being registered and being unregistered", () => {
            // register spy object as callback
            var cb = {
                cb: (event) => null
            };
            (<any>spyOn(cb, "cb")).and.callThrough();
            var handle: string = ws.register("/adhocracy/somethingactive", cb.cb);

            expect((<any>cb.cb).calls.count()).toEqual(0);

            // trigger event
            wsRaw.onmessage({ data: JSON.stringify({
                resource: "/adhocracy/somethingactive",
                event: "new_child",
                child: "/adhocracy/somethingactive/fiyudt8y"
            }, null, 2)});

            expect((<any>cb.cb).calls.count()).toEqual(1);

            // unregister callback
            ws.unregister("/adhocracy/somethingactive", handle);

            // trigger another event
            wsRaw.onmessage({ data: JSON.stringify({
                resource: "/adhocracy/somethingactive",
                event: "new_child",
                child: "/adhocracy/somethingactive/q2u7"
            }, null, 2)});

            expect((<any>cb.cb).calls.count()).toEqual(1);
        });

        it("throws an exception on un-registration of a non-existing handle", () => {
            expect(() => ws.unregister("/adhocracy/somethingelse", "81")).toThrow();
        });
    });
};
