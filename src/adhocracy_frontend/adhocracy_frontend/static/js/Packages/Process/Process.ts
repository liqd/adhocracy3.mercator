    /// <reference path="../../../lib2/types/angular.d.ts"/>

import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhUtil from "../Util/Util";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";

import RIBPlan from "../../Resources_/adhocracy_meinberlin/resources/bplan/IProcess";
import RIBuergerhaushalt from "../../Resources_/adhocracy_meinberlin/resources/burgerhaushalt/IProcess";
import RICollaborativeText from "../../Resources_/adhocracy_meinberlin/resources/collaborative_text/IProcess";
import RIIdeaCollection from "../../Resources_/adhocracy_meinberlin/resources/idea_collection/IProcess";
import RIKiezkasse from "../../Resources_/adhocracy_meinberlin/resources/kiezkassen/IProcess";
import RIPoll from "../../Resources_/adhocracy_meinberlin/resources/stadtforum/IPoll";
import RIProposalVersion from "../../Resources_/adhocracy_core/resources/proposal/IProposalVersion";

import * as SIDescription from "../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIImageReference from "../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocationReference from "../../Resources_/adhocracy_core/sheets/geo/ILocationReference";
import * as SIName from "../../Resources_/adhocracy_core/sheets/name/IName";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SIWorkflow from "../../Resources_/adhocracy_core/sheets/workflow/IWorkflowAssignment";
import * as SITags from "../../Resources_/adhocracy_core/sheets/tags/ITags";
import * as SITitle from "../../Resources_/adhocracy_core/sheets/title/ITitle";

export var pkgLocation = "/Process";


// mirrors adhocracy_core.sheets.workflow.StateData
export interface IStateData {
    name : string;
    description : string;
    start_date : string;
}

export interface IProcessProperties {
    hasCreatorParticipate? : boolean;
    hasImage? : boolean;
    hasLocation? : boolean;
    hasLocationText? : boolean;
    // if a process has a proposal budget, but no max budget, then set maxBudget = Infinity.
    maxBudget? : number;
    processClass?;
    proposalClass;
    // WARNING: proposalSheet is not a regular feature of adhocracy,
    // but a hack of Buergerhaushalt and Kiezkasse.
    proposalSheet?;
    proposalVersionClass;
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

var getDate = (utcDate : string) : string => {
    var date = new Date(utcDate),
        year = date.getFullYear(),
        month = ("0" + (date.getMonth() + 1)).slice(-2),
        day = ("0" + date.getDate()).slice(-2);
    return day + "." + month + "." + year;
};

var getName = (backendName : string) : string => {
    switch (backendName) {
        case RIBPlan.content_type:
            return "TR__BPLAN_PROCESS";
        case RIBuergerhaushalt.content_type:
            return "TR__BUERGERHAUSHALT";
        case RICollaborativeText.content_type:
            return "TR__COLLABORATIVE_TEXT_EDITING";
        case RIIdeaCollection.content_type:
            return "TR__IDEA_COLLECTION";
        case RIKiezkasse.content_type:
            return "TR__KIEZKASSE";
        case RIPoll.content_type:
            return "TR__POLL";
    }
};

var queryParamWithAny = (args : any[]) : string => {
    var res = "\[\"any\", \[\"";
    for (var i = 0; i < args.length; i++) {
        res += args[i] + "\", \"";
    }
    res += "\"\]\]";
    return res;
};


export class Provider implements angular.IServiceProvider {
    public templates : {[processType : string]: string};
    public processProperties : {[processType : string]: IProcessProperties};
    public $get;

    constructor () {
        this.templates = {};
        this.processProperties = {};

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

    public getProcessProperties(processType : string) : IProcessProperties {
        if (!this.provider.processProperties.hasOwnProperty(processType)) {
            return;
        }
        return this.provider.processProperties[processType];
    }
}

export var workflowSwitchDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
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
                if ( ! $window.confirm("Will switch to process state " + newState + ". (Page will reload)")) {
                    return;
                }
                adhHttp.get(scope.path).then((process) => {
                    process.data[SIWorkflow.nick] = {
                        workflow_state: newState
                    };
                    process.data[SIName.nick] = undefined;
                    adhHttp.put(scope.path, process).then((response) => {
                        $window.parent.location.reload();
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
                    scope.processProperties = adhProcess.getProcessProperties(processType);
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
    adhHttp : AdhHttp.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/ListItem.html",
        scope: {
            path: "@"
        },
        link: (scope) => {
            adhHttp.get(scope.path).then((process) => {
                if (process.data[SIImageReference.nick] && process.data[SIImageReference.nick].picture) {
                    scope.picture = process.data[SIImageReference.nick].picture;
                }
                if (process.content_type === RIPoll.content_type) {
                    adhHttp.get(process.data[SITags.nick].LAST).then((version) => {
                        scope.title = version.data[SITitle.nick].title;
                        scope.shortDesc = version.data[SIDescription.nick].short_description;
                    });
                } else {
                    scope.title = process.data[SITitle.nick].title;
                    scope.shortDesc = process.data[SIDescription.nick].short_description;
                }
                if (process.data[SILocationReference.nick] && process.data[SILocationReference.nick].location) {
                    adhHttp.get(process.data[SILocationReference.nick].location).then((loc) => {
                        scope.locationText = loc.data[SITitle.nick].title;
                    });
                }
                scope.processName = getName(process.content_type);
                var workflow = process.data[SIWorkflow.nick];
                scope.participationStartDate = getDate(getStateData(workflow, "participate").start_date);
                scope.participationEndDate = getDate(getStateData(workflow, "closed").start_date);
            });
        }
    };
};

export var listingDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service,
    $translate
) => {
    return {
        restrict: "E",
        scope: {},
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        link: (scope) => {
            var contentType = queryParamWithAny([
                    RIBPlan.content_type,
                    RIBuergerhaushalt.content_type,
                    RICollaborativeText.content_type,
                    RIIdeaCollection.content_type,
                    RIKiezkasse.content_type,
                    RIPoll.content_type
                ]);
            scope.params = {
                depth: "all",
                content_type: contentType
            };
            var countParams = {
                depth: "all",
                content_type: contentType,
                elements: "omit"
            };
            adhHttp.get("/", countParams).then((res) => {
                scope.processCount = res.data[SIPool.nick].count;
            });

            $translate("TR__PROCESS_LIST_INFO").then((translated) => {
                scope.processListInfo = translated;
            });
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
                    scope.processTitle = process.data[SITitle.nick].title;
                });
            }));
        }
    };
};

