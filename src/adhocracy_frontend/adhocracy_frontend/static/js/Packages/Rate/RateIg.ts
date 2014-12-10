/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../_all.d.ts"/>

import modernizr = require("modernizr");

import AdhHttp = require("../Http/Http");
import AdhMetaApi = require("../Http/MetaApi");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhUser = require("../User/User");

import RIComment = require("../../Resources_/adhocracy_core/resources/comment/IComment");
import RICommentVersion = require("../../Resources_/adhocracy_core/resources/comment/ICommentVersion");
import RIProposal = require("../../Resources_/adhocracy_core/resources/sample_proposal/IProposal");
import RIProposalVersion = require("../../Resources_/adhocracy_core/resources/sample_proposal/IProposalVersion");
import RIRate = require("../../Resources_/adhocracy_core/resources/rate/IRate");
import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
import RISection = require("../../Resources_/adhocracy_core/resources/sample_section/ISection");
import RISectionVersion = require("../../Resources_/adhocracy_core/resources/sample_section/ISectionVersion");
import SICommentable = require("../../Resources_/adhocracy_core/sheets/comment/ICommentable");
import SIComment = require("../../Resources_/adhocracy_core/sheets/comment/IComment");
import SIDocument = require("../../Resources_/adhocracy_core/sheets/document/IDocument");
import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");
import SIRateable = require("../../Resources_/adhocracy_core/sheets/rate/IRateable");
import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");


export var register = (angular, config, meta_api) => {

    // Sine initialization is async, we need to call it through
    // beforeEach.  Since we only want to call it once, we wrap this
    // dummy "describe" around the entire test suite.

    describe("[]", () => {
        var adhMetaApi : AdhMetaApi.MetaApiQuery;
        var adhPreliminaryNames : AdhPreliminaryNames.Service;
        var adhHttp : AdhHttp.Service<any>;
        var adhUser : AdhUser.Service;

        var _proposalVersion : RIProposalVersion;
        var _commentVersion : RICommentVersion;
        var _rateVersion : RIRateVersion;

        beforeEach((done) => {
            adhMetaApi = angular.injector(["ng"]).invoke(() => new AdhMetaApi.MetaApiQuery(meta_api));
            adhPreliminaryNames = angular.injector(["ng"]).invoke(() => new AdhPreliminaryNames.Service());

            adhHttp = (() => {
                var factory = ($http, $q, $timeout) => {
                    $http.defaults.headers.common["X-User-Token"] = "SECRET_GOD";
                    $http.defaults.headers.common["X-User-Path"] = "/principals/users/0000000/";

                    return (new AdhHttp.Service($http, $q, $timeout, adhMetaApi, adhPreliminaryNames, config));
                };
                factory.$inject = ["$http", "$q", "$timeout"];
                return angular.injector(["ng"]).invoke(factory);
            })();

            // When localstorage is available, adhUser will delete userPath
            // which prevents us from setting it synchronously.
            (<any>modernizr).localstorage = false;

            adhUser = (() => {
                var factory = (
                    $q,
                    $http,
                    $rootScope,
                    $window
                ) => {
                    return (new AdhUser.Service(
                        adhHttp,
                        $q,
                        $http,
                        $rootScope,
                        $window,
                        angular,
                        modernizr
                    ));
                };
                factory.$inject = ["$q", "$http", "$rootScope", "$window"];
                return angular.injector(["ng"]).invoke(factory);
            })();

            adhUser.userPath = "/principals/users/0000000/";

            var poolPath = "/adhocracy";
            var proposalName = "Against_Curtains_" + Math.random();
                // (we don't have a way yet to repeat this test
                // without having to come up with new names every
                // time, so we just randomise.)

            var cb = (transaction : any) : ng.IPromise<void> => {
                // post items
                var proposal : AdhHttp.ITransactionResult =
                    transaction.post(poolPath, new RIProposal({preliminaryNames: adhPreliminaryNames, name: proposalName}));
                var section : AdhHttp.ITransactionResult =
                    transaction.post(proposal.path, new RISection({preliminaryNames: adhPreliminaryNames, name : "motivation"}));

                // post section version
                var sectionVersionResource = new RISectionVersion({preliminaryNames: adhPreliminaryNames});
                var sectionVersion : AdhHttp.ITransactionResult = transaction.post(section.path, sectionVersionResource);

                // post proposal version
                var proposalVersionResource = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
                proposalVersionResource.data["adhocracy_core.sheets.document.IDocument"] =
                    new SIDocument.Sheet({
                        title: proposalName,
                        description: "whoof",
                        picture: undefined,
                        elements: [sectionVersion.path]
                    });
                proposalVersionResource.data["adhocracy_core.sheets.versions.IVersionable"] =
                    new SIVersionable.Sheet({
                        follows: [proposal.first_version_path]
                    });
                var proposalVersion : AdhHttp.ITransactionResult = transaction.post(proposal.path, proposalVersionResource);

                var proposalVersionProper = transaction.get(proposalVersion.path);

                return transaction.commit().then((responses) : ng.IPromise<void> => {
                    _proposalVersion = responses[proposalVersionProper.index];

                    return adhHttp.withTransaction((transaction) => {

                        var commentPostPool = _proposalVersion.data[SICommentable.nick].post_pool;
                        var comment : AdhHttp.ITransactionResult =
                            transaction.post(commentPostPool, new RIComment({preliminaryNames: adhPreliminaryNames, name : "comment"}));

                        // post comment version
                        var commentVersionResource = new RICommentVersion({preliminaryNames: adhPreliminaryNames});
                        commentVersionResource.data[SIComment.nick] = new SIComment.Sheet({
                            refers_to: _proposalVersion.path,
                            content: "this is my two cents"
                        });
                        var commentVersion : AdhHttp.ITransactionResult = transaction.post(comment.path, commentVersionResource);
                        var commentVersionProper = transaction.get(commentVersion.path);

                        return transaction.commit().then((responses) : ng.IPromise<void> => {
                            _commentVersion = <any>(responses[commentVersionProper.index]);

                            return adhHttp.withTransaction((transaction) => {

                                // post rate item
                                var ratePostPool = _commentVersion.data[SIRateable.nick].post_pool;
                                console.log(ratePostPool);
                                var rate : AdhHttp.ITransactionResult =
                                    transaction.post(ratePostPool, new RIRate({
                                        preliminaryNames: adhPreliminaryNames,
                                        name : "rate"
                                    }));

                                // post rate version
                                var rateVersionResource = new RIRateVersion({preliminaryNames: adhPreliminaryNames});
                                rateVersionResource.data[SIRate.nick] = new SIRate.Sheet({
                                    subject: adhUser.userPath,
                                    object: _commentVersion.path,
                                    rate: <any>1
                                });
                                rateVersionResource.data[SIVersionable.nick] = new SIVersionable.Sheet({
                                    follows: [rate.first_version_path]
                                });
                                var rateVersion : AdhHttp.ITransactionResult = transaction.post(rate.path, rateVersionResource);
                                var rateVersionProper = transaction.get(rateVersion.path);

                                return transaction.commit()
                                    .then((responses) : void => {
                                        _rateVersion = <any>(responses[rateVersionProper.index]);
                                        done();
                                    });
                            });
                        });
                    });
                })
                .catch((error) : void => {
                    console.log(error);
                    done();
                });
            };

            adhHttp.withTransaction(cb);
        });

        describe("filter pools", () => {
            it("sets up fixtures properly", () => {
                expect(_proposalVersion.content_type).toEqual(RIProposalVersion.content_type);
                expect(_commentVersion.content_type).toEqual(RICommentVersion.content_type);
                expect(_rateVersion.content_type).toEqual(RIRateVersion.content_type);
            });

            it("logs in god", () => {
                // (this is not really a test, because adhUser is not
                // really a service.  it's all mocked.  it's still
                // good to know that userPath is where it is needed.
                // :-)
                expect(adhUser.userPath).toContain("/principals/users/0000000/");
            });

            it("/adhocracy is postable", (done) => {
                adhHttp.options("/adhocracy")
                    .then((options) => {
                        expect(options.POST).toBe(true);
                        done();
                    });
            });

            it("query 1: user's own rating", (done) => {
                var ratePostPoolPath = _commentVersion.data[SIRateable.nick].post_pool;

                var query : any = {};
                query.content_type = RIRateVersion.content_type;
                query.depth = 2;
                query.tag = "LAST";
                query[SIRate.nick + ":subject"] = adhUser.userPath;

                adhHttp.get(ratePostPoolPath, query)
                    .then(
                        (poolRsp) => {
                            var elements : string[] = poolRsp.data[SIPool.nick].elements;
                            expect(elements.length).toEqual(1);
                            adhHttp.get(elements[0])
                                .then((rateRsp) => {
                                    expect(rateRsp.content_type).toEqual(RIRateVersion.content_type);
                                    done();
                                });
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        });
            });

            it("query 2: rating totals", (done) => {
                var ratePostPoolPath = _commentVersion.data[SIRateable.nick].post_pool;

                var aggrkey : string = "rate";
                var query : any = {};
                query.content_type = RIRateVersion.content_type;
                query.depth = 2;
                query.tag = "LAST";
                query.count = "true";
                query.aggregateby = aggrkey;

                adhHttp.get(ratePostPoolPath, query)
                    .then(
                        (poolRsp) => {
                            var rspCounts = poolRsp.data[SIPool.nick].aggregateby;
                            expect(rspCounts.hasOwnProperty(aggrkey)).toBe(true);
                            expect(rspCounts[aggrkey]).toEqual({"1": 1});  // 0-counts are omitted
                            done();
                        },
                        (msg) => {
                            expect(msg).toBe(false);
                            done();
                        });
            });
        });
    });
};
