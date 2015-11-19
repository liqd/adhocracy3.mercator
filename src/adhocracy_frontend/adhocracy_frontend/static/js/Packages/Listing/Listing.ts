/// <reference path="../../../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>
/// <reference path="../../_all.d.ts"/>

import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhWebSocket from "../WebSocket/WebSocket";

import * as ResourcesBase from "../../ResourcesBase";

import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";

var pkgLocation = "/Listing";

//////////////////////////////////////////////////////////////////////
// Listings

export interface IListingContainerAdapter {
    // A list of elements that should be displayed
    elemRefs(any) : string[];

    // Total number of elements
    totalCount(any) : number;

    // The pool a new element should be posted to.
    poolPath(any) : string;

    canWarmup : boolean;
}

export class ListingPoolAdapter implements IListingContainerAdapter {
    public elemRefs(container : ResourcesBase.Resource) {
        return container.data[SIPool.nick].elements;
    }

    public totalCount(container : ResourcesBase.Resource) {
        return container.data[SIPool.nick].count;
    }

    public poolPath(container : ResourcesBase.Resource) {
        return container.path;
    }

    public canWarmup = true;
}

export interface IFacetItem {
    key : string;
    name : string;
    enabled? : boolean;
}

export interface IFacet {
    /* NOTE: Facets currently have a fixed set of items. */
    key : string;
    name : string;
    items : IFacetItem[];
}

export type IPredicate = string | {[key : string]: string}

export interface ListingScope<Container> extends angular.IScope {
    path : string;
    contentType? : string;
    facets? : IFacet[];
    sort? : string;
    sorts? : string[];
    reverse? : boolean;
    initialLimit? : number;
    currentLimit? : number;
    totalCount? : number;
    params? : any;
    emptyText? : string;
    data : {
        showSort : boolean;
        showFilter : boolean;
    };
    container : Container;
    poolPath : string;
    poolOptions : AdhHttp.IOptions;
    createPath? : string;
    elements : string[];
    frontendOrderPredicate : IPredicate;
    frontendOrderReverse : boolean;
    update : (boolean?) => angular.IPromise<void>;
    loadMore : () => void;
    wsOff : () => void;
    clear : () => void;
    onCreate : () => void;
    setSort : (sort : string) => void;
}

export interface IFacetsScope extends angular.IScope {
    facets : IFacet[];
    update : () => angular.IPromise<void>;
    enableItem : (facet : IFacet, item : IFacetItem) => void;
    disableItem : (facet : IFacet, item : IFacetItem) => void;
    toggleItem : (facet : IFacet, item : IFacetItem, event) => void;
}

export interface IFacetsShow extends angular.IScope {
    facets : IFacet[];
    update : () => angular.IPromise<void>;
    enableItem : (facet : IFacet, item : IFacetItem) => void;
    disableItem : (facet : IFacet, item : IFacetItem) => void;
    toggleItem : (facet : IFacet, item : IFacetItem, event) => void;
}

// FIXME: as the listing elements are tracked by their $id (the element path) in the listing template, we don't allow duplicate elements
// in one listing. We should add a proper warning if that occurs or handle that case properly.

export class Listing<Container extends ResourcesBase.Resource> {
    public static templateUrl : string = pkgLocation + "/Listing.html";

    constructor(private containerAdapter : IListingContainerAdapter) {}

    public createDirective(adhConfig : AdhConfig.IService, adhWebSocket: AdhWebSocket.Service) {
        var _self = this;
        var _class = (<any>_self).constructor;

        var unregisterWebsocket = (scope) => {
            if (typeof scope.wsOff !== "undefined") {
                scope.wsOff();
                scope.wsOff = undefined;
            }
        };

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + _class.templateUrl,
            scope: {
                path: "@",
                contentType: "@",
                facets: "=?",
                sort: "=?",
                sorts: "=?",
                reverse: "=?",
                initialLimit: "=?",
                frontendOrderPredicate: "=?",
                frontendOrderReverse: "=?",
                params: "=?",
                update: "=?",
                noCreateForm: "=?",
                emptyText: "@",
                data: "=?"
            },
            transclude: true,
            link: (scope, element, attrs, controller, transclude) => {
                element.on("$destroy", () => {
                    unregisterWebsocket(scope);
                });
            },
            controller: ["$filter", "$scope", "adhHttp", "adhPreliminaryNames", "adhPermissions", (
                $filter: angular.IFilterService,
                $scope: ListingScope<Container>,
                adhHttp: AdhHttp.Service<Container>,
                adhPreliminaryNames : AdhPreliminaryNames.Service,
                adhPermissions : AdhPermissions.Service
            ) : void => {
                adhPermissions.bindScope($scope, () => $scope.poolPath, "poolOptions");

                $scope.createPath = adhPreliminaryNames.nextPreliminary();

                var getElements = (
                    warmup? : boolean, count? : boolean, limit? : number, offset? : number
                ) : angular.IPromise<Container> => {
                    var params = <any>_.extend({}, $scope.params);
                    if (typeof $scope.contentType !== "undefined") {
                        params.content_type = $scope.contentType;
                        if (_.endsWith($scope.contentType, "Version")) {
                            params.depth = 2;
                            params.tag = "LAST";
                        }
                    }
                    if ($scope.facets) {
                        $scope.facets.forEach((facet : IFacet) => {
                            facet.items.forEach((item : IFacetItem) => {
                                if (item.enabled) {
                                    params[facet.key] = item.key;
                                }
                            });
                        });
                    }
                    if ($scope.sort) {
                        params["sort"] = $scope.sort;
                        if ($scope.reverse) {
                            params["reverse"] = $scope.reverse;
                        }
                    }
                    if (limit) {
                        params["limit"] = limit;
                        if (offset) {
                            params["offset"] = offset;
                        }
                    }
                    if (count) {
                        params["count"] = "true";
                    }
                    return adhHttp.get($scope.path, params, {
                        warmupPoolCache: warmup
                    });
                };

                // See ResourceActions for control of showing and hiding of these
                $scope.data = {
                    showSort: false,
                    showFilter: false
                };

                $scope.update = (warmup? : boolean) : angular.IPromise<void> => {
                    if ($scope.initialLimit) {
                        if (!$scope.currentLimit) {
                            $scope.currentLimit = $scope.initialLimit;
                        }
                    }
                    return getElements(warmup, true, $scope.currentLimit).then((container) => {
                        $scope.container = container;
                        $scope.poolPath = _self.containerAdapter.poolPath($scope.container);
                        $scope.totalCount = _self.containerAdapter.totalCount($scope.container);

                        // FIXME: Sorting direction should be implemented in backend, working on a copy is used,
                        // because otherwise sometimes the already reversed sorted list (from cache) would be
                        // reversed again
                        var elements = _.clone(_self.containerAdapter.elemRefs($scope.container));

                        // trying to maintain compatible with builtin orderBy functionality, but
                        // allow to not specify predicate or reverse.
                        if ($scope.frontendOrderPredicate) {
                            $scope.elements = $filter("orderBy")(
                                elements,
                                $scope.frontendOrderPredicate,
                                $scope.frontendOrderReverse
                            );
                        } else if ($scope.frontendOrderReverse) {
                            $scope.elements = elements.reverse();
                        } else {
                            $scope.elements = elements;
                        }
                    });
                };

                $scope.loadMore = () : void => {
                    if ($scope.currentLimit < $scope.totalCount) {
                        getElements(true, false, $scope.initialLimit, $scope.currentLimit).then((container) => {
                            var elements = _.clone(_self.containerAdapter.elemRefs(container));
                            $scope.elements = $scope.elements.concat(elements);
                            $scope.currentLimit += $scope.initialLimit;
                        });
                    }
                };

                $scope.clear = () : void => {
                    $scope.container = undefined;
                    $scope.poolPath = undefined;
                    $scope.elements = [];
                };

                $scope.setSort = (sort : string) => {
                    $scope.sort = sort;
                };

                $scope.onCreate = () : void => {
                    $scope.update();
                    $scope.createPath = adhPreliminaryNames.nextPreliminary();
                };

                $scope.$watch("sort", (sort : string) => {
                    $scope.update();
                });

                $scope.$watch("path", (newPath : string) => {
                    unregisterWebsocket($scope);

                    if (newPath) {
                        // NOTE: Ideally we would like to first subscribe to
                        // websocket messages and only then get the resource in
                        // order to not miss any messages in between. But in
                        // order to subscribe we already need the resource. So
                        // that is not possible.
                        $scope.update(_self.containerAdapter.canWarmup).then(() => {
                            try {
                                $scope.wsOff = adhWebSocket.register($scope.poolPath, () => $scope.update());
                            } catch (e) {
                                console.log(e);
                                console.log("Will continue on resource " + $scope.poolPath + " without server bind.");
                            }
                        });
                    } else {
                        $scope.clear();
                    }
                });
            }]
        };
    }
}


export var facets = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        scope: {
            facets: "=",
            update: "="
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Facets.html",
        link: (scope : IFacetsScope) => {

            scope.enableItem = (facet : IFacet, item : IFacetItem) => {
                if (!item.enabled) {
                    facet.items.forEach((_item : IFacetItem) => {
                        _item.enabled = (item === _item);
                    });
                    scope.update();
                }
            };
            scope.disableItem = (facet : IFacet, item : IFacetItem) => {
                if (item.enabled) {
                    item.enabled = false;
                    scope.update();
                }
            };
            scope.toggleItem = (facet : IFacet, item : IFacetItem, event) => {
                event.stopPropagation();
                if (item.enabled) {
                    scope.disableItem(facet, item);
                } else {
                    scope.enableItem(facet, item);
                }
            };
        }
    };
};
