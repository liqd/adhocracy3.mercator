import * as AdhConfig from "../Config/Config";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

export var pkgLocation = "/Proposal";

export var addProposalButton = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/AddProposalButton.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.bind("processState", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");
            scope.setCameFrom = () => adhTopLevelState.setCameFrom();
        }
    };
};
