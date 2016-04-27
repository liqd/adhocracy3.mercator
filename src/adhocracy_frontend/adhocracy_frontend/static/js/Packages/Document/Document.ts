import * as AdhBadge from "../Badge/Badge";
import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhMapping from "../Mapping/Mapping";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import * as ResourcesBase from "../ResourcesBase";

import RIDocument from "../../Resources_/adhocracy_core/resources/document/IDocument";
import RIDocumentVersion from "../../Resources_/adhocracy_core/resources/document/IDocumentVersion";
import RIGeoDocument from "../../Resources_/adhocracy_core/resources/document/IGeoDocument";
import RIGeoDocumentVersion from "../../Resources_/adhocracy_core/resources/document/IGeoDocumentVersion";
import RIParagraph from "../../Resources_/adhocracy_core/resources/paragraph/IParagraph";
import RIParagraphVersion from "../../Resources_/adhocracy_core/resources/paragraph/IParagraphVersion";
import * as SICommentable from "../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIDocument from "../../Resources_/adhocracy_core/sheets/document/IDocument";
import * as SIImageReference from "../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SIMetadata from "../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIParagraph from "../../Resources_/adhocracy_core/sheets/document/IParagraph";
import * as SIPoint from "../../Resources_/adhocracy_core/sheets/geo/IPoint";
import * as SITitle from "../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";

var pkgLocation = "/Document";


export interface IParagraph {
    body : string;
    deleted : boolean;
    commentCount? : number;
    path? : string;
    selectedState? : string;
}

export interface IBadge {
    title : string;
    description : string;
    name : string;
}

export interface IScope extends angular.IScope {
    path? : string;
    hasMap? : boolean;
    hasBadges?: boolean;
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
        assignments?: IBadge[];
    };
    selectedState? : string;
    resource: any;

    toggleCreateForm() : void;
    showCreateForm? : boolean;

    documentVersion? : RIDocumentVersion;
    paragraphVersions? : RIParagraphVersion[];
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
    adhHttp : AdhHttp.Service<any>,
    adhGetBadges? : AdhBadge.IGetBadges,
    adhTopLevelState? : AdhTopLevelState.Service
) => (
    scope : IScope,
    pathKey : string = "path",
    hasMap : boolean = false,
    hasBadges : boolean = false
) : Function => {
    return scope.$watch(pathKey, (path : string) => {
        if (path) {
            adhHttp.get(path).then((documentVersion : RIDocumentVersion) => {
                var paragraphPaths : string[] = documentVersion.data[SIDocument.nick].elements;
                var paragraphPromises = _.map(paragraphPaths, (path) => {
                    return adhHttp.get(path);
                });

                return $q.all(paragraphPromises).then((paragraphVersions : RIParagraphVersion[]) => {
                    var paragraphs = _.map(paragraphVersions, (paragraphVersion) => {
                        return {
                            body: paragraphVersion.data[SIParagraph.nick].text,
                            deleted: false,
                            commentCount: paragraphVersion.data[SICommentable.nick].comments_count,
                            path: paragraphVersion.path
                        };
                    });

                    scope.documentVersion = documentVersion;
                    scope.paragraphVersions = paragraphVersions;

                    scope.data = {
                        title: documentVersion.data[SITitle.nick].title,
                        paragraphs: paragraphs,
                        // FIXME: DefinitelyTyped
                        commentCountTotal: (<any>_).sumBy(paragraphs, "commentCount"),
                        modificationDate: documentVersion.data[SIMetadata.nick].modification_date,
                        creationDate: documentVersion.data[SIMetadata.nick].creation_date,
                        creator: documentVersion.data[SIMetadata.nick].creator,
                        picture: documentVersion.data[SIImageReference.nick].picture
                    };

                    if (hasMap) {
                        scope.data.coordinates = documentVersion.data[SIPoint.nick].coordinates;
                    }

                    if (hasBadges) {
                        adhGetBadges(documentVersion).then((assignments) => {
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
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhUploadImage
) => (
    scope : IFormScope,
    poolPath : string,
    hasMap : boolean = false
) : angular.IPromise<RIDocumentVersion> => {
    const documentClass = hasMap ? RIGeoDocument : RIDocument;
    const documentVersionClass = hasMap ? RIGeoDocumentVersion : RIDocumentVersion;

    var doc = new documentClass({preliminaryNames: adhPreliminaryNames});
    doc.parent = poolPath;

    var paragraphItems = [];
    var paragraphVersions = [];

    _.forEach(scope.data.paragraphs, (paragraph) => {
        if (!paragraph.deleted) {
            var item = new RIParagraph({preliminaryNames: adhPreliminaryNames});
            item.parent = doc.path;

            var version = new RIParagraphVersion({preliminaryNames: adhPreliminaryNames});
            version.parent = item.path;
            version.data[SIVersionable.nick] = new SIVersionable.Sheet({
                follows: [item.first_version_path]
            });
            version.data[SIParagraph.nick] = new SIParagraph.Sheet({
                text: paragraph.body
            });

            paragraphItems.push(item);
            paragraphVersions.push(version);
        }
    });

    var documentVersion = new documentVersionClass({preliminaryNames: adhPreliminaryNames});
    documentVersion.parent = doc.path;
    documentVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [doc.first_version_path]
    });
    documentVersion.data[SIDocument.nick] = new SIDocument.Sheet({
        elements: <string[]>_.map(paragraphVersions, "path")
    });
    documentVersion.data[SITitle.nick] = new SITitle.Sheet({
        title: scope.data.title
    });
    if (hasMap && scope.data.coordinates && scope.data.coordinates[0] && scope.data.coordinates[1]) {
        documentVersion.data[SIPoint.nick] = new SIPoint.Sheet({
            coordinates: scope.data.coordinates
        });
    }

    var commit = () => {
        return adhHttp.deepPost(<any[]>_.flatten([doc, documentVersion, paragraphItems, paragraphVersions]))
            .then((result) => result[1]);
    };

    if (scope.$flow && scope.$flow.support && scope.$flow.files.length > 0) {
        return adhUploadImage(poolPath, scope.$flow).then((imagePath : string) => {
            documentVersion.data[SIImageReference.nick] = new SIImageReference.Sheet({
                picture: imagePath
            });
            return commit();
        });
    } else {
        return commit();
    }
};

export var postEdit = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhUploadImage
) => (
    scope : IFormScope,
    oldVersion : RIDocumentVersion,
    oldParagraphVersions : RIParagraphVersion[],
    hasMap : boolean = false
) : angular.IPromise<RIDocumentVersion> => {
    // This function assumes that paragraphs can not be reordered or deleted
    // and that new paragraphs are always appended to the end.

    var documentPath = AdhUtil.parentPath(oldVersion.path);
    var poolPath = AdhUtil.parentPath(documentPath);

    const documentVersionClass = hasMap ? RIGeoDocumentVersion : RIDocumentVersion;

    var paragraphItems : RIParagraph[] = [];
    var paragraphVersions : RIParagraphVersion[] = [];
    var paragraphRefs : string[] = [];

    var paragraphVersion : RIParagraphVersion;

    _.forEach(scope.data.paragraphs, (paragraph : IParagraph, index : number) => {
        // currently, if a paragraph has been deleted, it doesn't get posted at all.
        if (!paragraph.deleted) {

            if (index >= oldParagraphVersions.length) {
                var item = new RIParagraph({preliminaryNames: adhPreliminaryNames});
                item.parent = documentPath;

                paragraphVersion = new RIParagraphVersion({preliminaryNames: adhPreliminaryNames});
                paragraphVersion.parent = item.path;
                paragraphVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
                    follows: [item.first_version_path]
                });
                paragraphVersion.data[SIParagraph.nick] = new SIParagraph.Sheet({
                    text: paragraph.body
                });
                paragraphVersion.root_versions = [oldVersion.path];

                paragraphItems.push(item);
                paragraphVersions.push(paragraphVersion);
                paragraphRefs.push(paragraphVersion.path);

            } else {
                var oldParagraphVersion = oldParagraphVersions[index];

                if (paragraph.body !== oldParagraphVersion.data[SIParagraph.nick].text) {
                    paragraphVersion = new RIParagraphVersion({preliminaryNames: adhPreliminaryNames});
                    paragraphVersion.parent = AdhUtil.parentPath(oldParagraphVersion.path);
                    paragraphVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
                        follows: [oldParagraphVersion.path]
                    });
                    paragraphVersion.data[SIParagraph.nick] = new SIParagraph.Sheet({
                        text: paragraph.body
                    });
                    paragraphVersion.root_versions = [oldVersion.path];

                    paragraphVersions.push(paragraphVersion);
                    paragraphRefs.push(paragraphVersion.path);
                } else {
                    paragraphRefs.push(oldParagraphVersion.path);
                }
            }
        }
    });

    var documentVersion = new documentVersionClass({preliminaryNames: adhPreliminaryNames});
    documentVersion.parent = documentPath;
    documentVersion.data[SIVersionable.nick] = new SIVersionable.Sheet({
        follows: [oldVersion.path]
    });
    documentVersion.data[SIDocument.nick] = new SIDocument.Sheet({
        elements: paragraphRefs
    });
    documentVersion.data[SITitle.nick] = new SITitle.Sheet({
        title: scope.data.title
    });
    if (hasMap && scope.data.coordinates && scope.data.coordinates[0] && scope.data.coordinates[1]) {
        documentVersion.data[SIPoint.nick] = new SIPoint.Sheet({
            coordinates: scope.data.coordinates
        });
    }
    // FIXME: workaround for a backend bug
    var oldImageReferenceSheet = oldVersion.data[SIImageReference.nick];
    if (oldImageReferenceSheet.picture) {
        documentVersion.data[SIImageReference.nick] = oldImageReferenceSheet;
    }

    var commit = () => {
        return adhHttp.deepPost(_.flatten<ResourcesBase.IResource>([documentVersion, paragraphItems, paragraphVersions]))
            .then((result) => result[0]);
    };

    if (scope.$flow && scope.$flow.support && scope.$flow.files.length > 0) {
        return adhUploadImage(poolPath, scope.$flow).then((imagePath : string) => {
            documentVersion.data[SIImageReference.nick] = new SIImageReference.Sheet({
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
    adhHttp : AdhHttp.Service<any>,
    adhGetBadges : AdhBadge.IGetBadges,
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
        }
    };
};

export var listItemDirective = (
    $q : angular.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhGetBadges : AdhBadge.IGetBadges,
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
        }
    };
};

export var mapListItemDirective = (
    $q : angular.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhGetBadges : AdhBadge.IGetBadges,
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
    adhHttp : AdhHttp.Service<any>,
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
            polygon: "=?"
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

            scope.paragraphCount = () => _.filter(scope.data.paragraphs, (p) => !p.deleted).length;

            scope.cancel = () => {
                var processUrl = adhTopLevelState.get("processUrl");
                adhTopLevelState.goToCameFrom(adhResourceUrlFilter(processUrl));
            };

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.documentForm, () => {
                    return postCreate(adhHttp, adhPreliminaryNames, adhUploadImage)(scope, scope.path, scope.hasMap);
                }).then((documentVersion : RIDocumentVersion) => {
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
    adhHttp : AdhHttp.Service<any>,
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
            polygon: "=?"
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

            scope.paragraphCount = () => _.filter(scope.data.paragraphs, (p) => !p.deleted).length;

            bindPath($q, adhHttp)(scope, undefined, scope.hasMap);

            scope.cancel = () => {
                var itemPath = AdhUtil.parentPath(scope.documentVersion.path);
                adhTopLevelState.goToCameFrom(adhResourceUrlFilter(itemPath));
            };

            scope.submit = () => {
                return adhSubmitIfValid(scope, element, scope.documentForm, () => {
                    return postEdit(adhHttp, adhPreliminaryNames, adhUploadImage)(
                        scope, scope.documentVersion, scope.paragraphVersions, scope.hasMap);
                }).then((documentVersion : RIDocumentVersion) => {
                    var itemPath = AdhUtil.parentPath(documentVersion.path);
                    $location.url(adhResourceUrlFilter(itemPath));
                });
            };
        }
    };
};

