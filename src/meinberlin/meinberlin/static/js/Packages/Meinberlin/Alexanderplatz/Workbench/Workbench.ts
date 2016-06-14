/// <reference path="../../../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhMovingColumns from "../../../MovingColumns/MovingColumns";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhResourceArea from "../../../ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";
import * as AdhUtil from "../../../Util/Util";

import RIAlexanderplatzProcess from "../../../../Resources_/adhocracy_meinberlin/resources/alexanderplatz/IProcess";
import RIGeoDocument from "../../../../Resources_/adhocracy_core/resources/document/IGeoDocument";
import RIGeoDocumentVersion from "../../../../Resources_/adhocracy_core/resources/document/IGeoDocumentVersion";
import RIGeoProposal from "../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposal";
import RIGeoProposalVersion from "../../../../Resources_/adhocracy_core/resources/proposal/IGeoProposalVersion";
import RIParagraph from "../../../../Resources_/adhocracy_core/resources/paragraph/IParagraph";
import RIParagraphVersion from "../../../../Resources_/adhocracy_core/resources/paragraph/IParagraphVersion";
import * as SIParagraph from "../../../../Resources_/adhocracy_core/sheets/document/IParagraph";
import * as SILocationReference from "../../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIMultiPolygon from "../../../../Resources_/adhocracy_core/sheets/geo/IMultiPolygon";

export var pkgLocation = "/Meinberlin/Alexanderplatz/Workbench";


export var workbenchDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Workbench.html",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("view", scope));
            scope.$on("$destroy", adhTopLevelState.bind("tab", scope));
        }
    };
};

export var getProcessPolygon = (
    adhHttp : AdhHttp.Service<any>
) => (processUrl : string) : angular.IPromise<any> => {
    return adhHttp.get(processUrl).then((resource) => {
        var locationUrl = resource.data[SILocationReference.nick].location;
        return adhHttp.get(locationUrl).then((location) => {
            return location.data[SIMultiPolygon.nick].coordinates[0][0];
        });
    });
};

export var processDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhHttp : AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProcessDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
            scope.$on("$destroy", adhTopLevelState.bind("tab", scope));
            adhPermissions.bindScope(scope, () => scope.processUrl, "processOptions");

            scope.proposalType = RIGeoProposalVersion.content_type;
            scope.documentType = RIGeoDocumentVersion.content_type;
            scope.documentItemType = RIGeoDocument.content_type;

            scope.setCameFrom = () => {
                adhTopLevelState.setCameFrom();
            };

            scope.$watch("processUrl", (processUrl) => {
                if (processUrl) {
                    getProcessPolygon(adhHttp)(processUrl).then((polygon) => {
                        scope.polygon = polygon;
                    });
                }
            });

            scope.data = {};
            scope.showMap = (isShowMap) => {
                scope.data.isShowMap = isShowMap;
            };
        }
    };
};

export var documentDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhHttp : AdhHttp.Service<any>,
    adhResourceUrl,
    $location : angular.ILocationService,
    $window : angular.IWindowService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/DocumentDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "documentUrl"]);
            adhPermissions.bindScope(scope, () => AdhUtil.parentPath(scope.documentUrl), "documentItemOptions");

            scope.setCameFrom = () => {
                adhTopLevelState.setCameFrom();
            };

            scope.hide = () => {
                if ($window.confirm("Do you really want to delete this?")) {
                    var itemPath = AdhUtil.parentPath(scope.documentUrl);
                    adhHttp.hide(itemPath, RIGeoDocument.content_type)
                        .then(() => {
                            $location.url(adhResourceUrl(scope.processUrl));
                        });
                }
            };
        }
    };
};

export var proposalDetailColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);
            adhPermissions.bindScope(scope, () => AdhUtil.parentPath(scope.proposalUrl), "proposalItemOptions");

            scope.setCameFrom = () => {
                adhTopLevelState.setCameFrom();
            };
        }
    };
};

export var documentCreateColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/DocumentCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);
            scope.$watch("processUrl", (processUrl) => {
                if (processUrl) {
                    getProcessPolygon(adhHttp)(processUrl).then((polygon) => {
                        scope.polygon = polygon;
                    });
                }
            });

            scope.cancel = () => {
                var url = adhResourceUrl(scope.processUrl);
                adhTopLevelState.goToCameFrom(url);
            };
        }
    };
};

export var documentEditColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/DocumentEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "documentUrl"]);
            scope.$watch("processUrl", (processUrl) => {
                if (processUrl) {
                    getProcessPolygon(adhHttp)(processUrl).then((polygon) => {
                        scope.polygon = polygon;
                    });
                }
            });

            scope.cancel = () => {
                var url = adhResourceUrl(AdhUtil.parentPath(scope.documentUrl));
                adhTopLevelState.goToCameFrom(url);
            };
        }
    };
};

export var proposalCreateColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalCreateColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl"]);

            scope.cancel = () => {
                var url = adhResourceUrl(scope.processUrl);
                adhTopLevelState.goToCameFrom(url);
            };
        }
    };
};

export var proposalEditColumnDirective = (
    adhConfig : AdhConfig.IService,
    adhTopLevelState : AdhTopLevelState.Service,
    adhResourceUrl
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ProposalEditColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["processUrl", "proposalUrl"]);

            scope.cancel = () => {
                var url = adhResourceUrl(AdhUtil.parentPath(scope.proposalUrl));
                adhTopLevelState.goToCameFrom(url);
            };
        }
    };
};

export var registerRoutes = (
    processType : string = "",
    context : string = ""
) => (adhResourceAreaProvider : AdhResourceArea.Provider) => {
    adhResourceAreaProvider
        // documents tab
        .default(RIAlexanderplatzProcess, "", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide",
            tab: "documents"
        })
        .default(RIAlexanderplatzProcess, "create_document", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide",
            tab: "documents"
        })
        .specific(RIAlexanderplatzProcess, "create_document", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (resource : RIAlexanderplatzProcess) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.canPost(RIGeoDocument.content_type)) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .defaultVersionable(RIGeoDocument, RIGeoDocumentVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide",
            tab: "documents"
        })
        .specificVersionable(RIGeoDocument, RIGeoDocumentVersion, "", processType, context, [
            () => (item : RIGeoDocument, version : RIGeoDocumentVersion) => {
                return {
                    documentUrl: version.path
                };
            }])
        .defaultVersionable(RIGeoDocument, RIGeoDocumentVersion, "edit", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide",
            tab: "documents"
        })
        .specificVersionable(RIGeoDocument, RIGeoDocumentVersion, "edit", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (item : RIGeoDocument, version : RIGeoDocumentVersion) => {
                return adhHttp.options(item.path).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {
                            documentUrl: version.path
                        };
                    }
                });
            }])
        .defaultVersionable(RIParagraph, RIParagraphVersion, "comments", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show",
            tab: "documents"
        })
        .specificVersionable(RIParagraph, RIParagraphVersion, "comments", processType, context, [
            () => (item : RIParagraph, version : RIParagraphVersion) => {
                var documentUrl = _.last(_.sortBy(version.data[SIParagraph.nick].documents));
                return {
                    commentableUrl: version.path,
                    commentCloseUrl: documentUrl,
                    documentUrl: documentUrl
                };
            }])

        // proposals tab
        .default(RIAlexanderplatzProcess, "proposals", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide",
            tab: "proposals"
        })
        .default(RIAlexanderplatzProcess, "create_proposal", processType, context, {
            space: "content",
            movingColumns: "is-show-hide-hide",
            tab: "proposals"
        })
        .specific(RIAlexanderplatzProcess, "create_proposal", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (resource : RIAlexanderplatzProcess) => {
                return adhHttp.options(resource.path).then((options : AdhHttp.IOptions) => {
                    if (!options.canPost(RIGeoProposal.content_type)) {
                        throw 401;
                    } else {
                        return {};
                    }
                });
            }])
        .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide",
            tab: "proposals"
        })
        .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "", processType, context, [
            () => (item : RIGeoProposal, version : RIGeoProposalVersion) => {
                return {
                    proposalUrl: version.path
                };
            }])
        .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "edit", processType, context, {
            space: "content",
            movingColumns: "is-show-show-hide",
            tab: "proposals"
        })
        .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "edit", processType, context, [
            "adhHttp", (adhHttp : AdhHttp.Service<any>) => (item : RIGeoProposal, version : RIGeoProposalVersion) => {
                return adhHttp.options(item.path).then((options : AdhHttp.IOptions) => {
                    if (!options.POST) {
                        throw 401;
                    } else {
                        return {
                            proposalUrl: version.path
                        };
                    }
                });
            }])
        .defaultVersionable(RIGeoProposal, RIGeoProposalVersion, "comments", processType, context, {
            space: "content",
            movingColumns: "is-collapse-show-show",
            tab: "proposals"
        })
        .specificVersionable(RIGeoProposal, RIGeoProposalVersion, "comments", processType, context, [
            () => (item : RIGeoProposal, version : RIGeoProposalVersion) => {
                return {
                    commentableUrl: version.path,
                    commentCloseUrl: version.path,
                    proposalUrl: version.path
                };
            }]);
};
