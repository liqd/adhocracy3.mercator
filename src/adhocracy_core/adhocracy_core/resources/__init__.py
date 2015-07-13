"""Resource types mapped to sheets (OpenClosePrinciple), object hierarchy."""
import random
import string

from pyramid.path import DottedNameResolver
from pyramid.threadlocal import get_current_registry
from pyramid.config import Configurator
from pyramid.traversal import find_interface
from pyramid.traversal import resource_path
from pyramid.registry import Registry
from substanced.content import add_content_type
from zope.interface import directlyProvides
from zope.interface import alsoProvides
from substanced.interfaces import IRoot

from adhocracy_core.authorization import set_local_roles
from adhocracy_core.interfaces import ResourceMetadata
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IServicePool
from adhocracy_core.events import ResourceCreatedAndAdded
from adhocracy_core.sheets.name import IName
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_modification_date


resource_meta = ResourceMetadata(content_name='',
                                 iresource=None,
                                 content_class=None,
                                 permission_create='',
                                 is_implicit_addable=False,
                                 basic_sheets=[],
                                 extended_sheets=[],
                                 after_creation=[],
                                 use_autonaming=False,
                                 autonaming_prefix='',
                                 use_autonaming_random=False,
                                 element_types=[],
                                 item_type=False,
                                 )


def generate_random_name():
    """Return random name (alpha/num)."""
    length = random.choice(range(40, 60))
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


def add_resource_type_to_registry(metadata: ResourceMetadata,
                                  config: Configurator):
    """Add the `resource` type specified in metadata to the content registry.

    As generic factory the :class:`ResourceFactory` is used.
    `config.registry` must have an `content` attribute with
    :class:`adhocracy_core.registry.ResourceRegistry` to store the metadata.
    """
    assert hasattr(config.registry, 'content')
    resources_meta = config.registry.content.resources_meta
    resources_meta[metadata.iresource] = metadata
    iresource = metadata.iresource
    name = metadata.content_name or iresource.__identifier__
    meta = {'content_name': name}
    add_content_type(config, iresource.__identifier__,
                     ResourceFactory(metadata),
                     factory_type=iresource.__identifier__, **meta)


class ResourceFactory:

    """Basic resource factory."""

    name_identifier = IName.__identifier__

    def __init__(self, metadata: ResourceMetadata):
        self.meta = metadata
        """:class:`ResourceMetadata`."""

    def _add(self, parent: IPool, resource: object, appstructs: dict,
             registry: Registry) -> str:
        """Add resource to parent pool.

        :raises substanced.folder.FolderKeyError:
        :raises ValueError:
        """
        name = ''
        if self.name_identifier in appstructs:
            name = appstructs[self.name_identifier]['name']
        if self.meta.use_autonaming:
            prefix = self.meta.autonaming_prefix
            name = parent.next_name(resource, prefix=prefix)
        elif self.meta.use_autonaming_random:
            name = generate_random_name()
        if name in parent:
            raise KeyError('Duplicate name: {}'.format(name))
        if IServicePool.providedBy(resource):
            name = self.meta.content_name
            parent.add_service(name, resource,
                               send_events=True,
                               registry=registry)
            return
        if name == '':
            raise KeyError('Empty name')
        parent.add(name, resource,
                   send_events=True,
                   registry=registry)

    def _notify_new_resource_created_and_added(self, resource, registry,
                                               creator):
        has_parent = resource.__parent__ is not None
        is_root = IRoot.providedBy(resource)
        if (has_parent or is_root) and registry is not None:
            event = ResourceCreatedAndAdded(object=resource,
                                            parent=resource.__parent__,
                                            registry=registry,
                                            creator=creator)
            registry.notify(event)

    def __call__(self,
                 parent=None,
                 appstructs={},
                 run_after_creation=True,
                 creator=None,
                 registry=None,
                 request=None,
                 send_event=True,
                 **kwargs
                 ):
        """Triggered when a ResourceFactory instance is called.

        Kwargs::

            parent (IPool or None): Add the new resource to this pool.
                                    None value is allowed to create non
                                    persistent Resources (without OID/parent).
                                    Defaults to None.
            appstructs (dict): Key/Values of sheet appstruct data.
                               Key is identifier of a sheet interface.
                               Value is the data to set.
            after_creation (bool): Whether to invoke after_creation hooks,
                                   If parent is None you should set this False
                                   Default is True.
            creator (IResource or None): The resource of the creating user
                                         to set the right metadata.
            registry (Registry or None): Registry passed to creation eventes.
                If None :func:`pyramid.threadlocal.get_current_registry` is
                called. Default is None.
            request (Request or None): passed to
                :class:`adhocracy_core.interfaces.IResourceSheetModified'events
            send_event (bool): send
                :class:`adhocracy_core.interfaces.IResourceCreatedAndAdded`
                event. Default is True.
            **kwargs: Arbitary keyword arguments. Will be passed along with
                       'creator' to the `after_creation` hook as 3rd argument
                      `options`.

        Returns:
            object (IResource): the newly created resource

        Raises:
            KeyError: if self.metadata.use_autonaming is False and the
                      `resource name` is not given or already used in the
                      `parent` pool.
                      You can set the `resource name` with appstruct data
                      for the name sheet (:mod:`adhocracy_core.sheets.name`).
            ComponentLookupError: if `appstructs` contains sheet data
                                  for non existing sheets.
        """
        resource = self.meta.content_class()
        directlyProvides(resource, self.meta.iresource)
        isheets = self.meta.basic_sheets + self.meta.extended_sheets
        alsoProvides(resource, isheets)
        if registry is None:
            registry = get_current_registry()

        if parent is not None:
            self._add(parent, resource, appstructs, registry)
        else:
            resource.__parent__ = None
            resource.__name__ = ''

        for key, struct in appstructs.items():
            isheet = DottedNameResolver().maybe_resolve(key)
            sheet = get_sheet(resource, isheet, registry=registry)
            if sheet.meta.creatable:
                sheet.set(struct,
                          send_event=False,
                          request=request)

        # Fixme: Sideffect. We change here the passed creator because the
        # creator of user resources should always be the created user.
        # A better solution would be to have custom adapter to add
        # resources.
        # To prevent import circles we do not import at module level.
        from adhocracy_core.resources.principal import IUser
        if IUser.providedBy(resource):
            creator = resource

        if creator is not None:
            userid = resource_path(creator)
            set_local_roles(resource, {userid: {'role:creator'}})

        if IMetadata.providedBy(resource):
            metadata = self._get_metadata(resource, creator, registry)
            sheet = get_sheet(resource, IMetadata, registry=registry)
            sheet.set(metadata,
                      send_event=False,
                      request=request,
                      omit_readonly=False)

        if run_after_creation:
            for call in self.meta.after_creation:
                kwargs['creator'] = creator
                call(resource, registry, options=kwargs)

        if send_event:
            self._notify_new_resource_created_and_added(resource,
                                                        registry,
                                                        creator)

        return resource

    def _get_metadata(self, resource: IResource, creator: IResource,
                      registry: Registry) -> dict:
        now = get_modification_date(registry)
        creator = creator if creator is not None else None
        metadata = {'creator': creator,
                    'creation_date': now,
                    'item_creation_date': now,
                    'modified_by': creator,
                    'modification_date': now,
                    }

        item = find_interface(resource, IItem)
        if IItemVersion.providedBy(resource) and item is not None:
            item_sheet = get_sheet(item, IMetadata, registry=registry)
            item_creation_date = item_sheet.get()['creation_date']
            metadata['item_creation_date'] = item_creation_date
        return metadata


def includeme(config):
    """Include resource types and subscribers."""
    config.include('.simple')
    config.include('.item')
    config.include('.itemversion')
    config.include('.asset')
    config.include('.pool')
    config.include('.organisation')
    config.include('.root')
    config.include('.tag')
    config.include('.comment')
    config.include('.external_resource')
    config.include('.principal')
    config.include('.rate')
    config.include('.image')
    config.include('.subscriber')
    config.include('.geo')
    config.include('.process')
    config.include('.proposal')
    config.include('.document')
    config.include('.document_process')
    config.include('.paragraph')
    config.include('.badge')
    config.include('.service')
    config.include('.logbook')
