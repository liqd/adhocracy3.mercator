import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhHttp = require("../Http/Http");
import AdhPermissions = require("../Permissions/Permissions");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUser = require("../User/User");

import ResourcesBase = require("../../ResourcesBase");

import RIRate = require("../../Resources_/adhocracy_core/resources/rate/IRate");
import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
import RIUser = require("../../Resources_/adhocracy_core/resources/principal/IUser");
import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");
import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
import SIUserBasic = require("../../Resources_/adhocracy_core/sheets/principal/IUserBasic");

import Adapter = require("./Adapter");

var pkgLocation = "/Rate";


/**
 * Motivation and UI
 * ~~~~~~~~~~~~~~~~~
 *
 * The UI should show the rating button as follows::
 *
 *     Count:  Pros  Cons  Neutrals
 *      +13    14    1     118
 *
 * The words "Props", "Cons", Neutrals" are buttons.  If the user clicks
 * on any one, it becomes active, and all other buttons become inactive.
 * Initially, all buttons are inactive.
 *
 * The current design: Once any of the buttons is activated, the rating
 * cannot be taken back.  The user can only click on "neutral" if she
 * wants to change her mind about having an opinion.
 *
 * The final design: if an active button is clicked, it becomes inactive,
 * and the rating object will be deleted.  (FIXME: This requires a
 * deletion semantics, which should also become a section in this
 * document.)
 */


export interface IRateScope extends ng.IScope {
    refersTo : string;
    postPoolPath : string;
    rates : {
        pro : number;
        contra : number;
        neutral : number;
    };
    myRateResource : RIRateVersion;
    allRateResources : RIRateVersion[];
    auditTrail : { subject: string; rate: number }[];
    auditTrailVisible : boolean;
    isActive : (value : number) => boolean;
    isActiveClass : (value : number) => string;  // css class name if RateValue is active, or "" otherwise.
    differenceClass : () => string;  // css class name is-positive, is-negative or "" otherwise.
    toggleShowDetails() : void;
    cast(value : number) : void;
    toggle() : void;
    assureUserRateExists() : ng.IPromise<void>;
    postUpdate() : ng.IPromise<void>;
    optionsPostPool : AdhHttp.IOptions;
    ready : boolean;
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


/**
 * initialise rates
 */
export var resetRates = ($scope : IRateScope) : void => {
    $scope.rates = {
        pro: 0,
        contra: 0,
        neutral: 0
    };

    delete $scope.myRateResource;
};


/**
 * Take the rateable in $scope.refersTo, finds the post_pool of its
 * rateable, and stores it to '$scope.postPoolPath'.  Promises a void
 * that is resolved once the scope is updated.
 */
export var fetchPostPoolPath = (
    adapter : IRateAdapter<any>,
    $scope : IRateScope,
    adhHttp : AdhHttp.Service<any>
) : ng.IPromise<void> => {
    return adhHttp.get($scope.refersTo)
        .then((rateable : ResourcesBase.Resource) => {
            $scope.postPoolPath = adapter.rateablePostPoolPath(rateable);
        });
};


/**
 * Get rate of specified user and write results to $scope.myRateResource,
 * but only if it exists.
 */
export var fetchMyRate = (
    $scope : IRateScope,
    adhHttp : AdhHttp.Service<any>,
    poolPath : string,
    object : string,
    subject : string
) : ng.IPromise<void> => {
    var query : any = {};
    query.content_type = RIRateVersion.content_type;
    query.depth = 2;
    query.tag = "LAST";
    query[SIRate.nick + ":subject"] = subject;
    query[SIRate.nick + ":object"] = object;

    return adhHttp.get(poolPath, query).then((poolRsp) => {
        if (poolRsp.data[SIPool.nick].elements.length > 0) {
            return adhHttp.get(poolRsp.data[SIPool.nick].elements[0]).then((rateRsp) => {
                $scope.myRateResource = rateRsp;
            });
        }
    });
};


/**
 * Get aggregates rates of all users and write results to $scope.rates.
 */
export var fetchAggregatedRates = (
    $scope : IRateScope,
    adhHttp : AdhHttp.Service<any>,
    poolPath : string,
    object : string
) : ng.IPromise<void> => {
    var query : any = {};
    query.content_type = RIRateVersion.content_type;
    query.depth = 2;
    query.tag = "LAST";
    query.count = "true";
    query.aggregateby = "rate";
    query[SIRate.nick + ":object"] = object;

    return adhHttp.get(poolPath, query).then((poolRsp) => {
        var rates = poolRsp.data[SIPool.nick].aggregateby.rate;
        $scope.rates.pro = rates["1"] || 0;
        $scope.rates.contra = rates["-1"] || 0;
        $scope.rates.neutral = rates["0"] || 0;
    });
};


/**
 * Collect detailed information about $scope.postPoolPath specific to
 * ratings for $scope.refersTo.  Updates '$scope.auditTrail'.
 * Promises a void that is resolved once the scope is updated.
 */
export var fetchAuditTrail = (
    adapter : IRateAdapter<any>,
    $scope : IRateScope,
    $q : ng.IQService,
    adhHttp : AdhHttp.Service<any>
) : ng.IPromise<void> => {
    var query : any = {};
    query.content_type = RIRateVersion.content_type;
    query.depth = 2;
    query.tag = "LAST";
    query[SIRate.nick + ":object"] = $scope.refersTo;

    return adhHttp.get($scope.postPoolPath, query)
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
                $scope.auditTrail = auditTrail;
            });
        });
};


/**
 * controller for rate widget.  promises a void in order to notify
 * the unit test suite that it is done setting up its state.  (the
 * widget will ignore this promise.)
 */
export var rateController = (
    adapter : IRateAdapter<any>,
    $scope : IRateScope,
    $q : ng.IQService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhUser : AdhUser.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service
) : ng.IPromise<void> => {

    $scope.isActive = (rate : number) : boolean =>
        typeof $scope.myRateResource !== "undefined" &&
            rate === adapter.rate($scope.myRateResource);

    $scope.isActiveClass = (rate : number) : string =>
        $scope.isActive(rate) ? "is-rate-button-active" : "";

    $scope.differenceClass = () => {
        var netRate = $scope.rates.pro - $scope.rates.contra;
        if (netRate > 0) {
            return "is-positive";
        } else if (netRate < 0) {
            return "is-negative";
        }
        return "";
    };

    $scope.toggleShowDetails = () => {
        if ($scope.auditTrailVisible) {
            $scope.auditTrailVisible = false;
            delete $scope.auditTrail;
        } else {
            $q.all([
                fetchMyRate($scope, adhHttp, $scope.postPoolPath, $scope.refersTo, adhUser.userPath),
                fetchAggregatedRates($scope, adhHttp, $scope.postPoolPath, $scope.refersTo),
                fetchAuditTrail(adapter, $scope, $q, adhHttp)
            ]).then(() => {
                $scope.auditTrailVisible = true;
            });
        }
    };

    $scope.cast = (rate : number) : void => {
        if (!$scope.optionsPostPool.POST) {
            adhTopLevelState.redirectToLogin();
        }

        if ($scope.isActive(rate)) {
            // click on active button to un-rate

            // (the current implementation does not allow withdrawing
            // of rates, so if you click on "pro" twice in a row, the
            // second time will have no effect.  the work-around is for
            // the user to rate something "neutral".  a proper fixed
            // will be provided later.)
            //
            // adapter.rate($scope.myRateResource, <any>false);
            // $scope.postUpdate();
        } else {
            // click on inactive button to (re-)rate
            $scope.assureUserRateExists()
                .then(() => {
                    adapter.rate($scope.myRateResource, rate);
                    $scope.postUpdate();
                });
        }
    };

    $scope.toggle = () : void => {
        if ($scope.isActive(1)) {
            $scope.cast(0);
        } else {
            $scope.cast(1);
        }
    };

    $scope.assureUserRateExists = () : ng.IPromise<void> => {
        if (typeof $scope.myRateResource !== "undefined") {
            return $q.when();
        } else {
            return adhHttp
                .withTransaction((transaction) : ng.IPromise<void> => {
                    var item : AdhHttp.ITransactionResult =
                        transaction.post($scope.postPoolPath, new RIRate({ preliminaryNames: adhPreliminaryNames }));
                    var version : AdhHttp.ITransactionResult =
                        transaction.get(item.first_version_path);

                    return transaction.commit()
                        .then((responses) : void => {
                            $scope.myRateResource = <RIRateVersion>responses[version.index];
                            adapter.subject($scope.myRateResource, adhUser.userPath);
                            adapter.object($scope.myRateResource, $scope.refersTo);
                        });
                });
        }
    };

    $scope.postUpdate = () : ng.IPromise<void> => {
        if (typeof $scope.myRateResource === "undefined") {
            throw "internal error?!";
        } else {
            return adhHttp
                .postNewVersionNoFork($scope.myRateResource.path, $scope.myRateResource)
                .then((response : { value: RIRate }) => {
                    $scope.auditTrailVisible = false;
                    return $q.all([
                        fetchMyRate($scope, adhHttp, $scope.postPoolPath, $scope.refersTo, adhUser.userPath),
                        fetchAggregatedRates($scope, adhHttp, $scope.postPoolPath, $scope.refersTo)
                    ]);
                })
                .then(() => { return; });
        }
    };

    resetRates($scope);
    $scope.auditTrailVisible = false;
    return fetchPostPoolPath(adapter, $scope, adhHttp)
        .then(() => $q.all([
            fetchMyRate($scope, adhHttp, $scope.postPoolPath, $scope.refersTo, adhUser.userPath),
            fetchAggregatedRates($scope, adhHttp, $scope.postPoolPath, $scope.refersTo)
        ]))
        .then(() => {
            adhPermissions.bindScope($scope, $scope.postPoolPath, "optionsPostPool");
            $scope.ready = true;
        });
};


export var createDirective = (
    template : string,
    adapter : IRateAdapter<any>,
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + template,
        scope: {
            refersTo: "@",
            postPoolSheet : "@",
            postPoolField : "@"
        },
        controller:
            ["$scope", "$q", "adhHttp", "adhPermissions", "adhUser", "adhPreliminaryNames", "adhTopLevelState",
                ($scope, $q, adhHttp, adhPermissions, adhUser, adhPreliminaryNames, adhTopLevelState) =>
                    rateController(adapter, $scope, $q, adhHttp, adhPermissions, adhUser, adhPreliminaryNames, adhTopLevelState)]
    };
};


export var moduleName = "adhRate";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhHttp.moduleName,
            AdhPermissions.moduleName,
            AdhPreliminaryNames.moduleName,
            AdhTopLevelState.moduleName,
            AdhUser.moduleName
        ])
        .directive("adhRate", ["$q", "adhConfig", "adhPreliminaryNames", ($q, adhConfig, adhPreliminaryNames) =>
            createDirective(
                "/Rate.html",
                new Adapter.RateAdapter(),
                adhConfig
            )])
        .directive("adhLike", ["$q", "adhConfig", "adhPreliminaryNames", ($q, adhConfig, adhPreliminaryNames) =>
            createDirective(
                "/Like.html",
                new Adapter.RateAdapter(),
                adhConfig
            )]);
};
