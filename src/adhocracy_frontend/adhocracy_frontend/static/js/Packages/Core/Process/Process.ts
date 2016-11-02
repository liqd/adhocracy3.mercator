/// <reference path="../../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhNames from "../Names/Names";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhUtil from "../Util/Util";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

import * as SIDescription from "../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIImageReference from "../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIName from "../../../Resources_/adhocracy_core/sheets/name/IName";
import * as SITitle from "../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SIWorkflow from "../../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";
import RIProcess from "../../../Resources_/adhocracy_core/resources/process/IProcess";

var pkgLocation = "/Core/Process";


// mirrors adhocracy_core.sheets.workflow.StateData
export interface IStateData {
    name : string;
    description : string;
    start_date : string;
}

export interface IProcessProperties {
    document? : boolean;
    hasAuthorInListItem? : boolean;
    hasCommentColumn? : boolean;
    hasCreatorParticipate? : boolean;
    hasDescription? : boolean;
    hasImage? : boolean;
    hasLocation? : boolean;
    hasLocationText? : boolean;
    item;
    // if a process has a proposal budget, but no max budget, then set maxBudget = Infinity.
    maxBudget? : number;
    proposalColumn : string;
    // WARNING: proposalSheet is not a regular feature of adhocracy,
    // but a hack of Buergerhaushalt and Kiezkasse.
    proposalSheet?;
    version;
}

export var getStateData = (sheet : SIWorkflow.ISheet, name : string) : IStateData => {
    for (var i = 0; i < sheet.state_data.length; i++) {
        if (sheet.state_data[i].name === name) {
            return sheet.state_data[i];
        }
    }
    return {
        name: null,
        description: null,
        start_date: null
    };
};


export class Provider implements angular.IServiceProvider {
    public templates : {[processType : string]: string};
    protected processProperties : {[processType : string]: IProcessProperties};
    public $get;

    constructor () {
        this.templates = {};
        this.processProperties = {};

        this.$get = ["$injector", ($injector) => {
            return new Service(this, $injector);
        }];
    }

    public setProperties(processType : string, properties : IProcessProperties) {
        this.processProperties[processType] = properties;
    }

    public getProperties(processType : string) : IProcessProperties {
        return this.processProperties[processType];
    }
}

export class Service {
    constructor(
        private provider : Provider,
        private $injector : angular.auto.IInjectorService
    ) {}

    public getTemplate(processType : string) : string {
        if (!this.provider.templates.hasOwnProperty(processType)) {
            throw "No template for process type \"" + processType + "\" has been configured.";
        }
        return this.provider.templates[processType];
    }

    public getProperties(processType : string) : IProcessProperties {
        return this.provider.getProperties(processType);
    }
}

export var workflowSwitchDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhPermissions : AdhPermissions.Service,
    $q : angular.IQService,
    $translate,
    $window : angular.IWindowService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/WorkflowSwitch.html",
        scope: {
            path: "@"
        },
        transclude: true,
        link: (scope) => {

            adhPermissions.bindScope(scope, scope.path, "rawOptions", {importOptions: false});
            scope.$watch("rawOptions", (rawOptions) => {
                scope.availableStates = AdhUtil.deepPluck(rawOptions, [
                    "data", "PUT", "request_body", "data", SIWorkflow.nick, "workflow_state"]);
            });

            adhHttp.get(scope.path).then((process) => {
                scope.workflowState = SIWorkflow.get(process).workflow_state;
            });

            scope.switchState = (newState) => {
                $q.all([$translate("TR__WILL_SWITCH_TO_STATE"), $translate("TR__WILL_RELOAD_PAGE")]).then((translated) => {
                    if (!$window.confirm(translated[0] + newState + ". " + translated[1])) {
                        return;
                    }
                    adhHttp.get(scope.path).then((process) => {
                        SIWorkflow.set(process, {
                            workflow_state: newState
                        });
                        SIName.set(process, undefined);
                        adhHttp.put(scope.path, process).then((response) => {
                            $window.parent.location.reload();
                        });
                    });
                });
            };

        }
    };
};

export var processViewDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhProcess : Service,
    $compile : angular.ICompileService
) => {
    return {
        restrict: "E",
        link: (scope, element) => {
            adhTopLevelState.on("processType", (processType) => {
                if (processType) {
                    scope.processProperties = adhProcess.getProperties(processType);
                    var template = adhProcess.getTemplate(processType);
                    element.html(template);
                    $compile(element.contents())(scope);
                }
            });
        }
    };
};

export var listItemDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    adhNames : AdhNames.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        scope: {
            path: "@"
        },
        link: (scope) => {
            adhHttp.get(scope.path).then((process) => {
                if (SIImageReference.get(process) && SIImageReference.get(process).picture) {
                    scope.picture = SIImageReference.get(process).picture;
                }
                scope.title = SITitle.get(process).title;
                scope.processName = adhNames.getName(process.content_type, 1);
                if (SILocationReference.get(process) && SILocationReference.get(process).location) {
                    adhHttp.get(SILocationReference.get(process).location).then((loc) => {
                        scope.locationText = SITitle.get(loc).title;
                    });
                }
                var workflow = SIWorkflow.get(process);
                scope.participationStartDate = getStateData(workflow, "participate").start_date;
                scope.participationEndDate = getStateData(workflow, "evaluate").start_date;
                scope.shortDesc = SIDescription.get(process).short_description;
            });
        }
    };
};

export var listingDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        scope: {},
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        link: (scope) => {
            scope.contentType = RIProcess.content_type;
            scope.params = {
                depth: "all"
            };
        }
    };
};

export var currentProcessTitleDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhHttp: AdhHttp.Service
) => {
    return {
        restrict: "E",
        scope: {},
        template: "<a class=\"current-process-title\" data-ng-href=\"{{processUrl | adhResourceUrl}}\">{{processTitle}}</a>",
        link: (scope) => {
            scope.$on("$destroy", adhTopLevelState.bind("processUrl", scope));
            scope.$on("$destroy", adhTopLevelState.on("processUrl", (processUrl) => {
                adhHttp.get(processUrl).then((process) => {
                    scope.processTitle = SITitle.get(process).title;
                });
            }));
        }
    };
};

