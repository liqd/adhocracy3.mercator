/// <reference path="../../../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>
/// <reference path="../../_all.d.ts"/>

import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhInject = require("../Inject/Inject");
import AdhPermissions = require("../Permissions/Permissions");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhWebSocket = require("../WebSocket/WebSocket");

import ResourcesBase = require("../../ResourcesBase");

import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");

var pkgLocation = "/Listing";

//////////////////////////////////////////////////////////////////////
// Listings

export interface IListingContainerAdapter {
    // A list of elements that should be displayed
    elemRefs(any) : string[];

    // The pool a new element should be posted to.
    poolPath(any) : string;

    canWarmup : boolean;
}

export class ListingPoolAdapter implements IListingContainerAdapter {
    public elemRefs(container : ResourcesBase.Resource) {
        return container.data[SIPool.nick].elements;
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

export type IPredicateItem = string | ((string) => string);
export type IPredicate = IPredicateItem | IPredicateItem[];

export interface ListingScope<Container> extends angular.IScope {
    path : string;
    contentType? : string;
    facets? : IFacet[];
    sort? : string;
    params? : any;
    emptyText? : string;
    container : Container;
    poolPath : string;
    poolOptions : AdhHttp.IOptions;
    createPath? : string;
    elements : string[];
    frontendOrderPredicate : IPredicate;
    frontendOrderReverse : boolean;
    update : (boolean?) => angular.IPromise<void>;
    wsOff : Function;
    clear : () => void;
    onCreate : () => void;
}

export interface IFacetsScope extends angular.IScope {
    facets : IFacet[];
    update : () => angular.IPromise<void>;
    enableItem : (IFacet, IFacetItem) => void;
    disableItem : (IFacet, IFacetItem) => void;
    toggleItem : (IFacet, IFacetItem, event) => void;
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
                frontendOrderPredicate: "=?",
                frontendOrderReverse: "=?",
                params: "=?",
                update: "=?",
                noCreateForm: "=?",
                emptyText: "@"
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

                $scope.update = (warmup? : boolean) : angular.IPromise<void> => {
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
                    }
                    return adhHttp.get($scope.path, params, warmup).then((container) => {
                        $scope.container = container;
                        $scope.poolPath = _self.containerAdapter.poolPath($scope.container);

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

                $scope.clear = () : void => {
                    $scope.container = undefined;
                    $scope.poolPath = undefined;
                    $scope.elements = [];
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


export var moduleName = "adhListing";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
            AdhInject.moduleName,
            AdhPermissions.moduleName,
            AdhPreliminaryNames.moduleName,
            AdhWebSocket.moduleName
        ])
        .directive("adhFacets", ["adhConfig", facets])
        .directive("adhListing",
            ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
                new Listing(new ListingPoolAdapter()).createDirective(adhConfig, adhWebSocket)]);
};
