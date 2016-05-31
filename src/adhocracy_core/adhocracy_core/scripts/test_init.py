from pyramid.traversal import find_resource
from pyramid import testing
from pytest import fixture
from pytest import mark
from pytest import raises
from tempfile import mkstemp
import os
import json
from adhocracy_core.resources.badge import add_badges_service
from adhocracy_core.resources.organisation import IOrganisation
from adhocracy_core.resources.root import IRootPool
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.name import IName
from adhocracy_core.sheets.badge import IBadgeAssignment
from adhocracy_core.resources.badge import IBadge


@fixture
def principals(pool_with_catalogs, registry):
    from adhocracy_core.resources.principal import IPrincipalsService
    context = pool_with_catalogs
    inst = registry.content.create(IPrincipalsService.__identifier__,
                                   parent=context)
    return inst


@mark.usefixtures('integration')
class TestImportResources:

    def test_import_resources(self, registry, log):
        from adhocracy_core.scripts import import_resources

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/",
                 "content_type": "adhocracy_core.resources.organisation.IOrganisation",
                 "data": {"adhocracy_core.sheets.name.IName":
                          {"name": "alt-treptow"}}}
            ]))

        root = registry.content.create(IRootPool.__identifier__)
        import_resources(root, registry, filename)
        assert IOrganisation.providedBy(root['alt-treptow'])
        assert registry.content.get_sheet_field(root['alt-treptow'],
                                                IName,
                                                'name') == 'alt-treptow'


    def test_import_resources_invalid_data(self, registry, log):
        from adhocracy_core.scripts import import_resources
        import colander

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/",
                 "content_type": "adhocracy_core.resources.pool.IPool",
                 "data": {"adhocracy_core.sheets.name.IName":
                          {"name": "NameSample"},
                          "adhocracy_core.sheets.title.ITitle":
                          {"title": 42}
                 }}
            ]))

        root = registry.content.create(IRootPool.__identifier__)
        with raises(colander.Invalid):
            import_resources(root, registry, filename)


    def test_import_resources_already_exists(self, registry, log):
        from adhocracy_core.scripts import import_resources

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/",
                 "content_type": "adhocracy_core.resources.organisation.IOrganisation",
                 "data": {"adhocracy_core.sheets.name.IName":
                          {"name": "alt-treptow"}}}
            ]))

        root = registry.content.create(IRootPool.__identifier__)
        import_resources(root, registry, filename)
        # try readding
        import_resources(root, registry, filename)
        assert IOrganisation.providedBy(root['alt-treptow'])
        assert registry.content.get_sheet_field(root['alt-treptow'],
                                                IName,
                                                'name') == 'alt-treptow'

    def test_import_resources_already_oneleveldeep(self, registry, principals,
                                                   log):
        from adhocracy_core.scripts import import_resources

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/orga",
                 "content_type": "adhocracy_core.resources.organisation.IOrganisation",
                 "data": {"adhocracy_core.sheets.name.IName":
                          {"name": "alt-treptow"}}}
            ]))

        root = registry.content.create(IRootPool.__identifier__)
        appstructs = {'adhocracy_core.sheets.name.IName': {'name': 'orga'}}
        registry.content.create(IOrganisation.__identifier__, root,
                                appstructs=appstructs, registry=registry)

        import_resources(root, registry, filename)
        assert IOrganisation.providedBy(root['orga']['alt-treptow'])

    def test_import_resources_set_creator(self, registry, log):
        from adhocracy_core.scripts import import_resources

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/",
                 "creator": "god",
                 "content_type": "adhocracy_core.resources.organisation.IOrganisation",
                 "data": {"adhocracy_core.sheets.name.IName":
                          {"name": "alt-treptow"}}}
            ]))

        root = registry.content.create(IRootPool.__identifier__)
        import_resources(root, registry, filename)
        assert IOrganisation.providedBy(root['alt-treptow'])
        god = root['principals']['users'].values()[0]
        assert registry.content.get_sheet_field(root['alt-treptow'],
                                                IMetadata,
                                                'creator') == god

    def test_import_resource_create_group(self, registry, log):
        from adhocracy_core.scripts import import_resources

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/principals/groups",
                 "content_type": "adhocracy_core.resources.principal.IGroup",
                 "data": {"adhocracy_core.sheets.name.IName":
                          {"name": "moderators-abc"},
                          "adhocracy_core.sheets.principal.IGroup":
                          {"roles": ["creator", "initiator"]}
                 }
                }

            ]))
        root = registry.content.create(IRootPool.__identifier__)
        import_resources(root, registry, filename)

    def test_get_expected_path(self, log):
        from adhocracy_core.scripts import _get_expected_path

        resource_info = {"path": "/",
                         "data": {"adhocracy_core.sheets.name.IName":
                                  {"name": "alt-treptow"}}}
        assert _get_expected_path(resource_info) == '/alt-treptow'

    def test_get_expected_path_no_name_noname(self, log):
        from adhocracy_core.scripts import _get_expected_path

        resource_info = {"path": "/",
                         "data": {}}
        assert _get_expected_path(resource_info) == ''

    def test_username_is_resolved_to_his_path(self, registry):
        from adhocracy_core.scripts import import_resources
        from .import_users import _get_user_locator

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/principals/users/badge_assignments",
                 "content_type": "adhocracy_core.resources.badge.IBadgeAssignment",
                 "data": {"adhocracy_core.sheets.badge.IBadgeAssignment":
                          {"subject": "user_by_login:god",
                           "badge": "/orga/badges/badge0",
                           "object": "/principals/users/0000000"
                          },
                          "adhocracy_core.sheets.name.IName": {"name": "assign0"}}
                }]))

        root = registry.content.create(IRootPool.__identifier__)
        appstructs = {'adhocracy_core.sheets.name.IName': {'name': 'orga'}}
        orga = registry.content.create(IOrganisation.__identifier__, root,
                                appstructs=appstructs, registry=registry)
        add_badges_service(orga, registry, {})
        badge_appstructs = {'adhocracy_core.sheets.name.IName': {'name': 'badge0'}}
        registry.content.create(IBadge.__identifier__,
                                orga['badges'],
                                appstructs=badge_appstructs,
                                registry=registry)
        import_resources(root, registry, filename)
        assignments = find_resource(root, '/principals/users/badge_assignments/')
        assignment = list(assignments.values())[0]
        subject = registry.content.get_sheet_field(assignment,
                                                   IBadgeAssignment,
                                                   'subject')
        user_locator = _get_user_locator(root, registry)
        god = user_locator.get_user_by_login('god')
        assert subject == god

    def test_raise_when_resolving_non_existing_user(self, registry):
        from adhocracy_core.scripts import import_resources

        (self._tempfd, filename) = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/principals/users/badge_assignments",
                 "content_type": "adhocracy_core.resources.badge.IBadgeAssignment",
                 "data": {"adhocracy_core.sheets.badge.IBadgeAssignment":
                          {"subject": "user_by_login:Malkovitch",
                           "badge": "/orga/badges/badge0",
                           "object": "/principals/users/0000000"
                          },
                          "adhocracy_core.sheets.name.IName": {"name": "assign0"}}
                }]))

        root = registry.content.create(IRootPool.__identifier__)
        appstructs = {'adhocracy_core.sheets.name.IName': {'name': 'orga'}}
        orga = registry.content.create(IOrganisation.__identifier__, root,
                                appstructs=appstructs, registry=registry)
        add_badges_service(orga, registry, {})
        badge_appstructs = {'adhocracy_core.sheets.name.IName': {'name': 'badge0'}}
        registry.content.create(IBadge.__identifier__,
                                orga['badges'],
                                appstructs=badge_appstructs,
                                registry=registry)
        with raises(ValueError):
            import_resources(root, registry, filename)

    def teardown_method(self, method):
        if hasattr(self, 'tempfd'):
            os.close(self._tempfd)


class TestImportLocalRoles:

    def call_fut(self, *args):
        from . import import_local_roles
        return import_local_roles(*args)

    @fixture
    def filename(self, tmpdir):
        return str(tmpdir) + '/local_roles.json'

    def test_import_local_roles(self, registry, filename):
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {"path": "/alt-treptow",
                 "roles": {"initiators-treptow-koepenick": ["role:initiator"]}}
            ]))
        root = testing.DummyResource()
        root['alt-treptow'] = testing.DummyResource(__parent__=root)

        self.call_fut(root, registry, filename)

        assert root['alt-treptow'].__local_roles__ == \
            {'initiators-treptow-koepenick': set(['role:initiator'])}


def test_append_cvs_field():
    from . import append_cvs_field
    result = []
    append_cvs_field(result, 'content;')
    assert result == ['content']

def test_get_sheet_field_for_partial(context, registry, mocker):
    from adhocracy_core.interfaces import ISheet
    from . import get_sheet_field_for_partial
    registry.content = mocker.Mock()
    assert get_sheet_field_for_partial(ISheet, 'field', context) ==\
           registry.content.get_sheet_field.return_value
    registry.content.get_sheet_field.assert_called_with(context, ISheet,
                                                        'field')


@mark.usefixtures('integration')
class TestImportFixture:

    def call_fut(self, *args, **kwargs):
        from . import import_fixture
        return import_fixture(*args, **kwargs)

    @fixture
    def asset(self, tmpdir) -> str:
        """Asset specification, package or absolute path."""
        return str(tmpdir)

    def create_import_file(self, asset: str, import_type: str,
                           data=None) -> str:
        os.mkdir(asset + '/' + import_type)
        import_file = asset + '/' + import_type + '/file.json'
        with open(import_file, 'w') as f:
            f.write(data or 'import')
        return import_file

    def test_raise_if_not_directory_package_path(self):
        from adhocracy_core.exceptions import ConfigurationError
        asset_file = 'adhocracy_core:' + 'interfaces.py'
        with raises(ConfigurationError):
            self.call_fut(asset_file, None, None)

    def test_raise_if_not_directory_absolute_path(self, asset):
        from adhocracy_core.exceptions import ConfigurationError
        asset_file = asset + '/file'
        with open(asset_file, 'w') as f:
            f.write('File')
        with raises(ConfigurationError):
            self.call_fut(asset_file, None, None)

    def test_ignore_if_no_subdirs(self, asset):
        assert self.call_fut(asset, None, None) is None

    def test_raise_if_wrong_subdirs(self, asset):
        from adhocracy_core.exceptions import ConfigurationError
        os.mkdir(asset + '/wrong_import_type')
        with raises(ConfigurationError):
            self.call_fut(asset, None, None)

    def test_ignore_if_log_only(self, asset, mocker, context, registry, log):
        import_file = self.create_import_file(asset, 'groups')
        mock = mocker.patch('adhocracy_core.scripts._import_groups')
        self.call_fut(asset, context, registry, log_only=True)
        assert not mock.called

    def test_import_groups(self, asset, mocker, context, registry, log):
        import_file = self.create_import_file(asset, 'groups')
        mock = mocker.patch('adhocracy_core.scripts._import_groups')
        self.call_fut(asset, context, registry)
        mock.assert_called_with(context, registry, import_file)

    def test_import_users(self, asset, mocker, context, registry, log):
        import_file = self.create_import_file(asset, 'users')
        mock = mocker.patch('adhocracy_core.scripts._import_users')
        self.call_fut(asset, context, registry)
        mock.assert_called_with(context, registry, import_file)

    def test_import_local_groups(self, asset, mocker, context, registry, log):
        import_file = self.create_import_file(asset, 'local_roles')
        mock = mocker.patch('adhocracy_core.scripts.import_local_roles')
        self.call_fut(asset, context, registry)
        mock.assert_called_with(context, registry, import_file)

    def test_import_resources(self, asset, mocker, context, registry):
        import_file = self.create_import_file(asset, 'resources')
        mock = mocker.patch('adhocracy_core.scripts.import_resources')
        self.call_fut(asset, context, registry)
        mock.assert_called_with(context, registry, import_file)

    def test_import_workflow_state(self, asset, mocker, context, registry):
        import_data = 'process/proposal:announce->participate'
        self.create_import_file(asset, 'states', import_data)
        mock = mocker.patch('adhocracy_core.scripts._set_workflow_state')
        self.call_fut(asset, context, registry)
        mock.assert_called_with(context, registry, 'process/proposal',
                                ['announce', 'participate'],
                                absolute=True,
                                reset=True)

    def test_ignore_if_empty_workflow_state(
        self, asset, mocker, context, registry):
        os.mkdir(asset + '/' + 'states')
        mock = mocker.patch('adhocracy_core.scripts._set_workflow_state')
        self.call_fut(asset, context, registry)
        assert not mock.called

