import * as AdhAbuse from "../Abuse/Module";
import * as AdhAngularHelpersModule from "../AngularHelpers/Module";
import * as AdhAnonymizeModule from "../Anonymize/Module";
import * as AdhCredentialsModule from "../User/Module";
import * as AdhDateTimeModule from "../DateTime/Module";
import * as AdhDoneModule from "../Done/Module";
import * as AdhEmbedModule from "../Embed/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhListingModule from "../Listing/Module";
import * as AdhMovingColumnsModule from "../MovingColumns/Module";
import * as AdhNamesModule from "../Names/Module";
import * as AdhPermissionsModule from "../Permissions/Module";
import * as AdhPreliminaryNamesModule from "../PreliminaryNames/Module";
import * as AdhRateModule from "../Rate/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhComment from "./Comment";
import * as AdhEmbed from "../Embed/Embed";
import * as AdhNames from "../Names/Names";

import RICommentVersion from "../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";

export var moduleName = "adhComment";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhAbuse.moduleName,
            AdhAngularHelpersModule.moduleName,
            AdhAnonymizeModule.moduleName,
            AdhCredentialsModule.moduleName,
            AdhDateTimeModule.moduleName,
            AdhDoneModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhListingModule.moduleName,
            AdhMovingColumnsModule.moduleName,
            AdhNamesModule.moduleName,
            AdhPermissionsModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhRateModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider : AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("create-or-show-comment-listing");
        }])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RICommentVersion.content_type] = "TR__RESOURCE_COMMENT";
        }])
        .directive("adhCommentListing", [
            "adhConfig",
            "adhHttp",
            "adhPermissions",
            "adhTopLevelState",
            "$location",
            AdhComment.adhCommentListing])
        .directive("adhCreateOrShowCommentListing", [
            "adhConfig", "adhDone", "adhHttp", "adhPreliminaryNames", "adhCredentials", AdhComment.adhCreateOrShowCommentListing])
        .directive("adhComment", [
            "adhConfig",
            "adhHttp",
            "adhPermissions",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhRecursionHelper",
            "$window",
            "$q",
            "$timeout",
            "$translate",
            AdhComment.commentDetailDirective])
        .directive("adhCommentCreate", ["adhConfig", "adhHttp", "adhPreliminaryNames", AdhComment.commentCreateDirective])
        .directive("adhCommentColumn", ["adhConfig", "adhTopLevelState", AdhComment.commentColumnDirective]);
};
