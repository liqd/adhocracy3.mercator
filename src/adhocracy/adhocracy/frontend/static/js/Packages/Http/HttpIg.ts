/// <reference path="../../../lib/DefinitelyTyped/jasmine/jasmine.d.ts"/>
/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../_all.d.ts"/>

import Resources = require("../../Resources");
import RIProposal = require("../../Resources_/adhocracy_sample/resources/proposal/IProposal");
import RIProposalVersion = require("../../Resources_/adhocracy_sample/resources/proposal/IProposalVersion");
import RISection = require("../../Resources_/adhocracy_sample/resources/section/ISection");
import RISectionVersion = require("../../Resources_/adhocracy_sample/resources/section/ISectionVersion");
import RITag = require("../../Resources_/adhocracy/interfaces/ITag");
import SIDocument = require("../../Resources_/adhocracy/sheets/document/IDocument");
import SIVersionable = require("../../Resources_/adhocracy/sheets/versions/IVersionable");

import AdhMetaApi = require("../MetaApi/MetaApi");
import AdhHttp = require("./Http");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");


export var register = (angular, config, meta_api) => {

    describe("withTransaction", () => {
        var adhHttp : AdhHttp.Service<any> = (() => {
            var factory = ($http, $q) => {
                return (new AdhHttp.Service($http, $q, new AdhMetaApi.MetaApiQuery(meta_api)));
            };
            factory.$inject = ["$http", "$q"];
            return angular.injector(["ng"]).invoke(factory);
        })();

        var adhPreliminaryNames = new AdhPreliminaryNames();

        it("Deep-rewrites preliminary resource paths.", (done) => {
            var poolPath = "/adhocracy";
            var proposalName = "Against_Curtains_" + Math.random();
                // (we don't have a way yet to repeat this test
                // without having to come up with new names every
                // time, so we just randomise.)

            var cb = (transaction : any) : ng.IPromise<void> => {
                var proposal : AdhHttp.ITransactionResult =
                    transaction.post(poolPath, new RIProposal({preliminaryNames: adhPreliminaryNames, name: proposalName}));
                var section : AdhHttp.ITransactionResult =
                    transaction.post(proposal.path, new RISection({preliminaryNames: adhPreliminaryNames, name : "Motivation"}));

                var sectionVersionResource = new RISectionVersion({preliminaryNames: adhPreliminaryNames});
                var sectionVersion : AdhHttp.ITransactionResult = transaction.post(section.path, sectionVersionResource);

                var proposalVersionResource = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
                proposalVersionResource.data["adhocracy.sheets.document.IDocument"] =
                    new SIDocument.AdhocracySheetsDocumentIDocument({
                        title: proposalName,
                        description: "whoof",
                        elements: [sectionVersion.path]
                    });
                proposalVersionResource.data["adhocracy.sheets.versions.IVersionable"] =
                    new SIVersionable.AdhocracySheetsVersionsIVersionable({
                        follows: [proposal.first_version_path]
                    });
                transaction.post(proposal.path, proposalVersionResource);

                return transaction.commit()
                    .then((responses) : ng.IPromise<Resources.Content<any>> => {
                        var lastTagPath : string = responses[proposal.index].path + "/LAST";
                        return adhHttp.get(lastTagPath);
                    })
                    .then((lastTag : RITag) => {
                        var lastVersionPaths : string[] = lastTag.data["adhocracy.sheets.tags.ITag"].elements;
                        expect(lastVersionPaths.length).toBe(1);
                        expect(lastVersionPaths[0].substring(lastVersionPaths[0].length - 4)).toBe("0001");
                    })
                    .then(() => {
                        done();
                    }, (error) => {
                        expect(false).toBe(true);
                        done();
                    });
            };

            adhHttp.withTransaction(cb);
        });

        xit("Keeps track of the LAST tag properly.", () => {
            expect(false).toBe(true);
        });
    });
};
