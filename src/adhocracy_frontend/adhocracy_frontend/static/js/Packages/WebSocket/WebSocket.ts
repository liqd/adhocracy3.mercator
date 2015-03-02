/// <reference path="../../../lib/DefinitelyTyped/modernizr/modernizr.d.ts"/>

import AdhConfig = require("../Config/Config");
import AdhEventManager = require("../EventManager/EventManager");


/**
 * WebSocket as provided by the browser.
 */
export interface IRawWebSocket {
    send : (msg : string) => void;
    addEventListener : (event : any, callback : () => void) => void;
    onmessage? : (event : any) => void;
    onerror? : (event : any) => void;
    onopen? : (event : any) => void;
    onclose? : (event : any) => void;
    readyState : number;
    CONNECTING : number;
    OPEN : number;
    CLOSING : number;
    CLOSED : number;
}


export interface IServerEvent {
    event : string;
    resource : string;
    child? : string;
    version? : string;
}


interface IRequest {
    action : string;
    resource : string;
}


interface IResponseOk {
    status : string;
    action : string;
    resource : string;
}


interface IResponseError {
    error : string;
    details : string;
}


/**
 * WebSocket Service
 *
 * This service provides a callback-based API to the consumer modules
 * for keeping up to date with relevant changes on the server side.
 * The network protocol is specified in ./docs/source/websockets.rst.
 *
 * Note that WebSocket connections may get dropped or not be available
 * in the first place.  So you should not rely on updates.
 */
export class Service {
    "use strict";

    private connected : boolean;
    private ws : IRawWebSocket;
    private registrations : {[path : string] : number};
    private messageEventManager : AdhEventManager.EventManager;
    private domEventManager : AdhEventManager.EventManager;

    constructor(
        private adhConfig : AdhConfig.IService,
        private adhEventManagerClass : typeof AdhEventManager.EventManager,
        rawWebSocketFactory : (uri : string) => IRawWebSocket
    ) {
        this.connected = false;
        this.messageEventManager = new adhEventManagerClass();
        this.registrations = {};

        this.domEventManager = new adhEventManagerClass();

        this.ws = rawWebSocketFactory(adhConfig.ws_url);
        this.ws.onmessage = (ev) => {
            this.onmessage(ev);
            this.domEventManager.trigger("message", ev);
        };
        this.ws.onerror = (ev) => {
            this.onerror(ev);
            this.domEventManager.trigger("error", ev);
        };
        this.ws.onopen = (ev) => {
            this.resendSubscriptions();
            this.connected = true;
            this.domEventManager.trigger("open", ev);
        };
        this.ws.onclose = (ev) => {
            this.connected = false;
            this.domEventManager.trigger("close", ev);
        };
    }

    public isConnected() {
        return this.connected;
    }

    public register(path : string, callback : (msg : IServerEvent) => void) : Function {
        if (!this.registrations[path]) {
            this.registrations[path] = 1;
            this.send("subscribe", path);
        } else {
            this.registrations[path] += 1;
        }
        var off : Function = this.messageEventManager.on(path, callback);

        return () => {
            if (!this.registrations[path]) {
                throw "resource is not registered";
            }
            off();
            this.registrations[path] -= 1;
            if (this.registrations[path] === 0) {
                this.send("unsubscribe", path);
            }
        };
    }

    public addEventListener(event : string, callback : (arg?) => void) : Function {
        return this.domEventManager.on(event, callback);
    }

    private resendSubscriptions() : void {
        _.forOwn(this.registrations, (value, path) => {
            if (value) {
                this.send("subscribe", path);
            }
        });
    }

    private send(action : string, path : string) : void {
        if (this.ws.readyState === this.ws.OPEN) {
            this.ws.send(JSON.stringify({action: action, resource: path}));
        }
    }

    private onmessage(event) : void {
        var msg : IResponseOk | IResponseError | IServerEvent = JSON.parse(event.data);

        if (msg.hasOwnProperty("event")) {
            var serverEvent = <IServerEvent>msg;
            this.messageEventManager.trigger(serverEvent.resource, serverEvent);
        } else if (msg.hasOwnProperty("error")) {
            this.handleErrorResponse(<IResponseError>msg);
        }
    }

    private handleErrorResponse(msg : IResponseError) : void {
        switch (msg.error) {
            case "unknown_action":
            case "unknown_resource":
            case "malformed_message":
            case "invalid_json":
            case "subscribe_not_supported":
            case "internal_error":
                console.log(msg);
                throw "WebSocket: onmessage: received error message.";
            default:
                console.log(msg);
                throw "WebSocket: onmessage: received **unknown** error message.  this should not happen!";
        }
    }

    private onerror(msg) : void {
        console.log("WebSocket: error!");
        console.log(msg);
        throw "WebSocket: error!";
    }
};


export var dummyWebSocketFactory = (uri : string) => {
    return {
        send: (msg) => undefined,
        readyState: 3,
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    };
};


/**
 * Automatically choose a IRawWebSocket implementation.
 */
export var rawWebSocketFactoryFactory = (Modernizr : ModernizrStatic) => {
    if (Modernizr.websockets) {
        return (uri : string) => new WebSocket(uri);
    } else {
        return dummyWebSocketFactory;
    }
};


export var moduleName = "adhWebSocket";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEventManager.moduleName
        ])
        .factory("adhRawWebSocketFactory", ["Modernizr", rawWebSocketFactoryFactory])
        .service("adhWebSocket", ["adhConfig", "adhEventManagerClass", "adhRawWebSocketFactory", Service]);
};
