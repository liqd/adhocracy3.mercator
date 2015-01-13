import AdhHttp = require("../Http/Http");


/**
 * See `console.*` and `window.onerror` with functions that send all
 * of console.log to the backend.
 *
 * WARNING: Before you activate this service, consider privacy
 * implications and legal constraints!
 *
 * FIXME: some exceptions are not caught, e.g. (I think) exceptions in
 * async calls (?) and things called from dom, like `<img
 * src="bad-url" />`
 *
 * FIXME: this may break IE9.  it certainly won't work as intended.
 */
export class Service {
    private verbosity = {
        header: true,
        reportToBackend: true,
        reportToConsole: true
    }

    constructor(private adhHttp : AdhHttp.Service<any>) {
        (<any>console).__log = (<any>console).log;
        (<any>console).log = () => {
            if (this.verbosity.header) (<any>console).__log("*** log");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__log.apply((<any>console), arguments);
        };

        (<any>console).__assert = (<any>console).assert;
        (<any>console).assert = () => {
            if (this.verbosity.header) (<any>console).__log("*** assert");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__assert.apply((<any>console), arguments);
        };

        (<any>console).__trace = (<any>console).trace;
        (<any>console).trace = () => {
            if (this.verbosity.header) (<any>console).__log("*** trace");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__trace.apply((<any>console), arguments);
        };

        (<any>console).__debug = (<any>console).debug;
        (<any>console).debug = () => {
            if (this.verbosity.header) (<any>console).__debug("*** debug");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__debug.apply((<any>console), arguments);
        };

        (<any>console).__info = (<any>console).info;
        (<any>console).info = () => {
            if (this.verbosity.header) (<any>console).__info("*** info");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__info.apply((<any>console), arguments);
        };

        (<any>console).__warn = (<any>console).warn;
        (<any>console).warn = () => {
            if (this.verbosity.header) (<any>console).__warn("*** warn");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__warn.apply((<any>console), arguments);
        };

        (<any>console).__error = (<any>console).error;
        (<any>console).error = () => {
            if (this.verbosity.header) (<any>console).__error("*** error");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__error.apply((<any>console), arguments);
        };

        window.onerror = () => {
            if (this.verbosity.header) (<any>console).__log("*** EXCEPTION!");
            if (this.verbosity.reportToBackend) this.report(arguments);
            if (this.verbosity.reportToConsole) (<any>console).__log.apply((<any>console), arguments);
        };
    }

    private report(arguments : any) : void {
        this.adhHttp.postRaw("/browser_console/", arguments);
    }
}

export var moduleName = "adhRemoteBrowserConsole";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName
        ])
        .service("adhRemoteBrowserConsole", ["adhHttp", Service]);
};
