import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhPreliminaryNamesModule from "../../PreliminaryNames/Module";

import * as AdhEmbed from "../../Embed/Embed";

import * as MyProposal from "./MyProposal";

export var moduleName = "adhMyPackageMyProposal";


export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerDirective("my-proposal-detail");
            adhEmbedProvider.registerDirective("my-proposal-create");
        }])
        .directive("adhMyProposalDetail", ["adhConfig", "adhHttp", MyProposal.detailDirective])
        .directive("adhMyProposalListItem", ["adhConfig", "adhHttp", MyProposal.listItemDirective])
        .directive("adhMyProposalCreate", [
            "$location", "adhConfig", "adhHttp", "adhPreliminaryNames", "adhResourceUrlFilter", MyProposal.createDirective]);
};
