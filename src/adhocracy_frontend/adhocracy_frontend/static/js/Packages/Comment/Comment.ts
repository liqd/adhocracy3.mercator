import _ = require("lodash");

import AdhConfig = require("../Config/Config");
import AdhDateTime = require("../DateTime/DateTime");
import AdhDone = require("../Done/Done");
import AdhEmbed = require("../Embed/Embed");
import AdhHttp = require("../Http/Http");
import AdhListing = require("../Listing/Listing");
import AdhMovingColumns = require("../MovingColumns/MovingColumns");
import AdhPermissions = require("../Permissions/Permissions");
import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");
import AdhRate = require("../Rate/Rate");
import AdhAngularHelpers = require("../AngularHelpers/AngularHelpers");
import AdhResourceWidgets = require("../ResourceWidgets/ResourceWidgets");
import AdhTopLevelState = require("../TopLevelState/TopLevelState");
import AdhUser = require("../User/User");
import AdhUtil = require("../Util/Util");
import AdhResourceUtil = require("../Util/ResourceUtil");

import ResourcesBase = require("../../ResourcesBase");

import RIExternalResource = require("../../Resources_/adhocracy_core/resources/external_resource/IExternalResource");
import SIPool = require("../../Resources_/adhocracy_core/sheets/pool/IPool");

import Adapter = require("./Adapter");

var pkgLocation = "/Comment";


export interface ICommentAdapter<T extends ResourcesBase.Resource> extends AdhListing.IListingContainerAdapter {
    create(settings : any) : T;
    createItem(settings : any) : any;
    content(resource : T) : string;
    content(resource : T, value : string) : T;
    refersTo(resource : T) : string;
    refersTo(resource : T, value : string) : T;
    creator(resource : T) : string;
    creationDate(resource : T) : string;
    modificationDate(resource : T) : string;
    commentCount(resource : T) : number;
    edited(resource : T) : boolean;
}


export interface ICommentResourceScope extends AdhResourceWidgets.IResourceWidgetScope {
    refersTo : string;
    poolPath : string;
    hideCancel? : boolean;
    poolOptions : AdhHttp.IOptions;
    createPath : string;
    selectedState : string;
    show : {
        createForm : boolean;
    };
    createComment() : void;
    cancelCreateComment() : void;
    afterCreateComment() : ng.IPromise<void>;
    report? : () => void;
    // update resource
    update() : void;
    // update outer listing
    updateListing() : void;
    data : {
        content : string;
        creator : string;
        creationDate : string;
        modificationDate : string;
        commentCount : number;
        comments : string[];
        path : string;
        replyPoolPath : string;
    };
}

export class CommentResource<R extends ResourcesBase.Resource> extends AdhResourceWidgets.ResourceWidget<R, ICommentResourceScope> {
    constructor(
        private adapter : ICommentAdapter<R>,
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        public adhPermissions : AdhPermissions.Service,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        private adhTopLevelState : AdhTopLevelState.Service,
        $q : ng.IQService
    ) {
        super(adhHttp, adhPreliminaryNames, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/CommentDetail.html";
    }

    createRecursionDirective(adhRecursionHelper) {
        var directive = this.createDirective();
        directive.compile = (element) => adhRecursionHelper.compile(element, directive.link);

        directive.require.push("?^adhMovingColumn");

        directive.scope.refersTo = "@";
        directive.scope.poolPath = "@";
        directive.scope.frontendOrderPredicate = "=?";
        directive.scope.frontendOrderReverse = "=?";
        directive.scope.updateListing = "=";

        return directive;
    }

    public link(scope : ICommentResourceScope, element, attrs, controllers) {
        var self = this;

        var instance = super.link(scope, element, attrs, controllers);

        // the report abuse UI is only available in moving columns
        var column : AdhMovingColumns.MovingColumnController = controllers[1];
        if (column) {
            scope.report = () => {
                column.$scope.shared.abuseUrl = scope.data.path;
                column.toggleOverlay("abuse");
            };
        }

        // FIXME DefinitelyTyped
        (<any>scope).$on("$destroy", this.adhTopLevelState.on("commentUrl", (commentVersionUrl) => {
            if (!commentVersionUrl) {
                scope.selectedState = "";
            } else if (AdhUtil.parentPath(commentVersionUrl) === scope.path) {
                scope.selectedState = "is-selected";
            } else {
                scope.selectedState = "is-not-selected";
            }
        }));

        scope.show = {
            createForm: false
        };

        scope.createComment = () => {
            scope.show.createForm = true;
            scope.createPath = self.adhPreliminaryNames.nextPreliminary();
        };

        scope.cancelCreateComment = () => {
            scope.show.createForm = false;
        };

        scope.afterCreateComment = () => {
            return this.update(instance).then(() => {
                scope.show.createForm = false;
            });
        };

        scope.update = () => {
            return this.update(instance);
        };

        var originalSubmit = scope.submit;
        scope.submit = () => {
            return originalSubmit().then((x) => {
                this.update(instance);
                return x;
            });
        };

        return instance;
    }

    public _handleDelete(instance : AdhResourceWidgets.IResourceWidgetInstance<R, ICommentResourceScope>, path : string) {
        // FIXME: use resource abstractions here
        return <any>this.adhHttp.put(path, {
            content_type: "adhocracy_core.resources.comment.IComment",
            data: {
                "adhocracy_core.sheets.metadata.IMetadata": {
                    hidden: true
                }
            }
        }, true).then((response) => {
            instance.scope.updateListing();
        });
    }

    public _update(
        instance : AdhResourceWidgets.IResourceWidgetInstance<R, ICommentResourceScope>,
        resource : R
    ) {
        return this.adhHttp.getNewestVersionPathNoFork(resource.path)
            .then((path) => this.adhHttp.get(path))
            .then((resource) => {
                var scope : ICommentResourceScope = instance.scope;
                scope.data = {
                    path: resource.path,
                    content: this.adapter.content(resource),
                    creator: this.adapter.creator(resource),
                    creationDate: this.adapter.creationDate(resource),
                    modificationDate: this.adapter.modificationDate(resource),
                    commentCount: this.adapter.commentCount(resource),
                    comments: this.adapter.elemRefs(resource),
                    replyPoolPath: this.adapter.poolPath(resource),
                    edited: this.adapter.edited(resource)
                };
                this.adhPermissions.bindScope(scope, scope.data.replyPoolPath, "poolOptions");
                this.adhPermissions.bindScope(scope, AdhUtil.parentPath(scope.data.path), "commentItemOptions");
                this.adhPermissions.bindScope(scope, scope.data.path, "versionOptions");
            });
    }

    public _create(instance : AdhResourceWidgets.IResourceWidgetInstance<R, ICommentResourceScope>) {
        var item = this.adapter.createItem({
            preliminaryNames: this.adhPreliminaryNames,
            name: "comment"
        });
        item.parent = instance.scope.poolPath;

        var version = this.adapter.create({
            preliminaryNames: this.adhPreliminaryNames,
            follows: [item.first_version_path]
        });
        this.adapter.content(version, instance.scope.data.content);
        this.adapter.refersTo(version, instance.scope.refersTo);
        version.parent = item.path;

        return this.$q.when([item, version]);
    }

    public _edit(instance : AdhResourceWidgets.IResourceWidgetInstance<R, ICommentResourceScope>, oldItem : R) {
        return this.adhHttp.getNewestVersionPathNoFork(oldItem.path)
            .then((path) => this.adhHttp.get(path))
            .then((oldVersion) => {
                var resource = AdhResourceUtil.derive(oldVersion, {preliminaryNames: this.adhPreliminaryNames});
                this.adapter.content(resource, instance.scope.data.content);
                resource.parent = AdhUtil.parentPath(oldVersion.path);
                return [resource];
            });
    }

    public _clear(instance : AdhResourceWidgets.IResourceWidgetInstance<R, ICommentResourceScope>) {
        instance.scope.data = <any>{};
    }
}

export class CommentCreate<R extends ResourcesBase.Resource> extends CommentResource<R> {
    constructor(
        adapter : ICommentAdapter<R>,
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        public adhPermissions : AdhPermissions.Service,
        adhPreliminaryNames : AdhPreliminaryNames.Service,
        adhTopLevelState : AdhTopLevelState.Service,
        $q : ng.IQService
    ) {
        super(adapter, adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, adhTopLevelState, $q);
        this.templateUrl = adhConfig.pkg_path + pkgLocation + "/CommentCreate.html";
    }

    public createDirective() {
        var directive = super.createDirective();
        directive.scope["hideCancel"] = "=?";
        return directive;
    }
}

export var adhCommentListing = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service,
    $location : ng.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/CommentListing.html",
        scope: {
            path: "@",
            frontendOrderReverse: "=?",
            frontendOrderPredicate: "=?"
        },
        link: () => {
            adhTopLevelState.setCameFrom($location.url());
        }
    };
};

/**
 * Directive which checks whether an ExternalResource exists for the given
 * poolPath and key. ExternalResource is a commentable.
 *
 * If not, it is created on the fly.
 *
 * If it exists, the corresponding comment listing is created.
 */
export var adhCreateOrShowCommentListing = (
    adhConfig : AdhConfig.IService,
    adhDone,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhUser : AdhUser.Service
) => {
    return {
        restrict: "E",
        template: "<adh-comment-listing data-ng-if=\"display\" data-path=\"{{commentablePath}}\"></adh-comment-listing>",
        scope: {
            poolPath: "@",
            key: "@"
        },
        link: (scope) => {
            scope.display = false;
            var commentablePath = scope.poolPath + scope.key + "/";

            var setScope = (path) => {
                scope.display = true;
                scope.commentablePath = path;
            };

            // create commentable if it doesn't exist yet
            // REFACT: Add Filter "name": scope.key - this requires name index to be enabled in the backend
            adhHttp.get(scope.poolPath, {
                "content_type": RIExternalResource.content_type
            }).then(
                (result) => {
                    if (_.contains(result.data[SIPool.nick].elements, commentablePath)) {
                        setScope(commentablePath);
                    } else {
                        var unwatch = scope.$watch(() => adhUser.loggedIn, (loggedIn) => {
                            if (loggedIn) {
                                var externalResource = new RIExternalResource({preliminaryNames: adhPreliminaryNames, name: scope.key});
                                return adhHttp.post(scope.poolPath, externalResource).then((obj) => {
                                    if (obj.path !== commentablePath) {
                                        console.log("Created object has wrong path (internal error)");
                                    }
                                })["finally"](() => {
                                    // If the post didn't succeed, somebody else will probably already
                                    // have posted the resource. The error can thus be ignored.
                                    setScope(commentablePath);
                                    unwatch();
                                });
                            }
                        });
                    }
                },
                (msg) => {
                    console.log("Could not query given postPool");
                }
            ).then(adhDone);
        }
    };
};


export var moduleName = "adhComment";

export var register = (angular) => {
    angular
        .module(moduleName, [
            AdhDateTime.moduleName,
            AdhDone.moduleName,
            AdhEmbed.moduleName,
            AdhHttp.moduleName,
            AdhListing.moduleName,
            AdhPermissions.moduleName,
            AdhPreliminaryNames.moduleName,
            AdhRate.moduleName,
            AdhAngularHelpers.moduleName,
            AdhResourceWidgets.moduleName,
            AdhTopLevelState.moduleName,
            AdhUser.moduleName
        ])
        .directive("adhCommentListingPartial",
            ["adhConfig", "adhWebSocket", (adhConfig, adhWebSocket) =>
                new AdhListing.Listing(new Adapter.ListingCommentableAdapter()).createDirective(adhConfig, adhWebSocket)])
        .directive("adhCommentListing", ["adhConfig", "adhTopLevelState", "$location", adhCommentListing])
        .directive("adhCreateOrShowCommentListing", [
            "adhConfig", "adhDone", "adhHttp", "adhPreliminaryNames", "adhUser", adhCreateOrShowCommentListing])
        .directive("adhCommentResource", [
            "adhConfig", "adhHttp", "adhPermissions", "adhPreliminaryNames", "adhTopLevelState", "adhRecursionHelper", "$q",
            (adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, adhTopLevelState, adhRecursionHelper, $q) => {
                var adapter = new Adapter.CommentAdapter();
                var widget = new CommentResource(adapter, adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, adhTopLevelState, $q);
                return widget.createRecursionDirective(adhRecursionHelper);
            }])
        .directive("adhCommentCreate", [
            "adhConfig", "adhHttp", "adhPermissions", "adhPreliminaryNames", "adhTopLevelState", "adhRecursionHelper", "$q",
            (adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, adhTopLevelState, adhRecursionHelper, $q) => {
                var adapter = new Adapter.CommentAdapter();
                var widget = new CommentCreate(adapter, adhConfig, adhHttp, adhPermissions, adhPreliminaryNames, adhTopLevelState, $q);
                return widget.createRecursionDirective(adhRecursionHelper);
            }]);
};
