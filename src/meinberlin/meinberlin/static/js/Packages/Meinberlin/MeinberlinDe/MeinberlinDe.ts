/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../../Config/Config";
import * as AdhTopLevelState from "../../TopLevelState/TopLevelState";


var pkgLocation = "/Meinberlin/MeinberlinDe";


export var headerDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Header.html",
        scope: {},
        link: (scope) => {
            scope.hideHeader = adhConfig.custom["hide_header"];
            scope.$on("$destroy", adhTopLevelState.bind("customHeader", scope));
        }
    };
};
