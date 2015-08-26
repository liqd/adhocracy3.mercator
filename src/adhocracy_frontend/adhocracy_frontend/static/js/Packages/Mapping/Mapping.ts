/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/leaflet/leaflet.d.ts"/>

import _ = require("lodash");

import ResourcesBase = require("../../ResourcesBase");

import AdhAngularHelpers = require("../AngularHelpers/AngularHelpers");
import AdhConfig = require("../Config/Config");
import AdhEmbed = require("../Embed/Embed");
import AdhListing = require("../Listing/Listing");
import AdhWebSocket = require("../WebSocket/WebSocket");

// FIXME: See #1008
import AdhHttp = require("../Http/Http");  if (AdhHttp) { ; }
import AdhPermissions = require("../Permissions/Permissions");  if (AdhPermissions) { ; }
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");  if (AdhPreliminaryNames) { ; }

import AdhMappingUtils = require("./MappingUtils");

var pkgLocation = "/Mapping";


var refreshAfterColumnExpandHack = (
    $timeout : angular.ITimeoutService,
    leaflet : typeof L
) => (map : L.Map, bounds : L.LatLngBounds) => {
    $timeout(() => {
        map.invalidateSize(false);
        map.fitBounds(bounds);
        leaflet.Util.setOptions(map, {
            minZoom: map.getZoom()
        });
    }, 500);  // FIXME: moving column transition duration
};

// FIXME DefinitelyTyped: this is basically L.DivIconOptions, but with
// number[] instead of L.Point. Leaflet accepts both:
// http://leafletjs.com/reference.html#point
export interface IIcon {
    iconSize?: number[];
    iconAnchor?: number[];
    popupAnchor? : number[];
    className?: string;
    html?: string;
}

export interface IMapData {
    style : L.PathOptions;
    getIcon(key : string) : L.DivIcon;
}

export class MapDataProvider {
    public style : L.PathOptions;
    public icons : {[key : string]: IIcon};
    public $get : any[];

    constructor() {
        var self : MapDataProvider = this;

        self.style = {};
        self.icons = {};

        self.$get = ["leaflet", (leaflet : typeof L) => {
            return {
                style: self.style,
                getIcon: (key) => {
                    return leaflet.divIcon(<any>self.icons[key]);
                }
            };
        }];
    }
}

export interface IMapInputScope extends angular.IScope {
    lat : number;
    lng : number;
    height : number;
    polygon : L.Polygon;
    rawPolygon : any;
    zoom? : number;
    text : string;
    error : boolean;
    dirty : boolean;
    resetCoordinates() : void;
    clearCoordinates() : void;
    pin? : string;
}

export var mapInput = (
    adhConfig : AdhConfig.IService,
    adhSingleClickWrapper,
    adhMapData : IMapData,
    $timeout : angular.ITimeoutService,
    leaflet : typeof L
) => {
    return {
        scope: {
            lat: "=",
            lng: "=",
            height: "@",
            rawPolygon: "=polygon",
            zoom: "@?",
            pin: "@?"
        },
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Input.html",
        link: (scope : IMapInputScope, element) => {

            var oldLng : number = _.clone(scope.lng);
            var oldLat : number = _.clone(scope.lat);

            scope.dirty = false;

            var mapElement = element.find(".map");
            mapElement.height(scope.height);

            var map = leaflet.map(mapElement[0]);
            leaflet.tileLayer("https://maps.berlinonline.de/tile/bright/{z}/{x}/{y}.png", {maxZoom: 18}).addTo(map);

            scope.polygon = leaflet.polygon(leaflet.GeoJSON.coordsToLatLngs(scope.rawPolygon), adhMapData.style);
            scope.polygon.addTo(map);

            // limit map to polygon
            map.fitBounds(scope.polygon.getBounds());
            leaflet.Util.setOptions(map, {
                minZoom: map.getZoom()
            });

            if (typeof scope.zoom !== "undefined") {
                map.setZoom(scope.zoom);
                //
            }

            var selectedItemLeafletIcon = adhMapData.getIcon(scope.pin || "item-selected");
            var marker : L.Marker;

            var createMarker = (latlng : L.LatLng) : void => {
                marker = leaflet
                    .marker(latlng)
                    .setIcon(selectedItemLeafletIcon)
                    .addTo(map)

                    // only allow to change location by dragging if the new point is inside the polygon
                    .on("dragend", (event : L.LeafletDragEndEvent) => {
                        var result = event.target.getLatLng();
                        var pointInPolygon = AdhMappingUtils.pointInPolygon(result, scope.polygon);

                        if (pointInPolygon) {
                            scope.dirty = true;
                            $timeout(() => {
                                oldLat = scope.lat;
                                oldLng = scope.lng;
                                scope.lat = result.lat;
                                scope.lng = result.lng;
                            });
                        } else {
                            marker.setLatLng(leaflet.latLng(scope.lat, scope.lng));
                            marker.dragging.disable();
                            $timeout(() => {
                                scope.text = "TR__MAP_MARKER_ERROR";
                                scope.error = true;
                                $timeout(() => {
                                    scope.text = "TR__MAP_EXPLAIN_DRAG";
                                    marker.dragging.enable();
                                    scope.error = false;
                                }, 2000);
                            });
                        }
                    });
            };

            if (scope.lat || scope.lng) {
                createMarker(leaflet.latLng(scope.lat, scope.lng));
                marker.dragging.enable();

                scope.text = "TR__MAP_EXPLAIN_DRAG";
            } else {
                scope.text = "TR__MAP_EXPLAIN_CLICK";
            }

            // when the polygon is clicked, set the marker there
            adhSingleClickWrapper(scope.polygon).on("sglclick", (event : L.LeafletMouseEvent) => {
                if (typeof marker === "undefined") {
                    createMarker(event.latlng);
                } else {
                    marker.setLatLng(event.latlng);
                    scope.dirty = true;
                }
                marker.dragging.enable();
                $timeout(() => {
                    oldLat = scope.lat;
                    oldLng = scope.lng;
                    scope.lat = event.latlng.lat;
                    scope.lng = event.latlng.lng;
                    scope.text = "TR__MAP_EXPLAIN_DRAG";
                });
            });

            scope.polygon.on("dblclick", (event : L.LeafletMouseEvent) => {
                map.zoomIn();
            });
            map.on("dblclick", (event : L.LeafletMouseEvent) => {
                map.zoomIn();
            });

            scope.resetCoordinates = () => {
                scope.lng = oldLng;
                scope.lat = oldLat;
                marker.setLatLng(leaflet.latLng(scope.lat, scope.lng));
                scope.dirty = false;
                scope.text = "TR__MAP_EXPLAIN_RESET";
                $timeout(() => {
                    scope.text = "TR__MAP_EXPLAIN_DRAG";
                }, 2000);
            };

            scope.clearCoordinates = () => {
                scope.lng = undefined;
                scope.lat = undefined;
                map.removeLayer(marker);
                marker = undefined;
                scope.dirty = false;
                scope.text = "TR__MAP_EXPLAIN_CLICK";
            };

            refreshAfterColumnExpandHack($timeout, leaflet)(map, scope.polygon.getBounds());
        }
    };
};

export var mapDetail = (
    adhMapData : IMapData,
    leaflet : typeof L,
    $timeout : angular.ITimeoutService
) => {
    return {
        scope: {
            lat: "=",
            lng: "=",
            polygon: "=",
            height: "@",
            zoom: "@?",
            pin: "@?"
        },
        restrict: "E",
        template: "<div class=\"map\"></div>",
        link: (scope, element) => {

            var mapElement = element.find(".map");
            mapElement.height(scope.height);

            scope.map = leaflet.map(mapElement[0], {
                scrollWheelZoom: false
            });
            leaflet.tileLayer("https://maps.berlinonline.de/tile/bright/{z}/{x}/{y}.png", {maxZoom: 18}).addTo(scope.map);
            scope.polygon = leaflet.polygon(leaflet.GeoJSON.coordsToLatLngs(scope.polygon), adhMapData.style);
            scope.polygon.addTo(scope.map);

            scope.map.fitBounds(scope.polygon.getBounds());
            leaflet.Util.setOptions(scope.map, {
                minZoom: scope.map.getZoom()
            });

            scope.marker = leaflet
                .marker(leaflet.latLng(scope.lat, scope.lng))
                .setIcon(adhMapData.getIcon(scope.pin || "item-selected"))
                .addTo(scope.map);

            scope.$watchGroup(["lat", "lng"], (newValues) => {
                scope.marker.setLatLng(leaflet.latLng(newValues[0], newValues[1]));
            });

            refreshAfterColumnExpandHack($timeout, leaflet)(scope.map, scope.polygon.getBounds());
        }

    };
};


export interface IMapListScope extends angular.IScope {
    height : number;
    polygon : L.Polygon;
    rawPolygon : number[][];
    items : string[];
    selectedPath : string;
    selectItem(path : string, animate? : boolean) : void;
    getPreviousItem() : void;
    getNextItem() : void;
    showZoomButton : boolean;
    resetMap() : void;
    visibleItems : number;
    pin? : string;
    pinSelected? : string;
}

export class MapListingController {
    private map : L.Map;
    private scrollContainer;
    private selectedItemLeafletIcon;
    private itemLeafletIcon;
    private markers : {[path : string]: L.Marker};
    private scrollToItem;

    constructor(
        private adhMapData : IMapData,
        private $scope : IMapListScope,
        private $element,
        private $attrs,
        private $timeout : angular.ITimeoutService,
        private leaflet : typeof L
    ) {
        this.scrollContainer = this.$element.find(".map-list-scroll-container-inner");
        this.selectedItemLeafletIcon = this.adhMapData.getIcon($scope.pinSelected || "item-selected");
        this.itemLeafletIcon = this.adhMapData.getIcon($scope.pin || "item");
        this.markers = {};
        this.scrollToItem = _.throttle((path, animate) => this._scrollToItem(path, animate), 10);

        this.map = this.createMap();

        this.$scope.visibleItems = 0;

        this.$scope.selectItem = (path : string, animate = true) => {
            if (this.markers.hasOwnProperty(this.$scope.selectedPath)) {
                this.markers[this.$scope.selectedPath].setIcon(this.itemLeafletIcon);
            }

            this.$scope.selectedPath = path;
            this.scrollToItem(path, animate);
            if (path) {
                this.markers[path].setIcon(this.selectedItemLeafletIcon);
            }
        };

        this.$scope.getPreviousItem = () => {
            this.getRelativeItem(-1);
        };

        this.$scope.getNextItem = () => {
            this.getRelativeItem(1);
        };

        this.$scope.resetMap = () => {
            this.map.invalidateSize(false);
            this.map.fitBounds(this.$scope.polygon.getBounds());

            // this is hacky but I could not find how to add
            // a callback function to fitbounds as this always
            // triggers the moveend event.
            this.$timeout(() => {
                this.$scope.showZoomButton = false;
            }, 300);
        };

        this.$scope.$watch("items", () => {
            this.scrollToItem(this.$scope.selectedPath, false);
        });

        this.$scope.$watch(() => $element.find(".map-list").width(), () => {
            this.scrollToItem(this.$scope.selectedPath, false);

            // FIXME: moving column load time hard coded
            this.$timeout(() => {
                this.scrollToItem(this.$scope.selectedPath, true);
            }, 500);
        });
    }

    private createMap() {
        var mapElement = this.$element.find(".map-list-map");
        mapElement.height(this.$scope.height);

        var map = this.leaflet.map(mapElement[0], {
            zoomControl: false
        });
        this.leaflet.tileLayer("https://maps.berlinonline.de/tile/bright/{z}/{x}/{y}.png", {maxZoom: 18}).addTo(map);

        this.$scope.polygon = this.leaflet.polygon(this.leaflet.GeoJSON.coordsToLatLngs(this.$scope.rawPolygon), this.adhMapData.style);
        this.$scope.polygon.addTo(map);

        // add zoom control bottom right
        map.addControl( this.leaflet.control.zoom({position: 'bottomright'}) );

        // limit map to polygon
        map.fitBounds(this.$scope.polygon.getBounds());
        this.leaflet.Util.setOptions(map, {
             minZoom: map.getZoom()
        });

        map.on("moveend", () => {
            this.$scope.visibleItems = 0;
            this.$timeout(() => {
                _.forEach(this.$scope.items, (path) => {
                    if (this.isVisible(path)) {
                        this.$scope.visibleItems++;
                    } else if (path === this.$scope.selectedPath) {
                        this.$scope.getNextItem();
                    }
                });
                if (!this.$scope.selectedPath && this.$scope.visibleItems > 0) {
                    this.$scope.getNextItem();
                }
            });
            this.$scope.showZoomButton = true;
        });

        return map;
    }

    private getRelativeItem(offset : number) : void {
        var mod = (index, total) => (index + total) % total;

        var initialIndex = this.pathToIndex(this.$scope.selectedPath);
        var total = this.$scope.items.length;

        var index = mod(initialIndex + offset, total);
        var counter = 0;
        while (!this.isVisible(this.indexToPath(index))) {
            if (counter > total) {
                this.$scope.selectItem(null);
                return;
            }
            index = mod(index + offset, total);
            counter++;
        }

        this.$scope.selectItem(this.indexToPath(index));
    }

    private _scrollToItem(path : string, animate = true) : void {
        // FIXME: this needs to be retriggered when the widget
        // is resized or the index of an item changes.

        var index = path ? this.pathToIndex(path) : -1;
        var width = this.$element.find(".map-list-item").width();

        if (this.$attrs.orientation === "vertical") {
            var element = this.$element.find(".map-list-item").eq(index);
            (<any>this.scrollContainer).scrollToElement(element, 10, animate ? 300 : 0);
        } else {
            var left = width * (index + 1);
            (<any>this.scrollContainer).scrollTo(left, 0, animate ? 800 : 0);
        }
    }

    private isVisible(path : string) : boolean {
        if (this.markers.hasOwnProperty(path)) {
            var mapBounds = this.map.getBounds();
            var markerLatLng = this.markers[path].getLatLng();
            return mapBounds.contains(markerLatLng);
        } else {
            return false;
        }
    }

    private pathToIndex(path : string) : number {
        return this.$scope.items.indexOf(path);
    }

    private indexToPath(index : number) : string {
        return this.$scope.items[index];
    }

    private isUndefinedLatLng(lat : number, lng : number) : boolean {
        return lat === 0 && lng === 0;
    }

    public registerListItem(path : string, lat : number, lng : number) : () => void {
        if (this.isUndefinedLatLng(lat, lng)) {
            return () => undefined;
        } else {
            var marker = this.leaflet.marker(this.leaflet.latLng(lat, lng), {
                icon: this.itemLeafletIcon
            });
            marker.addTo(this.map);
            marker.on("click", () => {
                this.$timeout(() => {
                    this.$scope.selectItem(path);
                });
            });
            this.markers[path] = marker;

            if (this.isVisible(path)) {
                this.$scope.visibleItems++;

                if (!this.$scope.selectedPath) {
                    this.$scope.selectItem(path, false);
                }
            }

            return () => {
                if (this.isVisible(path)) {
                    this.$scope.visibleItems--;
                }
                if (path === this.$scope.selectedPath) {
                    this.$scope.getNextItem();
                }
                delete this.markers[path];
                this.map.removeLayer(marker);
                this.scrollToItem(this.$scope.selectedPath, false);
            };
        }
    }
}

export var mapListingInternal = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        scope: {
            height: "@",
            rawPolygon: "=polygon",
            items: "=",
            emptyText: "@",
            pin: "@?",
            pinSelected: "@?"
        },
        restrict: "E",
        transclude: true,
        templateUrl: (element, attrs) => {
            if (attrs.orientation === "vertical") {
                return adhConfig.pkg_path + pkgLocation + "/ListingInternal.html";
            } else {
                return adhConfig.pkg_path + pkgLocation + "/ListingInternalHorizontal.html";
            }
        },
        controller: ["adhMapData", "$scope", "$element", "$attrs", "$timeout", "leaflet", MapListingController]
    };
};


export class Listing<Container extends ResourcesBase.Resource> extends AdhListing.Listing<Container> {
    public static templateUrl : string = pkgLocation + "/Listing.html";

    public createDirective(adhConfig : AdhConfig.IService, adhWebSocket: AdhWebSocket.Service) {
        var directive = super.createDirective(adhConfig, adhWebSocket);
        directive.scope["polygon"] = "=";
        directive.scope["pin"] = "@?";
        directive.scope["pinSelected"] = "@?";

        var originalLink = directive.link;
        directive.link = function(scope) {
            originalLink.apply(undefined, arguments);

            // FIXME: only here for manual testing
            scope.changeData = () => {
                scope.elements.splice(0, 1);
            };
        };

        return directive;
    }
}


export var moduleName = "adhMapping";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAngularHelpers.moduleName,
            AdhEmbed.moduleName,
            AdhListing.moduleName,
            "adhInject",
            "duScroll"
        ])
        .provider("adhMapData", MapDataProvider)
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerEmbeddableDirectives(["map-input", "map-detail", "map-listing-internal"]);
        }])
        .config(["adhMapDataProvider", (adhMapDataProvider : MapDataProvider) => {
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
        .directive("adhMapInput", ["adhConfig", "adhSingleClickWrapper", "adhMapData", "$timeout", "leaflet", mapInput])
        .directive("adhMapDetail", ["adhMapData", "leaflet", "$timeout", mapDetail])
        .directive("adhMapListingInternal", ["adhConfig", "adhHttp", mapListingInternal])
        .directive("adhMapListing", ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
                new Listing(new AdhListing.ListingPoolAdapter()).createDirective(adhConfig, adhWebSocket)]);
};
