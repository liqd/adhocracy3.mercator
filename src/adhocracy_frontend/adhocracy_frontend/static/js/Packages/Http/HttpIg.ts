/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../_all.d.ts"/>

import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");

import ResourcesBase = require("../../ResourcesBase");

import RIProposal = require("../../Resources_/adhocracy_core/resources/sample_proposal/IProposal");
import RIProposalVersion = require("../../Resources_/adhocracy_core/resources/sample_proposal/IProposalVersion");
import RISection = require("../../Resources_/adhocracy_core/resources/sample_section/ISection");
import RISectionVersion = require("../../Resources_/adhocracy_core/resources/sample_section/ISectionVersion");
import RITag = require("../../Resources_/adhocracy_core/interfaces/ITag");
import SIDocument = require("../../Resources_/adhocracy_core/sheets/document/IDocument");
import SITag = require("../../Resources_/adhocracy_core/sheets/tags/ITag");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");

import AdhHttp = require("./Http");
import AdhMetaApi = require("./MetaApi");

export var register = (angular, config, meta_api) => {

    describe("$http.get and AdhHttp.getRaw", () => {
        var adhHttp : AdhHttp.Service<any> = (() => {
            var factory = ($http, $q, $timeout) => {
                $http.defaults.headers.common["X-User-Token"] = "SECRET_GOD";
                $http.defaults.headers.common["X-User-Path"] = "/principals/users/0000000";

                var preliminaryNames = new AdhPreliminaryNames.Service();
                return (new AdhHttp.Service($http, $q, $timeout, new AdhMetaApi.MetaApiQuery(meta_api), preliminaryNames, config));
            };
            factory.$inject = ["$http", "$q", "$timeout"];
            return angular.injector(["ng"]).invoke(factory);
        })();

        // FIXME: there is a work-around for this problem in Error.ts
        // in function logBackendError.  if this test is re-enabled
        // and the underlying issue is fixed, remove the work-around.
        xit("do not lose error response status and body.", (done) => {
            adhHttp.getRaw("/does/not/exist").then(
                (response) => {
                    expect("should not succeed").toBe(true);
                    done();
                },
                (error) => {
                    expect(error.status).not.toBe(0);
                    expect(error.data).not.toBe(null);
                    done();
                }
            );
        });
    });

    var proposalName = "Against_Curtains_" + Math.random();
        // (we don't have a way yet to repeat this test without having
        // to come up with new names every time, so we just
        // randomise.)

    describe("withTransaction", () => {
        var adhHttp : AdhHttp.Service<any> = (() => {
            var factory = ($http, $q, $timeout) => {
                $http.defaults.headers.common["X-User-Token"] = "SECRET_GOD";
                $http.defaults.headers.common["X-User-Path"] = "/principals/users/0000000";

                var preliminaryNames = new AdhPreliminaryNames.Service();
                return (new AdhHttp.Service($http, $q, $timeout, new AdhMetaApi.MetaApiQuery(meta_api), preliminaryNames, config));
            };
            factory.$inject = ["$http", "$q", "$timeout"];
            return angular.injector(["ng"]).invoke(factory);
        })();

        var adhPreliminaryNames = new AdhPreliminaryNames.Service();

        it("Deep-rewrites preliminary resource paths.", (done) => {
            var poolPath = "/adhocracy";
            var cb = (transaction : any) : ng.IPromise<void> => {
                var proposal : AdhHttp.ITransactionResult =
                    transaction.post(poolPath, new RIProposal({preliminaryNames: adhPreliminaryNames, name: proposalName}));
                var section : AdhHttp.ITransactionResult =
                    transaction.post(proposal.path, new RISection({preliminaryNames: adhPreliminaryNames, name: "Motivation"}));

                var sectionVersionResource = new RISectionVersion({preliminaryNames: adhPreliminaryNames});
                var sectionVersion : AdhHttp.ITransactionResult = transaction.post(section.path, sectionVersionResource);

                var proposalVersionResource = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
                proposalVersionResource.data[SIDocument.nick] =
                    new SIDocument.Sheet({
                        title: proposalName,
                        description: "whoof",
                        picture: undefined,
                        elements: [sectionVersion.path]
                    });
                proposalVersionResource.data[SIVersionable.nick] =
                    new SIVersionable.Sheet({
                        follows: [proposal.first_version_path]
                    });
                transaction.post(proposal.path, proposalVersionResource);

                return transaction.commit()
                    .then((responses) : ng.IPromise<ResourcesBase.Resource> => {
                        var lastTagPath : string = responses[proposal.index].path + "LAST";
                        return adhHttp.get(lastTagPath);
                    })
                    .then((lastTag : RITag) => {
                        var lastVersionPaths : string[] = lastTag.data[SITag.nick].elements;
                        expect(lastVersionPaths.length).toBe(1);
                        expect(lastVersionPaths[0].substring(lastVersionPaths[0].length - 4)).toBe("001/");
                    })
                    .then(() => {
                        done();
                    }, (error) => {
                        expect(error).toBe(true);
                        done();
                    });
            };

            adhHttp.withTransaction(cb);
        });
    });

    describe("postNewVersionNoFork", () => {
        var adhHttp : AdhHttp.Service<any> = (() => {
            var factory = ($http, $q, $timeout) => {
                $http.defaults.headers.common["X-User-Token"] = "SECRET_GOD";
                $http.defaults.headers.common["X-User-Path"] = "/principals/users/0000000";

                var preliminaryNames = new AdhPreliminaryNames.Service();
                return (new AdhHttp.Service($http, $q, $timeout, new AdhMetaApi.MetaApiQuery(meta_api), preliminaryNames, config));
            };
            factory.$inject = ["$http", "$q", "$timeout"];
            return angular.injector(["ng"]).invoke(factory);
        })();

        var adhPreliminaryNames = new AdhPreliminaryNames.Service();

        it("Identifies backend 'no fork allowed' error message properly.", (done) => {
            var firstVersionPath = "/adhocracy/" + proposalName + "/VERSION_0000000/";
            var proposalVersionResource = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
            proposalVersionResource.data[SIDocument.nick] = new SIDocument.Sheet({
                title: proposalName,
                description: "whoof",
                picture: undefined,
                elements: []
            });

            adhHttp.postNewVersionNoFork(firstVersionPath, proposalVersionResource).then(
                (response) => {
                    expect(true).toBe(true);
                    done();
                },
                (error) => {
                    expect("this should not happen.").toBe(false);
                    done();
                }
            );
        });
    });
};
