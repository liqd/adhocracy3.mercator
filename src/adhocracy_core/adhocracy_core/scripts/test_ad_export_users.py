from copy import deepcopy


from pyramid import testing
from pytest import fixture
from unittest.mock import Mock
from unittest.mock import call

class TestGetUsers:

    @fixture
    def user1(self):
        from adhocracy_core.resources.principal import IUser
        user = testing.DummyResource(__provides__=IUser)
        user.name = "Ana Musterman"
        user.email = "ana@example.org"
        return user

    @fixture
    def context(self, pool, service, user1):
        pool['principals'] = deepcopy(service)
        pool['principals']['users'] = deepcopy(service)
        pool['principals']['users']['0000000'] = user1
        pool['principals']['users']['badges'] = deepcopy(service)
        return pool

    def call_fut(self, root, registry):
        from .ad_export_users import _get_users
        return _get_users(root, registry)

    def test_get_users(self, context, registry, user1):
        mock_locator = Mock()
        registry.getMultiAdapter = mock_locator
        import pdb; pdb.set_trace()
        users = self.call_fut(context, registry)
        assert mock_locator.get_users.called

class TestWriteUsersToCSV:

    @fixture
    def registry(self, registry_with_content, mock_sheet):
        registry = registry_with_content
        registry.content.get_sheet.return_value = mock_sheet
        return registry

    @fixture
    def user1(self):
        from adhocracy_core.resources.principal import IUser
        user = testing.DummyResource(__provides__=IUser)
        user.name = "Ana Musterman"
        user.email = "ana@example.org"
        return user

    def call_fut(self, *args):
        from .ad_export_users import _write_users_to_csv
        return _write_users_to_csv(*args)

    def test_write_users_to_csv(self, registry, mock_sheet, user1):
        writer = Mock()
        mock_sheet.get.return_value = {'creation_date': '2016-01-01'}
        result = self.call_fut([user1], writer, registry)
        calls = [call(['Username', 'Email', 'Creation date']),
                 call([user1.name, user1.email, '2016-01-01'])]
        writer.writerow.assert_has_calls(calls)
