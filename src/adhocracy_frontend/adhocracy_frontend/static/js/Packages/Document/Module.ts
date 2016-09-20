import * as AdhAngularHelpersModule from "../AngularHelpers/Module";
import * as AdhBadgeModule from "../Badge/Module";
import * as AdhEmbedModule from "../Embed/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhImageModule from "../Image/Module";
import * as AdhInjectModule from "../Inject/Module";
import * as AdhMappingModule from "../Mapping/Module";
import * as AdhMarkdownModule from "../Markdown/Module";
import * as AdhPreliminaryNamesModule from "../PreliminaryNames/Module";
import * as AdhResourceAreaModule from "../ResourceArea/Module";
import * as AdhStickyModule from "../Sticky/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhEmbed from "../Embed/Embed";
import * as AdhResourceArea from "../ResourceArea/ResourceArea";

import * as AdhDocument from "./Document";

import RIGeoDocumentVersion from "../../Resources_/adhocracy_core/resources/document/IGeoDocumentVersion";

export var moduleName = "adhDocument";

export var register = (angular) => {
    angular
        .module(moduleName, [
            "duScroll",
            "ngMessages",
            AdhAngularHelpersModule.moduleName,
            AdhHttpModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhImageModule.moduleName,
            AdhInjectModule.moduleName,
            AdhMappingModule.moduleName,
            AdhMarkdownModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhStickyModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider
                .registerDirective("document-detail")
                .registerDirective("document-create")
                .registerDirective("document-edit")
                .registerDirective("document-list-item");
        }])
        .config(["adhResourceAreaProvider", (adhResourceAreaProvider : AdhResourceArea.Provider) => {
            adhResourceAreaProvider.names[RIGeoDocumentVersion.content_type] = "TR__DOCUMENTS";
        }])
        .directive("adhDocumentDetail", ["$q", "adhConfig", "adhHttp", "adhGetBadges", "adhTopLevelState", AdhDocument.detailDirective])
        .directive("adhDocumentCreate", [
            "$location",
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhShowError",
            "adhSubmitIfValid",
            "adhResourceUrlFilter",
            "adhUploadImage",
            "flowFactory",
            AdhDocument.createDirective])
        .directive("adhDocumentEdit", [
            "$location",
            "$q",
            "adhConfig",
            "adhHttp",
            "adhPreliminaryNames",
            "adhTopLevelState",
            "adhShowError",
            "adhSubmitIfValid",
            "adhResourceUrlFilter",
            "adhUploadImage",
            "flowFactory",
            AdhDocument.editDirective])
        .directive("adhDocumentListing", ["adhConfig", AdhDocument.listingDirective])
        .directive("adhDocumentListItem", [
            "$q", "adhConfig", "adhHttp", "adhGetBadges", "adhTopLevelState", AdhDocument.listItemDirective])
        .directive("adhDocumentMapListItem", [
            "$q", "adhConfig", "adhHttp", "adhGetBadges", "adhTopLevelState", AdhDocument.mapListItemDirective]);
};
