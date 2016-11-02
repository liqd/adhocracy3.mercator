import * as AdhBadge from "../Badge/Badge";
import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhMapping from "../Mapping/Mapping";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import * as ResourcesBase from "../../../ResourcesBase";

import RICommentVersion from "../../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIDocument from "../../../Resources_/adhocracy_core/resources/document/IDocument";
import RIDocumentVersion from "../../../Resources_/adhocracy_core/resources/document/IDocumentVersion";
import RIGeoDocument from "../../../Resources_/adhocracy_core/resources/document/IGeoDocument";
import RIGeoDocumentVersion from "../../../Resources_/adhocracy_core/resources/document/IGeoDocumentVersion";
import RIParagraph from "../../../Resources_/adhocracy_core/resources/paragraph/IParagraph";
import RIParagraphVersion from "../../../Resources_/adhocracy_core/resources/paragraph/IParagraphVersion";
import * as SICommentable from "../../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIDocument from "../../../Resources_/adhocracy_core/sheets/document/IDocument";
import * as SIImageReference from "../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SIMetadata from "../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIParagraph from "../../../Resources_/adhocracy_core/sheets/document/IParagraph";
import * as SIPoint from "../../../Resources_/adhocracy_core/sheets/geo/IPoint";
import * as SITitle from "../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../../Resources_/adhocracy_core/sheets/versions/IVersionable";

export var pkgLocation = "/Core/Document";


export interface IParagraph {
    body : string;
    deleted : boolean;
    commentCount? : number;
    path? : string;
    selectedState? : string;
}

export interface IScope extends angular.IScope {
    path? : string;
    hasMap? : boolean;
    hasBadges? : boolean;
    options : AdhHttp.IOptions;
    errors? : AdhHttp.IBackendErrorItem[];
    data : {
        title : string;
        paragraphs? : IParagraph[];
        commentCountTotal? : number;
        picture? : string;
        creator? : string;
        creationDate? : string;
        modificationDate? : string;

        // optional features
        coordinates? : number[];
        assignments? : AdhBadge.IBadgeAssignment[];
    };
    selectedState? : string;
    resource : any;

    toggleCreateForm() : void;
    showCreateForm? : boolean;

    documentVersion? : ResourcesBase.IResource;
    paragraphVersions? : ResourcesBase.IResource[];

    commentType? : string;
}

export interface IFormScope extends IScope {
    showError;
    addParagraph() : void;
    deleteParagraph(index : number) : void;
    paragraphCount() : number;
    submit() : angular.IPromise<any>;
    cancel() : void;
    documentForm : any;
    polygon? : number[][];
    $flow? : Flow;
}

export var highlightSelectedParagraph = (
    commentableUrl : string,
    scope : IScope) => {
    if (scope.data) {
        _.forEach(scope.data.paragraphs, (paragraph) => {
            if (!commentableUrl) {
                paragraph.selectedState = "";
            } else if (paragraph.path === commentableUrl) {
                paragraph.selectedState = "is-selected";
            } else {
                paragraph.selectedState = "is-not-selected";
            }
        });
    }
};

export var bindPath = (
    $q : angular.IQService,
    adhHttp : AdhHttp.Service,
    adhGetBadges? : AdhBadge.IGetBadgeAssignments,
    adhTopLevelState? : AdhTopLevelState.Service
) => (
    scope : IScope,
    pathKey : string = "path",
    hasMap : boolean = false,
    hasBadges : boolean = false
) : Function => {
    return scope.$watch(pathKey, (path : string) => {
        if (path) {
            adhHttp.get(path).then((documentVersion : ResourcesBase.IResource) => {
                var paragraphPaths : string[] = SIDocument.get(documentVersion).elements;
                var paragraphPromises = _.map(paragraphPaths, (path) => {
                    return adhHttp.get(path);
                });

                return $q.all(paragraphPromises).then((paragraphVersions : ResourcesBase.IResource[]) => {
                    var paragraphs = _.map(paragraphVersions, (paragraphVersion) => {
                        return {
                            body: SIParagraph.get(paragraphVersion).text,
                            deleted: false,
                            commentCount: SICommentable.get(paragraphVersion).comments_count,
                            path: paragraphVersion.path
                        };
                    });

                    scope.documentVersion = documentVersion;
                    scope.paragraphVersions = paragraphVersions;

                    scope.data = {
                        title: SITitle.get(documentVersion).title,
                        paragraphs: paragraphs,
                        // FIXME: DefinitelyTyped
                        commentCountTotal: (<any>_).sumBy(paragraphs, "commentCount"),
                        modificationDate: SIMetadata.get(documentVersion).modification_date,
                        creationDate: SIMetadata.get(documentVersion).creation_date,
                        creator: SIMetadata.get(documentVersion).creator,
                        picture: SIImageReference.get(documentVersion).picture
                    };

                    if (hasMap) {
                        scope.data.coordinates = SIPoint.get(documentVersion).coordinates;
                    }

                    if (hasBadges) {
                        adhGetBadges(<RIDocumentVersion>documentVersion).then((assignments) => {
                            scope.data.assignments = assignments;
                        });
                    }

                    // FIXME: This probably isn't the right place for this also topLevelState
                    // had to be included in this function just for this
                    if (adhTopLevelState) {
                        highlightSelectedParagraph(adhTopLevelState.get("commentableUrl"), scope);
                    }
                });
            });
        }
    });
};

export var postCreate = (
    adhHttp : AdhHttp.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhUploadImage
) => (
    scope : IFormScope,
    poolPath : string,
    hasMap : boolean = false
) : angular.IPromise<RIDocumentVersion> => {
    const documentClass = hasMap ? RIGeoDocument : RIDocument;
    const documentVersionClass = hasMap ? RIGeoDocumentVersion : RIDocumentVersion;

    var doc : ResourcesBase.IResource = {
        path: adhPreliminaryNames.nextPreliminary(),
        first_version_path: adhPreliminaryNames.nextPreliminary(),
        parent: poolPath,
        content_type: documentClass.content_type,
        data: {},
    };

    var paragraphItems = [];
    var paragraphVersions = [];

    _.forEach(scope.data.paragraphs, (paragraph) => {
        if (!paragraph.deleted) {
            var item : ResourcesBase.IResource = {
                path: adhPreliminaryNames.nextPreliminary(),
                content_type: RIParagraph.content_type,
                data: {},
            };
            item.parent = doc.path;

            var version : ResourcesBase.IResource = {
                path: adhPreliminaryNames.nextPreliminary(),
                content_type: RIParagraphVersion.content_type,
                data: {},
            };
            version.parent = item.path;
            SIVersionable.set(version, {
                follows: [item.first_version_path]
            });
            SIParagraph.set(version, {
                text: paragraph.body
            });

            paragraphItems.push(item);
            paragraphVersions.push(version);
        }
    });

    var documentVersion : ResourcesBase.IResource = {
        path: adhPreliminaryNames.nextPreliminary(),
        parent: doc.path,
        content_type: documentVersionClass.content_type,
        data: {},
    };
    SIVersionable.set(documentVersion, {
        follows: [doc.first_version_path]
    });
    SIDocument.set(documentVersion, {
        elements: <string[]>_.map(paragraphVersions, "path")
    });
    SITitle.set(documentVersion, {
        title: scope.data.title
    });
    if (hasMap && scope.data.coordinates && scope.data.coordinates[0] && scope.data.coordinates[1]) {
        SIPoint.set(documentVersion, {
            coordinates: scope.data.coordinates
        });
    }

    var commit = () => {
        return adhHttp.deepPost(<any[]>_.flatten([doc, documentVersion, paragraphItems, paragraphVersions]))
            .then((result) => result[1]);
    };

    if (scope.$flow && scope.$flow.support && scope.$flow.files.length > 0) {
        return adhUploadImage(poolPath, scope.$flow).then((imagePath : string) => {
            SIImageReference.set(documentVersion, {
                picture: imagePath
            });
            return commit();
        });
    } else {
        return commit();
    }
};

export var postEdit = (
    adhHttp : AdhHttp.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhUploadImage
) => (
    scope : IFormScope,
    oldVersion : ResourcesBase.IResource,
    oldParagraphVersions : ResourcesBase.IResource[],
    hasMap : boolean = false
) : angular.IPromise<RIDocumentVersion> => {
    // This function assumes the following:
    //
    // -   paragraphs can not be reordered
    // -   paragraphs can't really be deleted, only excluded from the
    //     next version of the document (by marking them as deleted
    //     here in the FE),
    // -   new paragraphs are always appended to the end.

    var documentPath = AdhUtil.parentPath(oldVersion.path);
    var poolPath = AdhUtil.parentPath(documentPath);

    const documentVersionClass = hasMap ? RIGeoDocumentVersion : RIDocumentVersion;

    var paragraphItems : ResourcesBase.IResource[] = [];
    var paragraphVersions : ResourcesBase.IResource[] = [];
    var paragraphRefs : string[] = [];

    var paragraphVersion : ResourcesBase.IResource;

    _.forEach(scope.data.paragraphs, (paragraph : IParagraph, index : number) => {
        // currently, if a paragraph has been deleted, it doesn't get posted at all.
        if (!paragraph.deleted) {

            if (index >= oldParagraphVersions.length) {
                var item : ResourcesBase.IResource = {
                    path: adhPreliminaryNames.nextPreliminary(),
                    parent: documentPath,
                    content_type: RIParagraph.content_type,
                    data: {},
                };

                paragraphVersion = {
                    path: adhPreliminaryNames.nextPreliminary(),
                    parent: item.path,
                    content_type: RIParagraphVersion.content_type,
                    data: {},
                };
                SIVersionable.set(paragraphVersion, {
                    follows: [item.first_version_path]
                });
                SIParagraph.set(paragraphVersion, {
                    text: paragraph.body
                });
                paragraphVersion.root_versions = [oldVersion.path];

                paragraphItems.push(item);
                paragraphVersions.push(paragraphVersion);
                paragraphRefs.push(paragraphVersion.path);

            } else {
                var oldParagraphVersion = oldParagraphVersions[index];

                if (paragraph.body !== SIParagraph.get(oldParagraphVersion).text) {
                    paragraphVersion = {
                        path: adhPreliminaryNames.nextPreliminary(),
                        parent: AdhUtil.parentPath(oldParagraphVersion.path),
                        root_versions: [oldVersion.path],
                        content_type: RIParagraphVersion.content_type,
                        data: {},
                    };
                    SIVersionable.set(paragraphVersion, {
                        follows: [oldParagraphVersion.path]
                    });
                    SIParagraph.set(paragraphVersion, {
                        text: paragraph.body
                    });

                    paragraphVersions.push(paragraphVersion);
                    paragraphRefs.push(paragraphVersion.path);
                } else {
                    paragraphRefs.push(oldParagraphVersion.path);
                }
            }
        }
    });

    var documentVersion = {
        path: adhPreliminaryNames.nextPreliminary(),
        parent: documentPath,
        content_type: documentVersionClass.content_type,
        data: {},
    };
    SIVersionable.set(documentVersion, {
        follows: [oldVersion.path]
    });
    SIDocument.set(documentVersion, {
        elements: paragraphRefs
    });
    SITitle.set(documentVersion, {
        title: scope.data.title
    });
    if (hasMap && scope.data.coordinates && scope.data.coordinates[0] && scope.data.coordinates[1]) {
        SIPoint.set(documentVersion, {
            coordinates: scope.data.coordinates
        });
    }
    // FIXME: workaround for a backend bug
    var oldImageReferenceSheet = SIImageReference.get(oldVersion);
    if (oldImageReferenceSheet.picture) {
        SIImageReference.set(documentVersion, oldImageReferenceSheet);
    }

    var commit = () => {
        return adhHttp.deepPost(_.flatten<ResourcesBase.IResource>([documentVersion, paragraphItems, paragraphVersions]))
            .then((result) => result[0]);
    };

    if (scope.$flow && scope.$flow.support && scope.$flow.files.length > 0) {
        return adhUploadImage(poolPath, scope.$flow).then((imagePath : string) => {
            SIImageReference.set(documentVersion, {
                picture: imagePath
            });
            return commit();
        });
    } else {
        return commit();
    }
};

export var detailDirective = (
    $q : angular.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@",
            hasMap: "=?",
            hasBadges: "=?",
            badgeclass: "=?"
        },
        link: (scope : IScope) => {
            bindPath($q, adhHttp, adhGetBadges, adhTopLevelState)(scope, undefined, scope.hasMap, scope.hasBadges);
            scope.$on("$destroy", adhTopLevelState.on("commentableUrl", (commentableUrl) => {
                highlightSelectedParagraph(adhTopLevelState.get("commentableUrl"), scope);
            }));
            scope.commentType = RICommentVersion.content_type;
        }
    };
};

export var listItemDirective = (
    $q : angular.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        scope: {
            path: "@",
            hasMap: "=?",
            hasBadges: "=?"
        },
        link: (scope : IScope) => {
            bindPath($q, adhHttp, adhGetBadges)(scope, undefined, scope.hasMap, scope.hasBadges);

            scope.$on("$destroy", adhTopLevelState.on("documentUrl", (documentVersionUrl) => {
                if (!documentVersionUrl) {
                    scope.selectedState = "";
                } else if (documentVersionUrl === scope.path) {
                    scope.selectedState = "is-selected";
                } else {
                    scope.selectedState = "is-not-selected";
                }
            }));
            scope.commentType = RICommentVersion.content_type;
        }
    };
};

export var mapListItemDirective = (
    $q : angular.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhGetBadges : AdhBadge.IGetBadgeAssignments,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    var directive : angular.IDirective = listItemDirective($q, adhConfig, adhHttp, adhGetBadges, adhTopLevelState);
    var superLink = <Function>directive.link;

    directive.require = "^adhMapListingInternal";
    directive.link = (scope : IScope, element, attrs, mapListing : AdhMapping.MapListingController) => {
        scope.hasMap = true;
        superLink(scope);

        var unregister = scope.$watch("data.coordinates", (coordinates : number[]) => {
            if (typeof coordinates !== "undefined" && coordinates.length === 2) {
                scope.$on("$destroy", mapListing.registerListItem(scope.path, coordinates[1], coordinates[0]));
                unregister();
            }
        });
    };

    return directive;
};

export var listingDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        scope: {
            path: "@"
        },
        link: (scope) => {
            scope.contentType = RIDocumentVersion.content_type;
        }
    };
};

export var createDirective = (
    $location : angular.ILocationService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError,
    adhSubmitIfValid,
    adhResourceUrlFilter,
    adhUploadImage,
    flowFactory
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            path: "@",
            hasMap: "=?",
            hasImage: "=?",
            polygon: "=?",
            cancelUrl: "=?"
        },
        link: (scope : IFormScope, element) => {
            scope.errors = [];
            scope.$flow = flowFactory.create({singleFile: true});
            scope.data = {
                title: "",
                paragraphs: [{
                    body: "",
                    deleted: false
                }],
                coordinates: []
            };
            scope.showError = adhShowError;

            scope.addParagraph = () => {
                scope.data.paragraphs.push({
                    body: "",
                    deleted: false
                });
            };

            scope.deleteParagraph = (index) => {
                scope.data.paragraphs[index].deleted = true;
            };

            scope.paragraphCount = () => {
                if (scope.data) {
                    return _.filter(scope.data.paragraphs, (p) => !p.deleted).length;
                }
            };

            scope.cancel = () => {
                var processUrl = adhTopLevelState.get("processUrl");
                adhTopLevelState.goToCameFrom(adhResourceUrlFilter(processUrl));
            };

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.documentForm, () => {
                    return postCreate(adhHttp, adhPreliminaryNames, adhUploadImage)(scope, scope.path, scope.hasMap);
                }).then((documentVersion : ResourcesBase.IResource) => {
                    var itemPath = AdhUtil.parentPath(documentVersion.path);
                    $location.url(adhResourceUrlFilter(itemPath));
                });
            };
        }
    };
};

export var editDirective = (
    $location : angular.ILocationService,
    $q : angular.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError,
    adhSubmitIfValid,
    adhResourceUrlFilter,
    adhUploadImage,
    flowFactory
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            path: "@",
            hasMap: "=?",
            hasBadges: "=?",
            hasImage: "=?",
            polygon: "=?",
            cancelUrl: "=?"
        },
        link: (scope : IFormScope, element) => {
            scope.errors = [];
            scope.$flow = flowFactory.create({singleFile: true});
            scope.showError = adhShowError;

            scope.addParagraph = () => {
                scope.data.paragraphs.push({
                    body: "",
                    deleted: false
                });
            };

            scope.deleteParagraph = (index) => {
                scope.data.paragraphs[index].deleted = true;
            };

            scope.paragraphCount = () => {
                if (scope.data) {
                    return _.filter(scope.data.paragraphs, (p) => !p.deleted).length;
                }
            };

            bindPath($q, adhHttp)(scope, undefined, scope.hasMap);

            scope.cancel = () => {
                var itemPath = AdhUtil.parentPath(scope.documentVersion.path);
                adhTopLevelState.goToCameFrom(adhResourceUrlFilter(itemPath));
            };

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.documentForm, () => {
                    return postEdit(adhHttp, adhPreliminaryNames, adhUploadImage)(
                        scope, scope.documentVersion, scope.paragraphVersions, scope.hasMap);
                }).then((documentVersion : ResourcesBase.IResource) => {
                    var itemPath = AdhUtil.parentPath(documentVersion.path);
                    $location.url(adhResourceUrlFilter(itemPath));
                });
            };
        }
    };
};
