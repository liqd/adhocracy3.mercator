import colander
from pyramid import testing
from pytest import mark
from pytest import fixture
from pytest import raises


@fixture()
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.content')
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_mercator.sheets.mercator')


@mark.usefixtures('integration')
class TestIncludeme:

    def test_includeme_register_title_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import ITitle
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=ITitle)
        assert get_sheet(context, ITitle)

    def test_includeme_register_userinfo_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IUserInfo
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IUserInfo)
        assert get_sheet(context, IUserInfo)

    def test_includeme_register_organizationinfo_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IOrganizationInfo
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IOrganizationInfo)
        assert get_sheet(context, IOrganizationInfo)

    def test_includeme_register_introduction_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IIntroduction
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IIntroduction)
        assert get_sheet(context, IIntroduction)

    def test_includeme_register_description_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IDescription
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IDescription)
        assert get_sheet(context, IDescription)

    def test_includeme_register_location_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import ILocation
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=ILocation)
        assert get_sheet(context, ILocation)

    def test_includeme_register_story_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IStory
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IStory)
        assert get_sheet(context, IStory)

    def test_includeme_register_outcome_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IOutcome
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IOutcome)
        assert get_sheet(context, IOutcome)

    def test_includeme_register_steps_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import ISteps
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=ISteps)
        assert get_sheet(context, ISteps)

    def test_includeme_register_value_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IValue
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IValue)
        assert get_sheet(context, IValue)

    def test_includeme_register_finance_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IFinance
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IFinance)
        assert get_sheet(context, IFinance)

    def test_includeme_register_experience_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IExperience
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IExperience)
        assert get_sheet(context, IExperience)

    def test_includeme_register_heardfrom_sheet(self, config):
        from adhocracy_mercator.sheets.mercator import IHeardFrom
        from adhocracy_core.utils import get_sheet
        context = testing.DummyResource(__provides__=IHeardFrom)
        assert get_sheet(context, IHeardFrom)


class TestTitleSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import title_meta
        return title_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import ITitle
        from adhocracy_mercator.sheets.mercator import TitleSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == ITitle
        assert inst.meta.schema_class == TitleSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'title': ''}
        assert inst.get() == wanted


class TestUserInfoSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import userinfo_meta
        return userinfo_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import IUserInfo
        from adhocracy_mercator.sheets.mercator import UserInfoSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IUserInfo
        assert inst.meta.schema_class == UserInfoSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'family_name': '',
                  'personal_name': '',
                  'country': 'DE'}
        assert inst.get() == wanted


class TestOrganizationInfoSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import organizationinfo_meta
        return organizationinfo_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import IOrganizationInfo
        from adhocracy_mercator.sheets.mercator import OrganizationInfoSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IOrganizationInfo
        assert inst.meta.schema_class == OrganizationInfoSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'country': 'DE',
                  'help_request': '',
                  'name': '',
                  'planned_date': None,
                  'status': 'other',
                  'status_other': '',
                  'website': '',
                  }
        assert inst.get() == wanted


class TestOrganizationInfoSchema:

    @fixture
    def inst(self):
        from adhocracy_mercator.sheets.mercator import OrganizationInfoSchema
        return OrganizationInfoSchema()

    @fixture
    def cstruct_required(self):
        return {'country': 'DE',
                'name': 'Name',
                'status': 'planned_nonprofit',
                }

    def test_deserialize_empty(self, inst):
        from colander import Invalid
        cstruct = {}
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'status': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        wanted = cstruct_required   # cstruct and appstruct are the same here
        assert inst.deserialize(cstruct_required) == wanted

    def test_deserialize_with_status_other_and_no_description(
            self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['status'] = 'other'
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'status_other':
                                        'Required iff status == other'}

    def test_deserialize_without_name(self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['status'] = 'planned_nonprofit'
        cstruct['name'] = None
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'name': 'Required iff status != other'}

    def test_deserialize_without_country(self, inst, cstruct_required):
        from colander import Invalid
        cstruct = cstruct_required
        cstruct['status'] = 'planned_nonprofit'
        cstruct['country'] = None
        with raises(Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'country':
                                        'Required iff status != other'}

    def test_deserialize_with_status_and_description(self, inst,
                                                     cstruct_required):
        cstruct = cstruct_required
        cstruct['status'] = 'other'
        cstruct['status_other'] = 'Description'
        wanted = cstruct
        assert inst.deserialize(cstruct_required) == wanted


class TestIntroductionSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import introduction_meta
        return introduction_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import IIntroduction
        from adhocracy_mercator.sheets.mercator import IntroductionSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IIntroduction
        assert inst.meta.schema_class == IntroductionSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'picture': '', 'teaser': ''}
        assert inst.get() == wanted


class TestDescriptionSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import description_meta
        return description_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    @fixture
    def resource(self):
        from adhocracy_mercator.sheets.mercator import IDescription
        return testing.DummyResource(__provides__=IDescription)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import IDescription
        from adhocracy_mercator.sheets.mercator import DescriptionSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IDescription
        assert inst.meta.schema_class == DescriptionSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'description': '',
                  }
        assert inst.get() == wanted


class TestLocationSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import location_meta
        return location_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    @fixture
    def resource(self):
        from adhocracy_mercator.sheets.mercator import ILocation
        return testing.DummyResource(__provides__=ILocation)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import ILocation
        from adhocracy_mercator.sheets.mercator import LocationSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == ILocation
        assert inst.meta.schema_class == LocationSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'location_is_specific': False,
                  'location_specific_1': '',
                  'location_specific_2': '',
                  'location_specific_3': '',
                  'location_is_linked_to_ruhr': False,
                  'location_is_online': False,
                  }
        assert inst.get() == wanted


def _make_mercator_resource(context, location_appstruct={}, finance_appstruct={}):
    from adhocracy_core.interfaces import IResource
    from adhocracy_mercator.sheets.mercator import IMercatorSubResources
    from adhocracy_mercator.sheets.mercator import ILocation
    from adhocracy_mercator.sheets.mercator import IFinance
    from adhocracy_core.utils import get_sheet
    resource = testing.DummyResource(__provides__=[IResource,
                                                   IMercatorSubResources])
    context['res'] = resource
    sub_resources_sheet = get_sheet(resource, IMercatorSubResources)
    if location_appstruct:
        location_resource = testing.DummyResource(__provides__=[IResource,
                                                               ILocation])
        location_sheet = get_sheet(location_resource, ILocation)
        location_sheet.set(location_appstruct)
        context['location'] = location_resource
        sub_resources_sheet.set({'location': location_resource})
    if finance_appstruct:
        finance_resource = testing.DummyResource(__provides__=[IResource,
                                                               IFinance])
        finance_sheet = get_sheet(finance_resource, IFinance)
        finance_sheet.set(finance_appstruct)
        context['finance'] = finance_resource
        sub_resources_sheet.set({'finance': finance_resource})
    return resource


@mark.usefixtures('integration')
class TestMercatorLocationIndex:

    @fixture
    def context(self, pool_graph):
        return pool_graph

    def test_index_location_default(self, context):
        from adhocracy_mercator.sheets.mercator import index_location
        resource = _make_mercator_resource(context)
        result = index_location(resource, 'default')
        assert result == 'default'

    def test_index_location_is_linked_to_ruhr(self, context):
        from adhocracy_mercator.sheets.mercator import index_location
        resource = _make_mercator_resource(
            context,
            location_appstruct={'location_is_linked_to_ruhr': True})
        result = index_location(resource, 'default')
        assert result == ['linked_to_ruhr']

    def test_index_location_is_online_and_linked_to_ruhr(self, context):
        from adhocracy_mercator.sheets.mercator import index_location
        resource = _make_mercator_resource(
            context,
            location_appstruct={'location_is_online': True,
                               'location_is_linked_to_ruhr': True})
        result = index_location(resource, 'default')
        assert set(result) == set(['online', 'linked_to_ruhr'])


@mark.usefixtures('integration')
class TestMercatorRequestedFundingIndex:

    @fixture
    def context(self, pool_graph):
        return pool_graph

    def test_index_requested_funding_default(self, context):
        from adhocracy_mercator.sheets.mercator import index_requested_funding
        resource = _make_mercator_resource(context)
        result = index_requested_funding(resource, 'default')
        assert result == 'default'

    def test_index_requested_funding_lte_5000(self, context):
        from adhocracy_mercator.sheets.mercator import index_requested_funding
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'requested_funding': 5000})
        result = index_requested_funding(resource, 'default')
        assert result == ['5000']

    def test_index_requested_funding_lte_10000(self, context):
        from adhocracy_mercator.sheets.mercator import index_requested_funding
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'requested_funding': 10000})
        result = index_requested_funding(resource, 'default')
        assert result == ['10000']

    def test_index_requested_funding_lte_20000(self, context):
        from adhocracy_mercator.sheets.mercator import index_requested_funding
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'requested_funding': 20000})
        result = index_requested_funding(resource, 'default')
        assert result == ['20000']

    def test_index_requested_funding_lte_50000(self, context):
        from adhocracy_mercator.sheets.mercator import index_requested_funding
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'requested_funding': 50000})
        result = index_requested_funding(resource, 'default')
        assert result == ['50000']

    def test_index_requested_funding_gt_50000(self, context):
        from adhocracy_mercator.sheets.mercator import index_requested_funding
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'requested_funding': 50001})
        result = index_requested_funding(resource, 'default')
        assert result == 'default'


@mark.usefixtures('integration')
class TestMercatorBudgetIndex:

    @fixture
    def context(self, pool_graph):
        return pool_graph

    def test_index_budget_default(self, context):
        from adhocracy_mercator.sheets.mercator import index_budget
        resource = _make_mercator_resource(context)
        result = index_budget(resource, 'default')
        assert result == 'default'

    def test_index_budget_lte_5000(self, context):
        from adhocracy_mercator.sheets.mercator import index_budget
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'budget': 5000})
        result = index_budget(resource, 'default')
        assert result == ['5000']

    def test_index_budget_lte_10000(self, context):
        from adhocracy_mercator.sheets.mercator import index_budget
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'budget': 10000})
        result = index_budget(resource, 'default')
        assert result == ['10000']

    def test_index_budget_lte_20000(self, context):
        from adhocracy_mercator.sheets.mercator import index_budget
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'budget': 20000})
        result = index_budget(resource, 'default')
        assert result == ['20000']

    def test_index_budget_lte_50000(self, context):
        from adhocracy_mercator.sheets.mercator import index_budget
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'budget': 50000})
        result = index_budget(resource, 'default')
        assert result == ['50000']

    def test_index_budget_gt_50000(self, context):
        from adhocracy_mercator.sheets.mercator import index_budget
        resource = _make_mercator_resource(
            context,
            finance_appstruct={'budget': 50001})
        result = index_budget(resource, 'default')
        assert result == ['above_50000']


class TestOutcomeSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import outcome_meta
        return outcome_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import IOutcome
        from adhocracy_mercator.sheets.mercator import OutcomeSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IOutcome
        assert inst.meta.schema_class == OutcomeSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'outcome': ''}
        assert inst.get() == wanted


class TestFinanceSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import finance_meta
        return finance_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import IFinance
        from adhocracy_mercator.sheets.mercator import FinanceSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IFinance
        assert inst.meta.schema_class == FinanceSchema

    def test_get_empty(self, meta, context):
        from decimal import Decimal
        inst = meta.sheet_class(meta, context)
        wanted = {'budget': Decimal(0),
                  'granted': False,
                  'other_sources': '',
                  'requested_funding': Decimal(0)}
        assert inst.get() == wanted


class TestFinanceSchema:

    @fixture
    def inst(self):
        from adhocracy_mercator.sheets.mercator import FinanceSchema
        return FinanceSchema()

    @fixture
    def cstruct_required(self):
        return {'requested_funding': '500',
                'budget': '100.00',
                }

    def test_deserialize_empty(self, inst):
        cstruct = {}
        with raises(colander.Invalid) as error:
            inst.deserialize(cstruct)
        assert error.value.asdict() == {'requested_funding': 'Required',
                                        'budget': 'Required'}

    def test_deserialize_with_required(self, inst, cstruct_required):
        from decimal import Decimal
        wanted = {'requested_funding': Decimal(500),
                  'budget': Decimal(100),
                  'granted': False,
                  }
        assert inst.deserialize(cstruct_required) == wanted

    def test_deserialize_requested_funding_field_lt_0(
            self, inst, cstruct_required):
        cstruct_required['requested_funding'] = '-1'
        with raises(colander.Invalid):
            inst.deserialize(cstruct_required)

    def test_deserialize_requested_funding_field_gte_0(
            self, inst, cstruct_required):
        from decimal import Decimal
        cstruct_required['requested_funding'] = '0.00'
        result = inst.deserialize(cstruct_required)
        assert result['requested_funding'] == Decimal(0)

    def test_deserialize_requested_funding_field_gt_50000(
            self, inst, cstruct_required):
        cstruct_required['requested_funding'] = '500000.01'
        with raises(colander.Invalid):
            inst.deserialize(cstruct_required)


class TestExperienceSheet:

    @fixture
    def meta(self):
        from adhocracy_mercator.sheets.mercator import experience_meta
        return experience_meta

    @fixture
    def context(self):
        from adhocracy_core.interfaces import IItem
        return testing.DummyResource(__provides__=IItem)

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_mercator.sheets.mercator import IExperience
        from adhocracy_mercator.sheets.mercator import ExperienceSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IExperience
        assert inst.meta.schema_class == ExperienceSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        wanted = {'experience': '',
                  }
        assert inst.get() == wanted


class TestIntroImageMimeTypeValidator:

    def test_valid(self):
        from adhocracy_mercator.sheets.mercator import _intro_image_mime_type_validator
        assert _intro_image_mime_type_validator('image/jpeg') is True

    def test_invalid(self):
        from adhocracy_mercator.sheets.mercator import _intro_image_mime_type_validator
        assert _intro_image_mime_type_validator('text/plain') is False

    def test_empty(self):
        from adhocracy_mercator.sheets.mercator import _intro_image_mime_type_validator
        assert _intro_image_mime_type_validator('') is False

