import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";

import * as SIDescription from "../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SITitle from "../../Resources_/adhocracy_core/sheets/title/ITitle";

var pkgLocation = "/Home";


export var homeDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Home.html",
        scope: {},
        link: (scope) => {
            adhHttp.get("/").then((root) => {
                scope.title = root.data[SITitle.nick].title;
                scope.description = root.data[SIDescription.nick].description;
            });
        }
    };
};
