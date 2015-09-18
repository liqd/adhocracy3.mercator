import * as AdhCredentialsModule from "../User/Module";
import * as AdhHttpModule from "../Http/Module";
import * as AdhEmbedModule from "../Embed/Module";
import * as AdhTopLevelState from "../TopLevelState/Module";

import * as AdhEmbed from "../Embed/Embed";

import * as AdhBadge from "./Badge";


export var moduleName = "adhBadge";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhCredentialsModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhHttpModule.moduleName,
            AdhTopLevelState.moduleName
        ])
        .config(["adhEmbedProvider", (adhEmbedProvider: AdhEmbed.Provider) => {
            adhEmbedProvider.embeddableDirectives.push("badge-assignment-create");
            adhEmbedProvider.embeddableDirectives.push("badge-assignment-edit");
        }])
        .factory("adhGetBadges", ["adhHttp", "$q", AdhBadge.getBadgesFactory])
        .directive("adhBadgeAssignmentCreate", ["adhConfig", "adhHttp", "$q", "adhCredentials", AdhBadge.badgeAssignmentCreateDirective])
        .directive("adhBadgeAssignmentEdit", ["adhConfig", "adhHttp", "$q", "adhCredentials", AdhBadge.badgeAssignmentEditDirective])
        .directive("adhBadgeAssignmentEditInline", ["adhConfig", "adhHttp", "$q", "adhCredentials",
            "adhTopLevelState", AdhBadge.badgeAssignmentEditInlineDirective]);
};
