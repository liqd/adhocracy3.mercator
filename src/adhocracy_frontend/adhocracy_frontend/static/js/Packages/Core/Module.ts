import * as AdhAbuseModule from "./Abuse/Module";
import * as AdhAngularHelpersModule from "./AngularHelpers/Module";
import * as AdhAnonymizeModule from "./Anonymize/Module";
import * as AdhBadgeModule from "./Badge/Module";
import * as AdhCommentModule from "./Comment/Module";
import * as AdhConfigModule from "./Config/Module";
import * as AdhCrossWindowMessagingModule from "./CrossWindowMessaging/Module";
import * as AdhDateTimeModule from "./DateTime/Module";
import * as AdhDocumentModule from "./Document/Module";
import * as AdhDoneModule from "./Done/Module";
import * as AdhEmbedModule from "./Embed/Module";
import * as AdhEventManagerModule from "./EventManager/Module";
import * as AdhHomeModule from "./Home/Module";
import * as AdhHttpModule from "./Http/Module";
import * as AdhIdeaCollectionModule from "./IdeaCollection/Module";
import * as AdhImageModule from "./Image/Module";
import * as AdhInjectModule from "./Inject/Module";
import * as AdhListingModule from "./Listing/Module";
import * as AdhLocaleModule from "./Locale/Module";
import * as AdhMappingModule from "./Mapping/Module";
import * as AdhMarkdownModule from "./Markdown/Module";
import * as AdhMetaApiModule from "./MetaApi/Module";
import * as AdhMovingColumnsModule from "./MovingColumns/Module";
import * as AdhNamesModule from "./Names/Module";
import * as AdhPageModule from "./Page/Module";
import * as AdhPermissionsModule from "./Permissions/Module";
import * as AdhPreliminaryNamesModule from "./PreliminaryNames/Module";
import * as AdhProcessModule from "./Process/Module";
import * as AdhRateModule from "./Rate/Module";
import * as AdhResourceActionsModule from "./ResourceActions/Module";
import * as AdhResourceAreaModule from "./ResourceArea/Module";
import * as AdhShareSocialModule from "./ShareSocial/Module";
import * as AdhStickyModule from "./Sticky/Module";
import * as AdhTopLevelStateModule from "./TopLevelState/Module";
import * as AdhTrackingModule from "./Tracking/Module";
import * as AdhUserModule from "./User/Module";
import * as AdhUserViewsModule from "./User/ViewsModule";
import * as AdhWebSocketModule from "./WebSocket/Module";

export var moduleName = "adhCore";

export var register = (angular, config, metaApi) => {
    AdhAbuseModule.register(angular);
    AdhAngularHelpersModule.register(angular);
    AdhAnonymizeModule.register(angular);
    AdhBadgeModule.register(angular);
    AdhCommentModule.register(angular);
    AdhConfigModule.register(angular, config);
    AdhCrossWindowMessagingModule.register(angular);
    AdhDateTimeModule.register(angular);
    AdhDocumentModule.register(angular);
    AdhDoneModule.register(angular);
    AdhEmbedModule.register(angular);
    AdhEventManagerModule.register(angular);
    AdhHomeModule.register(angular);
    AdhHttpModule.register(angular, config);
    AdhIdeaCollectionModule.register(angular);
    AdhImageModule.register(angular);
    AdhInjectModule.register(angular);
    AdhListingModule.register(angular);
    AdhLocaleModule.register(angular);
    AdhMappingModule.register(angular);
    AdhMarkdownModule.register(angular);
    AdhMetaApiModule.register(angular, metaApi);
    AdhMovingColumnsModule.register(angular);
    AdhNamesModule.register(angular);
    AdhPageModule.register(angular);
    AdhPermissionsModule.register(angular);
    AdhPreliminaryNamesModule.register(angular);
    AdhProcessModule.register(angular);
    AdhRateModule.register(angular);
    AdhResourceActionsModule.register(angular);
    AdhResourceAreaModule.register(angular);
    AdhShareSocialModule.register(angular);
    AdhStickyModule.register(angular);
    AdhTopLevelStateModule.register(angular);
    AdhTrackingModule.register(angular);
    AdhUserModule.register(angular);
    AdhUserViewsModule.register(angular);
    AdhWebSocketModule.register(angular);

    angular
        .module(moduleName, [
            AdhCommentModule.moduleName,
            AdhConfigModule.moduleName,
            AdhCrossWindowMessagingModule.moduleName,
            AdhEmbedModule.moduleName,
            AdhMetaApiModule.moduleName,
            AdhNamesModule.moduleName,
            AdhPageModule.moduleName,
            AdhResourceAreaModule.moduleName,
            AdhTrackingModule.moduleName,
            AdhUserViewsModule.moduleName
        ]);
};
