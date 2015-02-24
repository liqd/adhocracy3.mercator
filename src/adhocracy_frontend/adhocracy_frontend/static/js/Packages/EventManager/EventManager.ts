import _ = require("lodash");

import AdhUtil = require("../Util/Util");


/**
 * Generic event handler with on, off and trigger.
 *
 * This class is not meant to be used as a singleton service. You
 * should rather inject the class itself and create an instance where
 * you need it.  This way you can avoid conflicting event names.
 */
export class EventManager {
    private handlers : {[event : string]: {[id : number]: {
        priority : number;
        handler : (arg : any) => void;
    }}} = {};
    private nextID : number = 0;

    constructor(
        private $q : ng.IQService
    ) {}

    private getNextID() : number {
        return this.nextID++;
    }

    public on(event : string, handler : (arg : any) => any, priority : number = 100) : number {
        this.handlers[event] = this.handlers[event] || {};
        var id = this.getNextID();
        this.handlers[event][id] = {
            priority: priority,
            handler: handler
        };
        return id;
    }

    public off(event? : string, id? : number) : void {
        if (typeof event === "undefined") {
            this.handlers = {};
        } else if (typeof id === "undefined") {
            delete this.handlers[event];
        } else {
            delete this.handlers[event][id];
        }
    }

    public trigger(event : string, arg? : any) : ng.IPromise<void> {
        var handlers = (<Function>_.chain)(this.handlers[event])
            .values()
            .sortBy("priority")
            .reverse()
            .pluck("handler")
            .map((fn) => () => fn(arg))
            .value();

        return AdhUtil.qSync(this.$q)(handlers);
    }
}


export var moduleName = "adhEventManager";

export var register = (angular) => {
    angular
        .module(moduleName, [])
        .value("adhEventManagerClass", EventManager);
};
