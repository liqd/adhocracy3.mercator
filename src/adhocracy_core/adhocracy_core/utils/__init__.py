"""Helper functions."""
from collections import namedtuple
from collections.abc import Iterator
from collections.abc import Sequence
from datetime import datetime
from functools import reduce
import copy
import json
import pprint

from pyramid.compat import is_nonstr_iter
from pyramid.request import Request
from pyramid.traversal import find_resource
from substanced.util import get_dotted_name
from substanced.util import acquire
from zope.component import getAdapter
from zope.interface import directlyProvidedBy
from zope.interface import Interface
from zope.interface import providedBy
from zope.interface.interfaces import IInterface
import colander

from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IResourceSheet
from adhocracy_core.interfaces import ISheet


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


def get_sheet(context, isheet: IInterface) -> IResourceSheet:
    """Get sheet adapter for the `isheet` interface.

    :raises zope.component.ComponentLookupError:
        if there is no sheet adapter registered for `isheet`.

    """
    return getAdapter(context, IResourceSheet, name=isheet.__identifier__)


def get_all_sheets(context) -> Iterator:
    """Get the sheet adapters for all ISheet interfaces of `context`.

    :returns: generator of :class:`adhocracy_core.interfaces.IResourceSheet`
              objects
    :raises zope.component.ComponentLookupError:

    """
    isheets = get_isheets(context)
    for isheet in isheets:
        yield(get_sheet(context, isheet))


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


_named_object = namedtuple('NamedObject', ['name'])
"""An object that has a name (and nothing else)."""


def raise_colander_style_error(sheet: Interface, field_name: str,
                               description: str):
    """Raise a Colander Invalid error without requiring a node object.

    :param sheet: the error will be located within this sheet
    :param field_name: the error will be located within this field in the sheet
    :param description: the description of the error
    :raises colander.Invalid: constructed from the given parameters
    """
    name = 'data.{}.{}'.format(sheet.__identifier__, field_name)
    raise colander.Invalid(_named_object(name), description)


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
    """"Return resource object of the authenticated user.

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
