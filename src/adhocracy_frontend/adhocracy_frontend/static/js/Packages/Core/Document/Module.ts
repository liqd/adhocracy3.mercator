import * as AdhAngularHelpersModule from "../AngularHelpers/Module";
import * as AdhBadgeModule from "../Badge/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhImageModule from "../Image/Module";
import * as AdhInjectModule from "../Inject/Module";
import * as AdhMappingModule from "../Mapping/Module";
import * as AdhMarkdownModule from "../Markdown/Module";
import * as AdhNamesModule from "../Names/Module";
import * as AdhPreliminaryNamesModule from "../PreliminaryNames/Module";
import * as AdhStickyModule from "../Sticky/Module";
import * as AdhTopLevelStateModule from "../TopLevelState/Module";

import * as AdhNames from "../Names/Names";

import * as AdhDocument from "./Document";

import RIGeoDocumentVersion from "../../../Resources_/adhocracy_core/resources/document/IGeoDocumentVersion";

export var moduleName = "adhDocument";

export var register = (angular) => {
    angular
        .module(moduleName, [
            "duScroll",
            "ngMessages",
            AdhAngularHelpersModule.moduleName,
            AdhBadgeModule.moduleName,
            AdhHttpModule.moduleName,
            AdhImageModule.moduleName,
            AdhInjectModule.moduleName,
            AdhMappingModule.moduleName,
            AdhMarkdownModule.moduleName,
            AdhNamesModule.moduleName,
            AdhPreliminaryNamesModule.moduleName,
            AdhStickyModule.moduleName,
            AdhTopLevelStateModule.moduleName
        ])
        .config(["adhNamesProvider", (adhNamesProvider : AdhNames.Provider) => {
            adhNamesProvider.names[RIGeoDocumentVersion.content_type] = "TR__RESOURCE_DOCUMENT";
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
        .directive("adhDocumentListItem", [
            "$q", "adhConfig", "adhHttp", "adhGetBadges", "adhTopLevelState", AdhDocument.listItemDirective])
        .directive("adhDocumentMapListItem", [
            "$q", "adhConfig", "adhHttp", "adhGetBadges", "adhTopLevelState", AdhDocument.mapListItemDirective]);
};
