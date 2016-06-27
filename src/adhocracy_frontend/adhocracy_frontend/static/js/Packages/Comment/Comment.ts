import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhCredentials from "../User/Credentials";
import * as AdhHttp from "../Http/Http";
import * as AdhMovingColumns from "../MovingColumns/MovingColumns";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhResourceUtil from "../Util/ResourceUtil";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import RIComment from "../../Resources_/adhocracy_core/resources/comment/IComment";
import RICommentVersion from "../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIExternalResource from "../../Resources_/adhocracy_core/resources/external_resource/IExternalResource";
import * as SICommentable from "../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIComment from "../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIMetadata from "../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";

var pkgLocation = "/Comment";


export interface ICommentResourceScope extends angular.IScope {
    path : string;
    column? : AdhMovingColumns.MovingColumnController;
    contentType : string;
    submit : () => any;
    hide : () => angular.IPromise<void>;
    refersTo : string;
    poolPath : string;
    hideCancel? : boolean;
    poolOptions : AdhHttp.IOptions;
    edit : () => void;
    cancel : () => void;
    mode : number;
    selectedState : string;
    show : {
        createForm : boolean;
    };
    createComment() : void;
    cancelCreateComment() : void;
    afterCreateComment() : angular.IPromise<void>;
    item : any;
    report? : () => void;
    // update resource
    update() : angular.IPromise<void>;
    // update outer listing
    onSubmit() : void;
    onCancel() : void;
    data : {
        content : string;
        creator : string;
        creationDate : string;
        modificationDate : string;
        commentCount : number;
        comments : string[];
        path : string;
        itemPath : string;
        replyPoolPath : string;
        edited : boolean;
    };
}


export var update = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) => (
    scope : ICommentResourceScope,
    versionPath : string
) : angular.IPromise<void> => {
    var p1 = adhHttp.get(AdhUtil.parentPath(versionPath));
    var p2 = adhHttp.get(versionPath);
    return $q.all([p1, p2]).then((args : any[]) => {
        var item = args[0];
        var version = args[1];

        scope.item = item;

        if (!scope.data) {
            scope.data = <any>{};
        }

        scope.data.path = version.path;
        scope.data.itemPath = item.path;
        scope.data.content = version.data[SIComment.nick].content;
        scope.data.creator = item.data[SIMetadata.nick].creator;
        scope.data.creationDate = version.data[SIMetadata.nick].item_creation_date;
        scope.data.modificationDate = version.data[SIMetadata.nick].modification_date;
        scope.data.commentCount = version.data[SICommentable.nick].comments_count;
        scope.data.replyPoolPath = version.data[SICommentable.nick].post_pool;
        // NOTE: this is lexicographic comparison. Might break if the datetime
        // encoding changes.
        scope.data.edited = scope.data.modificationDate > scope.data.creationDate;

        var params = {
            elements: "paths",
            depth: 2,
            tag: "LAST",
            content_type: RICommentVersion.content_type,
            sort: "item_creation_date"
        };
        params[SIComment.nick + ":refers_to"] = version.path;
        return adhHttp.get(scope.data.replyPoolPath, params).then((pool) => {
            scope.data.comments = pool.data[SIPool.nick].elements;
        });
    });
};

export var bindPath = (
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) => (
    scope : ICommentResourceScope,
    pathKey : string = "path"
) : void => {
    var _update = update(adhHttp, $q);
    scope.$watch(pathKey, (versionPath : string) => {
        if (versionPath) {
            _update(scope, versionPath);
        }
    });
};

export var postCreate = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : ICommentResourceScope,
    poolPath : string
) => {
    var item = new RIComment({
        preliminaryNames: adhPreliminaryNames
    });
    item.parent = poolPath;

    var version = new RICommentVersion({
        preliminaryNames: adhPreliminaryNames
    });
    version.data[SIComment.nick] = new SIComment.Sheet({
        content: scope.data.content,
        refers_to: scope.refersTo
    });
    version.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [item.first_version_path]
    });
    version.parent = item.path;

    return adhHttp.deepPost([item, version]);
};

export var postEdit = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : ICommentResourceScope,
    oldItem
) => {
    return adhHttp.getNewestVersionPathNoFork(oldItem.path)
        .then((path) => adhHttp.get(path))
        .then((oldVersion) => {
            var resource = AdhResourceUtil.derive(oldVersion, {preliminaryNames: adhPreliminaryNames});
            resource.data[SIComment.nick].content = scope.data.content;
            resource.parent = oldItem.path;
            return adhHttp.deepPost([resource]);
        });
};


export var commentDetailDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhRecursionHelper,
    $window : Window,
    $q : angular.IQService,
    $translate
) => {
    var _update = update(adhHttp, $q);
    var _postEdit = postEdit(adhHttp, adhPreliminaryNames);

    var link = (scope : ICommentResourceScope, element, attrs, column? : AdhMovingColumns.MovingColumnController) => {

        scope.$on("$destroy", adhTopLevelState.on("commentUrl", (commentVersionUrl) => {
            if (!commentVersionUrl) {
                scope.selectedState = "";
            } else if (commentVersionUrl === scope.path) {
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
        };

        scope.cancelCreateComment = () => {
            scope.show.createForm = false;
        };

        scope.afterCreateComment = () => {
            return scope.update().then(() => {
                scope.show.createForm = false;
            });
        };

        scope.edit = () => {
            scope.mode = 1;
        };

        scope.cancel = () => {
            scope.mode = 0;
        };

        scope.update = () => {
            return _update(scope, scope.path);
        };

        scope.submit = () => {
            return _postEdit(scope, scope.item).then(() => {
                scope.update();
                if (scope.onSubmit) {
                    scope.onSubmit();
                }
                scope.mode = 0;
            });
        };

        scope.contentType = RIComment.content_type;

        adhPermissions.bindScope(scope, () => scope.data && scope.data.replyPoolPath, "poolOptions");
        adhPermissions.bindScope(scope, () => scope.data && scope.data.itemPath, "commentItemOptions");
        adhPermissions.bindScope(scope, () => scope.data && scope.data.path, "versionOptions");

        scope.update();
    };

    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        require: "?^adhMovingColumn",
        scope: {
            path: "@",
            onSubmit: "=?"
        },
        compile: (element) => {
            return adhRecursionHelper.compile(element, link);
        }
    };
};

export var commentCreateDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => {
    var _postCreate = postCreate(adhHttp, adhPreliminaryNames);

    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            refersTo: "@",
            poolPath: "@",
            onSubmit: "=?",
            onCancel: "=?",
            hideCancel: "=?"
        },
        link: (scope : ICommentResourceScope) => {
            scope.submit = () => {
                return _postCreate(scope, scope.poolPath).then(() => {
                    scope.data = <any>{};
                    if (scope.onSubmit) {
                        scope.onSubmit();
                    }
                });
            };

            scope.cancel = () => {
                if (scope.onCancel) {
                    scope.onCancel();
                }
            };
        }
    };
};


export var adhCommentListing = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        scope: {
            path: "@"
        },
        link: (scope) => {
            adhTopLevelState.setCameFrom($location.url());

            scope.contentType = RICommentVersion.content_type;
            scope.sorts = [{
                key: "date",
                name: "TR__CREATION_DATE",
                index: "item_creation_date",
                reverse: true
            }, {
                key: "rates",
                name: "TR__RATES",
                index: "rates",
                reverse: true
            }];
            scope.params = {};

            var update = () => {
                return adhHttp.get(scope.path).then((commentable) => {
                    scope.params[SIComment.nick + ":refers_to"] = scope.path;
                    scope.poolPath = commentable.data[SICommentable.nick].post_pool;
                    scope.custom = {
                        refersTo: scope.path,
                        goToLogin: () => {
                            return adhTopLevelState.setCameFromAndGo("/login");
                        }
                    };
                });
            };

            scope.$watch("path", update);
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
    adhCredentials : AdhCredentials.Service
) => {
    return {
        restrict: "E",
        template: "<adh-comment-listing data-ng-if=\"display\" data-path=\"{{commentablePath}}\"></adh-comment-listing>"
                  + "<div data-ng-if=\"display === false\">{{ 'TR__COMMENT_EMPTY_TEXT' | translate }}</div>",
        scope: {
            poolPath: "@",
            key: "@"
        },
        link: (scope) => {
            scope.display = undefined;
            var commentablePath = scope.poolPath + scope.key + "/";

            var setScope = (path) => {
                scope.display = true;
                scope.commentablePath = path;
            };

            // create commentable if it doesn't exist yet
            // REFACT: Add Filter "name": scope.key - this requires name index to be enabled in the backend
            adhHttp.get(scope.poolPath, {
                elements: "paths",
                "content_type": RIExternalResource.content_type
            }).then(
                (result) => {
                    if (_.includes(result.data[SIPool.nick].elements, commentablePath)) {
                        setScope(commentablePath);
                    } else {
                        var unwatch = scope.$watch(() => adhCredentials.loggedIn, (loggedIn) => {
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
                            } else {
                                scope.display = false;
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

export var commentColumnDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Column.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["commentCloseUrl", "commentableUrl"]);
            scope.column = column;
        }
    };
};
