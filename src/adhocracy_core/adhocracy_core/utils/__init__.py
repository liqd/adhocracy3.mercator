"""Helper functions shared between modules."""
from collections import namedtuple
from collections.abc import Iterable
from collections.abc import Sequence
from datetime import datetime
from functools import reduce
from pytz import UTC
import copy
import json
import pprint

from pyramid.compat import is_nonstr_iter
from pyramid.location import lineage
from pyramid.request import Request
from pyramid.registry import Registry
from pyramid.traversal import find_resource
from pyramid.traversal import find_interface
from pyramid.traversal import resource_path
from pyramid.threadlocal import get_current_registry
from substanced.util import acquire
from substanced.util import find_catalog
from substanced.util import get_dotted_name
from zope.interface import directlyProvidedBy
from zope.interface import Interface
from zope.interface import providedBy
from zope.interface.interfaces import IInterface
import colander

from adhocracy_core.interfaces import ChangelogMetadata
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IResourceSheet
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import VisibilityChange
from adhocracy_core.interfaces import IResourceSheetModified


def append_if_not_none(lst: list, element: object):
    """Append `element` to `lst`, unless `element` is None."""
    if element is not None:
        lst.append(element)


def find_graph(context) -> object:
    """Get the Graph object in the lineage of `context` or None.

    :rtype: :class:`adhocracy_core.graph.Graph`

    """
    return acquire(context, '__graph__', None)


def get_iresource(context) -> IInterface:
    """Get the :class:`adhocracy_core.interfaces.IResource` of `context`.

    :return: :class:`IInterface` or None to ease testing

    """
    ifaces = list(directlyProvidedBy(context))
    iresources = [i for i in ifaces if i.isOrExtends(IResource)]
    return iresources[0] if iresources else None


def get_isheets(context) -> [IInterface]:
    """Get the :class:`adhocracy_core.interfaces.ISheet` interfaces."""
    ifaces = list(providedBy(context))
    return [i for i in ifaces if i.isOrExtends(ISheet)]


def get_matching_isheet(context, isheet: IInterface) -> IInterface:
    """
    Get `isheet` or a subclass of it if `context` provides it.

    If `context` provides neither `isheet` nor any of its subclasses, None
    is returned.
    """
    ifaces = list(providedBy(context))
    for iface in ifaces:
        if iface.isOrExtends(isheet):
            return iface
    return None


def get_sheet(context, isheet: IInterface, registry: Registry=None)\
        -> IResourceSheet:
    """Get sheet adapter for the `isheet` interface.

    :raises adhocracy_core.exceptions.RuntimeConfigurationError:
        if there is no `isheet` sheet registered for context.

    """
    if registry is None:
        registry = get_current_registry(context)
    return registry.content.get_sheet(context, isheet)


def get_all_taggedvalues(iface: IInterface) -> dict:
    """Get dict with all own and all inherited taggedvalues."""
    iro = [i for i in iface.__iro__]
    iro.reverse()
    taggedvalues = {}
    for i in iro:
        for key in i.getTaggedValueTags():
            taggedvalues[key] = i.getTaggedValue(key)
    return taggedvalues


def diff_dict(old_dict, new_dict, omit=()):
    """Calculate changed keys of two dictionaries.

    Return tuple of (added, changed, removed) keys between old_dict and
    new_dict.

    """
    old = old_dict.keys() - set(omit)
    new = new_dict.keys() - set(omit)

    added = new - old
    removed = old - new

    common = old & new
    changed = set([key for key in common if old_dict[key] != new_dict[key]])

    return (added, changed, removed)


def _sort_dict(d, sort_paths):  # pragma: no cover
    """Return sorted dictionary."""
    d2 = copy.deepcopy(d)
    for path in sort_paths:
        base = reduce(lambda d, seg: d[seg], path[:-1], d2)
        base[path[-1]] = sorted(base[path[-1]])
    return d2


def log_compatible_datetime(dt: datetime=datetime.now()):
    """Format a datetime in the same way as the logging framework.

    Mimics the output of the '%(asctime)' placeholder.
    """
    return '{}-{:02}-{:02} {:02}:{:02}:{:02},{:03}'.format(
        dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second,
        dt.microsecond // 1000)


def pprint_json(json_dict):  # pragma: no cover
    """Return sorted string representation of the dict.

    WARN: Not used and not tested.

    """
    json_dict_sorted = _sort_dict(json_dict)
    py_dict = json.dumps(json_dict_sorted, sort_keys=True,
                         indent=4, separators=(',', ': '))
    pprint.pprint(py_dict)


def strip_optional_prefix(s, prefix):
    """Strip an optional prefix from a string.

    Args:
      s (str): the string to process
      prefix (str): the prefix to strip from the string, if present

    Returns:
      str: `s` stripped of the `prefix`

      If `s` doesn't start with `prefix`, it is returned unchanged.

    """
    if s.startswith(prefix):
        return s[len(prefix):]
    else:
        return s


def to_dotted_name(context) -> str:
    """Get the dotted name of `context`.

    :returns:
        The dotted name of `context`, if it's a type.  If `context` is a string
        it is returned as is (since we suppose that it already
        represents a type name).

    """
    if isinstance(context, str):
        return context
    else:
        return get_dotted_name(context)


named_object = namedtuple('NamedObject', ['name'])
"""An object that has a name (and nothing else)."""


def raise_colander_style_error(sheet: Interface, field_name: str,
                               description: str):
    """Raise a Colander Invalid error without requiring a node object.

    :param sheet: the error will be located within this sheet; set to `None`
        to create a error outside of the "data" element, e.g. in a query string
    :param field_name: the error will be located within this field in the sheet
    :param description: the description of the error
    :raises colander.Invalid: constructed from the given parameters

    NOTE: You should always prefer to use the colander schemas to validate
    request data.
    """
    if sheet is not None:
        name = 'data.{}.{}'.format(sheet.__identifier__, field_name)
    else:
        name = field_name
    raise colander.Invalid(named_object(name), description)


def remove_keys_from_dict(dictionary: dict, keys_to_remove=()) -> dict:
    """Remove keys from `dictionary`.

    :param keys_to_remove: Tuple with keys or one key

    """
    if not is_nonstr_iter(keys_to_remove):
        keys_to_remove = (keys_to_remove,)
    dictionary_copy = {}
    for key, value in dictionary.items():
        if key not in keys_to_remove:
            dictionary_copy[key] = value
    return dictionary_copy


def exception_to_str(err: Exception):
    """Convert an exception to a string.

    :param err: the exception
    :return: "{type}: {str}", where {type} is the class name of the exception
              and {str} is the result of calling `str(err)`; or just "{type}"
              if {str} is empty
    """
    name = err.__class__.__name__
    desc = str(err)
    if desc:
        return '{}: {}'.format(name, desc)
    else:
        return name


def get_user(request: Request) -> object:
    """Return resource object of the authenticated user.

    This requires that :func:`pyramid.request.Request.authenticated_userid`
    returns a resource path.
    """
    user_path = request.authenticated_userid
    try:
        return find_resource(request.root, str(user_path))
    except KeyError:
        return None


def normalize_to_tuple(context) -> tuple:
    """Convert `context` to :class:`tuple`."""
    if isinstance(context, tuple):
        return context
    elif isinstance(context, str):
        return context,
    elif isinstance(context, Sequence):
        return tuple(context)
    else:
        return context,


def nested_dict_set(d: dict, keys: list, value: object):
    """
    Set a nested key in a dictionary.

    The following two expressions are equivalent, if ``d['key']['subkey']``
    already exists::

        nested_dict_set(d, ['key', 'subkey', 'subsubkey'], value)
        d['key']['subkey']['subsubkey'] = value

    If parent elements such as ``d['key']['subkey']`` or ``d['key']`` don't
    yet exist, this function will initialize them as dictionaries.
    """
    for key in keys[:-1]:
        d = d.setdefault(key, {})
    d[keys[-1]] = value


def get_sheet_field(resource, isheet: ISheet, field_name: str,
                    registry: Registry=None) -> object:
    """Return value of `isheet` field `field_name` for `resource`.

    :raise KeyError: if `field_name` does not exists for `isheet` sheets.
    :raise zope.component.ComponentLookupError: if there is no sheet adapter
                                               registered for `isheet`.
    """
    sheet = get_sheet(resource, isheet, registry=registry)
    field = sheet.get()[field_name]
    return field


def unflatten_multipart_request(request: Request) -> dict:
    """Convert a multipart/form-data request into the usual dict structure."""
    result = {}
    for key, value in request.POST.items():
        keyparts = key.split(':')
        nested_dict_set(result, keyparts, value)
    return result


def get_last_version(resource: IItemVersion,
                     registry: Registry) -> IItemVersion:
    """Get last version of  resource' according to the last tag."""
    # FIXME better just add tag backreferences fields to resources
    from adhocracy_core.sheets.tags import ITag  # prevent circle imports
    item = find_interface(resource, IItem)
    if item is None:
        return
    last_tag = item['LAST']
    last_versions = get_sheet_field(last_tag, ITag, 'elements',
                                    registry=registry)
    last_version = last_versions[0]
    return last_version


def get_changelog_metadata(resource, registry) -> ChangelogMetadata:
    """Return transaction changelog for `resource`."""
    path = resource_path(resource)
    changelog = registry.changelog[path]
    return changelog


def set_batchmode(request: Request, value=True):
    """Set 'batchmode' marker for the current request.

    This is called by :class:`adhocracy_core.rest.batchview.BatchView`.
    Other code can check :func:`is_batchmode` to modify behavior.
    """
    request.__is_batchmode__ = value


def is_batchmode(request: Request) -> bool:
    """Get 'batchmode' marker for the current request."""
    return getattr(request, '__is_batchmode__', False)


def get_following_new_version(registry, resource) -> IResource:
    """Return the following version created in this transaction."""
    changelog = get_changelog_metadata(resource, registry)
    if changelog.created:
        new_version = resource
    else:
        new_version = changelog.followed_by
    return new_version


def get_last_new_version(registry, resource) -> IResource:
    """Return last new version created in this transaction."""
    item = find_interface(resource, IItem)
    item_changelog = get_changelog_metadata(item, registry)
    return item_changelog.last_version


def is_deleted(resource: IResource) -> dict:
    """Check whether a resource is deleted.

    This also returns True for descendants of deleted resources, as a positive
    deleted status is inherited.
    """
    for context in lineage(resource):
        if getattr(context, 'deleted', False):
            return True
    return False


def is_hidden(resource: IResource) -> dict:
    """Check whether a resource is hidden.

    This also returns True for descendants of hidden resources, as a positive
    hidden status is inherited.
    """
    for context in lineage(resource):
        if getattr(context, 'hidden', False):
            return True
    return False


def get_reason_if_blocked(resource: IResource) -> str:
    """Check if a resource is blocked and return Reason, None otherwise."""
    reason = None
    if is_deleted(resource):
        reason = 'deleted'
    if is_hidden(resource):
        reason = 'both' if reason else 'hidden'
    return reason


def list_resource_with_descendants(resource: IResource) -> Iterable:
    """List all descendants of a resource, including the resource itself."""
    system_catalog = find_catalog(resource, 'system')
    if system_catalog is None:
        return []  # easier testing
    path_index = system_catalog['path']
    query = path_index.eq(resource_path(resource), include_origin=True)
    return query.execute()


def extract_events_from_changelog_metadata(meta: ChangelogMetadata) -> list:
    """
    Extract the relevant events affecting a resource.

    :param meta: an entry in the transaction changelog
    :return: a list of 0 to 2 events
    """
    events = []
    test_changed_descendants = True

    if (meta.resource is None or
            meta.visibility is VisibilityChange.invisible):
        test_changed_descendants = False
    elif meta.created or meta.visibility is VisibilityChange.revealed:
        events.append('created')
    elif meta.visibility is VisibilityChange.concealed:
        events.append('removed')
        test_changed_descendants = False
    elif get_reason_if_blocked(meta.resource) is not None:
        # hidden resources may still be modified by autoupdates
        # but we don't want to expose them
        test_changed_descendants = False
    elif meta.modified or meta.changed_backrefs:
        events.append('modified')

    if test_changed_descendants and meta.changed_descendants:
        events.append('changed_descendants')
    return events


def get_visibility_change(event: IResourceSheetModified) -> VisibilityChange:
    """Return changed visbility for `event.object`."""
    is_deleted = event.new_appstruct['deleted']
    is_hidden = event.new_appstruct['hidden']
    was_deleted = event.old_appstruct['deleted']
    was_hidden = event.old_appstruct['hidden']
    was_visible = not (was_hidden or was_deleted)
    is_visible = not (is_hidden or is_deleted)
    if was_visible:
        if is_visible:
            return VisibilityChange.visible
        else:
            return VisibilityChange.concealed
    else:
        if is_visible:
            return VisibilityChange.revealed
        else:
            return VisibilityChange.invisible


def get_modification_date(registry: Registry) -> datetime:
    """Get the shared modification date for the current transaction.

    This way every date created in one batch/post request
    can use this as default value.
    The frontend relies on this to ease sorting.
    """
    date = getattr(registry, '__modification_date__', None)
    if date is None:
        date = datetime.utcnow().replace(tzinfo=UTC)
        registry.__modification_date__ = date
    return date
