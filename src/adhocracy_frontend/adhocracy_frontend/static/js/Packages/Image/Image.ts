import * as _ from "lodash";

import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

import RIImage from "../../Resources_/adhocracy_core/resources/image/IImage";
import * as SIHasAssetPool from "../../Resources_/adhocracy_core/sheets/asset/IHasAssetPool";
import * as SIImageMetadata from "../../Resources_/adhocracy_core/sheets/image/IImageMetadata";
import * as SIImageReference from "../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";

var pkgLocation = "/Image";

/**
 * upload image file.  this function can potentially
 * be more general; for now it just handles the Flow object and
 * promises the path of the image resource as a string.
 *
 * as the a3 asset protocol is much simpler than HTML5 file upload, we
 * compose the multi-part mime post request manually (no chunking).
 * The $flow object is just used for meta data retrieval and cleared
 * before it can upload anything.
 *
 * NOTE: this uses several HTML5 APIs so you need to check for
 * compability before using it.
 *
 * FIXME: This should be exptended to cover a broader range of use cases.
 */
export var uploadImageFactory = (
    adhHttp : AdhHttp.Service
) => (
    poolPath : string,
    flow : Flow,
    contentType : string = RIImage.content_type,
    metadataSheet : string = SIImageMetadata.nick
) : angular.IPromise<string> => {
    if (flow.files.length !== 1) {
        throw "could not upload file: $flow.files.length !== 1";
    }
    var file = flow.files[0].file;

    var bytes = () : any => {
        var func;
        if (file.mozSlice) {
            func = "mozSlice";
        } else if (file.webkitSlice) {
            func = "webkitSlice";
        } else {
            func = "slice";
        }

        return file[func](0, file.size, file.type);
    };

    var formData = new FormData();
    formData.append("content_type", contentType);
    formData.append("data:adhocracy_core.sheets.asset.IAssetData:data", bytes());

    return adhHttp.get(poolPath)
        .then((pool) => {
            var postPath : string = pool.data[SIHasAssetPool.nick].asset_pool;
            return adhHttp.postRaw(postPath, formData)
                .then((rsp) => rsp.data.path)
                .catch(<any>AdhHttp.logBackendError);
        });
};


export var addImage = (
    adhHttp : AdhHttp.Service
) => (
    resourcePath : string,
    imagePath : string
) => {
    return adhHttp.get(resourcePath).then((resource) => {
        var patch = {
            data: {},
            content_type: resource.content_type
        };
        patch.data[SIImageReference.nick] = new SIImageReference.Sheet({ picture: imagePath });

        // Versioned resources are on the way out, so they get the special treatment
        if (resource.data[SIVersionable.nick]) {
            var newVersion = _.clone(resource);
            _.merge(newVersion.data, patch.data);
            return adhHttp.postNewVersionNoFork(resourcePath, newVersion);
        } else {
            return adhHttp.put(resourcePath, patch);
        }
    });
};


export var uploadImageDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhUploadImage,
    flowFactory,
    adhResourceUrl
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Upload.html",
        scope: {
            poolPath: "@",
            path: "@",
            didCompleteUpload: "&?",
            didCancelUpload: "&?",
            cancelUrl: "=?"
        },
        link: (scope) => {
            scope.$flow = flowFactory.create();

            scope.$flow.on("fileAdded", (file, event) => {
                scope.$flow.files = [file];
                return false;
            });

            scope.goToCameFrom = () => {
                var url = adhResourceUrl(scope.path);
                adhTopLevelState.goToCameFrom(url);
            };

            scope.submit = () => {
                return adhUploadImage(scope.poolPath, scope.$flow)
                    .then((imagePath : string) => addImage(adhHttp)(scope.path, imagePath)
                        .then(scope.didCompleteUpload)
                        .then(scope.goToCameFrom));
            };
        }
    };
};

export var showImageDirective = (
    adhHttp : AdhHttp.Service
) => {
    return {
        restrict: "E",
        template: "<img class=\"{{ cssClass }}\" data-ng-if=\"imageUrl\" data-ng-src=\"{{ imageUrl }}\" alt=\"{{alt}}\" />",
        scope: {
            path: "@", // of the attachment resource
            cssClass: "@",
            alt: "@?",
            format: "@?", // defaults to "detail"
            imageMetadataNick: "@?", // defaults to SIImageMetadata.nick
            fallbackUrl: "@?", // defaults to "/static/fallback_$format.jpg";
            noFallback: "=?",
            didFailToLoadImage: "&?"
        },
        link: (scope) => {
            scope.didFailToLoadImage = scope.didFailToLoadImage || (() => null);

            var imageMetadataNick = () =>
                scope.imageMetadataNick ? scope.imageMetadataNick : SIImageMetadata.nick;
            var format = () => scope.format || "detail";
            var fallbackUrl = () => {
                if (!scope.noFallback) {
                    return scope.fallbackUrl || ("/static/fallback_" + format() + ".jpg");
                }
            };
            scope.imageUrl = fallbackUrl(); // show fallback till real image is loaded

            scope.$watch("path", (path) => {
                // often instantiated before the path can be provided by the surrounding dom
                if ( ! path) { return; }
                adhHttp.get(scope.path).then(
                    (asset) => {
                        var imageUrl = asset.data[imageMetadataNick()][format()];
                        if ( ! imageUrl) {
                            console.log("Couldn't load image format <" + format() + ">"
                                + " from asset: " + scope.path);
                            scope.didFailToLoadImage();
                            return; // don't override the fallback image path
                        }
                        scope.imageUrl = imageUrl;
                    },
                    scope.didFailToLoadImage
                );
            });
        }
    };
};

export var backgroundImageDirective = (
    adhHttp : AdhHttp.Service
) => {
    var directive = showImageDirective(adhHttp);
    directive.template = "<div class=\"image-background {{cssClass}}\" " +
        "style=\"background-image: url({{ imageUrl }})\"><ng-transclude></ng-transclude></div>";
    (<angular.IDirective>directive).transclude = true;
    return directive;
};
