import * as AdhAngularHelpersModule from "../../../AngularHelpers/Module";
import * as AdhBadgeModule from "../../../Badge/Module";
import * as AdhBlogModule from "../../../Blog/Module";
import * as AdhCredentialsModule from "../../../User/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhImageModule from "../../../Image/Module";
import * as AdhInjectModule from "../../../Inject/Module";
import * as AdhLocaleModule from "../../../Locale/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../../../PreliminaryNames/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhResourceWidgetsModule from "../../../ResourceWidgets/Module";
import * as AdhStickyModule from "../../../Sticky/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhEmbed from "../../../Embed/Embed";

import * as Proposal from "./Proposal";


export var moduleName = "adhMercator2016Proposal";

export var register = (angular) => {

    angular
        .module(moduleName, [
            "duScroll",
            "ngMessages",
            AdhAngularHelpersModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhBlogModule.moduleName,
            AdhCredentialsModule.moduleName,
            AdhHttpModule.moduleName,
            AdhImageModule.moduleName,
            AdhInjectModule.moduleName,
            AdhLocaleModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhResourceWidgetsModule.moduleName,
            AdhStickyModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["flowFactoryProvider", (flowFactoryProvider) => {
            if (typeof flowFactoryProvider.defaults === "undefined") {
                flowFactoryProvider.defaults = {};
            }
            flowFactoryProvider.defaults = {
                singleFile: true,
                maxChunkRetries: 1,
                chunkRetryInterval: 5000,
                simultaneousUploads: 4,
                permanentErrors: [404, 500, 501, 502, 503],
                // these are not native to flow but used by custom functions
                minimumWidth: 400,
                maximumByteSize: 3000000,
                acceptedFileTypes: [
                    "gif",
                    "jpeg",
                    "png"
                ]  // correspond to exact mime types EG image/png
            };
        }])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider.registerDirective("mercator-2016-proposal-create");
            adhEmbedProvider.registerDirective("mercator-2016-proposal-detail");
            adhEmbedProvider.registerDirective("mercator-2016-proposal-listitem");
        }])
        .directive("adhMercator2016ProposalCreate", [
            "$location",
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhResourceUrlFilter",
            Proposal.createDirective])
        .directive("adhMercator2016ProposalModerate", [
            "$q",
            "$location",
            "adhConfig",
            "adhHttp",
            "adhTopLevelState",
            "adhPreliminaryNames",
            "adhResourceUrlFilter",
            "adhGetBadges",
            "adhCredentials",
            Proposal.moderateDirective])
        .directive("adhMercator2016ProposalEdit", [
            "$q",
            "$location",
            "adhConfig",
            "adhHttp",
            "adhTopLevelState",
            "adhPreliminaryNames",
            "adhResourceUrlFilter",
            "adhGetBadges",
            Proposal.editDirective])
        .directive("adhMercator2016ProposalListing", ["adhConfig", Proposal.listing])
        .directive("adhMercator2016ProposalListitem", ["$q", "adhConfig", "adhHttp", "adhTopLevelState", "adhGetBadges", Proposal.listItem])
        .controller("mercatorProposalFormController2016", [
            "$scope",
            "$element",
            "adhShowError",
            "adhTopLevelState",
            "adhSubmitIfValid",
            "adhResourceUrlFilter",
            "adhUploadImage",
            "flowFactory",
            "$translate",
            Proposal.mercatorProposalFormController2016])
        .directive("adhMercator2016ProposalDetail", [
            "$q", "adhConfig", "adhHttp", "adhTopLevelState", "adhPermissions", "adhGetBadges", "$translate", Proposal.detailDirective]);
};
