import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhEventManager = require("../EventManager/EventManager");
import AdhHttp = require("../Http/Http");
import AdhPermissions = require("../Permissions/Permissions");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhResourceUtil = require("../Util/ResourceUtil");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUser = require("../User/User");
import AdhUtil = require("../Util/Util");
import AdhWebSocket = require("../WebSocket/WebSocket");

import ResourcesBase = require("../../ResourcesBase");

import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
import RIUser = require("../../Resources_/adhocracy_core/resources/principal/IUser");
import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");
import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");

import Adapter = require("./Adapter");

var pkgLocation = "/Rate";


/**
 * Generic rate directive
 *
 * This module provides a generic code for rate widgets. It is generic in that
 * it can be used with different adapters and templates.
 *
 * FIXME: The code is currently tied to RIRateVersion
 *
 * An interesting detail is that the rate item is only created on the server
 * when a user casts a rate for the first time.  This does pose a special
 * challange for keeping multiple rate directives on the same page in sync
 * because there is not resource on the server that we could register
 * websockets on.  For this reason, there is the adhRateEventManager service
 * that is used to sync these directives locally.
 */


export interface IRateScope extends ng.IScope {
    refersTo : string;
    myRate : number;
    rates(rate : number) : number;
    optionsPostPool : AdhHttp.IOptions;
    ready : boolean;

    cast(value : number) : ng.IPromise<void>;
    uncast() : ng.IPromise<void>;
    toggle(value : number) : ng.IPromise<void>;

    // not currently used in the UI
    auditTrail : { subject: string; rate: number }[];
    auditTrailVisible : boolean;
    toggleShowDetails() : void;
}


// (this type is over-restrictive in that T is used for both the
// rate, the subject, and the target.  luckily, subtype-polymorphism
// is too cool to complain about it here.  :-)
export interface IRateAdapter<T extends ResourcesBase.Resource> {
    create(settings : any) : T;
    createItem(settings : any) : any;
    isRate(resource : T) : boolean;
    isRateable(resource : T) : boolean;
    rateablePostPoolPath(resource : T) : string;
    subject(resource : T) : string;
    subject(resource : T, value : string) : T;
    object(resource : T) : string;
    object(resource : T, value : string) : T;
    rate(resource : T) : number;
    rate(resource : T, value : number) : T;
    creator(resource : T) : string;
    creationDate(resource : T) : string;
    modificationDate(resource : T) : string;
}


export var directiveFactory = (template : string, adapter : IRateAdapter<RIRateVersion>) => (
    $q : ng.IQService,
    adhRateEventManager : AdhEventManager.EventManager,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhWebSocket : AdhWebSocket.Service,
    adhPermissions : AdhPermissions.Service,
    adhUser : AdhUser.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhDone
) => {
    "use strict";

    /**
     * Promise rate of specified subject.  Reject if none could be found.
     *
     * NOTE: This will return the first match. The backend must make sure that
     * there is never more than one rate item per subject-object pair.
     */
    var fetchRate = (poolPath : string, object : string, subject : string) : ng.IPromise<RIRateVersion> => {
        var query : any = {
            content_type: RIRateVersion.content_type,
            depth: 2,
            tag: "LAST"
        };
        query[SIRate.nick + ":subject"] = subject;
        query[SIRate.nick + ":object"] = object;

        return adhHttp.get(poolPath, query).then((pool) => {
            if (pool.data[SIPool.nick].elements.length > 0) {
                return adhHttp.get(pool.data[SIPool.nick].elements[0]);
            } else {
                return $q.reject("Not Found");
            }
        });
    };

    /**
     * Promise aggregates rates of all users.
     */
    var fetchAggregatedRates = (poolPath : string, object : string) : ng.IPromise<{[key : string]: number}> => {
        var query : any = {
            content_type: RIRateVersion.content_type,
            depth: 2,
            tag: "LAST",
            count: "true",
            aggregateby: "rate"
        };
        query[SIRate.nick + ":object"] = object;

        return adhHttp.get(poolPath, query).then((pool) => {
            return pool.data[SIPool.nick].aggregateby.rate;
        });
    };

    /**
     * Collect detailed information about poolPath specific to ratings for object.
     */
    var fetchAuditTrail = (poolPath : string, object : string) : ng.IPromise<any> => {
        var query : any = {
            content_type: RIRateVersion.content_type,
            depth: 2,
            tag: "LAST"
        };
        query[SIRate.nick + ":object"] = object;

        return adhHttp.get(poolPath, query)
            .then((poolRsp) => {
                var ratePaths : string[] = poolRsp.data[SIPool.nick].elements;
                var rates : RIRateVersion[] = [];
                var users : RIUser[] = [];
                var auditTrail : { subject: string; rate: number }[] = [];

                adhHttp.withTransaction((transaction) : ng.IPromise<void> => {
                    var gets : AdhHttp.ITransactionResult[] = ratePaths.map((path) => transaction.get(path));

                    return transaction.commit()
                        .then((responses) => {
                            gets.map((transactionResult) => {
                                rates.push(<any>responses[transactionResult.index]);
                            });
                        });
                }).then(() => {
                    return adhHttp.withTransaction((transaction) : ng.IPromise<void> => {
                        var gets : AdhHttp.ITransactionResult[] = rates.map((rate) => transaction.get(adapter.subject(rate)));

                        return transaction.commit()
                            .then((responses) => {
                                gets.map((transactionResult) => {
                                    users.push(<any>responses[transactionResult.index]);
                                });
                            });
                    });
                }).then(() => {
                    _.forOwn(ratePaths, (ratePath, ix) => {
                        auditTrail[ix] = {
                            subject: users[ix].data[SIUserBasic.nick].name,  // (use adapter for user, too?)
                            rate: adapter.rate(rates[ix])
                        };
                    });
                    return auditTrail;
                });
            });
    };

    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + template,
        scope: {
            refersTo: "@"
        },
        link: (scope : IRateScope) : void => {
            var myRateResource : RIRateVersion;
            var webSocketOff : Function;
            var postPoolPath : string;
            var rates : {[key : string]: number};
            var lock : boolean;
            var storeMyRateResource : (resource : RIRateVersion) => void;

            var updateMyRate = () : ng.IPromise<void> => {
                if (adhUser.loggedIn) {
                    return fetchRate(postPoolPath, scope.refersTo, adhUser.userPath).then((resource) => {
                        storeMyRateResource(resource);
                        scope.myRate = adapter.rate(resource);
                    }, () => undefined);
                } else {
                    return $q.when();
                }
            };

            var updateAggregatedRates = () : ng.IPromise<void> => {
                return fetchAggregatedRates(postPoolPath, scope.refersTo).then((r) => {
                    rates = r;
                });
            };

            var updateAuditTrail = () : ng.IPromise<void> => {
                return fetchAuditTrail(postPoolPath, scope.refersTo).then((auditTrail)  => {
                    scope.auditTrail = auditTrail;
                });
            };

            var assureUserRateExists = () : ng.IPromise<RIRateVersion> => {
                if (typeof myRateResource !== "undefined") {
                    return $q.when(myRateResource);
                } else {
                    return adhHttp.withTransaction((transaction) => {
                        var item = transaction.post(postPoolPath, adapter.createItem({preliminaryNames: adhPreliminaryNames}));
                        var version = transaction.get(item.first_version_path);

                        return transaction.commit()
                            .then((responses) => {
                                storeMyRateResource(<RIRateVersion>responses[version.index]);
                                return myRateResource;
                            });
                    });
                }
            };

            storeMyRateResource = (resource : RIRateVersion) => {
                myRateResource = resource;

                if (typeof webSocketOff === "undefined") {
                    var itemPath = AdhUtil.parentPath(resource.path);
                    webSocketOff = adhWebSocket.register(itemPath, (message) => {
                        updateMyRate();
                        updateAggregatedRates();
                    });
                    // FIXME DefinitelyTyped
                    (<any>scope).$on("$destroy", webSocketOff);
                }
            };

            scope.toggleShowDetails = () => {
                if (scope.auditTrailVisible) {
                    scope.auditTrailVisible = false;
                    delete scope.auditTrail;
                } else {
                    $q.all([updateMyRate(), updateAggregatedRates(), updateAuditTrail()]).then(() => {
                        scope.auditTrailVisible = true;
                    });
                }
            };

            scope.rates = (rate : number) : number => {
                return rates[rate.toString()] || 0;
            };

            // NOTE: In the future we might want to delete the rate instead.
            // For now, uncasting is simply implemented by casting a "neutral" rate.
            scope.uncast = () : ng.IPromise<void> => {
                return scope.cast(0);
            };

            scope.cast = (rate : number) : ng.IPromise<void> => {
                if (lock) {
                    return $q.reject("locked");
                }

                if (!scope.optionsPostPool.POST) {
                    if (!adhUser.loggedIn) {
                        adhTopLevelState.redirectToLogin();
                    } else {
                        // FIXME
                    }
                    return $q.reject("Permission Error");
                } else {
                    lock = true;

                    return assureUserRateExists().then((version) => {
                        var newVersion = AdhResourceUtil.derive(version, {
                            preliminaryNames: adhPreliminaryNames
                        });

                        adapter.rate(newVersion, rate);
                        adapter.object(newVersion, scope.refersTo);
                        adapter.subject(newVersion, adhUser.userPath);

                        return adhHttp.postNewVersionNoFork(version.path, newVersion)
                            .then(() => {
                                adhRateEventManager.trigger(scope.refersTo);
                                scope.auditTrailVisible = false;
                                return $q.all([updateMyRate(), updateAggregatedRates()]);
                            })
                            .then(() => undefined);
                    }).finally<void>(() => {
                        lock = false;
                    });
                }
            };

            scope.toggle = (rate : number) : ng.IPromise<void> => {
                if (rate === scope.myRate) {
                    return scope.uncast();
                } else {
                    return scope.cast(rate);
                }
            };

            // sync with other local rate buttons
            // FIXME DefinitelyTyped
            (<any>scope).$on("$destroy", adhRateEventManager.on(scope.refersTo, () => {
                updateMyRate();
                updateAggregatedRates();
            }));

            scope.auditTrailVisible = false;
            adhHttp.get(scope.refersTo)
                .then((rateable) => {
                    postPoolPath = adapter.rateablePostPoolPath(rateable);
                })
                .then(() => $q.all([updateMyRate(), updateAggregatedRates()]))
                .then(() => {
                    adhPermissions.bindScope(scope, postPoolPath, "optionsPostPool");
                    scope.ready = true;
                    adhDone();
                });
        }
    };
};


export var moduleName = "adhRate";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEventManager.moduleName,
            AdhHttp.moduleName,
            AdhPermissions.moduleName,
            AdhPreliminaryNames.moduleName,
            AdhTopLevelState.moduleName,
            AdhUser.moduleName,
            AdhWebSocket.moduleName
        ])
        .service("adhRateEventManager", ["adhEventManagerClass", (cls) => new cls()])
        .directive("adhRate", [
            "$q",
            "adhRateEventManager",
            "adhConfig",
            "adhHttp",
            "adhWebSocket",
            "adhPermissions",
            "adhUser",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhDone",
            directiveFactory("/Rate.html", new Adapter.RateAdapter())])
        .directive("adhLike", [
            "$q",
            "adhRateEventManager",
            "adhConfig",
            "adhHttp",
            "adhWebSocket",
            "adhPermissions",
            "adhUser",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhDone",
            directiveFactory("/Like.html", new Adapter.LikeAdapter())]);
};
