/// <reference path="../../../lib/DefinitelyTyped/lodash/lodash.d.ts"/>

import _ = require("lodash");

import Util = require("../Util/Util");
import AdhHttp = require("../Http/Http");
import AdhConfig = require("../Config/Config");
import AdhWebSocket = require("../WebSocket/WebSocket");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhPreliminaryNames = require("../../Packages/PreliminaryNames/PreliminaryNames");

import Resources = require("../../Resources");

import RIParagraph = require("../../Resources_/adhocracy_sample/resources/paragraph/IParagraph");
import RIParagraphVersion = require("../../Resources_/adhocracy_sample/resources/paragraph/IParagraphVersion");
import RIProposal = require("../../Resources_/adhocracy_sample/resources/proposal/IProposal");
import RIProposalVersion = require("../../Resources_/adhocracy_sample/resources/proposal/IProposalVersion");
import RISectionVersion = require("../../Resources_/adhocracy_sample/resources/section/ISectionVersion");
import RISection = require("../../Resources_/adhocracy_sample/resources/section/ISection");
import SIParagraph = require("../../Resources_/adhocracy/sheets/document/IParagraph");
import SISection = require("../../Resources_/adhocracy/sheets/document/ISection");
import SIDocument = require("../../Resources_/adhocracy/sheets/document/IDocument");
import SIVersionable = require("../../Resources_/adhocracy/sheets/versions/IVersionable");

var pkgLocation = "/Proposal";

/**
 * contents of the resource with view mode.
 */
interface DetailScope<Data> extends ng.IScope {
    viewmode : string;
    content : Resources.Content<Data>;
}

interface DetailRefScope<Data> extends DetailScope<Data> {
    ref : string;
}

interface IProposalVersionDetailScope<Data> extends DetailScope<Data> {
    list : () => void;
    display : () => void;
    edit : () => void;
    onCancel : () => void;
    commit : () => void;
    showComments : () => void;
    hideComments : () => void;
}

export class ProposalDetail {
    public createDirective() {
        return {
            restrict: "E",
            template: "<adh-proposal-version-detail data-content=\"content\" data-viewmode=\"list\"></adh-proposal-version-detail>",
            scope: {
                path: "="
            },
            controller: ["adhHttp", "adhWebSocket", "$scope", (adhHttp, adhWebSocket, $scope) => {
                var wsHandle;

                var fetchAndUpdateContent = (itemPath : string) : void => {
                    adhHttp.getNewestVersionPath(itemPath)
                        .then((versionPath) => adhHttp.get(versionPath))
                        .then((content) => {
                            $scope.content = content;
                        });
                };

                var wsHandler = (event : AdhWebSocket.IServerEvent) : void => {
                    fetchAndUpdateContent($scope.path);
                };

                try {
                    if (typeof wsHandle !== "undefined") {
                        adhWebSocket.unregister($scope.path, wsHandle);
                    }
                    wsHandle = adhWebSocket.register($scope.path, wsHandler);

                } catch (e) {
                    console.log(e);
                    console.log("Will continue on resource " + $scope.path + " without server bind.");
                }

                fetchAndUpdateContent($scope.path);
            }]
        };
    }
}

export class ProposalVersionDetail {
    public static templateUrl : string = "Proposal.html";

    public createDirective(adhConfig : AdhConfig.Type) {
        var _self = this;
        var _class = (<any>_self).constructor;

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/" + _class.templateUrl,
            scope: {
                content: "=",
                viewmode: "@"
            },
            controller: ["adhTopLevelState", "adhHttp", "$scope", (
                adhTopLevelState : AdhTopLevelState.TopLevelState,
                adhHttp : AdhHttp.Service<Resources.Content<any>>,
                $scope : IProposalVersionDetailScope<any>
            ) : void => {
                $scope.list = () => {
                    $scope.viewmode = "list";
                };

                $scope.display = () => {
                    $scope.viewmode = "display";
                };

                $scope.edit = () => {
                    $scope.viewmode = "edit";
                };

                $scope.onCancel = () => {
                    adhHttp.get($scope.content.path).then((content) => {
                        $scope.content = content;
                    });
                    $scope.viewmode = "display";
                };

                $scope.commit = () => {
                    adhHttp.postNewVersion($scope.content.path, $scope.content);

                    $scope.$broadcast("commit");
                    $scope.viewmode = "display";
                };

                $scope.showComments = () => {
                    adhTopLevelState.setContent2Url($scope.content.path);
                    adhTopLevelState.setFocus(2);
                };

                $scope.hideComments = () => {
                    adhTopLevelState.setFocus(1);
                };
            }]
        };
    }
}

interface IScopeProposalVersion {
    content : RIProposalVersion;
    paragraphVersions : RIParagraphVersion[];
    addParagraphVersion : () => void;
    commit : () => void;
    onNewProposal : (any) => void;
    onCancel : () => void;
    poolPath : string;
    viewmode : string;
}

export class ProposalVersionNew {

    public createDirective(adhHttp : ng.IHttpService, adhConfig : AdhConfig.Type, adhProposal : Service) {

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/Proposal.html",
            scope: {
                onNewProposal: "=",
                onCancel: "=",
                poolPath: "@"
            },
            controller: ["$scope", "adhPreliminaryNames", ($scope : IScopeProposalVersion, adhPreliminaryNames : AdhPreliminaryNames) => {
                $scope.viewmode = "edit";

                $scope.content = new RIProposalVersion({preliminaryNames: adhPreliminaryNames});
                $scope.content.data["adhocracy.sheets.document.IDocument"] =
                    new SIDocument.AdhocracySheetsDocumentIDocument({
                        title: "",
                        description: "",
                        elements: []
                    });
                $scope.paragraphVersions = [];

                $scope.addParagraphVersion = () => {
                    var pv = new RIParagraphVersion({preliminaryNames: adhPreliminaryNames});
                    pv.data["adhocracy.sheets.document.IParagraph"] =
                        new SIParagraph.AdhocracySheetsDocumentIParagraph({
                            content: ""
                        });
                    $scope.paragraphVersions.push(pv);
                };

                $scope.commit = () => {
                    adhProposal.postProposalWithParagraphs($scope.poolPath, $scope.content, $scope.paragraphVersions)
                        .then((resp) => {
                            adhHttp.get(resp.path).then((respGet) => {
                                $scope.onNewProposal(respGet);
                            });
                        });
                };
            }]
        };
    }
}

export class SectionVersionDetail {

    public createDirective(adhConfig : AdhConfig.Type, recursionHelper) {

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/Section.html",
            compile: (element) => recursionHelper.compile(element),
            scope: {
                ref: "=",
                viewmode: "="
            },
            controller: ["adhHttp", "$scope", (
                adhHttp : AdhHttp.Service<Resources.Content<SISection.HasAdhocracySheetsDocumentISection>>,
                $scope : DetailRefScope<SISection.HasAdhocracySheetsDocumentISection>
            ) : void => {
                var commit = (event, ...args) => {
                    adhHttp.postNewVersion($scope.content.path, $scope.content);
                };

                // keep pristine copy in sync with cache.  FIXME: this should be done in one gulp with postNewVersion
                adhHttp.get($scope.ref).then((content) => {
                    $scope.content = content;
                });

                // save working copy on 'commit' event from containing document.
                $scope.$on("commit", commit);
            }]
        };
    }
}

export class ParagraphVersionDetail {

    public createDirective(adhConfig : AdhConfig.Type) {

        return {
            restrict: "E",
            templateUrl: adhConfig.pkg_path + pkgLocation + "/templates/Paragraph.html",
            scope: {
                ref: "=",
                viewmode: "="
            },
            controller: ["adhHttp", "$scope", (
                adhHttp : AdhHttp.Service<Resources.Content<SIParagraph.HasAdhocracySheetsDocumentIParagraph>>,
                $scope : DetailRefScope<SIParagraph.HasAdhocracySheetsDocumentIParagraph>
            ) : void => {
                var commit = (event, ...args) => {
                    adhHttp.postNewVersion($scope.content.path, $scope.content);
                };

                // keep pristine copy in sync with cache.  FIXME: this should be done in one gulp with postNewVersion
                adhHttp.get($scope.ref).then((content) => {
                    $scope.content = content;
                });

                // save working copy on 'commit' event from containing document.
                $scope.$on("commit", commit);
            }]
        };
    }
}

export class Service {
    constructor(
        private adhHttp : AdhHttp.Service<any>,
        private adhPreliminaryNames : AdhPreliminaryNames,
        private $q : ng.IQService
    ) {}

    private postProposal(path : string, name : string, scope : {proposal ?: any}) : ng.IPromise<void> {
        return this.adhHttp.postToPool(path, new RIProposal({preliminaryNames: this.adhPreliminaryNames, name: name}))
            .then((ret) => { scope.proposal = ret; });
    }

    private postSection(path : string, name : string, scope : {section ?: any}) : ng.IPromise<void> {
        return this.adhHttp.postToPool(path, new RISection({preliminaryNames: this.adhPreliminaryNames, name: name}))
            .then((ret) => { scope.section = ret; });
    }

    private postParagraph(path : string, name : string, scope : {paragraphs ?: any}) : ng.IPromise<void> {
        return this.adhHttp.postToPool(path, new RIParagraph({preliminaryNames: this.adhPreliminaryNames, name: name}))
            .then((ret) => { scope.paragraphs[name] = ret; });
    }

    private postParagraphs(path : string, names : string[], scope) : ng.IPromise<void> {
        var _self = this;

        // we need to post the paragraph versions one after another in order to guarantee
        // the right order
        if (names.length > 0) {
            return _self.postParagraph(path, names[0], scope)
                .then(() => _self.postParagraphs(path, names.slice(1), scope));
        } else {
            return _self.$q.when();
        }
    }

    private postVersion(path : string, data) : ng.IPromise<any> {
        var _self = this;
        return _self.adhHttp.getNewestVersionPath(path)
            .then((versionPath) => _self.adhHttp.postNewVersion(versionPath, data));
    }

    private postProposalVersion(proposal, data, sections, scope) : ng.IPromise<void> {
        var _self = this;
        return _self.$q.all(sections.map((section) => _self.adhHttp.getNewestVersionPath(section.path)))
            .then((sectionVersionPaths) => {
                var _data = Util.deepcp(data);
                _data.data["adhocracy.sheets.document.IDocument"].elements = sectionVersionPaths;
                return _self.postVersion(proposal.path, _data);
            });
    }

    private postSectionVersion(section, data, paragraphs, scope) : ng.IPromise<void> {
        var _self = this;
        return _self.$q.all(paragraphs.map((paragraph) => _self.adhHttp.getNewestVersionPath(paragraph.path)))
            .then((paragraphVersionPaths) => {
                var _data = Util.deepcp(data);
                _data.data["adhocracy.sheets.document.ISection"].elements = paragraphVersionPaths;
                return _self.postVersion(section.path, _data);
            });
    }

    private postParagraphVersion(paragraph, data, scope : {proposal : any}) : ng.IPromise<void> {
        var _self = this;
        return _self.adhHttp.getNewestVersionPath(scope.proposal.path)
            .then((proposalVersionPath) => {
                var _data = Util.deepcp(data);
                _data.root_versions = [proposalVersionPath];
                return _self.postVersion(paragraph.path, _data);
            });
    }

    private postParagraphVersions(paragraphs : any[], datas : any[], scope) : ng.IPromise<void> {
        var _self = this;

        // we need to post the paragraph versions one after another in order to guarantee
        // that the final section version contains all new proposal versions
        if (paragraphs.length > 0) {
            return _self.postParagraphVersion(paragraphs[0], datas[0], scope)
                .then(() => _self.postParagraphVersions(paragraphs.slice(1), datas.slice(1), scope));
        } else {
            return _self.$q.when();
        }
    }

    public postProposalWithParagraphsOld(
        poolPath : string,
        proposalVersion : RIProposalVersion,
        paragraphVersions : RIParagraphVersion[]
    ) {
        var _self = this;

        var sectionVersion : RISectionVersion = new RISectionVersion({preliminaryNames: _self.adhPreliminaryNames});
        sectionVersion.data["adhocracy.sheets.document.ISection"] =
            new SISection.AdhocracySheetsDocumentISection({
                title : "single section",
                elements : [],
                subsections : []
            });

        var name = proposalVersion.data["adhocracy.sheets.document.IDocument"].title;
        name = Util.normalizeName(name);

        var scope : {proposal? : any; section? : any; paragraphs : {}} = {
            paragraphs: {}
        };

        return _self.postProposal(poolPath, name, scope)
            .then(() => _self.postSection(
                scope.proposal.path,
                "section",
                scope
            ))
            .then(() => _self.postParagraphs(
                scope.proposal.path,
                paragraphVersions.map((paragraphVersion, i) => "paragraph" + i),
                scope
            ))
            .then(() => _self.postProposalVersion(
                scope.proposal,
                proposalVersion,
                [scope.section],
                scope
            ))
            .then(() => _self.postSectionVersion(
                scope.section,
                sectionVersion,
                _.values(scope.paragraphs),
                scope
            ))
            .then(() => _self.postParagraphVersions(
                paragraphVersions.map((paragraphVersion, i) => scope.paragraphs["paragraph" + i]),
                paragraphVersions,
                scope
            ))

            // return the latest proposal Version
            .then(() => _self.adhHttp.getNewestVersionPath(scope.proposal.path))
            .then((proposalVersionPath) => _self.adhHttp.get(proposalVersionPath));
    }

    public postProposalWithParagraphsBatched(
        poolPath : string,
        proposalVersion : RIProposalVersion,
        paragraphVersions : RIParagraphVersion[]
    ) {
        var _self = this;

        var sectionVersion : RISectionVersion = new RISectionVersion({preliminaryNames: _self.adhPreliminaryNames});
        sectionVersion.data["adhocracy.sheets.document.ISection"] =
            new SISection.AdhocracySheetsDocumentISection({
                title : "single_section",
                elements : [],
                subsections : []
            });

        var name = proposalVersion.data["adhocracy.sheets.document.IDocument"].title;
        name = Util.normalizeName(name);

        // this is the batch-request logic.  it works a bit different
        // from the original logic in that it follows the references
        // down the items and up the versions, rather than going down
        // both.
        //
        // (this comment reference a meeting held earlier today and is
        // meaningless without having been there.  since this function
        // will be refactored away soon, so that should not be a big
        // deal.)

        return _self.adhHttp
            .withTransaction((transaction) : ng.IPromise<Resources.Content<any>> => {
                // items
                var postProposal : AdhHttp.ITransactionResult =
                    transaction.post(poolPath, new RIProposal({preliminaryNames: _self.adhPreliminaryNames, name: name}));
                var postSection : AdhHttp.ITransactionResult =
                    transaction.post(postProposal.path, new RISection({preliminaryNames: _self.adhPreliminaryNames, name: "section"}));
                var postParagraphs : AdhHttp.ITransactionResult[] =
                    paragraphVersions.map((paragraphVersion, i) =>
                        transaction.post(
                            postProposal.path,
                            new RIParagraph({preliminaryNames: _self.adhPreliminaryNames, name: "paragraph" + i})));

                // versions
                var postParagraphVersions = paragraphVersions.map((paragraphVersion, i) => {
                    paragraphVersion.data["adhocracy.sheets.versions.IVersionable"] =
                        new SIVersionable.AdhocracySheetsVersionsIVersionable({
                            follows: [postParagraphs[i].first_version_path]
                        });
                    return transaction.post(postParagraphs[i].path, paragraphVersion);
                });

                sectionVersion.data["adhocracy.sheets.versions.IVersionable"] =
                    new SIVersionable.AdhocracySheetsVersionsIVersionable({
                        follows: [postSection.first_version_path]
                    });
                sectionVersion.data["adhocracy.sheets.document.ISection"].elements = postParagraphVersions.map((p) => p.path);
                var postSectionVersion = transaction.post(postSection.path, sectionVersion);

                proposalVersion.data["adhocracy.sheets.versions.IVersionable"] =
                    new SIVersionable.AdhocracySheetsVersionsIVersionable({
                        follows: [postProposal.first_version_path]
                    });
                proposalVersion.data["adhocracy.sheets.document.IDocument"].elements = [postSectionVersion.path];
                var postProposalVersion : AdhHttp.ITransactionResult = transaction.post(postProposal.path, proposalVersion);

                return transaction.commit()
                    .then((responses) : Resources.Content<any> => {
                        // return the latest proposal Version
                        return responses[postProposalVersion.index];
                    });
            });
    }

    // FIXME: there are two implementations of
    // postProposalWithParagraph.  both will be obsoleted by upcoming
    // changes in surrounding the high-level-api user story, so we
    // keep both of them in the code for reference for now.  They need
    // to be cleaned up together once the high-level api is stable.
    public postProposalWithParagraphs(p, v, pvs) {
        // return this.postProposalWithParagraphsOld(p, v, pvs);
        return this.postProposalWithParagraphsBatched(p, v, pvs);
    }
};
