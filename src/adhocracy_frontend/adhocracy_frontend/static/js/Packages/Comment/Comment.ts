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

import * as ResourcesBase from "../../ResourcesBase";

import RIExternalResource from "../../Resources_/adhocracy_core/resources/external_resource/IExternalResource";
import RICommentVersion from "../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import * as SICommentable from "../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";

var pkgLocation = "/Comment";


export interface ICommentAdapter<T extends ResourcesBase.Resource> {
    contentType : string;
    itemContentType : string;
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
    elemRefs(any) : string[];
    poolPath(any) : string;
}


export interface ICommentResourceScope extends angular.IScope {
    path : string;
    submit : () => any;
    delete : () => angular.IPromise<void>;
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
    adapter : ICommentAdapter<RICommentVersion>,
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) => (
    scope : ICommentResourceScope,
    itemPath : string
) : angular.IPromise<void> => {
    var p1 = adhHttp.get(itemPath);
    var p2 = adhHttp.getNewestVersionPathNoFork(itemPath)
        .then((path) => adhHttp.get(path));
    return $q.all([p1, p2]).then((args : any[]) => {
        var item = args[0];
        var version = args[1];

        scope.item = item;

        scope.data = {
            path: version.path,
            itemPath: item.path,
            content: adapter.content(version),
            creator: adapter.creator(item),
            creationDate: adapter.creationDate(version),
            modificationDate: adapter.modificationDate(version),
            commentCount: adapter.commentCount(version),
            comments: adapter.elemRefs(version),
            replyPoolPath: adapter.poolPath(version),
            edited: adapter.edited(version)
        };
    });
};

export var bindPath = (
    adapter : ICommentAdapter<RICommentVersion>,
    adhHttp : AdhHttp.Service<any>,
    $q : angular.IQService
) => (
    scope : ICommentResourceScope,
    pathKey : string = "path"
) : void => {
    var _update = update(adapter, adhHttp, $q);
    scope.$watch(pathKey, (itemPath : string) => {
        if (itemPath) {
            _update(scope, itemPath);
        }
    });
};

export var postCreate = (
    adapter : ICommentAdapter<RICommentVersion>,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (
    scope : ICommentResourceScope,
    poolPath : string
) => {
    var item = adapter.createItem({
        preliminaryNames: adhPreliminaryNames,
        name: "comment"
    });
    item.parent = poolPath;

    var version = adapter.create({
        preliminaryNames: adhPreliminaryNames,
        follows: [item.first_version_path]
    });
    adapter.content(version, scope.data.content);
    adapter.refersTo(version, scope.refersTo);
    version.parent = item.path;

    return adhHttp.deepPost([item, version]);
};

export var postEdit = (
    adapter : ICommentAdapter<RICommentVersion>,
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
            adapter.content(resource, scope.data.content);
            resource.parent = oldItem.path;
            return adhHttp.deepPost([resource]);
        });
};


export var commentDetailDirective = (
    adapter : ICommentAdapter<RICommentVersion>
) => (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhRecursionHelper,
    $window : Window,
    $q : angular.IQService
) => {
    var _update = update(adapter, adhHttp, $q);
    var _postEdit = postEdit(adapter, adhHttp, adhPreliminaryNames);

    var link = (scope : ICommentResourceScope, element, attrs, column? : AdhMovingColumns.MovingColumnController) => {
        if (typeof column !== "undefined") {
            scope.report = () => {
                column.$scope.shared.abuseUrl = scope.data.path;
                column.toggleOverlay("abuse");
            };
        }

        scope.$on("$destroy", adhTopLevelState.on("commentUrl", (commentVersionUrl) => {
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
                scope.mode = 0;
            });
        };

        scope.delete = () : angular.IPromise<void> => {
            // FIXME: translate
            if ($window.confirm("Do you really want to delete this?")) {
                return adhHttp.hide(scope.data.itemPath, adapter.itemContentType).then(() => {
                    if (scope.onSubmit) {
                        scope.onSubmit();
                    }
                });
            } else {
                return $q.when();
            }
        };

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
    adapter : ICommentAdapter<RICommentVersion>
) => (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => {
    var _postCreate = postCreate(adapter, adhHttp, adhPreliminaryNames);

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

            scope.update = () => {
                return adhHttp.get(scope.path).then((commentable) => {
                    scope.elements = AdhUtil.eachItemOnce(commentable.data[SICommentable.nick].comments);
                    scope.poolPath = commentable.data[SICommentable.nick].post_pool;
                });
            };

            scope.$watch("path", scope.update);
            adhPermissions.bindScope(scope, () => scope.poolPath, "poolOptions");
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
                "content_type": RIExternalResource.content_type
            }).then(
                (result) => {
                    if (_.contains(result.data[SIPool.nick].elements, commentablePath)) {
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
        }
    };
};
