import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";

var pkgLocation = "/Abuse";


export var reportAbuseDirective = (adhHttp : AdhHttp.Service<any>, adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Abuse.html",
        scope: {
            url: "@",  // frontend URL
            modals: "=",
        },
        link: (scope) => {
            scope.netiquette_url = adhConfig.netiquette_url;
            scope.submit = () => {
                return adhHttp.postRaw(adhConfig.rest_url + "/report_abuse", {
                    url: scope.url,
                    remark: scope.remark
                }).then(() => {
                    scope.modals.hideModal("abuse");
                    scope.modals.alert("TR__REPORT_ABUSE_STATUS_OK", "success");
                }, () => {
                    // FIXME
                });
            };

            scope.cancel = () => {
                scope.modals.hideModal("abuse");
            };
        }
    };
};

