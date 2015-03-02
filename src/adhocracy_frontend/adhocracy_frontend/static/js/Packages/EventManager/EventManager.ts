/**
 * Generic event handler with on, off and trigger.
 *
 * This class is not meant to be used as a singleton service. You
 * should rather inject the class itself and create an instance where
 * you need it.  This way you can avoid conflicting event names.
 */
export class EventManager {
    private handlers : {[event : string]: {[id : number]: (arg : any) => void}} = {};
    private nextID : number = 0;

    private getNextID() : number {
        return this.nextID++;
    }

    public on(event : string, handler : (arg : any) => void) : Function {
        this.handlers[event] = this.handlers[event] || {};
        var id = this.getNextID();
        this.handlers[event][id] = handler;

        return () => {
            this.off(event, id);
        };
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

    public trigger(event : string, arg? : any) : void {
        for (var id in this.handlers[event]) {
            if (this.handlers[event].hasOwnProperty(id)) {
                var fn = this.handlers[event][id];
                fn(arg);
            }
        }
    }
}


export var moduleName = "adhEventManager";

export var register = (angular) => {
    angular
        .module(moduleName, [])
        .value("adhEventManagerClass", EventManager);
};
