/// <reference path="../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhUtil from "../Util/Util";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

import * as SIName from "../../Resources_/adhocracy_core/sheets/name/IName";
import * as SIWorkflow from "../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";
import RIProcess from "../../Resources_/adhocracy_core/resources/process/IProcess";

var pkgLocation = "/Process";


// mirrors adhocracy_core.sheets.workflow.StateData
export interface IStateData {
    name : string;
    description : string;
    start_date : string;
}

export var getStateData = (sheet : SIWorkflow.Sheet, name : string) : IStateData => {
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
    public buttons : {[processType : string]: string};
    public $get;

    constructor () {
        this.templates = {};
        this.buttons = {};

        this.$get = ["$injector", ($injector) => {
            return new Service(this, $injector);
        }];
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

    public getButton(processType : string) : string {
        if (!this.provider.buttons.hasOwnProperty(processType)) {
            return "";
        }
        return this.provider.buttons[processType];
    }
}

export var workflowSwitchDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
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
                scope.workflowState = process.data[SIWorkflow.nick].workflow_state;
            });

            scope.switchState = (newState) => {
                adhHttp.get(scope.path).then((process) => {
                    process.data[SIWorkflow.nick] = {
                        workflow_state: newState
                    };
                    process.data[SIName.nick] = undefined;
                    adhHttp.put(scope.path, process).then((response) => {
                        $window.alert("Switched to process state " + newState + ". Page reloading...");
                        $window.parent.location.reload();
                    });
                });
            };

        }
    };
};

export var viewDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhProcess : Service,
    $compile : angular.ICompileService
) => {
    return {
        restrict: "E",
        link: (scope, element) => {
            adhTopLevelState.on("processType", (processType) => {
                if (processType) {
                    var template = adhProcess.getTemplate(processType);
                    element.html(template);
                    $compile(element.contents())(scope);
                }
            });
        }
    };
};


export var buttonSlotDirective = (
    adhTopLevelState : AdhTopLevelState.Service,
    adhProcess : Service,
    $compile : angular.ICompileService
) => {
    return {
        restrict: "E",
        link: (scope, element) => {
            adhTopLevelState.on("processType", (processType) => {
                if (processType) {
                    var template : string = adhProcess.getButton(processType);
                    element.html(template);
                    $compile(element.contents())(scope);
                }
            });
        }
    };
};


export var listItemDirective = () => {
    return {
        restrict: "E",
        scope: {
            path: "@"
        },
        template: "<a data-ng-href=\"{{ path | adhResourceUrl }}\">{{path}}</a>"
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
