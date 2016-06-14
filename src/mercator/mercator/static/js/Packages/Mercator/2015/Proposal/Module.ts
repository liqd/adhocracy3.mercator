import * as AdhAngularHelpersModule from "../../../AngularHelpers/Module";
import * as AdhBadgeModule from "../../../Badge/Module";
import * as AdhBlogModule from "../../../Blog/Module";
import * as AdhHttpModule from "../../../Http/Module";
import * as AdhImageModule from "../../../Image/Module";
import * as AdhInjectModule from "../../../Inject/Module";
import * as AdhLocaleModule from "../../../Locale/Module";
import * as AdhMetaApiModule from "../../../MetaApi/Module";
import * as AdhPermissionsModule from "../../../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../../../PreliminaryNames/Module";
import * as AdhResourceAreaModule from "../../../ResourceArea/Module";
import * as AdhResourceWidgetsModule from "../../../ResourceWidgets/Module";
import * as AdhStickyModule from "../../../Sticky/Module";
import * as AdhTopLevelStateModule from "../../../TopLevelState/Module";

import * as AdhUtil from "../../../Util/Util";

import RIMercator2015Process from "../../../../Resources_/adhocracy_mercator/resources/mercator/IProcess";

import * as Proposal from "./Proposal";


export var moduleName = "adhMercator2015Proposal";

export var register = (angular) => {
    angular
        .module(moduleName, [
            "duScroll",
            "ngMessages",
            AdhAngularHelpersModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhBlogModule.moduleName,
            AdhHttpModule.moduleName,
            AdhImageModule.moduleName,
            AdhInjectModule.moduleName,
            AdhLocaleModule.moduleName,
            AdhMetaApiModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhResourceWidgetsModule.moduleName,
            AdhStickyModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhResourceAreaProvider", "adhConfig", "adhMetaApiProvider", (
            adhResourceAreaProvider,
            adhConfig,
            adhMetaApi
        ) => {
            var processType = RIMercator2015Process.content_type;
            var processHeader = adhConfig.pkg_path + Proposal.pkgLocation + "/ProcessHeader.html";
            adhResourceAreaProvider.processHeaders[processType] = processHeader;
            Proposal.registerRoutes(processType)(adhResourceAreaProvider, adhMetaApi);
        }])
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
        // NOTE: we do not use a Widget based directive here for performance reasons
        .directive("adhMercator2015Proposal", ["adhConfig", "adhHttp", "adhTopLevelState", "adhGetBadges", Proposal.listItem])
        .directive("adhMercator2015ProposalDetailView", [
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhGetBadges",
            "adhUploadImage",
            "flowFactory",
            "moment",
            "$window",
            "$location",
            "$q",
            (...args) => {
                var widget = AdhUtil.construct(Proposal.DetailWidget, args);
                return widget.createDirective();
            }])
        .directive("adhMercator2015ProposalCreate", [
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhGetBadges",
            "adhUploadImage",
            "$timeout",
            "flowFactory",
            "moment",
            "modernizr",
            "$window",
            "$location",
            "$q",
            (...args) => {
                var widget = AdhUtil.construct(Proposal.CreateWidget, args);
                return widget.createDirective();
            }])
        .directive("adhMercator2015ProposalListing", ["adhConfig", Proposal.listing])
        .directive("adhMercator2015UserProposalListing", ["adhConfig", Proposal.userListing])
        .directive("adhMercator2015AddProposalButton", ["adhConfig", "adhPermissions", "adhTopLevelState", Proposal.addProposalButton])
        .controller("mercatorProposalFormController", [
            "$scope", "$element", "$window", "adhShowError", "adhSubmitIfValid", Proposal.mercatorProposalFormController]);
};
