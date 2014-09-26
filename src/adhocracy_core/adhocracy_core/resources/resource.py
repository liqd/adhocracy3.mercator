"""Basic zodb persistent implementation for IResrouce."""
from persistent import Persistent
from zope.interface import implementer

from adhocracy_core.interfaces import resource_metadata
from adhocracy_core.interfaces import IResource
from adhocracy_core.utils import get_iresource
from adhocracy_core.utils import to_dotted_name


@implementer(IResource)
class Base(Persistent):

    """Persistent and location aware class."""

    __parent__ = None
    __name__ = None

    def __repr__(self):
        interface = get_iresource(self) or self.__class__
        interface_dotted = to_dotted_name(interface)
        oid = getattr(self, '__oid__', None)
        identifier = str(oid)
        return '{0} oid: {1}'.format(interface_dotted, identifier)


resource_metadata_defaults = resource_metadata._replace(
    iresource=IResource,
    content_class=Base,
    permission_add='add',
    permission_view='view',
    after_creation=[],
)
