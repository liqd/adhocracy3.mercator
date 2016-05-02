"""Helper functions shared between modules."""
from collections.abc import Iterable
from collections.abc import Sequence
from datetime import datetime
from functools import reduce
from pytz import UTC
import os
import time
import copy
import json
import pprint

from colander import Schema

from pyramid.compat import is_nonstr_iter
from pyramid.location import lineage
from pyramid.request import Request
from pyramid.registry import Registry
from pyramid.traversal import resource_path
from substanced.util import acquire
from substanced.util import find_catalog
from substanced.util import get_dotted_name
from zope.interface import directlyProvidedBy
from zope.interface import providedBy
from zope.interface.interfaces import IInterface

from adhocracy_core.interfaces import ChangelogMetadata
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import VisibilityChange
from adhocracy_core.interfaces import IResourceSheetModified


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


def unflatten_multipart_request(request: Request) -> dict:
    """Convert a multipart/form-data request into the usual dict structure."""
    result = {}
    for key, value in request.POST.items():
        keyparts = key.split(':')
        nested_dict_set(result, keyparts, value)
    return result


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
    if system_catalog is None:  # ease testing
        return []
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
    is_deleted = event.new_appstruct.get('deleted', False)
    is_hidden = event.new_appstruct.get('hidden', False)
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


def now() -> datetime:
    """Return current date time with 'UTC' time zone."""
    date = datetime.utcnow().replace(tzinfo=UTC)
    return date


def get_modification_date(registry: Registry) -> datetime:
    """Get the shared modification date for the current transaction.

    This way every date created in one batch/post request
    can use this as default value.
    The frontend relies on this to ease sorting.
    """
    date = getattr(registry, '__modification_date__', None)
    if date is None:
        date = now()
        registry.__modification_date__ = date
    return date


def create_filename(directory='.', prefix='', suffix='.csv') -> str:
    """Use current time to generate a unique filename.

    :params dir: directory path for the filename.
                 If non existing the directory is created.
    :params prefix: prefix for the generated filename
    :params suffix: type suffix for the generated filename, like 'csv'
    """
    if not os.path.exists(directory):
        os.makedirs(directory)
    time_str = time.strftime('%Y%m%d-%H%M%S')
    name = '{0}-{1}{2}'.format(prefix, time_str, suffix)
    path = os.path.join(directory, name)
    return path


def load_json(filename):
    """Load a json file from the disk."""
    with open(filename, 'r') as f:
        return json.load(f)


def has_annotation_sheet_data(resource: IResource) -> bool:
    """Check if `resource` has no data stored in AnnotationResourceSheets."""
    for attribute in resource.__dict__:
        if attribute.startswith('_sheet_'):
            return True
    else:
        return False


def is_created_in_current_transaction(resource: IResource,
                                      registry: Registry) -> bool:
    """Check if `resource` is created during the current transaction."""
    changelog = get_changelog_metadata(resource, registry)
    return changelog.created


def create_schema(schema_class, context, request, **kwargs) -> Schema:
    """Create `schema` from `schema_class` and add bindings.

    The default bindings are: `context`, `request` , `registry`, `creating`
    (defaults to False). These can be overridden or extended by `**kwargs`.
    """
    bindings = {'request': request,
                'registry': request and getattr(request, 'registry'),
                'context': context,
                'creating': False,
                }
    bindings.update(**kwargs)
    schema = schema_class().bind(**bindings)
    return schema
