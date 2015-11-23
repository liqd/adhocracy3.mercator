import * as AdhHttpModule from "../Http/Module";
import * as AdhInjectModule from "../Inject/Module";
import * as AdhPermissionsModule from "../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../PreliminaryNames/Module";
import * as AdhWebSocketModule from "../WebSocket/Module";

import * as AdhListing from "./Listing";


export var moduleName = "adhListing";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttpModule.moduleName,
            AdhInjectModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhWebSocketModule.moduleName
        ])
        .directive("adhFacets", ["adhConfig", AdhListing.facets])
        .directive("adhListingActions", ["adhConfig", AdhListing.listingActionsDirective])
        .directive("adhMapSwitchAction", ["adhConfig", AdhListing.mapSwitchDirective])
        .directive("adhFilterAndSort", [AdhListing.filterAndSortDirective])
        .directive("adhListing",
            ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
                new AdhListing.Listing(new AdhListing.ListingPoolAdapter()).createDirective(adhConfig, adhWebSocket)]);
};
