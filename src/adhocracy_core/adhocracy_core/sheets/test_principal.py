import colander
from pyramid import testing
from pytest import raises
from pytest import fixture


class TestPasswordSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.principal import password_metadata
        return password_metadata

    def test_create(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_core.sheets.principal import IPasswordAuthentication
        from adhocracy_core.sheets.principal import PasswordAuthenticationSheet
        from adhocracy_core.sheets.principal import PasswordAuthenticationSchema
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, PasswordAuthenticationSheet)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IPasswordAuthentication
        assert inst.meta.schema_class == PasswordAuthenticationSchema
        assert inst.meta.permission_create == 'create_sheet_password'

    def test_set_password(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.set({'password': 'test'})
        assert len(inst.context.password) == 60

    def test_reset_password(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.set({'password': 'test'})
        password_old = inst.context.password
        inst.set({'password': 'test'})
        password_new = inst.context.password
        assert password_new != password_old

    def test_set_empty_password(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.set({'password': ''})
        assert not hasattr(inst.context, 'password')

    def test_get_password(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.context.password = 'test'
        assert inst.get()['password'] == 'test'

    def test_get_empty_password(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get()['password'] == ''

    def test_check_password_valid(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.set({'password': 'test'})
        assert inst.check_plaintext_password('test')

    def test_check_password_not_valid(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.set({'password': 'test'})
        assert not inst.check_plaintext_password('wrong')

    def test_check_password_is_to_long(self, meta, context):
        inst = meta.sheet_class(meta, context)
        password = 'x' * 40026
        with raises(ValueError):
            inst.check_plaintext_password(password)


def test_includeme_register_password_sheet(config):
    from adhocracy_core.sheets.principal import IPasswordAuthentication
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.principal')
    context = testing.DummyResource(__provides__=IPasswordAuthentication)
    assert get_sheet(context, IPasswordAuthentication)


class TestUserBasicSchemaSchema:

    def make_one(self):
        from adhocracy_core.sheets.principal import UserBasicSchema
        return UserBasicSchema()

    def test_deserialize_all(self):
        inst = self.make_one()
        cstruct = {'email': 'test@test.de',
                   'name': 'login',
                   'tzname': 'Europe/Berlin'}
        assert inst.deserialize(cstruct) == cstruct

    def test_deserialize_name_missing(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({})

    def test_deserialize_name_empty(self):
        inst = self.make_one()
        with raises(colander.Invalid):
            inst.deserialize({'name': ''})

    def test_deserialize_name(self):
        inst = self.make_one()
        assert inst.deserialize({'name': 'login'}) == {'name': 'login'}

    def test_name_has_deferred_validator(self):
        inst = self.make_one()
        assert isinstance(inst['name'].validator, colander.deferred)

    def test_email_has_deferred_validator(self):
        inst = self.make_one()
        assert isinstance(inst['email'].validator, colander.deferred)


class TestDeferredValidateUserName:

    @fixture
    def requestp(self, registry):
        return testing.DummyRequest(root=testing.DummyResource(),
                                    registry=registry)

    def _call_fut(self, node, kw):
        from adhocracy_core.sheets.principal import deferred_validate_user_name
        return deferred_validate_user_name(node, kw)

    def test_name_is_empty_and_no_request_kw(self, node, mock_user_locator):
        mock_user_locator.get_user_by_login.return_value = None
        assert self._call_fut(node, {}) is None

    def test_name_is_empty(self, node, requestp, mock_user_locator):
        mock_user_locator.get_user_by_login.return_value = None
        validator = self._call_fut(node, {'request': requestp})
        assert validator(node, '') is None

    def test_name_is_unique(self, node, requestp, mock_user_locator):
        mock_user_locator.get_user_by_login.return_value = None
        validator = self._call_fut(node, {'request': requestp})
        assert validator(node, 'unique') is None

    def test_name_is_not_unique(self, node, requestp, mock_user_locator):
        mock_user_locator.get_user_by_login.return_value = object()
        validator = self._call_fut(node, {'request': requestp})
        with raises(colander.Invalid):
            validator(node, 'not unique')


class TestDeferredValidateUserEmail:

    @fixture
    def request(self, registry):
        return testing.DummyRequest(root=testing.DummyResource(),
                                    registry=registry)

    def _call_fut(self, node, kw):
        from adhocracy_core.sheets.principal import deferred_validate_user_email
        return deferred_validate_user_email(node, kw)

    def test_email_is_empty(self, node, request, mock_user_locator):
        mock_user_locator.get_user_by_email.return_value = None
        validator = self._call_fut(node, {'request': request})
        with raises(colander.Invalid):
            validator(node, '') is None

    def test_email_is_wrong(self, node, request, mock_user_locator):
        validator = self._call_fut(node, {'request': request})
        with raises(colander.Invalid):
             validator(node, 'wrong_email') is None

    def test_email_is_unique(self, node, request, mock_user_locator):
        mock_user_locator.get_user_by_email.return_value = None
        validator = self._call_fut(node, {'request': request})
        assert validator(node, 'test@test.de') is None

    def test_email_is_not_unique(self, node, request, mock_user_locator):
        mock_user_locator.get_user_by_email.return_value = object()
        validator = self._call_fut(node, {'request': request})
        with raises(colander.Invalid):
            validator(node, 'not unique')


class TestUserBasicSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.principal import userbasic_metadata
        return userbasic_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.principal import IUserBasic
        from adhocracy_core.sheets.principal import UserBasicSchema
        from adhocracy_core.sheets import GenericResourceSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, GenericResourceSheet)
        assert inst.meta.isheet == IUserBasic
        assert inst.meta.schema_class == UserBasicSchema
        assert inst.meta.permission_create == 'create_sheet_userbasic'

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'name': '',
                              'email': '',
                              'tzname': 'UTC',
                              }


def test_includeme_register_userbasic_sheet(config):
    from adhocracy_core.sheets.principal import IUserBasic
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.principal')
    context = testing.DummyResource(__provides__=IUserBasic)
    assert get_sheet(context, IUserBasic)


class TestPermissionsSchemaSchema:

    @fixture
    def context(self, context):
        context.roles = []
        return context

    @fixture
    def request(self, context, registry):
        request = testing.DummyRequest()
        request.registry = registry
        request.root = context
        return request

    @fixture
    def group(self, context):
        group = testing.DummyResource()
        group.roles = []
        context['group'] = group
        return group

    @fixture
    def permissions_sheet(self, context, registry, mock_sheet):
        import copy
        from adhocracy_core.sheets.principal import IPermissions
        from adhocracy_core.testing import add_and_register_sheet
        mock_sheet = copy.deepcopy(mock_sheet)
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IPermissions)
        add_and_register_sheet(context, mock_sheet, registry)
        return mock_sheet

    def make_one(self):
        from adhocracy_core.sheets.principal import PermissionsSchema
        return PermissionsSchema()

    def test_deserialize_empty(self):
        inst = self.make_one()
        assert inst.deserialize({}) == {'groups': []}

    def test_serialize_empty(self):
        inst = self.make_one().bind()
        assert inst.serialize({}) == {'groups': [],
                                      'roles': [],
                                      'roles_and_group_roles': []}

    def test_serialize_with_groups_and_roles(self, context, group, request):
        context.roles = ['view']
        context.group_ids = ['/group']
        group.roles = ['admin']
        appstruct = {'groups': [group], 'roles': ['view']}
        inst = self.make_one().bind(context=context, request=request)
        assert inst.serialize(appstruct) == \
            {'groups': [request.application_url + '/group/'],
             'roles': ['view'],
             'roles_and_group_roles': ['admin', 'view']}



class TestPermissionsSheet:

    @fixture
    def context(self, context):
        context.roles = []
        context.group_ids = []
        return context

    @fixture
    def meta(self):
        from adhocracy_core.sheets.principal import permissions_metadata
        return permissions_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.principal import IPermissions
        from adhocracy_core.sheets.principal import PermissionsSchema
        from adhocracy_core.sheets.principal import \
            PermissionsAttributeStorageSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, PermissionsAttributeStorageSheet)
        assert inst.meta.isheet == IPermissions
        assert inst.meta.schema_class == PermissionsSchema
        assert inst.meta.permission_create == 'manage_principals'
        assert inst.meta.permission_edit == 'manage_principals'
        assert inst.meta.permission_view == 'view'

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'groups': [],
                              'roles': [],
                              'roles_and_group_roles': [],
                              }

    def test_set_groups(self, meta, context):
        group = testing.DummyResource()
        context['group'] = group
        inst = meta.sheet_class(meta, context)
        inst.set({'groups': [group]})
        assert context.group_ids == ['/group']


def test_includeme_register_permissions_sheet(config):
    from adhocracy_core.sheets.principal import IPermissions
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.principal')
    context = testing.DummyResource(__provides__=IPermissions)
    assert get_sheet(context, IPermissions)


class TestGroupSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.principal import group_metadata
        return group_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.principal import IGroup
        from adhocracy_core.sheets.principal import GroupSchema
        from adhocracy_core.sheets import GenericResourceSheet
        inst = meta.sheet_class(meta, context)
        assert isinstance(inst, GenericResourceSheet)
        assert inst.meta.isheet == IGroup
        assert inst.meta.schema_class == GroupSchema

    def test_get_empty(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'users': [],
                              'roles': [],
                              }


def test_includeme_register_group_sheet(config):
    from adhocracy_core.sheets.principal import IGroup
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.principal')
    context = testing.DummyResource(__provides__=IGroup)
    inst = get_sheet(context, IGroup)
    assert inst.meta.isheet is IGroup