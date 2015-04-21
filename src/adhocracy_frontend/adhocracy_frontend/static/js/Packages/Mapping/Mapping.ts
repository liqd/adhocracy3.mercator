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
import AdhUtil = require("../Util/Util");

import AdhMappingUtils = require("./MappingUtils");

import RICommentVersion = require("../../Resources_/adhocracy_core/resources/comment/ICommentVersion");
import RIProposalVersion = require("../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProposalVersion");
import SIProposal = require("../../Resources_/adhocracy_meinberlin/sheets/kiezkassen/IProposal");
import SIPoint = require("../../Resources_/adhocracy_core/sheets/geo/IPoint");
import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");

var pkgLocation = "/Mapping";


export var style = {
    fillColor: "#000",
    color: "#000",
    opacity: 0.5,
    stroke: false
};

export var cssItemIcon = {
    className: "icon-map-pin",
    iconAnchor: [17.5, 41],
    iconSize: [35, 42]
};

export var cssAddIcon = {
    className: "icon-map-pin-add",
    iconAnchor: [16.5, 41],
    iconSize: [35, 42]
};

export var cssSelectedItemIcon = {
    className: "icon-map-pin is-active",
    iconAnchor: [17.5, 41],
    iconSize: [33, 42]
};


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

export interface IMapInputScope extends angular.IScope {
    lat : number;
    lng : number;
    height : number;
    polygon : L.Polygon;
    rawPolygon : any;
    zoom? : number;
    text : string;
    error : boolean;
    mapClicked : boolean;
    saveCoordinates() : void;
    resetCoordinates() : void;
}

export var mapInput = (
    adhConfig : AdhConfig.IService,
    adhSingleClickWrapper,
    $timeout : angular.ITimeoutService,
    leaflet : typeof L
) => {
    return {
        scope: {
            lat: "=",
            lng: "=",
            height: "@",
            rawPolygon: "=polygon",
            zoom: "@?"
        },
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Input.html",
        link: (scope : IMapInputScope, element) => {

            var tmpLng : number = _.clone(scope.lng);
            var tmpLat : number = _.clone(scope.lat);

            var mapElement = element.find(".map");
            mapElement.height(scope.height);

            var map = leaflet.map(mapElement[0]);
            leaflet.tileLayer("http://maps.berlinonline.de/tile/bright/{z}/{x}/{y}.png", {maxZoom: 18}).addTo(map);

            scope.polygon = leaflet.polygon(leaflet.GeoJSON.coordsToLatLngs(scope.rawPolygon), style);
            scope.polygon.addTo(map);

            // limit map to polygon
            map.fitBounds(scope.polygon.getBounds());
            leaflet.Util.setOptions(map, {
                minZoom: map.getZoom()
            });

            if (typeof scope.zoom !== "undefined") {
                map.setZoom(scope.zoom);
            }

            var selectedItemLeafletIcon = (<any>leaflet).divIcon(cssAddIcon);
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
                            scope.mapClicked = true;
                            $timeout(() => {
                                tmpLat = result.lat;
                                tmpLng = result.lng;
                            });
                        } else {
                            marker.setLatLng(leaflet.latLng(tmpLat, tmpLng));
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

            if (typeof scope.lat !== "undefined" && typeof scope.lng !== "undefined") {
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
                }
                marker.dragging.enable();
                $timeout(() => {
                    tmpLat = event.latlng.lat;
                    tmpLng = event.latlng.lng;
                    scope.text = "TR__MAP_EXPLAIN_DRAG";
                    scope.mapClicked = true;
                });
            });

            scope.polygon.on("dblclick", (event : L.LeafletMouseEvent) => {
                map.zoomIn();
            });
            map.on("dblclick", (event : L.LeafletMouseEvent) => {
                map.zoomIn();
            });

            scope.saveCoordinates = () => {
                scope.lng = tmpLng;
                scope.lat = tmpLat;
                scope.mapClicked = false;
                scope.text = "TR__MAP_MARKER_SAVED";
                $timeout(() => {
                    scope.text = "TR__MAP_EXPLAIN_DRAG";
                }, 2000);
            };

            scope.resetCoordinates = () => {
                tmpLng = undefined;
                tmpLat = undefined;
                scope.lng = undefined;
                scope.lat = undefined;
                map.removeLayer(marker);
                marker = undefined;
                scope.mapClicked = false;
                scope.text = "TR__MAP_EXPLAIN_CLICK";
            };

            refreshAfterColumnExpandHack($timeout, leaflet)(map, scope.polygon.getBounds());
        }
    };
};

export var mapDetail = (leaflet : typeof L, $timeout : angular.ITimeoutService) => {
    return {
        scope: {
            lat: "=",
            lng: "=",
            polygon: "=",
            height: "@",
            zoom: "@?"
        },
        restrict: "E",
        template: "<div class=\"map\"></div>",
        link: (scope, element) => {

            var mapElement = element.find(".map");
            mapElement.height(scope.height);

            scope.map = leaflet.map(mapElement[0]);
            leaflet.tileLayer("http://maps.berlinonline.de/tile/bright/{z}/{x}/{y}.png", {maxZoom: 18}).addTo(scope.map);
            scope.polygon = leaflet.polygon(leaflet.GeoJSON.coordsToLatLngs(scope.polygon), style);
            scope.polygon.addTo(scope.map);

            scope.map.fitBounds(scope.polygon.getBounds());
            leaflet.Util.setOptions(scope.map, {
                minZoom: scope.map.getZoom()
            });

            scope.marker = leaflet
                .marker(leaflet.latLng(scope.lat, scope.lng))
                .setIcon((<any>leaflet).divIcon(cssSelectedItemIcon))
                .addTo(scope.map);

            scope.$watchGroup(["lat", "lng"], (newValues) => {
                scope.marker.setLatLng(leaflet.latLng(newValues[0], newValues[1]));
            });

            refreshAfterColumnExpandHack($timeout, leaflet)(scope.map, scope.polygon.getBounds());
        }

    };
};

export interface IItem<T> {
    value : T;
    marker : L.Marker;
    hide : boolean;
    index : number;
};

export interface IMapListScope<T> extends angular.IScope {
    height : number;
    polygon : L.Polygon;
    rawPolygon : number[][];
    items : IItem<T>[];
    itemValues : T[];
    selectedItem : IItem<T>;
    toggleItem(item : IItem<T>) : void;
    getPreviousItem(item : IItem<T>) : void;
    getNextItem(item : IItem<T>) : void;
    getDataFromURLs(): void;
}

export var mapListingInternal = (adhConfig : AdhConfig.IService, adhHttp : AdhHttp.Service<any>,
    leaflet : typeof L, $timeout : angular.ITimeoutService) => {
    return {
        scope: {
            height: "@",
            rawPolygon: "=polygon",
            itemValues: "=items"
        },
        restrict: "E",

        templateUrl: (element, attrs) => {
            if (attrs.orientation === "vertical") {
                return adhConfig.pkg_path + pkgLocation + "/ListingInternal.html";
            } else {
                return adhConfig.pkg_path + pkgLocation + "/ListingInternalHorizontal.html";
            }
        },

        link: (scope : IMapListScope<any>, element, attrs) => {

            var scrollContainer = angular.element(".map-list-scroll-container-inner");
            var scrollToItem = (key) : void => {
                var element = angular.element(".map-list-item" + key);
                if (attrs.orientation === "vertical") {
                    (<any>scrollContainer).scrollToElement(element, 10, 300);
                } else {
                    var left = element.width() * key;
                    (<any>scrollContainer).scrollTo(left, 0, 800);
                }
            };

            var mapElement = element.find(".map-list-map");
            mapElement.height(scope.height);

            var map = leaflet.map(mapElement[0]);
            leaflet.tileLayer("http://maps.berlinonline.de/tile/bright/{z}/{x}/{y}.png", {maxZoom: 18}).addTo(map);

            scope.polygon = leaflet.polygon(leaflet.GeoJSON.coordsToLatLngs(scope.rawPolygon), style);
            scope.polygon.addTo(map);

            // limit map to polygon
            map.fitBounds(scope.polygon.getBounds());
            leaflet.Util.setOptions(map, {
                 minZoom: map.getZoom()
            });

            var selectedItemLeafletIcon = (<any>leaflet).divIcon(cssSelectedItemIcon);
            var itemLeafletIcon = (<any>leaflet).divIcon(cssItemIcon);


            scope.items = [];
            _.forEach(scope.itemValues, (url, key) => {

                adhHttp.get(AdhUtil.parentPath(url), {
                    content_type: RICommentVersion.content_type,
                    depth: "all",
                    tag: "LAST",
                    count: true
                }).then((pool) => {
                    adhHttp.get(url).then((resource: RIProposalVersion) => {
                        var mainSheet: SIProposal.Sheet = resource.data[SIProposal.nick];
                        var pointSheet: SIPoint.Sheet = resource.data[SIPoint.nick];
                        var poolSheet = pool.data[SIPool.nick];

                        var value = {
                            url: url,
                            title: mainSheet.title,
                            locationText: mainSheet.location_text,
                            commentCount: poolSheet.count,
                            lng: pointSheet.x,
                            lat: pointSheet.y
                        };

                        var hide = (value.lat === 0 && value.lat === 0);

                        var item = {
                            value: value,
                            marker: L.marker(leaflet.latLng(value.lat, value.lng), { icon: itemLeafletIcon }),
                            hide: hide,
                            index: key
                        };

                        item.marker.addTo(map);
                        item.marker.on("click", (e) => {
                            $timeout(() => {
                                scope.toggleItem(item);
                                scrollToItem(item.index);
                            });
                        });

                        if (key === 0) {
                            scope.selectedItem = item;
                            <any>scope.selectedItem.marker.setIcon(selectedItemLeafletIcon);
                        }
                        scope.items.push(item);
                    });
                });
            });


            map.on("moveend", () => {
                var bounds = map.getBounds();
                $timeout(() => {
                    _.forEach(scope.items, (item) => {
                        if (bounds.contains(item.marker.getLatLng())) {
                            item.hide = false;
                        } else {
                            item.hide = true;
                        }
                    });
                });
            });

            var loopCarousel = (index, total) => {
                index = index < 0 ? total : index;
                index = index > total ? 0 : index;
                return index;
            };

            scope.toggleItem = (item) => {
                if (typeof scope.selectedItem !== "undefined") {
                    scope.selectedItem.marker.setIcon(itemLeafletIcon);
                }
                scope.selectedItem = item;
                item.marker.setIcon(selectedItemLeafletIcon);
            };

            scope.getPreviousItem = (item) => {
                var index = loopCarousel(item.index - 1, scope.items.length - 1);
                while (scope.items[index].hide) {
                    index = loopCarousel(index - 1, scope.items.length - 1);
                }
                scope.toggleItem(scope.items[index]);
                scrollToItem(index);
            };

            scope.getNextItem = (item) => {
                var index = loopCarousel(item.index + 1, scope.items.length - 1);
                while (scope.items[index].hide) {
                    index = loopCarousel(index + 1, scope.items.length - 1);
                }
                scope.toggleItem(scope.items[index]);
                scrollToItem(index);
            };
        }
    };
};


export class Listing<Container extends ResourcesBase.Resource> extends AdhListing.Listing<Container> {
    public static templateUrl : string = pkgLocation + "/Listing.html";

    public createDirective(adhConfig : AdhConfig.IService, adhWebSocket: AdhWebSocket.Service) {
        var directive = super.createDirective(adhConfig, adhWebSocket);
        directive.scope["polygon"] = "=";
        directive.link = function(scope, element, attrs) {
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
            "duScroll"
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerEmbeddableDirectives(["map-input", "map-detail", "map-listing-internal"]);
        }])
        .directive("adhMapInput", ["adhConfig", "adhSingleClickWrapper", "$timeout", "leaflet", mapInput])
        .directive("adhMapDetail", ["leaflet", mapDetail])
        .directive("adhMapListingInternal", ["adhConfig", "adhHttp", "leaflet", "$timeout" , mapListingInternal])
        .directive("adhMapListing", ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
                new Listing(new AdhListing.ListingPoolAdapter()).createDirective(adhConfig, adhWebSocket)]);
};
