from datetime import datetime
from datetime import timedelta
from pytz import UTC

from pyramid import testing
from pytest import fixture
from pytest import mark
from pytest import raises


class TestUserInfoSheet:

    @fixture
    def meta(self):
        from .mercator2 import userinfo_meta
        return userinfo_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IUserInfo
        from .mercator2 import UserInfoSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IUserInfo
        assert inst.meta.schema_class == UserInfoSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'first_name': '',
                  'last_name': '',
                  }
        assert inst.get() == wanted


class TestOrganizationInfoSheet:

    @fixture
    def meta(self):
        from .mercator2 import organizationinfo_meta
        return organizationinfo_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IOrganizationInfo
        from .mercator2 import OrganizationInfoSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IOrganizationInfo
        assert inst.meta.schema_class == OrganizationInfoSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'name': '',
                  'city': '',
                  'country': '',
                  'help_request': '',
                  'registration_date': None,
                  'website': '',
                  'contact_email': '',
                  'status': 'other',
                  'status_other': '',
                  }
        assert inst.get() == wanted

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestOrganizationInfoSchema:

    @fixture
    def inst(self):
        from .mercator2 import OrganizationInfoSchema
        return OrganizationInfoSchema()

    @fixture
    def cstruct_required(self):
        return {'country': 'DE',
                'name': 'Name',
                'status': 'planned_nonprofit',
                'contact_email': 'anna@example.com',
                'registration_date': '2015-02-18T14:17:24+00:00',
                'city': 'Berlin',
                }

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'status': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
            {'country': 'DE',
             'name': 'Name',
             'status': 'planned_nonprofit',
             'contact_email': 'anna@example.com',
             'registration_date': datetime(2015, 2, 18,
                                           14, 17, 24, 0, tzinfo=UTC),
             'city': 'Berlin',
            }

    def test_deserialize_with_status_other_and_no_description(
            self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['status'] = 'other'
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'status_other':
                                        'Required iff status == other'}

    def test_deserialize_with_status_other(
            self, inst, cstruct_required):
        cstruct = cstruct_required
        cstruct['status'] = 'other'
        cstruct['status_other'] = 'Blabla'
        assert inst.deserialize(cstruct) == \
            {'country': 'DE',
             'name': 'Name',
             'status': 'other',
             'status_other': 'Blabla',
             'contact_email': 'anna@example.com',
             'registration_date': datetime(2015, 2, 18,
                                           14, 17, 24, 0, tzinfo=UTC),
             'city': 'Berlin',
            }

    def test_deserialize_with_status_support_needed(
            self, inst, cstruct_required):
        cstruct = cstruct_required
        cstruct['status'] = 'support_needed'
        cstruct['help_request'] = 'Blabla'
        assert inst.deserialize(cstruct) == \
            {'country': 'DE',
             'name': 'Name',
             'status': 'support_needed',
             'help_request': 'Blabla',
             'contact_email': 'anna@example.com',
             'registration_date': datetime(2015, 2, 18,
                                           14, 17, 24, 0, tzinfo=UTC),
             'city': 'Berlin',
            }

    def test_deserialize_with_status_support_needed_and_no_help_request(
            self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['status'] = 'support_needed'
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'help_request':
                                        'Required iff status == support_needed'}


class TestPitchSchema:

    @fixture
    def inst(self):
        from .mercator2 import PitchSchema
        return PitchSchema()

    @fixture
    def cstruct_required(self):
        return {'pitch': 'something'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'pitch': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == {'pitch': 'something'}


class TestPitchSheet:

    @fixture
    def meta(self):
        from .mercator2 import pitch_meta
        return pitch_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IPitch
        from .mercator2 import PitchSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IPitch
        assert inst.meta.schema_class == PitchSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestPartnersSheet:

    @fixture
    def meta(self):
        from .mercator2 import partners_meta
        return partners_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IPartners
        from .mercator2 import PartnersSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IPartners
        assert inst.meta.schema_class == PartnersSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'partner1_name': '',
                  'partner1_website': '',
                  'partner1_country': '',
                  'partner2_name': '',
                  'partner2_website': '',
                  'partner2_country': '',
                  'partner3_name': '',
                  'partner3_website': '',
                  'partner3_country': '',
                  'other_partners': '',
                  'has_partners': False}
        assert inst.get() == wanted

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestTopicSchema:

    @fixture
    def inst(self):
        from .mercator2 import TopicSchema
        return TopicSchema()

    @fixture
    def cstruct_required(self):
        return {'topic': ['urban_development']}

    def test_serialize_empty(self, inst):
        assert inst.bind().serialize() == {'topic': [],
                                           'topic_other': ''}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'topic': 'Required'}

    def test_deserialize_with_gt_2_topics(self, inst, cstruct_required):
        from colander import Invalid
        cstruct_required['topic'] = ['education', 'migration', 'communities']
        with raises(Invalid) as error:
            inst.deserialize(cstruct_required)
        assert error.value.asdict() == {'topic': 'Longer than maximum length 2'}

    def test_deserialize_with_duplicated_topics(self, inst, cstruct_required):
        from colander import Invalid
        cstruct_required['topic'] = ['migration', 'migration']
        with raises(Invalid) as error:
            inst.deserialize(cstruct_required)
        assert error.value.asdict() == {'topic': 'Duplicates are not allowed'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
            {'topic': ['urban_development']}

    def test_deserialize_with_status_other_and_no_text(
            self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['topic'] = ['other', 'urban_development']
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'topic_other':
                                        'Required if "other" in topic'}


    def test_deserialize_with_status_other(
            self, inst, cstruct_required):
        cstruct = cstruct_required
        cstruct['topic'] = ['other', 'urban_development']
        cstruct['topic_other'] = 'Blabla'
        assert inst.deserialize(cstruct_required) == \
            {'topic': ['other', 'urban_development'],
             'topic_other': 'Blabla'}


class TestTopicSheet:

    @fixture
    def meta(self):
        from .mercator2 import topic_meta
        return topic_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import ITopic
        from .mercator2 import TopicSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == ITopic
        assert inst.meta.schema_class == TopicSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestDurationSchema:

    @fixture
    def inst(self):
        from .mercator2 import DurationSchema
        return DurationSchema()

    @fixture
    def cstruct_required(self):
        return {'duration': '6'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'duration': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == {'duration': 6}


class TestDurationSheet:

    @fixture
    def meta(self):
        from .mercator2 import duration_meta
        return duration_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IDuration
        from .mercator2 import DurationSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IDuration
        assert inst.meta.schema_class == DurationSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestLocationSchema:

    @fixture
    def inst(self):
        from .mercator2 import LocationSchema
        return LocationSchema()

    @fixture
    def cstruct_required(self):
        return {'location': 'Berlin',
                'has_link_to_ruhr': 'false',
                'is_online': 'false',
                'link_to_ruhr': ''
        }

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'has_link_to_ruhr': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
              {'location': 'Berlin',
               'is_online': False,
               'has_link_to_ruhr': False,
               'is_online': False}

    def test_deserialize_with_link_to_ruhr_but_no_text(self,
                                                       inst,
                                                       cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['has_link_to_ruhr'] = True
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'link_to_ruhr':
                                        'Required iff has_link_to_ruhr == True'}

    def test_deserialize_with_link_to_ruhr(self,
                                           inst,
                                           cstruct_required):
        cstruct = cstruct_required
        cstruct['has_link_to_ruhr'] = True
        cstruct['link_to_ruhr'] = 'Blabla'
        assert inst.deserialize(cstruct) == \
            {'has_link_to_ruhr': True,
             'is_online': False,
             'link_to_ruhr': 'Blabla',
             'location': 'Berlin'}


class TestLocationSheet:

    @fixture
    def meta(self):
        from .mercator2 import location_meta
        return location_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import ILocation
        from .mercator2 import LocationSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == ILocation
        assert inst.meta.schema_class == LocationSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestStatusSchema:

    @fixture
    def inst(self):
        from .mercator2 import StatusSchema
        return StatusSchema()

    @fixture
    def cstruct_required(self):
        return {'status': 'other'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'status': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == {'status': 'other'}


class TestStatusSheet:

    @fixture
    def meta(self):
        from .mercator2 import status_meta
        return status_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IStatus
        from .mercator2 import StatusSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IStatus
        assert inst.meta.schema_class == StatusSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestChallengeSchema:

    @fixture
    def inst(self):
        from .mercator2 import ChallengeSchema
        return ChallengeSchema()

    @fixture
    def cstruct_required(self):
        return {'challenge': 'reduce pollution in Europe'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'challenge': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
            {'challenge': 'reduce pollution in Europe'}


class TestChallengeSheet:

    @fixture
    def meta(self):
        from .mercator2 import challenge_meta
        return challenge_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IChallenge
        from .mercator2 import ChallengeSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IChallenge
        assert inst.meta.schema_class == ChallengeSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestGoalSchema:

    @fixture
    def inst(self):
        from .mercator2 import GoalSchema
        return GoalSchema()

    @fixture
    def cstruct_required(self):
        return {'goal': 'free bicycle for everyone'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'goal': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
               {'goal': 'free bicycle for everyone'}


class TestGoalSheet:

    @fixture
    def meta(self):
        from .mercator2 import goal_meta
        return goal_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IGoal
        from .mercator2 import GoalSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IGoal
        assert inst.meta.schema_class == GoalSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestPlanSchema:

    @fixture
    def inst(self):
        from .mercator2 import PlanSchema
        return PlanSchema()

    @fixture
    def cstruct_required(self):
        return {'plan': '3D-printed bicycle'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'plan': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
               {'plan': '3D-printed bicycle'}


class TestPlanSheet:

    @fixture
    def meta(self):
        from .mercator2 import plan_meta
        return plan_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IPlan
        from .mercator2 import PlanSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IPlan
        assert inst.meta.schema_class == PlanSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestTargetSchema:

    @fixture
    def inst(self):
        from .mercator2 import TargetSchema
        return TargetSchema()

    @fixture
    def cstruct_required(self):
        return {'target': 'everyone'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'target': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == {'target': 'everyone'}


class TestTargetSheet:

    @fixture
    def meta(self):
        from .mercator2 import target_meta
        return target_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import ITarget
        from .mercator2 import TargetSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == ITarget
        assert inst.meta.schema_class == TargetSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestTeamSchema:

    @fixture
    def inst(self):
        from .mercator2 import TeamSchema
        return TeamSchema()

    @fixture
    def cstruct_required(self):
        return {'team': 'Ana'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'team': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == {'team': 'Ana'}


class TestTeamSheet:

    @fixture
    def meta(self):
        from .mercator2 import team_meta
        return team_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import ITeam
        from .mercator2 import TeamSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == ITeam
        assert inst.meta.schema_class == TeamSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestExtraInfoSchema:

    @fixture
    def inst(self):
        from .mercator2 import ExtraInfoSchema
        return ExtraInfoSchema()

    @fixture
    def cstruct_required(self):
        return {'extrainfo': 'Was successful in XYZ.'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'extrainfo': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        wanted = cstruct_required
        assert inst.deserialize(cstruct_required) == \
        {'extrainfo': 'Was successful in XYZ.'}


class TestExtraInfoSheet:

    @fixture
    def meta(self):
        from .mercator2 import extrainfo_meta
        return extrainfo_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IExtraInfo
        from .mercator2 import ExtraInfoSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IExtraInfo
        assert inst.meta.schema_class == ExtraInfoSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestConnectionCohesionSchema:

    @fixture
    def inst(self):
        from .mercator2 import ConnectionCohesionSchema
        return ConnectionCohesionSchema()

    @fixture
    def cstruct_required(self):
        return {'connection_cohesion': 'Reducing pollution reduces social problems.'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'connection_cohesion': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
               {'connection_cohesion': 'Reducing pollution reduces social problems.'}


class TestConnectionCohesionSheet:

    @fixture
    def meta(self):
        from .mercator2 import connectioncohesion_meta
        return connectioncohesion_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IConnectionCohesion
        from .mercator2 import ConnectionCohesionSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IConnectionCohesion
        assert inst.meta.schema_class == ConnectionCohesionSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestDifferenceSchema:

    @fixture
    def inst(self):
        from .mercator2 import DifferenceSchema
        return DifferenceSchema()

    @fixture
    def cstruct_required(self):
        return {'difference': 'Designs of bicycles are open-sourced.'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'difference': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
               {'difference': 'Designs of bicycles are open-sourced.'}


class TestDifferenceSheet:

    @fixture
    def meta(self):
        from .mercator2 import difference_meta
        return difference_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IDifference
        from .mercator2 import DifferenceSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IDifference
        assert inst.meta.schema_class == DifferenceSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestPracticalRelevanceSchema:

    @fixture
    def inst(self):
        from .mercator2 import PracticalRelevanceSchema
        return PracticalRelevanceSchema()

    @fixture
    def cstruct_required(self):
        return {'practicalrelevance': 'Designs of bicycles are open-sourced.'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'practicalrelevance': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
               {'practicalrelevance': 'Designs of bicycles are open-sourced.'}


class TestPracticalRelevanceSheet:

    @fixture
    def meta(self):
        from .mercator2 import practicalrelevance_meta
        return practicalrelevance_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IPracticalRelevance
        from .mercator2 import PracticalRelevanceSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IPracticalRelevance
        assert inst.meta.schema_class == PracticalRelevanceSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestFinancialPlanningSchema:

    @fixture
    def inst(self):
        from .mercator2 import FinancialPlanningSchema
        return FinancialPlanningSchema()

    @fixture
    def cstruct_required(self):
        return {'budget': '10000',
                'requested_funding': '500',
                'major_expenses': 'travel'}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == \
            {'budget': 'Required',
             'major_expenses': 'Required',
             'requested_funding': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
            {'budget': 10000,
             'requested_funding': 500,
             'major_expenses': 'travel'}


class TestFinancialPlanningSheet:

    @fixture
    def meta(self):
        from .mercator2 import financialplanning_meta
        return financialplanning_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IFinancialPlanning
        from .mercator2 import FinancialPlanningSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IFinancialPlanning
        assert inst.meta.schema_class == FinancialPlanningSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestExtraFundingSchema:

    @fixture
    def inst(self):
        from .mercator2 import ExtraFundingSchema
        return ExtraFundingSchema()

    @fixture
    def cstruct_required(self):
        return {'other_sources': 'XYZ grant',
                'secured': 'False'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
            {'other_sources': 'XYZ grant',
             'secured': False}


class TestExtraFundingSheet:

    @fixture
    def meta(self):
        from .mercator2 import extra_funding_meta
        return extra_funding_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IExtraFunding
        from .mercator2 import ExtraFundingSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IExtraFunding
        assert inst.meta.schema_class == ExtraFundingSchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestCommunitySchema:

    @fixture
    def inst(self):
        from .mercator2 import CommunitySchema
        return CommunitySchema()

    @fixture
    def cstruct_required(self):
        return {'expected_feedback': 'Nice comments',
                'heard_froms': ['website']}

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == \
            {'heard_froms': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == cstruct_required

    def test_deserialize_with_duplicate_heard_froms(self, inst, cstruct_required):
        from colander import Invalid
        cstruct_required['heard_froms'] = ['website', 'website']
        with raises(Invalid) as error:
            inst.deserialize(cstruct_required)
        assert error.value.asdict() == {'heard_froms': 'Duplicates are not allowed'}

    def test_deserialize_with_heard_from_other_and_no_text(
            self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['heard_froms'] = ['other', 'website']
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'heard_from_other':
                                        'Required if "other" in heard_froms'}

    def test_deserialize_with_heard_from_other(
            self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['heard_froms'] = ['other', 'website']
        cstruct['heard_from_other'] = 'blabla'
        assert inst.deserialize(cstruct) == \
            {'expected_feedback': 'Nice comments',
             'heard_from_other': 'blabla',
             'heard_froms': ['other', 'website']}


class TestCommunitySheet:

    @fixture
    def meta(self):
        from .mercator2 import community_meta
        return community_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import ICommunity
        from .mercator2 import CommunitySchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == ICommunity
        assert inst.meta.schema_class == CommunitySchema

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)


class TestWinnerInfoSchema:

    @fixture
    def inst(self):
        from .mercator2 import WinnerInfoSchema
        return WinnerInfoSchema()

    @fixture
    def cstruct_required(self):
        return {'funding': '10000'}

    def test_deserialize_empty(self, inst):
        cstruct = {}
        assert inst.deserialize(cstruct) == {}

    def test_deserialize_with_required(self, inst, cstruct_required):
        assert inst.deserialize(cstruct_required) == \
            {'funding': 10000}


class TestWinnerInfoSheet:

    @fixture
    def meta(self):
        from .mercator2 import winnerinfo_meta
        return winnerinfo_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from .mercator2 import IWinnerInfo
        from .mercator2 import WinnerInfoSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IWinnerInfo
        assert inst.meta.schema_class == WinnerInfoSchema
        assert inst.meta.permission_view == 'view_mercator2_winnerinfo'
        assert inst.meta.permission_edit == 'edit_mercator2_winnerinfo'

    @mark.usefixtures('integration')
    def test_includeme(self, meta):
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=meta.isheet)
        assert get_sheet(context, meta.isheet)
