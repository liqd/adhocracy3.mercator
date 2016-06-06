/// <reference path="../../../lib2/types/angular.d.ts"/>
/// <reference path="../../../lib2/types/lodash.d.ts"/>
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
}

export class ListingPoolAdapter implements IListingContainerAdapter {
    // NOTE: container *must* have been requested with `elements=paths`
    public elemRefs(container : ResourcesBase.IResource) {
        return container.data[SIPool.nick].elements;
    }

    public totalCount(container : ResourcesBase.IResource) {
        return container.data[SIPool.nick].count;
    }

    public poolPath(container : ResourcesBase.IResource) {
        return container.path;
    }
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

export interface ISortItem {
    key : string;
    name : string;
    index : string;
    reverse? : boolean;
}

export type IPredicate = string | {[key : string]: string}

export interface ListingScope<Container> extends angular.IScope {
    path : string;
    refersTo? : string;
    contentType? : string;
    facets? : IFacet[];
    sort? : string;
    sorts? : ISortItem[];
    initialLimit? : number;
    currentLimit? : number;
    totalCount? : number;
    params? : any;
    emptyText? : string;
    showFilter : boolean;
    showSort : boolean;
    container : Container;
    poolPath : string;
    poolOptions : AdhHttp.IOptions;
    createPath? : string;
    elements : string[];
    update : (boolean?) => angular.IPromise<void>;
    loadMore : () => void;
    wsOff : () => void;
    clear : () => void;
    onCreate : () => void;
    toggleFilter : () => void;
    toggleSort : () => void;
    enableItem : (facet : IFacet, item : IFacetItem) => void;
    toggleItem : (facet : IFacet, item : IFacetItem, event) => void;
    disableItem : (facet : IFacet, item : IFacetItem) => void;
    setSort : (sort : string) => void;
}

export interface IFacetsScope extends angular.IScope {
    facets : IFacet[];
    update : () => angular.IPromise<void>;
    enableItem : (facet : IFacet, item : IFacetItem) => void;
    disableItem : (facet : IFacet, item : IFacetItem) => void;
    toggleItem : (facet : IFacet, item : IFacetItem, event) => void;
}

// FIXME: as the listing elements are tracked by their $id (the element path) in the listing template, we don't allow duplicate elements
// in one listing. We should add a proper warning if that occurs or handle that case properly.

export class Listing<Container extends ResourcesBase.IResource> {
    public static templateUrl : string = pkgLocation + "/Listing.html";

    public createDirective(adhConfig : AdhConfig.IService, adhWebSocket: AdhWebSocket.Service) {
        var _self = this;
        var _class = (<any>_self).constructor;

        var unregisterWebsocket = (scope) => {
            if (typeof scope.wsOff !== "undefined") {
                scope.wsOff();
                scope.wsOff = undefined;
            }
        };

        var adaptListingToParameter = (parameter: any, $scope: ListingScope<Container>) => {
            unregisterWebsocket($scope);
            if (parameter) {
                // NOTE: Ideally we would like to first subscribe to
                // websocket messages and only then get the resource in
                // order to not miss any messages in between. But in
                // order to subscribe we already need the resource. So
                // that is not possible.
                $scope.update().then(() => {
                    try {
                        $scope.wsOff = adhWebSocket.register(parameter, () => $scope.update());
                    } catch (e) {
                        console.log(e);
                        console.log("Will continue on resource " + parameter + " without server bind.");
                    }
                });
            } else {
                $scope.clear();
            }
        };

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + _class.templateUrl,
            scope: {
                path: "@",
                refersTo: "@",
                contentType: "@",
                facets: "=?",
                sort: "=?",
                sorts: "=?",
                initialLimit: "=?",
                params: "=?",
                noCreateForm: "=?",
                emptyText: "@",
                // use this to pass custom data to the injected templates
                custom: "=?"
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

                var getElements = (limit? : number, offset? : number) : angular.IPromise<Container> => {
                    var params = <any>{};

                    params.elements = "paths";

                    if (typeof $scope.contentType !== "undefined") {
                        params.content_type = $scope.contentType;
                        if (_.endsWith($scope.contentType, "Version")) {
                            params.depth = params.depth || 2;
                            params.tag = "LAST";
                        }
                    }

                    _.extend(params, $scope.params);

                    if ($scope.facets) {
                        $scope.facets.forEach((facet : IFacet) => {
                            facet.items.forEach((item : IFacetItem) => {
                                if (item.enabled) {
                                    params[facet.key] = item.key;
                                }
                            });
                        });
                    }

                    var sortItem;
                    if ($scope.sorts && $scope.sorts.length > 0) {
                        if ($scope.sort) {
                            sortItem = _.find($scope.sorts, (sortItem) => {
                                return sortItem.key === $scope.sort;
                            });
                            if (!sortItem) {
                                console.log("Unknown listing sort '" + $scope.sort + "'. Switching to default.");
                                sortItem = $scope.sorts[0];
                                $scope.sort = sortItem.key;
                            }
                        } else {
                            sortItem = $scope.sorts[0];
                            $scope.sort = sortItem.key;
                        }
                    }
                    if (sortItem) {
                        params.sort = sortItem.index;
                        params.reverse = !!sortItem.reverse;
                    }

                    if (limit) {
                        params.limit = limit;
                        if (offset) {
                            params.offset = offset;
                        }
                    }
                    return adhHttp.get($scope.path, params, {
                        warmupPoolCache: true
                    });
                };

                $scope.toggleFilter = () => {
                    $scope.showSort = false;
                    $scope.showFilter = !$scope.showFilter;
                };

                $scope.toggleSort = () => {
                    $scope.showFilter = false;
                    $scope.showSort = !$scope.showSort;
                };

                $scope.enableItem = (facet : IFacet, item : IFacetItem) => {
                    if (!item.enabled) {
                        facet.items.forEach((_item : IFacetItem) => {
                            _item.enabled = (item === _item);
                        });
                        $scope.update();
                    }
                };
                $scope.disableItem = (facet : IFacet, item : IFacetItem) => {
                    if (item.enabled) {
                        item.enabled = false;
                        $scope.update();
                    }
                };
                $scope.toggleItem = (facet : IFacet, item : IFacetItem, event) => {
                    event.stopPropagation();
                    if (item.enabled) {
                        $scope.disableItem(facet, item);
                    } else {
                        $scope.enableItem(facet, item);
                    }
                };

                $scope.update = (warmup? : boolean) : angular.IPromise<void> => {

                    if ($scope.initialLimit) {
                        if (!$scope.currentLimit) {
                            $scope.currentLimit = $scope.initialLimit;
                        }
                    }
                    return getElements($scope.currentLimit).then((container) => {
                        $scope.container = container;
                        $scope.poolPath = $scope.container.path;
                        $scope.totalCount = $scope.container.data[SIPool.nick].count;

                        // avoid modifying the cached result
                        $scope.elements = _.clone($scope.container.data[SIPool.nick].elements);

                        if (!$scope.sorts || $scope.sorts.length === 0) {
                            // If no backend based sorting is used, we
                            // apply some sorting to get consistent
                            // results across requests.
                            $scope.elements = _.sortBy($scope.elements).reverse();
                        }
                    });
                };

                $scope.loadMore = () : void => {
                    if ($scope.currentLimit < $scope.totalCount) {
                        getElements($scope.initialLimit, $scope.currentLimit).then((container) => {
                            var elements = _.clone(container.data[SIPool.nick].elements);
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

                $scope.$watch("path", () => adaptListingToParameter($scope.poolPath, $scope));

                $scope.$watch("refersTo", () => adaptListingToParameter($scope.refersTo, $scope));
            }]
        };
    }
}


export var facets = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        scope: {
            facets: "=",
            update: "=",
            toggleItem: "=",
            disableItem: "=",
            enableItem: "="
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Facets.html"
    };
};
