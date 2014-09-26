""" Events when adding with ItemVersions and Items.

In addition we have the normal substanced events:
https://substanced.readthedocs.org/en/latest/api.html#module-substanced.event

"""
from zope.interface import implementer
from zope.interface import Interface
from zope.interface.interfaces import IInterface

from adhocracy_core.interfaces import IItemVersionNewVersionAdded
from adhocracy_core.interfaces import ISheetReferencedItemHasNewVersion
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.interfaces import IResourceSheetModified
from adhocracy_core.interfaces import ISheet


@implementer(IResourceCreatedAndAdded)
class ResourceCreatedAndAdded:

    """An event type sent when a new IResource is created and added.

    :param object(adhocracy_core.interfaces.IResource):
    :param parent(adhocracy_core.interfaces.IResource):
    :param registry(pyramid.registry.Request):
    :param creator(adhocracy_core.resource.principal.IUser):
    """

    def __init__(self, object, parent, registry, creator):
        self.object = object
        self.parent = parent
        self.registry = registry
        self.creator = creator


@implementer(IResourceSheetModified)
class ResourceSheetModified:

    """An event type sent when a resource sheet is modified.

    :param object(adhocracy_core.interfaces.IResource):
    :param isheet(adhocracy_core.interfaces.IISheet):
    :param registry(pyramid.registry.Request):
    """

    def __init__(self, object, isheet, registry):
        self.object = object
        self.isheet = isheet
        self.registry = registry


@implementer(IItemVersionNewVersionAdded)
class ItemVersionNewVersionAdded:

    """ An event sent when a new IItemVersion is being added.

    :param object(adhocracy_core.interfaces.IItem):
    :param new_version(adhocracy_core.interfaces.IItemVersion):
    :param registry(pyramid.registry.Request):
    :param creator(adhocracy_core.resource.principal.IUser':
    """

    def __init__(self, object, new_version, registry, creator):
        self.object = object
        self.new_version = new_version
        self.registry = registry
        self.creator = creator


@implementer(ISheetReferencedItemHasNewVersion)
class SheetReferencedItemHasNewVersion:

    """ An event type sent when a referenced ItemVersion has a new follower.

    :param object(adhocracy_core.interfaces.IResource):
    :param isheet(adhocracy_core.interfaces.IISheet):
    :param isheet_field(str): field name with updated reference
    :param old_version(adhocracy_core.interfaces.IItemVersion): old referenced
                                                           resource
    :param new_version(adhocracy_core.interfaces.IItemVersion): new referenced
                                                           resource
    :param registry(pyramid.registry.Request):
    :param root_versions(list): IItemVersions not in the subtree of
                                these root resources should ignore
                                this event. Optional.
    :param creator(adhocracy_core.resource.principal.IUser':
    """

    def __init__(self,
                 object,
                 isheet,
                 isheet_field,
                 old_version,
                 new_version,
                 registry,
                 creator,
                 root_versions=[]):
        self.object = object
        self.isheet = isheet
        self.isheet_field = isheet_field
        self.old_version = old_version
        self.new_version = new_version
        self.registry = registry
        self.creator = creator
        self.root_versions = root_versions


class _ISheetPredicate:

    """Subscriber predicate  'isheet' to check event.isheet."""

    def __init__(self, isheet: IInterface, config):
        assert isheet.isOrExtends(ISheet)
        self.isheet = isheet

    def text(self) -> str:
        """Return text representation."""
        return 'isheet = %s' % (self.isheet.__identifier__)

    phash = text

    def __call__(self, event):
        event_isheet = getattr(event, 'isheet', Interface)
        return event_isheet.isOrExtends(self.isheet)


class _InterfacePredicate:

    """Subscriber predicate 'interface' to check interfaces of event.object."""

    def __init__(self, interface: IInterface, config):
        assert interface.isOrExtends(Interface)
        self.interface = interface

    def text(self) -> str:
        """Return text representation."""
        return 'interface = %s' % (self.interface.__identifier__)

    phash = text

    def __call__(self, event):
        return self.interface.providedBy(event.object)


def includeme(config):
    """ register event subscriber predicates 'isheet' and 'interface'."""
    config.include('substanced.event')
    config.add_subscriber_predicate('isheet', _ISheetPredicate)
    config.add_subscriber_predicate('interface', _InterfacePredicate)
