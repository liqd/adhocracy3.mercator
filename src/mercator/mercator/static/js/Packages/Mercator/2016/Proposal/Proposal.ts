/// <reference path="../../../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../../../../lib/DefinitelyTyped/moment/moment.d.ts"/>

import * as AdhBadge from "../../../Badge/Badge";
import * as AdhConfig from "../../../Config/Config";
import * as AdhHttp from "../../../Http/Http";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhPreliminaryNames from "../../../PreliminaryNames/PreliminaryNames";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";

import * as AdhMercator2015Proposal from "../../2015/Proposal/Proposal";

import * as SIChallenge from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IChallenge";
import * as SICommunity from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/ICommunity";
import * as SIConnectionCohesion from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IConnectionCohesion";
import * as SIDifference from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IDifference";
import * as SIDuration from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IDuration";
import * as SIExtraFunding from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IExtraFunding";
import * as SIExtraInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IExtraInfo";
import * as SIFinancialPlanning from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IFinancialPlanning";
import * as SIGoal from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IGoal";
import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocation from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/ILocation";
import * as SIMetaData from "../../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIMercatorIntroImageMetadata from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IIntroImageMetadata";
import * as SIMercatorSubResources from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IMercatorSubResources";
import * as SIOrganizationInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IOrganizationInfo";
import * as SIPartners from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IPartners";
import * as SIPitch from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IPitch";
import * as SIPlan from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IPlan";
import * as SIPracticalRelevance from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IPracticalRelevance";
import * as SIStatus from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IStatus";
import * as SITarget from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/ITarget";
import * as SITeam from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/ITeam";
import * as SITitle from "../../../../Resources_/adhocracy_core/sheets/title/ITitle";
import * as SITopic from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/ITopic";
import * as SIUserInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IUserInfo";
import * as SIWinnerInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IWinnerInfo";
import * as SIMercatorUserInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IUserInfo";
import RIChallenge from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IChallenge";
import RIConnectionCohesion from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IConnectionCohesion";
import RIDifference from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IDifference";
import RIDuration from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IDuration";
import RIExtraInfo from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IExtraInfo";
import RIGoal from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IGoal";
import RIMercatorIntroImage from "../../../../Resources_/adhocracy_mercator/resources/mercator/IIntroImage";
import RIMercatorProposal from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IMercatorProposal";
import RIPartners from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IPartners";
import RIPitch from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IPitch";
import RIPlan from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IPlan";
import RIPracticalRelevance from "../../../../Resources_/adhocracy_mercator/resources/mercator2/IPracticalRelevance";
import RITarget from "../../../../Resources_/adhocracy_mercator/resources/mercator2/ITarget";
import RITeam from "../../../../Resources_/adhocracy_mercator/resources/mercator2/ITeam";

var pkgLocation = "/Mercator/2016/Proposal";

var topics = [
    "democracy_and_participation",
    "arts_and_cultural_activities",
    "environment",
    "social_inclusion",
    "migration",
    "communities",
    "urban_development",
    "education",
    "other",
];

var topicTrString = (topic : string) : string => {
    var topicTranslations = {
        democracy_and_participation: "TR__MERCATOR_TOPIC_DEMOCRACY",
        arts_and_cultural_activities: "TR__MERCATOR_TOPIC_CULTURE",
        environment: "TR__MERCATOR_TOPIC_ENVIRONMENT",
        social_inclusion: "TR__MERCATOR_TOPIC_SOCIAL",
        migration: "TR__MERCATOR_TOPIC_MIGRATION",
        communities: "TR__MERCATOR_TOPIC_COMMUNITY",
        urban_development: "TR__MERCATOR_TOPIC_URBAN",
        education: "TR__MERCATOR_TOPIC_EDUCATION",
        other: "TR__MERCATOR_TOPIC_OTHER"
    };
    return topicTranslations[topic];
};


export interface IData {
    userInfo : {
        firstName : string;
        lastName : string;
    };
    organizationInfo : {
        name : string;
        email : string;
        website : string;
        city : string;
        country : string;
        status : string;
        otherText : string;
        registrationDate : string;
        helpRequest : string;
    };
    title : string;
    introduction : {
        pitch : string;
        picture : string;
    };
    partners : {
        hasPartners : boolean;
        partner1 : {
            name : string;
            country : string;
            website : string;
        };
        partner2 : {
            name : string;
            country : string;
            website : string;
        };
        partner3 : {
            name : string;
            country : string;
            website : string;
        };
        hasOther : boolean;
        otherText : string;
    };
    topic : {
        democracy_and_participation : boolean;
        arts_and_cultural_activities : boolean;
        environment : boolean;
        social_inclusion : boolean;
        migration : boolean;
        communities : boolean;
        urban_development : boolean;
        education : boolean;
        other : boolean;
        otherText : string;
    };
    topic_other : string;
    duration : number;
    location : {
        location_is_linked_to_ruhr : boolean;
        location_is_linked_to_ruhr_text : string;
        location_is_online : boolean;
        location_is_specific : boolean;
        location_specific : string;
    };
    status : string;
    impact : {
        challenge : string;
        goal : string;
        plan : string;
        target : string;
        team : string;
        extraInfo : string;
    };
    criteria : {
        strengthen : string;
        difference : string;
        practical : string;
    };
    finance : {
        budget : number;
        requestedFunding : number;
        major : string;
        otherSources? : string;
        secured? : boolean;
    };
    experience : string;
    heardFrom? : {
        facebook : boolean;
        newsletter : boolean;
        other : boolean;
        otherText : string;
        personal_contact : boolean;
        twitter : boolean;
        website : boolean;
    };
}

export interface IDetailData extends IData {
    commentCountTotal : number;
    commentCounts: {
        proposal : number;
        pitch : number;
        partners : number;
        duration : number;
        challenge : number;
        goal : number;
        plan : number;
        target : number;
        team : number;
        extrainfo : number;
        connectioncohesion : number;
        difference : number;
        practicalrelevance : number;
    };
    currentPhase : string;
    supporterCount : number;
    creationDate : string;
    creator : string;
}

export interface IFormData extends IData {
    acceptDisclaimer : boolean;
}


var fill = (data : IFormData, resource) => {
    switch (resource.content_type) {
        case RIMercatorProposal.content_type:
            resource.data[SIUserInfo.nick] = new SIUserInfo.Sheet({
                first_name: data.userInfo.firstName,
                last_name: data.userInfo.lastName
            });
            resource.data[SIOrganizationInfo.nick] = new SIOrganizationInfo.Sheet({
                name: data.organizationInfo.name,
                city: data.organizationInfo.city,
                country: data.organizationInfo.country,
                help_request: data.organizationInfo.helpRequest,
                registration_date: data.organizationInfo.registrationDate,
                website: data.organizationInfo.website,
                contact_email: data.organizationInfo.email,
                status: data.organizationInfo.status,
                status_other: data.organizationInfo.otherText
            });
            resource.data[SITopic.nick] = new SITopic.Sheet({
                topic: _.reduce(<any>data.topic, (result, include, topic) => {
                    if (include && (topic !== "otherText")) {
                        result.push(topic);
                    }
                    return result;
                }, []),
                topic_other: data.topic.otherText
            });
            resource.data[SITitle.nick] = new SITitle.Sheet({
                title: data.title
            });
            resource.data[SILocation.nick] = new SILocation.Sheet({
                location: data.location.location_specific,
                is_online: !!data.location.location_is_online,
                has_link_to_ruhr: !!data.location.location_is_linked_to_ruhr,
                link_to_ruhr: data.location.location_is_linked_to_ruhr_text
            });
            resource.data[SIStatus.nick] = new SIStatus.Sheet({
                status: data.status
            });
            resource.data[SIFinancialPlanning.nick] = new SIFinancialPlanning.Sheet({
                budget: data.finance.budget,
                requested_funding: data.finance.requestedFunding,
                major_expenses: data.finance.major
            });
            resource.data[SIExtraFunding.nick] = new SIExtraFunding.Sheet({
                other_sources: data.finance.otherSources,
                secured: !!data.finance.secured
            });
            resource.data[SICommunity.nick] = new SICommunity.Sheet({
                expected_feedback: data.experience,
                heard_froms: _.reduce(<any>data.heardFrom, (result, include, item) => {
                    if (include) {
                        result.push(item);
                    }
                    return result;
                }, []),
                heard_from_other: data.heardFrom.otherText
            });
            resource.data[SIImageReference.nick] = new SIImageReference.Sheet({
                picture: data.introduction.picture
            });
            resource.data[SIWinnerInfo.nick] = new SIWinnerInfo.Sheet({
                funding: null  // FIXME,
            });
            break;
        case RIPitch.content_type:
            resource.data[SIPitch.nick] = new SIPitch.Sheet({
                pitch: data.introduction.pitch
            });
            break;
        case RIPartners.content_type:
            resource.data[SIPartners.nick] = new SIPartners.Sheet({
                has_partners: (<any>data.partners.hasPartners === "true" ? true : false),
                partner1_name: data.partners.partner1.name,
                partner1_website: data.partners.partner1.website,
                partner1_country: data.partners.partner1.country,
                partner2_name: data.partners.partner2.name,
                partner2_website: data.partners.partner2.website,
                partner2_country: data.partners.partner2.country,
                partner3_name: data.partners.partner3.name,
                partner3_website: data.partners.partner3.website,
                partner3_country: data.partners.partner3.country,
                other_partners: data.partners.otherText
            });
            break;
        case RIDuration.content_type:
            resource.data[SIDuration.nick] = new SIDuration.Sheet({
                duration: data.duration
            });
            break;
        case RIChallenge.content_type:
            resource.data[SIChallenge.nick] = new SIChallenge.Sheet({
                challenge: data.impact.challenge
            });
            break;
        case RIGoal.content_type:
            resource.data[SIGoal.nick] = new SIGoal.Sheet({
                goal: data.impact.goal
            });
            break;
        case RIPlan.content_type:
            resource.data[SIPlan.nick] = new SIPlan.Sheet({
                plan: data.impact.plan
            });
            break;
        case RITarget.content_type:
            resource.data[SITarget.nick] = new SITarget.Sheet({
                target: data.impact.target
            });
            break;
        case RITeam.content_type:
            resource.data[SITeam.nick] = new SITeam.Sheet({
                team: data.impact.team
            });
            break;
        case RIExtraInfo.content_type:
            resource.data[SIExtraInfo.nick] = new SIExtraInfo.Sheet({
                extrainfo: data.impact.extraInfo
            });
            break;
        case RIConnectionCohesion.content_type:
            resource.data[SIConnectionCohesion.nick] = new SIConnectionCohesion.Sheet({
                connection_cohesion: data.criteria.strengthen
            });
            break;
        case RIDifference.content_type:
            resource.data[SIDifference.nick] = new SIDifference.Sheet({
                difference: data.criteria.difference
            });
            break;
        case RIPracticalRelevance.content_type:
            resource.data[SIPracticalRelevance.nick] = new SIPracticalRelevance.Sheet({
                practicalrelevance: data.criteria.practical
            });
            break;
    }
};

var create = (adhHttp : AdhHttp.Service<any>) => (scope, adhPreliminaryNames) => {
    var data : IFormData = scope.data;
    return adhHttp.withTransaction((transaction) => {
        var proposal = new RIMercatorProposal({preliminaryNames: adhPreliminaryNames});
        fill(data, proposal);
        var proposalRequest = transaction.post(scope.poolPath, proposal);

        var subResourcesSheet = new SIMercatorSubResources.Sheet(<any>{});
        _.forEach({
            pitch: RIPitch,
            partners: RIPartners,
            duration: RIDuration,
            challenge: RIChallenge,
            goal: RIGoal,
            plan: RIPlan,
            target: RITarget,
            team: RITeam,
            extrainfo: RIExtraInfo,
            connectioncohesion: RIConnectionCohesion,
            difference: RIDifference,
            practicalrelevance: RIPracticalRelevance
        }, (cls, subresourceKey : string) => {
            var resource = new cls({preliminaryNames: adhPreliminaryNames});
            fill(data, resource);
            var request = transaction.post(proposalRequest.path, resource);
            subResourcesSheet[subresourceKey] = request.path;
        });

        var proposal2 = new RIMercatorProposal({preliminaryNames: adhPreliminaryNames});
        proposal2.data[SIMercatorSubResources.nick] = subResourcesSheet;
        transaction.put(proposalRequest.path, proposal2);

        return transaction.commit().then((responses) => {
            return responses[0].path;
        });
    });
};

var get = (
    $q : ng.IQService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service
) => (path : string) : ng.IPromise<IDetailData> => {
    return adhHttp.get(path).then((proposal) => {
        var subs : {
            pitch : RIPitch;
            partners : RIPartners;
            duration : RIDuration;
            challenge : RIChallenge;
            goal : RIGoal;
            plan : RIPlan;
            target : RITarget;
            team : RITeam;
            extrainfo : RIExtraInfo;
            connectioncohesion : RIConnectionCohesion;
            difference : RIDifference;
            practicalrelevance : RIPracticalRelevance;
        } = <any>{};

        return $q.all(_.map(proposal.data[SIMercatorSubResources.nick], (path, key) => {
            return adhHttp.get(<string>path).then((subresource) => {
                subs[key] = subresource;
            });
        })).then(() => $q.all([
            AdhMercator2015Proposal.getWorkflowState(adhHttp, adhTopLevelState, $q)(),
            AdhMercator2015Proposal.countSupporters(adhHttp, path + "rates/", path),
            AdhMercator2015Proposal.countComments(adhHttp, path),
        ])).then((args : any[]) : IDetailData => {
            return {
                currentPhase: args[0],
                supporterCount: args[1],
                commentCountTotal: args[2],

                creationDate: proposal.data[SIMetaData.nick].item_creation_date,
                creator: proposal.data[SIMetaData.nick].creator,
                userInfo: {
                    firstName: proposal.data[SIMercatorUserInfo.nick].first_name,
                    lastName: proposal.data[SIMercatorUserInfo.nick].last_name
                },
                organizationInfo: {
                    name: proposal.data[SIOrganizationInfo.nick].name,
                    city: proposal.data[SIOrganizationInfo.nick].city,
                    country: proposal.data[SIOrganizationInfo.nick].country,
                    helpRequest: proposal.data[SIOrganizationInfo.nick].help_request,
                    registrationDate: proposal.data[SIOrganizationInfo.nick].registration_date,
                    website: proposal.data[SIOrganizationInfo.nick].website,
                    email: proposal.data[SIOrganizationInfo.nick].contact_email,
                    status: proposal.data[SIOrganizationInfo.nick].status,
                    otherText: proposal.data[SIOrganizationInfo.nick].status_other
                },
                topic: <any>_.reduce(<any>topics, (result, key : string) => {
                    result[key] = _.indexOf(proposal.data[SITopic.nick].topic, key) !== -1;
                    return result;
                }, {}),
                topic_other: proposal.data[SITopic.nick].topic_other,
                title: proposal.data[SITitle.nick].title,
                location: {
                    location_is_specific: !!proposal.data[SILocation.nick].location,
                    location_specific: proposal.data[SILocation.nick].location,
                    location_is_online: proposal.data[SILocation.nick].is_online,
                    location_is_linked_to_ruhr: proposal.data[SILocation.nick].has_link_to_ruhr,
                    location_is_linked_to_ruhr_text: proposal.data[SILocation.nick].link_to_ruhr
                },
                status: proposal.data[SIStatus.nick].status,
                finance: {
                    budget: proposal.data[SIFinancialPlanning.nick].budget,
                    requestedFunding: proposal.data[SIFinancialPlanning.nick].requested_funding,
                    major: proposal.data[SIFinancialPlanning.nick].major_expenses,
                    otherSources: (proposal.data[SIExtraFunding.nick] || {}).other_sources,
                    secured: (proposal.data[SIExtraFunding.nick] || {}).secured
                },
                experience: proposal.data[SICommunity.nick].expected_feedback,
                heardFrom: proposal.data[SICommunity.nick].heard_froms,
                introduction: {
                    pitch: subs.pitch.data[SIPitch.nick].pitch,
                    picture: proposal.data[SIImageReference.nick].picture
                },
                partners: {
                    hasPartners: subs.partners.data[SIPartners.nick].has_partners,
                    partner1: {
                        name: subs.partners.data[SIPartners.nick].partner1_name,
                        website: subs.partners.data[SIPartners.nick].partner1_website,
                        country: subs.partners.data[SIPartners.nick].partner1_country
                    },
                    partner2: {
                        name: subs.partners.data[SIPartners.nick].partner2_name,
                        website: subs.partners.data[SIPartners.nick].partner2_website,
                        country: subs.partners.data[SIPartners.nick].partner2_country
                    },
                    partner3: {
                        name: subs.partners.data[SIPartners.nick].partner3_name,
                        website: subs.partners.data[SIPartners.nick].partner3_website,
                        country: subs.partners.data[SIPartners.nick].partner3_country
                    },
                    hasOther: !!subs.partners.data[SIPartners.nick].other_partners,
                    otherText: subs.partners.data[SIPartners.nick].other_partners
                },
                duration: subs.duration.data[SIDuration.nick].duration,
                impact: {
                    challenge: subs.challenge.data[SIChallenge.nick].challenge,
                    goal: subs.goal.data[SIGoal.nick].goal,
                    plan: subs.plan.data[SIPlan.nick].plan,
                    target: subs.target.data[SITarget.nick].target,
                    team: subs.team.data[SITeam.nick].team,
                    extraInfo: subs.extrainfo.data[SIExtraInfo.nick].extrainfo
                },
                criteria: {
                    strengthen: subs.connectioncohesion.data[SIConnectionCohesion.nick].connection_cohesion,
                    difference: subs.difference.data[SIDifference.nick].difference,
                    practical: subs.practicalrelevance.data[SIPracticalRelevance.nick].practicalrelevance
                },

                // FIXME: It is not currently possible to get the
                // recursive comment count of a subresource. Will be
                // fixed in the backend.
                commentCounts: {
                    proposal: 0,
                    pitch: 0,
                    partners: 0,
                    duration: 0,
                    challenge: 0,
                    goal: 0,
                    plan: 0,
                    target: 0,
                    team: 0,
                    extrainfo: 0,
                    connectioncohesion: 0,
                    difference: 0,
                    practicalrelevance: 0
                }
            };
        });
    });
};


export var createDirective = (
        $q : ng.IQService,
        adhConfig : AdhConfig.IService,
        adhHttp : AdhHttp.Service<any>,
        adhTopLevelState : AdhTopLevelState.Service,
        $translate,
        flowFactory,
        adhShowError
    ) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            poolPath: "@",
            path: "@",
            data: "="
        },
        link: (scope) => {

            console.log(scope);

            var el = angular.element("#mercatorProposalForm");

            scope.mercatorProposalForm = el.scope();

            $translate.use("en");

            scope.$flow = flowFactory.create();

            var topicTotal = 0;

            scope.topics = topics;

            var heardFromCheckboxes = [
                "heard-from-personal",
                "heard-from-website",
                "heard-from-newsletter",
                "heard-from-facebook",
                "heard-from-twitter",
                "heard-from-other"
            ];

            var locationCheckboxes = [
                "location-location-is-specific",
                "location-location-is-online",
                "location-location-is-linked-to-ruhr"
            ];

            scope.topicChange = (isChecked) => {
                if (scope.data.topic) {
                    topicTotal = isChecked ? (topicTotal + 1) : (topicTotal - 1);
                    var validity = topicTotal > 0 && topicTotal < 3;
                    scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setValidity("enoughTopics", validity);
                    scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setDirty();
                } else {
                    scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setValidity("enoughTopics", false);
                    scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setDirty();
                }
            };

            var updateCheckBoxGroupValidity = (form, names : string[]) : boolean => {
                var valid =  _.some(names, (name) => form[name].$modelValue);
                _.forOwn(names, (name) => {
                    form[name].$setValidity("groupRequired", valid);
                });
                return valid;
            };

            scope.topicTrString = topicTrString;

            var showCheckboxGroupError = (form, names : string[]) : boolean => {
                if (!form) {
                    return false;
                }
                var dirty = scope.mercatorProposalForm.$submitted || _.some(names, (name) => form[name].$dirty);
                return !updateCheckBoxGroupValidity(form, names) && dirty;
            };

            scope.showTopicsError = () : boolean => {
                return ((topicTotal < 1) || (topicTotal > 2)) &&
                    scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$dirty;
            };

            scope.showLocationError = () : boolean => {
                return showCheckboxGroupError(scope.mercatorProposalBriefForm, locationCheckboxes);
            };

            scope.showStatusError = () : boolean => {
                return showCheckboxGroupError(scope.mercatorProposalBriefForm, locationCheckboxes);
            };

            scope.showFinanceGrantedInfo = () : boolean => {
                if (!scope.data) {
                    return false;
                }
                return (scope.data.finance && scope.data.finance.otherSources && scope.data.finance.otherSources !== "");
            };

            scope.showHeardFromError = () : boolean => {
                return showCheckboxGroupError(scope.mercatorProposalCommunityForm, heardFromCheckboxes);
            };

            scope.dateChange = (date) => {
                // FIXME: this is quite hacky dates need proper validation EG not so much in the past or future too
                scope.data.organizationInfo.registrationDate = date + "-01";
            };

            scope.showError = adhShowError;

            if (scope.path) {
                // Edit
                scope.edit = "true";

                get($q, adhHttp, adhTopLevelState)(scope.path).then((data) => {
                    scope.data = data;
                    scope.selectedTopics = [];

                    _.forEach(scope.data.topic, function(isSelected, key) {
                        if (isSelected === true) {
                            scope.selectedTopics.push(topicTrString(key));
                        }
                    });

                    _.forEach(scope.data.heardFrom, function(heardFromName: string) {
                        scope.data.heardFrom[heardFromName] = true;
                    });

                });
            } else {
                // Create
                // FIXME !
                scope.create = "true";

                scope.data = {
                    user_info: {},
                    organization_info: {},
                    introduction: {},
                    partners: {
                        partner1: {},
                        partner2: {},
                        partner3: {}
                    },
                    topic: {},
                    location: {},
                    impact: {},
                    criteria: {},
                    finance: {},
                    heardFrom: {}
                };
            }
        }
    };
};

export var listing = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Listing.html",
        scope: {
            path: "@",
            update: "=?",
            facets: "=?",
            sort: "=?",
            sorts: "=?",
            reverse: "=?",
            frontendOrderPredicate: "=?",
            frontendOrderReverse: "=?",
            initialLimit: "=?",
            params: "=?"
        },
        link: (scope) => {
            scope.contentType = RIMercatorProposal.content_type;
        }
    };
};

export var listItem = (
    $q : angular.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges
) => {
    return {
        retrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/../../2015/Proposal/ListItem.html",
        scope: {
            path: "@"
        },
        link: (scope, element) => {
            get($q, adhHttp, adhTopLevelState)(scope.path).then((data) => {

                scope.data = {
                    title: {
                        title: data.title
                    },
                    user_info: {
                        first_name: data.userInfo.firstName,
                        last_name: data.userInfo.lastName,
                        item_creation_date: data.creationDate,
                        path: data.creator
                    },
                    organization_info: data.organizationInfo,
                    finance: {
                        requested_funding: data.finance.requestedFunding
                    },
                    introduction: data.introduction,
                    commentCountTotal: data.commentCountTotal,
                    currentPhase: data.currentPhase,
                    supporterCount: data.supporterCount
                };
            });
        }
    };
};

export var mercatorProposalFormController2016 = (
    $scope,
    $element,
    $window,
    $location,
    adhShowError,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhSubmitIfValid,
    adhResourceUrl,
    adhUploadImage,
    flowFactory,
    $translate
) => {

    $scope.submitIfValid = () => {
        adhSubmitIfValid($scope, $element, $scope.mercatorProposalForm, () => {
            var post = () => create(adhHttp)($scope, adhPreliminaryNames).then((proposalPath) => {
                $location.url(adhResourceUrl(proposalPath));
            });

            if ($scope.$flow && $scope.$flow.support && $scope.$flow.files.length > 0) {
                return adhUploadImage(
                    adhTopLevelState.get("processUrl"),
                    $scope.$flow,
                    RIMercatorIntroImage.content_type,
                    SIMercatorIntroImageMetadata.nick
                ).then((imageUrl : string) => {
                    $scope.data.introduction.picture = imageUrl;
                    return post();
                });
            } else {
                return post();
            }
        });
    };

    $scope.cancel = () => {
        adhTopLevelState.goToCameFrom(adhResourceUrl(adhTopLevelState.get("processUrl")));
    };
};

export var detailDirective = (
    $q : ng.IQService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhPermissions : AdhPermissions.Service,
    $translate
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Detail.html",
        scope: {
            path: "@"
        },
        link: (scope) => {
            $translate.use("en");
            adhPermissions.bindScope(scope, () => scope.path);
            // FIXME, waa
            scope.isModerator = scope.options.PUT;

            get($q, adhHttp, adhTopLevelState)(scope.path).then((data) => {
                scope.data = data;

                scope.selectedTopics = [];

                _.forEach(scope.data.topic, function(isSelected, key) {
                    if ((isSelected === true) && (key !== "other")) {
                        scope.selectedTopics.push(topicTrString(key));
                    }
                });
            });
        }
    };
};
