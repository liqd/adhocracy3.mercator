import * as AdhAngularHelpersModule from "../../AngularHelpers/Module";
import * as AdhAnonymizeModule from "../../Anonymize/Module";
import * as AdhBadgeModule from "../../Badge/Module";
import * as AdhHttpModule from "../../Http/Module";
import * as AdhPermissionsModule from "../../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../../PreliminaryNames/Module";
import * as AdhRateModule from "../../Rate/Module";
import * as AdhResourceAreaModule from "../../ResourceArea/Module";
import * as AdhTopLevelStateModule from "../../TopLevelState/Module";

import * as Proposal from "./Proposal";

import RIProposalVersion from "../../../Resources_/adhocracy_s1/resources/s1/IProposalVersion";

export var moduleName = "adhS1Proposal";

export var register = (angular) => {
    angular.module(moduleName, [
        AdhAngularHelpersModule.moduleName,
        AdhAnonymizeModule.moduleName,
        AdhBadgeModule.moduleName,
        AdhHttpModule.moduleName,
        AdhPermissionsModule.moduleName,
        AdhPreliminaryNamesModule.moduleName,
        AdhRateModule.moduleName,
        AdhResourceAreaModule.moduleName,
        AdhTopLevelStateModule.moduleName
    ])
    .config(["adhResourceAreaProvider", (adhResourceAreaProvider) => {
            adhResourceAreaProvider.names[RIProposalVersion.content_type] = "TR__PROPOSALS";
        }])
    .directive("adhS1ProposalDetail", [
        "adhConfig", "adhHttp", "adhPermissions", "adhRate", "adhTopLevelState", "adhGetBadges", "$q", Proposal.detailDirective])
    .directive("adhS1ProposalListItem", [
        "adhConfig", "adhHttp", "adhPermissions", "adhRate", "adhTopLevelState", "adhGetBadges", "$q", Proposal.listItemDirective])
    .directive("adhS1ProposalCreate", [
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
    .directive("adhS1ProposalEdit", [
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
    ])
    .directive("adhS1ProposalListing", ["adhConfig", "adhTopLevelState", Proposal.listingDirective])
	.directive("adhS1RenominateProposal", ["adhConfig", "adhHttp", "$q", "$translate", "$window", Proposal.renominateProposalDirective]);
};
