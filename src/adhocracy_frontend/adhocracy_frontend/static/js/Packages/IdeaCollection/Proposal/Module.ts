import * as AdhAngularHelpersModule from "../../AngularHelpers/Module";
import * as AdhBadgeModule from "../../Badge/Module";
import * as AdhEmbedModule from "../../Embed/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhMappingModule from "../../Mapping/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../../PreliminaryNames/Module";
import * as AdhRateModule from "../../Rate/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as AdhEmbed from "../../Embed/Embed";

import * as Proposal from "./Proposal";


export var moduleName = "adhIdeaCollectionProposal";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAngularHelpersModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhMappingModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhRateModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("meinberlin-proposal-detail")
                .registerDirective("meinberlin-proposal-list-item")
                .registerDirective("meinberlin-proposal-create")
                .registerDirective("meinberlin-proposal-edit")
                .registerDirective("meinberlin-proposal-list");
        }])
        .directive("adhIdeaCollectionProposalDetail", [
            "adhConfig", "adhHttp", "adhPermissions", "adhRate", "adhTopLevelState", "adhGetBadges", "$q", Proposal.detailDirective])
        .directive("adhIdeaCollectionProposalListItem", [
            "adhConfig", "adhHttp", "adhPermissions", "adhRate", "adhTopLevelState", "adhGetBadges", "$q", Proposal.listItemDirective])
        .directive("adhIdeaCollectionProposalMapListItem", [
            "adhConfig", "adhHttp", "adhPermissions", "adhRate", "adhTopLevelState", "adhGetBadges", "$q", Proposal.mapListItemDirective])
        .directive("adhIdeaCollectionProposalCreate", [
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhShowError",
            "adhSubmitIfValid",
            "adhResourceUrlFilter",
            "$location",
            Proposal.createDirective
        ])
        .directive("adhIdeaCollectionProposalEdit", [
            "adhConfig",
            "adhHttp",
            "adhPermissions",
            "adhPreliminaryNames",
            "adhRate",
            "adhResourceUrlFilter",
            "adhShowError",
            "adhSubmitIfValid",
            "adhTopLevelState",
            "adhGetBadges",
            "$location",
            "$q",
            Proposal.editDirective
        ]);
};
