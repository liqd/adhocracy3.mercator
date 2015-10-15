import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhCredentials from "../User/Credentials";
import * as AdhEventManager from "../EventManager/EventManager";
import * as AdhHttp from "../Http/Http";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhResourceUtil from "../Util/ResourceUtil";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";
import * as AdhWebSocket from "../WebSocket/WebSocket";

import * as ResourcesBase from "../../ResourcesBase";

import RIRateVersion from "../../Resources_/adhocracy_core/resources/rate/IRateVersion";
import RIUser from "../../Resources_/adhocracy_core/resources/principal/IUser";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SIRate from "../../Resources_/adhocracy_core/sheets/rate/IRate";
import * as SIUserBasic from "../../Resources_/adhocracy_core/sheets/principal/IUserBasic";

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


export interface IRateScope extends angular.IScope {
    refersTo : string;
    showResults : string;
    disabled : boolean;
    hasCastInSession : boolean;
    myRate : number;
    rates(rate : number) : number;
    optionsPostPool : AdhHttp.IOptions;
    ready : boolean;
    hasCast : boolean;

    cast(value : number) : angular.IPromise<void>;
    uncast() : angular.IPromise<void>;
    toggle(value : number) : angular.IPromise<void>;

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


export class Service {
    constructor(
        private $q : angular.IQService,
        private adhHttp : AdhHttp.Service<any>
    ) {}

    /**
     * Promise rate of specified subject.  Reject if none could be found.
     *
     * NOTE: This will return the first match. The backend must make sure that
     * there is never more than one rate item per subject-object pair.
     */
    public fetchRate(poolPath : string, object : string, subject : string) : angular.IPromise<RIRateVersion> {
        var query : any = {
            content_type: RIRateVersion.content_type,
            depth: "all",
            tag: "LAST"
        };
        query[SIRate.nick + ":subject"] = subject;
        query[SIRate.nick + ":object"] = object;
        return this.adhHttp.get(poolPath, query).then((pool) => {
            if (pool.data[SIPool.nick].elements.length > 0) {
                return this.adhHttp.get(pool.data[SIPool.nick].elements[0]);
            } else {
                return this.$q.reject("Not Found");
            }
        });
    }

    /**
     * Promise aggregates rates of all users.
     */
    public fetchAggregatedRates(poolPath : string, object : string) : angular.IPromise<{[key : string]: number}> {
        var query : any = {
            content_type: RIRateVersion.content_type,
            depth: "all",
            tag: "LAST",
            count: "true",
            aggregateby: "rate"
        };
        query[SIRate.nick + ":object"] = object;

        return this.adhHttp.get(poolPath, query).then((pool) => {
            return pool.data[SIPool.nick].aggregateby.rate;
        });
    }
}


export var directiveFactory = (template : string, adapter : IRateAdapter<RIRateVersion>) => (
    $q : angular.IQService,
    adhRate : Service,
    adhRateEventManager : AdhEventManager.EventManager,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhWebSocket : AdhWebSocket.Service,
    adhPermissions : AdhPermissions.Service,
    adhCredentials : AdhCredentials.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhDone
) => {
    "use strict";

    /**
     * Collect detailed information about poolPath specific to ratings for object.
     */
    var fetchAuditTrail = (poolPath : string, object : string) : angular.IPromise<any> => {
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

                adhHttp.withTransaction((transaction) : angular.IPromise<void> => {
                    var gets : AdhHttp.ITransactionResult[] = ratePaths.map((path) => transaction.get(path));

                    return transaction.commit()
                        .then((responses) => {
                            gets.map((transactionResult) => {
                                rates.push(<any>responses[transactionResult.index]);
                            });
                        });
                }).then(() => {
                    return adhHttp.withTransaction((transaction) : angular.IPromise<void> => {
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
            refersTo: "@",
            showResults: "@",
            disabled: "="
        },
        link: (scope : IRateScope) : void => {
            var myRateResource : RIRateVersion;
            var webSocketOff : () => void;
            var postPoolPath : string;
            var rates : {[key : string]: number};
            var lock : boolean;
            var storeMyRateResource : (resource : RIRateVersion) => void;

            var updateMyRate = () : angular.IPromise<void> => {
                if (adhCredentials.loggedIn) {
                    return adhRate.fetchRate(postPoolPath, scope.refersTo, adhCredentials.userPath).then((resource) => {
                        storeMyRateResource(resource);
                        scope.myRate = adapter.rate(resource);
                        scope.hasCast = true;
                    }, () => undefined);
                } else {
                    return $q.when();
                }
            };

            var updateAggregatedRates = () : angular.IPromise<void> => {
                return adhRate.fetchAggregatedRates(postPoolPath, scope.refersTo).then((r) => {
                    rates = r;
                });
            };

            var updateAuditTrail = () : angular.IPromise<void> => {
                return fetchAuditTrail(postPoolPath, scope.refersTo).then((auditTrail)  => {
                    scope.auditTrail = auditTrail;
                });
            };

            var assureUserRateExists = () : angular.IPromise<RIRateVersion> => {
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
                    scope.$on("$destroy", webSocketOff);
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
            scope.uncast = () : angular.IPromise<void> => {
                return scope.cast(0);
            };

            scope.cast = (rate : number) : angular.IPromise<void> => {
                if (lock) {
                    return $q.reject("locked");
                }

                if (!scope.optionsPostPool.POST) {
                    if (!adhCredentials.loggedIn) {
                        adhTopLevelState.setCameFromAndGo("/login");
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
                        adapter.subject(newVersion, adhCredentials.userPath);

                        return adhHttp.postNewVersionNoFork(version.path, newVersion)
                            .then(() => {
                                adhRateEventManager.trigger(scope.refersTo);
                                scope.auditTrailVisible = false;
                                return $q.all([updateMyRate(), updateAggregatedRates()]);
                            })
                            .then(() => undefined);
                    }).finally(() => {
                        scope.hasCastInSession = true;
                        lock = false;
                    });
                }
            };

            scope.toggle = (rate : number) : angular.IPromise<void> => {
                if (rate === scope.myRate) {
                    return scope.uncast();
                } else {
                    return scope.cast(rate);
                }
            };

            // sync with other local rate buttons
            scope.$on("$destroy", adhRateEventManager.on(scope.refersTo, () => {
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
