/// <reference path="../../../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>
/// <reference path="../../../../../lib/DefinitelyTyped/moment/moment.d.ts"/>

import * as AdhBadge from "../../../Badge/Badge";
import * as AdhConfig from "../../../Config/Config";
import * as AdhCredentials from "../../../User/Credentials";
import * as AdhHttp from "../../../Http/Http";
import * as AdhPermissions from "../../../Permissions/Permissions";
import * as AdhPreliminaryNames from "../../../PreliminaryNames/PreliminaryNames";
import * as AdhTopLevelState from "../../../TopLevelState/TopLevelState";

import * as AdhMercator2015Proposal from "../../2015/Proposal/Proposal";

import * as SIBadgeable from "../../../../Resources_/adhocracy_core/sheets/badge/IBadgeable";
import * as SIBadgeAssignment from "../../../../Resources_/adhocracy_core/sheets/badge/IBadgeAssignment";
import * as SIChallenge from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IChallenge";
import * as SICommentable from "../../../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SICommunity from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/ICommunity";
import * as SIConnectionCohesion from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IConnectionCohesion";
import * as SIDescription from "../../../../Resources_/adhocracy_core/sheets/description/IDescription";
import * as SIDifference from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IDifference";
import * as SIDuration from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IDuration";
import * as SIExtraFunding from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IExtraFunding";
import * as SIExtraInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IExtraInfo";
import * as SIFinancialPlanning from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IFinancialPlanning";
import * as SIGoal from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IGoal";
import * as SIImageReference from "../../../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SILocation from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/ILocation";
import * as SIMercatorIntroImageMetadata from "../../../../Resources_/adhocracy_mercator/sheets/mercator/IIntroImageMetadata";
import * as SIMercatorSubResources from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IMercatorSubResources";
import * as SIMercatorUserInfo from "../../../../Resources_/adhocracy_mercator/sheets/mercator2/IUserInfo";
import * as SIMetaData from "../../../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
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
import RIBadgeAssignment from "../../../../Resources_/adhocracy_core/resources/badge/IBadgeAssignment";
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
    winner : {
        funding : number;
        description : string;
        name : string;
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
    selectedTopics : string[];
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
                    if (include && item !== "otherText" ) {
                        result.push(item);
                    }
                    return result;
                }, []),
                heard_from_other: data.heardFrom.otherText
            });
            resource.data[SIImageReference.nick] = new SIImageReference.Sheet({
                picture: data.introduction.picture
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

var create = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (scope) => {
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

var edit = (
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service
) => (scope) => {
    var data : IFormData = scope.data;
    return adhHttp.get(scope.path).then((oldProposal) => {
        var subResourcesSheet : SIMercatorSubResources.Sheet = oldProposal.data[SIMercatorSubResources.nick];

        return adhHttp.withTransaction((transaction) => {
            var proposal = new RIMercatorProposal({preliminaryNames: adhPreliminaryNames});
            fill(data, proposal);
            transaction.put(oldProposal.path, proposal);

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
                transaction.put(subResourcesSheet[subresourceKey], resource);
            });

            return transaction.commit();
        });
    });
};

var moderate = (
    $q : angular.IQService,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhCredentials : AdhCredentials.Service
) => (scope) => {
    return adhHttp.get(scope.path).then((oldProposal) => {
        var clone = _.cloneDeep(oldProposal);
        clone.data[SIWinnerInfo.nick] = new SIWinnerInfo.Sheet({
            funding: scope.data.winner.funding
        });
        var resourcePromise = adhHttp.put(scope.path, clone);

        var badgePoolPath = oldProposal.data[SIBadgeable.nick].post_pool;
        var assignmentRequests = _.map(oldProposal.data[SIBadgeable.nick].assignments, (p : string) => adhHttp.get(p));
        var badgePromise = $q.all(assignmentRequests).then((assignments) => {
            var communityAssignment = <any>_.find(assignments, (a : any) => {
                return _.endsWith(a.data[SIBadgeAssignment.nick].badge, "community/");
            });
            var winningAssignment = <any>_.find(assignments, (a : any) => {
                return _.endsWith(a.data[SIBadgeAssignment.nick].badge, "winning/");
            });
            var badgeAssignment = communityAssignment || winningAssignment;

            var postdata : any;
            if (badgeAssignment) {
                postdata = {
                    content_type: RIBadgeAssignment.content_type,
                    data: {}
                };
                postdata.data[SIDescription.nick] = {
                    description: scope.data.winner.description
                };
                return adhHttp.put(badgeAssignment.path, postdata);
            } else {
                postdata = {
                    content_type: RIBadgeAssignment.content_type,
                    data: {}
                };
                postdata.data[SIDescription.nick] = {
                    description: scope.data.winner.description
                };
                postdata.data[SIBadgeAssignment.nick] = {
                    badge: "/organisation/advocate-europe2/badges/winning/",  // FIXME
                    object: scope.path,
                    subject: adhCredentials.userPath
                };
                return adhHttp.post(badgePoolPath, postdata);
            }
        });

        return $q.all([resourcePromise, badgePromise]);
    });
};

var get = (
    $q : ng.IQService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhGetBadges : AdhBadge.IGetBadges
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
            adhGetBadges(proposal).then((assignments : AdhBadge.IBadge[]) => {
                var communityAssignment = _.find(assignments, (a) => a.name === "community");
                var winningAssignment = _.find(assignments, (a) => a.name === "winning");

                return communityAssignment || winningAssignment;
            })
        ])).then((args : any[]) : IDetailData => {
            var commentCounts = {
                proposal: proposal.data[SICommentable.nick].comments_count,
                pitch: subs.pitch.data[SICommentable.nick].comments_count,
                partners: subs.partners.data[SICommentable.nick].comments_count,
                duration: subs.duration.data[SICommentable.nick].comments_count,
                challenge: subs.challenge.data[SICommentable.nick].comments_count,
                goal: subs.goal.data[SICommentable.nick].comments_count,
                plan: subs.plan.data[SICommentable.nick].comments_count,
                target: subs.target.data[SICommentable.nick].comments_count,
                team: subs.team.data[SICommentable.nick].comments_count,
                extrainfo: subs.extrainfo.data[SICommentable.nick].comments_count,
                connectioncohesion: subs.connectioncohesion.data[SICommentable.nick].comments_count,
                difference: subs.difference.data[SICommentable.nick].comments_count,
                practicalrelevance: subs.practicalrelevance.data[SICommentable.nick].comments_count
            };

            return {
                currentPhase: args[0],
                supporterCount: args[1],

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
                    status: proposal.data[SIOrganizationInfo.nick].status,
                    otherText: proposal.data[SIOrganizationInfo.nick].status_other
                },
                topic: <any>_.reduce(<any>topics, (result, key : string) => {
                    result[key] = _.indexOf(proposal.data[SITopic.nick].topic, key) !== -1;
                    return result;
                }, {
                    otherText: proposal.data[SITopic.nick].topic_other
                }),
                selectedTopics: _.map(proposal.data[SITopic.nick].topic, (topic : string) => {
                    if (topic === "other") {
                        return proposal.data[SITopic.nick].topic_other;
                    } else {
                        return topicTrString(topic);
                    }
                }),
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
                heardFrom: _.reduce(proposal.data[SICommunity.nick].heard_froms, (result, item : string) => {
                    result[item] = true;
                    return result;
                }, {}),
                winner: {
                    funding: (proposal.data[SIWinnerInfo.nick] || {}).funding,
                    description: (args[2] || {}).description,
                    name: (args[2] || {}).name
                },
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
                commentCounts: commentCounts,
                commentCountTotal: _.sum(<any>commentCounts)
            };
        });
    });
};


export var createDirective = (
    $location : angular.ILocationService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhResourceUrl
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            poolPath: "@"
        },
        link: (scope) => {
            scope.create = true;

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
                heardFrom: {},
                winner: {}
            };

            scope.submit = () => create(adhHttp, adhPreliminaryNames)(scope).then((proposalPath) => {
                $location.url(adhResourceUrl(proposalPath));
            });
        }
    };
};

export var editDirective = (
    $q : angular.IQService,
    $location : angular.ILocationService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhResourceUrl,
    adhGetBadges : AdhBadge.IGetBadges
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Create.html",
        scope: {
            path: "@"
        },
        link: (scope) => {
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
                heardFrom: {},
                winner: {}
            };

            get($q, adhHttp, adhTopLevelState, adhGetBadges)(scope.path).then((data) => {
                scope.data = data;

                scope.data.partners.hasPartners = scope.data.partners.hasPartners ? "true" : "false";

                if (scope.data.organizationInfo.status === "planned_nonprofit") {
                    scope.data.organizationInfo.registrationDateField = data.organizationInfo.registrationDate.substr(0, 7);
                } else if (scope.data.organizationInfo.status === "registered_nonprofit") {
                    scope.data.organizationInfo.registrationDateField = data.organizationInfo.registrationDate.substr(0, 4);
                }
            });

            scope.submit = () => edit(adhHttp, adhPreliminaryNames)(scope).then(() => {
                $location.url(adhResourceUrl(scope.path));
            });
        }
    };
};

export var moderateDirective = (
    $q : angular.IQService,
    $location : angular.ILocationService,
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhTopLevelState : AdhTopLevelState.Service,
    adhPreliminaryNames : AdhPreliminaryNames.Service,
    adhResourceUrl,
    adhGetBadges : AdhBadge.IGetBadges,
    adhCredentials : AdhCredentials.Service
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Moderate.html",
        scope: {
            path: "@"
        },
        link: (scope) => {
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
                heardFrom: {},
                winner: {}
            };

            get($q, adhHttp, adhTopLevelState, adhGetBadges)(scope.path).then((data) => {
                scope.data = data;
            });

            scope.submit = () => moderate($q, adhHttp, adhPreliminaryNames, adhCredentials)(scope).then(() => {
                $location.url(adhResourceUrl(scope.path));
            });
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
            get($q, adhHttp, adhTopLevelState, adhGetBadges)(scope.path).then((data) => {

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
    adhShowError,
    adhTopLevelState : AdhTopLevelState.Service,
    adhSubmitIfValid,
    adhResourceUrl,
    adhUploadImage,
    flowFactory,
    $translate
) => {
    $translate.use("en");

    $scope.$flow = flowFactory.create();

    // Fixme: These links are not used currently due to them not working on production/staging
    // See https://github.com/liqd/adhocracy3/issues/2011
    $scope.selection_criteria_link = "http://advocate-europe.eu/en/idea-space/selection-criteria/";
    $scope.financial_plan_link = "http://advocate-europe.eu/de/media/advocate-europe_project-financial-plan.xlsx";

    var topicTotal = () => {
        return _.reduce($scope.data.topic, (result, include, topic : string) => {
            if (include && (topic !== "otherText")) {
                return result + 1;
            } else {
                return result;
            }
        }, 0);
    };

    $scope.topics = topics;

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

    $scope.topicChange = (isChecked) => {
        if ($scope.data.topic) {
            var validity = topicTotal() > 0 && topicTotal() < 3;
            $scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setValidity("enoughTopics", validity);
            $scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setDirty();
        } else {
            $scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setValidity("enoughTopics", false);
            $scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$setDirty();
        }
    };

    var updateCheckBoxGroupValidity = (form, names : string[]) : boolean => {
        var valid =  _.some(names, (name) => form[name].$modelValue);
        _.forOwn(names, (name) => {
            form[name].$setValidity("groupRequired", valid);
        });
        return valid;
    };

    $scope.topicTrString = topicTrString;

    var showCheckboxGroupError = (form, names : string[]) : boolean => {
        var dirty = $scope.mercatorProposalForm.$submitted || _.some(names, (name) => form[name].$dirty);
        return !updateCheckBoxGroupValidity(form, names) && dirty;
    };

    $scope.showTopicsError = () : boolean => {
        return ((topicTotal() < 1) || (topicTotal() > 2)) &&
            ($scope.mercatorProposalForm.mercatorProposalBriefForm["introduction-topics"].$dirty ||
                $scope.mercatorProposalForm.$submitted);
    };

    $scope.showLocationError = () : boolean => {
        return showCheckboxGroupError($scope.mercatorProposalBriefForm, locationCheckboxes);
    };

    $scope.showStatusError = () : boolean => {
        return showCheckboxGroupError($scope.mercatorProposalBriefForm, locationCheckboxes);
    };

    $scope.showFinanceGrantedInfo = () : boolean => {
        return ($scope.data.finance && $scope.data.finance.otherSources && $scope.data.finance.otherSources !== "");
    };

    $scope.showHeardFromError = () : boolean => {
        return showCheckboxGroupError($scope.mercatorProposalCommunityForm, heardFromCheckboxes);
    };

    $scope.dateChange = (date) => {
        // FIXME: this is quite hacky dates need proper validation EG not so much in the past or future too
        if ($scope.data.organizationInfo.status === "planned_nonprofit") {
            $scope.data.organizationInfo.registrationDate = $scope.data.organizationInfo.registrationDateField + "-01";
        } else {
            $scope.data.organizationInfo.registrationDate = $scope.data.organizationInfo.registrationDateField + "-01-01";
        }
    };

    $scope.showError = adhShowError;

    $scope.submitIfValid = () => {
        adhSubmitIfValid($scope, $element, $scope.mercatorProposalForm, () => {
            if ($scope.$flow && $scope.$flow.support && $scope.$flow.files.length > 0) {
                return adhUploadImage(
                    adhTopLevelState.get("processUrl"),
                    $scope.$flow,
                    RIMercatorIntroImage.content_type,
                    SIMercatorIntroImageMetadata.nick
                ).then((imageUrl : string) => {
                    $scope.data.introduction.picture = imageUrl;
                    return $scope.submit();
                });
            } else {
                return $scope.submit();
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
    adhGetBadges : AdhBadge.IGetBadges,
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

            get($q, adhHttp, adhTopLevelState, adhGetBadges)(scope.path).then((data) => {
                scope.data = data;
            });
        }
    };
};
