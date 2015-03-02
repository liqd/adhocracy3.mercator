/**
 * This package provides directives that represent resources.
 *
 * These directives provide a generic interface for creating, displaying,
 * editing and deleting resources with minimal additional effort.
 *
 * Each resourceWidget takes care of its own resources.  There is a single
 * central resourceWrapper that manages communication and also takes care
 * of collecting all generated resources and dispatching an HTTP request
 * on submit.
 *
 * The resourceWidgets can access the resourceWrapper by requiring it and
 * using its controller (see https://docs.angularjs.org/guide/directive#creating-directives-that-communicate).
 * See ResourceWrapperController for a description of the interface.
 */

import _ = require("lodash");

import AdhEventManager = require("../EventManager/EventManager");
import AdhHttp = require("../Http/Http");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");

import ResourcesBase = require("../../ResourcesBase");


export enum Mode {display, edit};


/**
 * Directive that wraps resourceWidgets, manages communication between
 * parent and child resources in the DAG, and takes
 * care of dispatching a HTTP request on submit.
 *
 * You can pass two callbacks to this directive:
 *
 * onSubmit
 * : called after successful submit
 *
 * onCancel
 * : called after cancel
 *
 * Note that these callbacks need to be functions of type () : void in the
 * parent scope.
 */
export class ResourceWrapperController {
    private resourcePromises : ng.IPromise<ResourcesBase.Resource[]>[];

    constructor(
        private $scope : ng.IScope,
        private $attrs : ng.IAttributes,
        private $q : ng.IQService,
        private $parse : ng.IParseService,
        adhEventManagerClass,
        private adhHttp : AdhHttp.Service<any>
    ) {
        this.eventManager = new adhEventManagerClass();
        this.resourcePromises = [];
    }

    private resetResourcePromises() : void {
        this.resourcePromises = [];
    }

    private triggerCallback(key : string, result? : any) : void {
        if (typeof this.$attrs[key] !== "undefined") {
            var fn = this.$parse(this.$attrs[key]);
            fn(this.$scope.$parent, { result: result });
        }
    }

    // FIXME: This is currently undocumented and I also don't like it.
    // We should think of a better way to do it.
    private displayOrClear() : void {
        if (typeof this.$attrs["clearOnSubmit"] !== "undefined") {
            this.triggerClear();
        } else {
            this.triggerSetMode(Mode.display);
        }
    }

    /**
     * An event handler that is used whenever the resourceWrapper needs to
     * contact the resourceWidgets. The following events are used:
     *
     * setMode
     * : set mode to the passed argument
     *
     * cancel
     * : when in edit mode, reset scope and switch to display mode
     *
     * submit
     * : resolve promise with a list of resources
     */
    public eventManager : AdhEventManager.EventManager;

    /**
     * registers a promise that will eventually be resolved with a list of
     * resources on submit.
     */
    public registerResourceDirective(promise : ng.IPromise<ResourcesBase.Resource[]>) {
        this.resourcePromises.push(promise);
    }

    /**
     * triggers a "setMode" event on eventManager
     */
    public triggerSetMode = (mode : Mode) => {
        this.resetResourcePromises();
        this.eventManager.trigger("setMode", mode);
    }

    /**
     * triggers a "cancel" event on eventManager
     */
    public triggerCancel = () => {
        this.eventManager.trigger("cancel");
        this.triggerCallback("onCancel");
    }

    /**
     * triggers a "submit" event on eventManager. This will cause the
     * resourceWidgets to resolve the promises registered via
     * registerResourceDirective. When all promises have been resolved,
     * all promised resources will be posted to the server via deepPost.
     */
    public triggerSubmit = () => {
        this.eventManager.trigger("submit");
        return this.$q.all(this.resourcePromises)
            .then((resourceLists) => {
                this.resetResourcePromises();
                var resources = _.reduce(resourceLists, (a : any[], b) => a.concat(b));
                return this.adhHttp.deepPost(resources);
            })
            .then(
                (result : any) => {
                    this.displayOrClear();
                    this.triggerCallback("onSubmit", result);
                },
                (errors : AdhHttp.IBackendErrorItem[]) => {
                    this.triggerSetMode(Mode.edit);
                    throw errors;
                });
    }

    /**
     * triggers a "clear" event on eventManager.
     */
    public triggerClear = () => {
        this.eventManager.trigger("clear");
    }
}

export var resourceWrapper = () => {
    return {
        restrict: "E",
        controller: ["$scope", "$attrs", "$q", "$parse", "adhEventManagerClass", "adhHttp", ResourceWrapperController]
    };
};


export interface IResourceWidgetScope extends ng.IScope {
    mode : Mode;
    path : string;
    errors? : AdhHttp.IBackendErrorItem[];

    /**
     * Set mode to "edit"
     */
    edit() : void;

    /**
     * Trigger submit on resourceWrapper.
     */
    submit() : ng.IPromise<void>;

    /**
     * Trigger cancel on resourceWrapper.
     */
    cancel() : void;

    /**
     * Emit an angular "delete" event.
     */
    delete() : void;

    /**
     * Trigger clear on resourceWrapper.
     */
    clear() : void;
}

export interface IResourceWidgetInstance<R extends ResourcesBase.Resource, S extends IResourceWidgetScope> {
    scope : S;
    wrapper : ResourceWrapperController;
    deferred : ng.IDeferred<R[]>
}

/**
 * Abstract base class for all resourceWidgets.
 *
 * This class implements the basic functionality to interact with a
 * resourceWrapper. It is implemented in such a way that most functionality is
 * implemented in widget methods. This way it is easy to extend.
 *
 * Subclasses need to implement _handleDelete, _update, _create and _edit. They
 * must also set templateUrl in the constructor. Additionally, they may extend
 * createDirective to modify the generated directive directly.
 *
 * If a resourceWidget is instantiated without a mode, the mode defaults to
 * "display".
 *
 * A resourceWidget must always be instantiated with a path. If you want to use
 * the widget to create a new resource and therefore do not know its path, you
 * must use a preliminary name (see PreliminaryNames package). The
 * resourceWidget will detect that and behave accordingly (e.g. it will not try
 * to load the resource from the server).
 */
export class ResourceWidget<R extends ResourcesBase.Resource, S extends IResourceWidgetScope> {
    public templateUrl : string;

    constructor(
        public adhHttp : AdhHttp.Service<any>,
        public adhPreliminaryNames : AdhPreliminaryNames.Service,
        public $q : ng.IQService
    ) {}

    public createDirective() : ng.IDirective {
        var self : ResourceWidget<R, S> = this;

        return {
            restrict: "E",
            require: ["^adhResourceWrapper"],
            templateUrl: self.templateUrl,
            scope: {
                mode: "@",
                path: "@"
            },
            link: (scope : S, element, attrs, controllers) => {
                self.link(scope, element, attrs, controllers);
            }
        };
    }

    public link(
        scope : S,
        element : ng.IAugmentedJQuery,
        attrs : ng.IAttributes,
        controllers
    ) : IResourceWidgetInstance<R, S> {
        var self : ResourceWidget<R, S> = this;

        var wrapper : ResourceWrapperController = controllers[0];

        var instance : IResourceWidgetInstance<R, S> = {
            scope: scope,
            wrapper: wrapper,
            deferred: self.$q.defer()
        };

        var setModeOff = wrapper.eventManager.on("setMode", (mode : Mode) =>
            self.setMode(instance, mode));

        var submitOff = wrapper.eventManager.on("submit", () =>
            self.provide(instance).then((resources) => instance.deferred.resolve(resources)));

        var cancelOff = wrapper.eventManager.on("cancel", () => {
            if (scope.mode === Mode.edit) {
                return self.update(instance).then(() => {
                    self.setMode(instance, Mode.display);
                });
            } else {
                return self.$q.when();
            }
        });

        var clearOff = wrapper.eventManager.on("clear", () =>
            self.clear(instance));

        scope.$on("triggerDelete", (ev, path : string) => self._handleDelete(instance, path));
        scope.$on("$destroy", () => {
            setModeOff();
            submitOff();
            cancelOff();
            clearOff();
            instance.deferred.resolve([]);
        });

        scope.edit = () => wrapper.triggerSetMode(Mode.edit);
        scope.submit = () => {
            return wrapper.triggerSubmit()
                .catch((errors : AdhHttp.IBackendErrorItem[]) => {
                    scope.errors = errors;
                    throw errors;
                });
        };
        scope.cancel = () => wrapper.triggerCancel();
        scope.delete = () => scope.$emit("triggerDelete", scope.path);
        scope.clear = () => wrapper.triggerClear();

        self.setMode(instance, scope.mode);
        self.update(instance);

        return instance;
    }

    /**
     * Set the mode of a this widget to either "display" or "edit".
     *
     * this method should not be used directly. You should rather use
     * instance.wrapper.triggerSetMode in order to change the mode on all
     * resourceWidgets in this resourceWrapper.
     */
    private setMode(instance : IResourceWidgetInstance<R, S>, mode? : string) : void;
    private setMode(instance : IResourceWidgetInstance<R, S>, mode? : Mode) : void;
    private setMode(instance, mode) {
        var self : ResourceWidget<R, S> = this;

        if (typeof mode === "string") {
            mode = Mode[mode];
        } else if (typeof mode === "undefined") {
            mode = Mode.display;
        }

        instance.deferred.resolve([]);
        if (mode === Mode.edit) {
            instance.deferred = self.$q.defer();
            instance.wrapper.registerResourceDirective(instance.deferred.promise);
        }
        if (mode === Mode.display) {
            instance.scope.errors = [];
        }
        instance.scope.mode = mode;
    }

    public update(instance : IResourceWidgetInstance<R, S>) : ng.IPromise<void> {
        var self : ResourceWidget<R, S> = this;

        if (self.adhPreliminaryNames.isPreliminary(instance.scope.path)) {
            return self.$q.when();
        } else {
            return self.adhHttp.get(instance.scope.path)
                .then((resource : R) => self._update(instance, resource));
        }
    }

    /**
     * Create resource(s) from scope.
     *
     * Calls _create/_edit if scope.path is preliminary/not preliminary.
     */
    public provide(instance : IResourceWidgetInstance<R, S>) : ng.IPromise<R[]> {
        if (this.adhPreliminaryNames.isPreliminary(instance.scope.path)) {
            return this._create(instance);
        } else {
            return this.adhHttp.get(instance.scope.path).then((old) => {
                return this._edit(instance, old);
            });
        }
    }

    public clear(instance : IResourceWidgetInstance<R, S>) : void {
        instance.deferred.resolve([]);
        instance.deferred = this.$q.defer();
        instance.scope.errors = [];
        instance.wrapper.registerResourceDirective(instance.deferred.promise);
        this._clear(instance);
    }

    /**
     * Handle delete events from children.
     */
    public _handleDelete(instance : IResourceWidgetInstance<R, S>, path : string) : ng.IPromise<void> {
        throw "abstract method: not implemented";
    }

    /**
     * Update scope from resource.
     */
    public _update(instance : IResourceWidgetInstance<R, S>, resource : R) : ng.IPromise<void> {
        throw "abstract method: not implemented";
    }

    /**
     * Initially create resource(s) from scope.
     */
    public _create(instance : IResourceWidgetInstance<R, S>) : ng.IPromise<R[]> {
        throw "abstract method: not implemented";
    }

    /**
     * Create modified resource(s) from scope.
     */
    public _edit(instance : IResourceWidgetInstance<R, S>, old : R) : ng.IPromise<R[]> {
        throw "abstract method: not implemented";
    }

    /**
     * Reset the directive to initial state. This function should probably
     * clear the scope and reset all forms to prestine state.
     */
    public _clear(instance : IResourceWidgetInstance<R, S>) : void {
        return;
    }
}


export var moduleName = "adhResourceWidgets";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEventManager.moduleName,
            AdhHttp.moduleName,
            AdhPreliminaryNames.moduleName
        ])
        .directive("adhResourceWrapper", resourceWrapper);
};
