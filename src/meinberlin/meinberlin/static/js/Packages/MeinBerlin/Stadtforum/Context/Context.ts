import * as AdhConfig from "../../../Config/Config";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";

var pkgLocation = "/MeinBerlin/Stadtforum/Context";


export var headerDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/header.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");
        }
    };

};


export var areaTemplate = (
    adhConfig : AdhConfig.IService,
    $templateRequest : angular.ITemplateRequestService
) => {
    return $templateRequest(adhConfig.pkg_path + pkgLocation + "/template.html");
};
