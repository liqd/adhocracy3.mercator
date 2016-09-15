import * as AdhBadgeModule from "../../../Badge/Module";
import * as AdhEmbedModule from "../../../Embed/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../../../PreliminaryNames/Module";
import * as AdhRateModule from "../../../Rate/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhEmbed from "../../../Embed/Embed";

import * as Proposal from "./Proposal";


export var moduleName = "adhMeinBerlinStadtforumProposal";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhBadgeModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhRateModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("meinberlin-stadtforum-proposal-detail")
                .registerDirective("meinberlin-stadtforum-proposal-create");
        }])
        .directive("adhMeinberlinStadtforumProposalDetail", [
            "adhConfig", "adhHttp", "adhPermissions", "adhRate", "adhTopLevelState", "adhGetBadges", "$q", Proposal.detailDirective])
        .directive("adhMeinberlinStadtforumProposalCreate", [
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhShowError",
            "adhSubmitIfValid",
            "adhResourceUrlFilter",
            "$location",
            Proposal.createDirective
        ]);
};
