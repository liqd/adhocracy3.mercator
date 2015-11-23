import * as AdhAngularHelpersModule from "../AngularHelpers/Module";
import * as AdhEmbedModule from "../Embed/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhInjectModule from "../Inject/Module";
import * as AdhListingModule from "../Listing/Module";
import * as AdhPermissionsModule from "../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../PreliminaryNames/Module";
import * as AdhWebSocketModule from "../WebSocket/Module";

import * as AdhEmbed from "../Embed/Embed";
import * as AdhListing from "../Listing/Listing";

import * as AdhMapping from "./Mapping";


export var moduleName = "adhMapping";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAngularHelpersModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhInjectModule.moduleName,
            AdhListingModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhWebSocketModule.moduleName,
            "duScroll"
        ])
        .provider("adhMapData", AdhMapping.MapDataProvider)
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("map-input")
                .registerDirective("map-detail")
                .registerDirective("map-listing-internal");
        }])
        .config(["adhMapDataProvider", (adhMapDataProvider : AdhMapping.MapDataProvider) => {
            adhMapDataProvider.style = {
                fillColor: "#000",
                color: "#000",
                opacity: 0.5,
                stroke: false
            };

            adhMapDataProvider.icons["item"] = {
                className: "icon-map-pin",
                iconAnchor: [17.5, 41],
                iconSize: [35, 42]
            };
            adhMapDataProvider.icons["add"] = {
                className: "icon-map-pin-add",
                iconAnchor: [16.5, 41],
                iconSize: [35, 42]
            };
            adhMapDataProvider.icons["item-selected"] = {
                className: "icon-map-pin is-active",
                iconAnchor: [17.5, 41],
                iconSize: [33, 42]
            };
        }])
        .directive("adhMapInput", ["adhConfig", "adhSingleClickWrapper", "adhMapData", "$timeout", "leaflet", AdhMapping.mapInput])
        .directive("adhMapDetail", ["adhMapData", "leaflet", "$timeout", AdhMapping.mapDetail])
        .directive("adhMapListingInternal", ["adhConfig", "adhHttp", AdhMapping.mapListingInternal])
        .directive("adhMapListing", ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
                new AdhMapping.Listing(new AdhListing.ListingPoolAdapter()).createDirective(adhConfig, adhWebSocket)]);
};
