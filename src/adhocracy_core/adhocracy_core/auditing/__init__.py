"""Log which user modifies resources in additional 'audit' database."""
import transaction
import substanced.util

from pyramid.traversal import resource_path
from pyramid.request import Request
from pyramid.response import Response
from BTrees.OOBTree import OOBTree
from datetime import datetime
from logging import getLogger
from adhocracy_core.sheets.principal import IUserBasic
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import ChangelogMetadata
from adhocracy_core.interfaces import VisibilityChange
from adhocracy_core.interfaces import AuditlogAction
from adhocracy_core.interfaces import AuditlogEntry

logger = getLogger(__name__)


class AuditLog(OOBTree):
    """An Auditlog composed of audit entries.

    This is a dictionary (:class:`collections.abc.Mapping`) with key
    :class:`datetime.datetime` and value
    :class:`adhocracy_core.interfaces.AuditlogEntry`.

    The methods `items`, `keys`, and `values` have the additional kwargs
    `max_key` and `min_key` to allow range queries::

       january = datetime(2015, 1, 1)
       february = datetime(2015, 2, 1)
       audit = get_auditlog(context)
       audit.items(min=january, max=february)
       ...

    """

    def add(self,
            name: AuditlogAction,
            resource_path: str,
            user_name: str,
            user_path: str) -> None:
        """Add an auditlog entry to the audit log."""
        self[datetime.utcnow()] = AuditlogEntry(name,
                                                resource_path,
                                                user_name,
                                                user_path)


def get_auditlog(context: IResource) -> AuditLog:
    """Return the auditlog."""
    return substanced.util.get_auditlog(context)


def set_auditlog(context: IResource) -> None:
    """Set an auditlog for the context."""
    conn = context._p_jar
    try:
        connection = conn.get_connection('audit')
    except KeyError:
        return
    root = connection.root()
    if 'auditlog' in root:
        return
    auditlog = AuditLog()
    root['auditlog'] = auditlog


def log_auditevent(context: IResource,
                   name: AuditlogAction,
                   user_name: str,
                   user_path: str) -> None:
    """Add an auditlog entry for `context` to the audit database.

    The audit database is created if missing. If the `zodbconn.uri.audit`
    value is not specified in the config, auditing does not happen.
    """
    auditlog = get_auditlog(context)
    path = resource_path(context)
    if auditlog is not None:
        auditlog.add(name, path, user_name, user_path)


def audit_resources_changes_callback(request: Request,
                                     response: Response) -> None:
    """Add auditlog entries to the auditlog when the resources are changed.

    This is a :term:`response- callback` that run after a request has
    finished. To store the audit entry it adds an additional transaction.
    """
    registry = request.registry
    changelog_metadata = registry.changelog.values()
    user_name, user_path = _get_user_info(request)
    for meta in changelog_metadata:
        _log_change(request.context, user_name, user_path, meta)


def _get_user_info(request: Request) -> (str, str):
    user = request.user
    if user is None:  # ease scripting without user and testing
        return ('', '')
    else:
        user_name = request.registry.content.get_sheet_field(user,
                                                             IUserBasic,
                                                             'name')
        user_path = resource_path(user)
        return (user_name, user_path)


def _log_change(context: IResource,
                user_name: str,
                user_path: str,
                change: ChangelogMetadata) -> None:
    data_changed = change.created or change.modified
    visibility_changed = change.visibility in [VisibilityChange.concealed,
                                               VisibilityChange.revealed]
    if data_changed or visibility_changed:
        action_name = _get_entry_name(change),
        log_auditevent(context,
                       action_name,
                       user_name=user_name,
                       user_path=user_path)
        transaction.commit()


def _get_entry_name(change) -> str:
    if change.created:
        return AuditlogAction.created
    elif change.modified:
        return AuditlogAction.modified
    elif change.visibility == VisibilityChange.concealed:
        return AuditlogAction.concealed
    elif change.visibility == VisibilityChange.revealed:
        return AuditlogAction.revealed
    else:
        raise ValueError('Invalid change state', change)
