import AdhEventHandler = require("../EventHandler/EventHandler");

/**
 * TopLevelState service for managing top level state.
 *
 * This service is used to interact with the general state of the
 * application.  In the UI, this state is represented in the moving
 * columns widget.  This state is also what should be encoded in the
 * URL.
 *
 * The state consists of the state of each column and the currently
 * focused column. Note that the "column" metaphor is derived from the
 * moving columns widget. This does not need to be represented by
 * actual columns in every implementation.
 *
 * Only focus and the state of content2 column are currently
 * implemented.
 */
export class TopLevelState {
    private eventHandler : AdhEventHandler.EventHandler;

    constructor(
        adhEventHandlerClass : typeof AdhEventHandler.EventHandler,
        private $location : ng.ILocationService
    ) {
        this.eventHandler = new adhEventHandlerClass();
    }

    public setFocus(column : number) : void {
        this.eventHandler.trigger("setFocus", column);
    }

    public onSetFocus(fn : (column : number) => void) : void {
        this.eventHandler.on("setFocus", fn);
    }

    public setContent2Url(url : string) : void {
        this.eventHandler.trigger("setContent2Url", url);
    }

    public onSetContent2Url(fn : (url : string) => void) : void {
        this.eventHandler.on("setContent2Url", fn);
    }

    // FIXME: {set,get}CameFrom should be worked into the class
    // doc-comment, but I don't feel I understand that comment well
    // enough to edit it.  (also, the entire toplevelstate thingy will
    // be refactored soon in order to get state mgmt with link support
    // right.  see /docs/source/api/frontend-state.rst)
    //
    // Open problem: if the user navigates away from the, say, login,
    // and the cameFrom stack will never be cleaned up...  how do we
    // clean it up?

    private cameFrom : string;

    public setCameFrom(path : string) : void {
        this.cameFrom = path;
    }

    public getCameFrom() : string {
        return this.cameFrom;
    }

    public clearCameFrom() : void {
        this.cameFrom = undefined;
    }

    public redirectToCameFrom(_default? : string) : void {
        var cameFrom = this.getCameFrom();
        if (typeof cameFrom !== "undefined") {
            this.$location.url(cameFrom);
        } else if (typeof _default !== "undefined") {
            this.$location.url(_default);
        }
    }
}


export var movingColumns = (topLevelState : TopLevelState) => {
    return {
        link: (scope, element) => {
            topLevelState.onSetFocus((column : number) : void => {
                // This is likely to change in the future.
                // So do not spend too much time interpreting this.
                if (column <= 1) {
                    element.removeClass("is-detail");
                } else if (column === 2) {
                    element.addClass("is-detail");
                }
            });
            topLevelState.onSetContent2Url((url : string) => {
                scope.content2Url = url;
            });
        }
    };
};


/**
 * A simple focus switcher that can be used until we have a proper widget for this.
 */
export var adhFocusSwitch = (topLevelState : TopLevelState) => {
    return {
        restrict: "E",
        template: "<a href=\"\" ng-click=\"switchFocus()\">X</a>",
        link: (scope) => {
            var column : number = 1;
            scope.switchFocus = () => {
                column = column === 1 ? 2 : 1;
                topLevelState.setFocus(column);
            };
        }
    };
};
