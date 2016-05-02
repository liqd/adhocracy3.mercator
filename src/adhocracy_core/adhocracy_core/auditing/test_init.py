import pytest

from pyramid import testing

from unittest.mock import Mock
from pytest import fixture
from pytest import mark
from adhocracy_core.interfaces import ChangelogMetadata
from adhocracy_core.interfaces import VisibilityChange


@fixture
def integration(integration):
    integration.include('adhocracy_core.changelog')


@fixture
def registry(registry_with_content):
    return registry_with_content


@fixture
def user():
    from adhocracy_core.sheets.principal import IUserBasic
    user = testing.DummyResource(__provides__=IUserBasic,
                                 __name__='user1',
                                 name='god')
    return user


@fixture
def mock_get_user_info(monkeypatch):
    import adhocracy_core.auditing
    mock_get_user_info = Mock(spec=adhocracy_core.auditing)
    mock_get_user_info.return_value = ('god',
                                       '/principals/users/000001')
    monkeypatch.setattr(adhocracy_core.auditing,
                        '_get_user_info',
                        mock_get_user_info)
    return mock_get_user_info


def _get_event_name(index):
    return 'event_{}'.format(index)


def _get_resource_path(index):
    return '/value1_{}'.format(index)


def _get_user_name(index):
    return 'user{}'.format(index)


def _get_user_path(index):
    return '/principals/users/user{}'.format(index)


@fixture
def context(context):
    mocked_conn = Mock()
    mocked_auditconn = Mock()
    mocked_auditconn.root.return_value = {}
    mocked_conn.get_connection.return_value = mocked_auditconn
    context._p_jar = mocked_conn
    return context


def test_set_auditlog_no_audit_connection(context):
    from . import get_auditlog
    from . import set_auditlog

    context._p_jar.get_connection \
        = Mock(name='method', side_effect=KeyError('audit'))

    set_auditlog(context)

    assert get_auditlog(context) is None


def test_audit_resources_changes_callback_empty_changelog(request_, context,
                                                          changelog):
    from . import audit_resources_changes_callback
    from . import get_auditlog
    from . import set_auditlog

    request_.context = context
    request_.registry.changelog = changelog
    set_auditlog(context)
    response = Mock()

    audit_resources_changes_callback(request_, response)

    all_entries = get_auditlog(request_.context).values()
    assert len(all_entries) == 0


def test_audit_resource_changes_callback(request_, context, changelog,
                                         mock_get_user_info):
    from . import audit_resources_changes_callback
    from . import get_auditlog
    from . import set_auditlog

    request_.context = context
    request_.registry.changelog = changelog
    registry.changelog = changelog
    set_auditlog(request_.context)

    changelog['/blublu'] \
        = changelog['/blublu']._replace(resource=testing.DummyResource())
    changelog['/'] = changelog['/']._replace(resource=context, created=True)
    changelog['/blabla'] \
        = changelog['/blabla']._replace(resource=context, modified=True)
    registry.changelog = changelog

    response = Mock()
    audit_resources_changes_callback(request_, response)

    all_entries = get_auditlog(request_.context).values()
    assert len(all_entries) == 2


@mark.usefixtures('integration')
def test_get_user_info(request_, user):
    from pyramid.traversal import resource_path
    from adhocracy_core.auditing import _get_user_info
    request_.user = user

    user_name, user_path = _get_user_info(request_)

    assert user_name == user.name
    assert user_path == resource_path(user)


def test_get_user_info_nouser_in_request(request_):
    from adhocracy_core.auditing import _get_user_info
    request_.user = None

    user_name, user_path = _get_user_info(request_)

    assert user_name == ''
    assert user_path == ''


class TestAuditlog:

    @fixture
    def inst(self):
        from . import AuditLog
        return AuditLog()

    def test_create(self, inst):
        from BTrees.OOBTree import OOBTree
        assert isinstance(inst, OOBTree)

    def test_add(self, inst):
        import datetime
        from adhocracy_core.interfaces import AuditlogEntry
        name = 'created'
        resource_path = '/resource1'
        user_name = 'user1'
        user_path = '/user1'
        inst.add(name, resource_path, user_name, user_path)
        key, value = inst.items()[0]
        assert isinstance(key, datetime.datetime)
        assert isinstance(value, AuditlogEntry)
        assert value.name == name
        assert value.resource_path == resource_path
        assert value.user_name == user_name
        assert value.user_path == user_path


class TestSetAuditlog:

    @fixture
    def mock_auditlog(self, monkeypatch):
        from adhocracy_core import auditing
        mock = Mock(spec=auditing.AuditLog)
        monkeypatch.setattr(auditing, 'AuditLog', mock)
        return mock

    @fixture
    def context_emptyroot(self):
        context = Mock()
        mocked_conn = Mock()
        mocked_auditconn = Mock()
        mocked_auditconn.root.return_value = {}
        mocked_conn.get_connection.return_value = mocked_auditconn
        context._p_jar = mocked_conn
        return context

    @fixture
    def context(self):
        context = Mock()
        mocked_conn = Mock()
        mocked_auditconn = Mock()
        mocked_auditconn.root.return_value = {'auditlog': Mock()}
        mocked_conn.get_connection.return_value = mocked_auditconn
        context._p_jar = mocked_conn
        return context

    def call_fut(self, ctx):
        from . import set_auditlog
        return set_auditlog(ctx)

    def test_set_auditlog_no_previous_auditlog(self,
                                               context_emptyroot,
                                               mock_auditlog):
        from . import set_auditlog
        set_auditlog(context_emptyroot)
        assert mock_auditlog.called is True

    def test_set_auditlog_previous_auditlog(self, context, mock_auditlog):
        from . import set_auditlog
        set_auditlog(context)
        assert mock_auditlog.called is False


def test_get_auditlog(context, monkeypatch):
    from . import get_auditlog
    mock = Mock()
    monkeypatch.setattr('substanced.util.get_auditlog', mock)
    get_auditlog(context)
    assert mock.called


class TestAddAuditEvent:

    @fixture
    def user(self):
        return testing.DummyResource(__name__='user',
                                     name='name')

    @fixture
    def mock_auditlog(self):
        from . import AuditLog
        mock = Mock(spec=AuditLog)
        return mock

    @fixture
    def mock_get_auditlog(self, monkeypatch):
        from adhocracy_core import auditing
        mock = Mock()
        monkeypatch.setattr(auditing, 'get_auditlog', mock)
        return mock

    def call_fut(self, context, name, user_name, user_path):
        from . import log_auditevent
        return log_auditevent(context,
                              name, user_name, user_path)

    def test_ignore_if_no_auditlog(self, context, mock_get_auditlog,
                                   mock_auditlog):
        mock_get_auditlog.return_value = None
        self.call_fut(context, 'created', 'user1', '/user1')
        assert mock_auditlog.add.called is False

    def test_add_if_auditlog(self, context, mock_auditlog,
                             mock_get_auditlog):
        mock_get_auditlog.return_value = mock_auditlog
        self.call_fut(context, 'created', 'user1', '/user1')
        assert mock_auditlog.add.called_with('/',
                                             'created',
                                             '/resource1',
                                             'user1',
                                             '/user1')


class TestGetAuditActionName:

    def call_fut(change):
        from . import _get_entry_name
        return _get_entry_name(change)

    def test_get_entry_name_created(self):
        from . import AuditlogAction
        from . import _get_entry_name
        change = ChangelogMetadata(modified=False,
                                   created=True,
                                   followed_by=None,
                                   resource=None,
                                   last_version=None,
                                   changed_descendants=False,
                                   changed_backrefs=False,
                                   visibility=VisibilityChange.visible)
        assert _get_entry_name(change) is AuditlogAction.created

    def test_get_entry_name_modified(self):
        from . import AuditlogAction
        from . import _get_entry_name
        change = ChangelogMetadata(modified=True,
                                   created=False,
                                   followed_by=None,
                                   resource=None,
                                   last_version=None,
                                   changed_descendants=False,
                                   changed_backrefs=False,
                                   visibility=VisibilityChange.visible)
        assert _get_entry_name(change) is AuditlogAction.modified

    def test_get_entry_name_concealed(self):
        from . import AuditlogAction
        from . import _get_entry_name
        change = ChangelogMetadata(modified=False,
                                   created=False,
                                   followed_by=None,
                                   resource=None,
                                   last_version=None,
                                   changed_descendants=False,
                                   changed_backrefs=False,
                                   visibility=VisibilityChange.concealed)
        assert _get_entry_name(change) is AuditlogAction.concealed

    def test_get_entry_name_revealed(self):
        from . import AuditlogAction
        from . import _get_entry_name
        change = ChangelogMetadata(modified=False,
                                   created=False,
                                   followed_by=None,
                                   resource=None,
                                   last_version=None,
                                   changed_descendants=False,
                                   changed_backrefs=False,
                                   visibility=VisibilityChange.revealed)
        assert _get_entry_name(change) is AuditlogAction.revealed

    def test_get_entry_name_visible(self):
        from . import _get_entry_name
        change = ChangelogMetadata(modified=False,
                                   created=False,
                                   followed_by=None,
                                   resource=None,
                                   last_version=None,
                                   changed_descendants=False,
                                   changed_backrefs=False,
                                   visibility=VisibilityChange.visible)
        with pytest.raises(ValueError):
            _get_entry_name(change)
