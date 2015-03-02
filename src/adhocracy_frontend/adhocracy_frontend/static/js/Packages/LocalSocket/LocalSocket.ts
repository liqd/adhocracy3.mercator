import AdhEventManager = require("../EventManager/EventManager");
import AdhUtil = require("../Util/Util");
import AdhWebSocket = require("../WebSocket/WebSocket");


export interface ILocalEvent extends AdhWebSocket.IServerEvent {}


/**
 * The LocalSocket Service is mostly compatible to the WebSocket Service.
 * The key difference is that not client-server communication takes place.
 * This means that you will only receive events that originate from the
 * local client.  In many cases this is desired because we do not want the
 * UI to change all the time but we do want it to update on user interaction.
 *
 * FIXME: Currewntly, very few events are actually triggered.
 */
export class Service {
    "use strict";

    private messageEventManager : AdhEventManager.EventManager;

    constructor(adhEventManagerClass : typeof AdhEventManager.EventManager) {
        this.messageEventManager = new adhEventManagerClass();
    }

    public register(path : string, callback : (msg : ILocalEvent) => void) : Function {
        return this.messageEventManager.on(path, callback);
    }

    public trigger(path : string, event : ILocalEvent) : void {
        this.messageEventManager.trigger(path, event);

        if (path !== "/") {
            var parentPath = AdhUtil.parentPath(path);

            if (event.event === "modified") {
                this.trigger(parentPath, this.modifiedChildEvent(parentPath, path));
            } else if (event.event === "removed") {
                this.trigger(parentPath, this.removedChildEvent(parentPath, path));
            }
            this.trigger(parentPath, this.changedDescendantsEvent(parentPath));
        }
    }

    // event factories
    public modifiedEvent(resource : string) : ILocalEvent {
        return {
            event: "modified",
            resource: resource
        };
    }

    public removedEvent(resource : string) : ILocalEvent {
        return {
            event: "removed",
            resource: resource
        };
    }

    public newChildEvent(resource : string, child : string) : ILocalEvent {
        return {
            event: "new_child",
            resource: resource,
            child: child
        };
    }

    public removedChildEvent(resource : string, child : string) : ILocalEvent {
        return {
            event: "removed_child",
            resource: resource,
            child: child
        };
    }

    public modifiedChildEvent(resource : string, child : string) : ILocalEvent {
        return {
            event: "modified_child",
            resource: resource,
            child: child
        };
    }

    public changedDescendantsEvent(resource : string) : ILocalEvent {
        return {
            event: "changed_descendants",
            resource: resource
        };
    }

    public newVersionEvent(resource : string, version : string) : ILocalEvent {
        return {
            event: "new_version",
            resource: resource,
            version: version
        };
    }
}


export var moduleName = "adhLocalSocket";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEventManager.moduleName
        ])
        .service("adhLocalSocket", ["adhEventManagerClass", Service]);
};
