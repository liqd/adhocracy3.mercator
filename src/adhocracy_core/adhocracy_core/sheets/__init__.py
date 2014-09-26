"""Adhocracy sheets."""
from persistent.mapping import PersistentMapping
from pyramid.decorator import reify
from pyramid.registry import Registry
from pyramid.threadlocal import get_current_registry
from substanced.property import PropertySheet
from zope.interface import implementer
import colander

from adhocracy_core.utils import find_graph
from adhocracy_core.events import ResourceSheetModified
from adhocracy_core.interfaces import IResourceSheet
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import sheet_metadata
from adhocracy_core.interfaces import SheetMetadata
from adhocracy_core.schema import Reference
from adhocracy_core.utils import remove_keys_from_dict
from adhocracy_core.utils import normalize_to_tuple


@implementer(IResourceSheet)
class GenericResourceSheet(PropertySheet):

    """Generic sheet for resources to get/set the sheet data structure."""

    request = None
    """Pyramid request object, just to fulfill the interface."""

    def __init__(self, metadata, context):
        schema = metadata.schema_class()
        self.schema = schema.bind(context=context)
        """:class:`colander.MappingSchema` to define the data structure."""
        self.context = context
        """Resource to adapt."""
        self.meta = metadata
        """SheetMetadata"""
        self.registry = get_current_registry(context)
        """class:`Registry` to add events and references."""
        self._data_key = self.meta.isheet.__identifier__
        self._graph = find_graph(context)

    def get(self, params: dict={}) -> dict:
        """Return appstruct."""
        appstruct = self._default_appstruct
        appstruct.update(self._get_data_appstruct(params))
        appstruct.update(self._get_reference_appstruct(params))
        appstruct.update(self._get_back_reference_appstruct(params))
        return appstruct

    @reify
    def _default_appstruct(self) -> dict:
        items = [(n.name, n.default) for n in self.schema]
        return dict(items)

    def _get_data_appstruct(self, params: dict={}) -> iter:
        for key in self._data_keys:
            if key in self._data:
                yield (key, self._data[key])

    @reify
    def _data_keys(self) -> list:
        return [n.name for n in self.schema if not hasattr(n, 'reftype')]

    @reify
    def _data(self):
        if not hasattr(self.context, '_sheets'):
            self.context._sheets = PersistentMapping()
        if self._data_key not in self.context._sheets:
            self.context._sheets[self._data_key] = PersistentMapping()
        return self.context._sheets[self._data_key]

    def _get_reference_appstruct(self, params: dict={}) -> iter:
        references = self._get_references()
        for key, node in self._reference_nodes.items():
            node_references = references.get(key, None)
            if not node_references:
                continue
            if isinstance(node, Reference):
                yield(key, node_references[0])
            else:
                yield(key, node_references)

    def _get_references(self) -> dict:
        if not self._graph:
            return {}
        return self._graph.get_references_for_isheet(self.context,
                                                     self.meta.isheet)

    @reify
    def _reference_nodes(self) -> dict:
        nodes = {}
        for node in self.schema:
            if hasattr(node, 'reftype') and not node.backref:
                nodes[node.name] = node
        return nodes

    def _get_back_reference_appstruct(self, params: dict={}) -> dict:
        for key, node in self._back_reference_nodes.items():
            node_backrefs = self._get_backrefs(node)
            if not node_backrefs:
                continue
            if isinstance(node, Reference):
                yield(key, node_backrefs[0])
            else:
                yield(key, node_backrefs)

    def _get_backrefs(self, node: Reference) -> dict:
            if not self._graph:
                return {}
            isheet = node.reftype.getTaggedValue('source_isheet')
            backrefs = self._graph.get_back_references_for_isheet(self.context,
                                                                  isheet)
            field = node.reftype.getTaggedValue('source_isheet_field')
            return backrefs.get(field, None)

    @reify
    def _back_reference_nodes(self) -> dict:
        nodes = {}
        for node in self.schema:
            if hasattr(node, 'reftype') and node.backref:
                nodes[node.name] = node
        return nodes

    def set(self, appstruct: dict, omit=(), send_event=True) -> bool:
        """Store appstruct."""
        appstruct = self._omit_forbidden_keys(appstruct, omit)
        self._store_data(appstruct)
        self._store_references(appstruct)
        # FIXME: only store struct if values have changed
        self._notify_resource_sheet_modified(send_event)
        return bool(appstruct)

    def _omit_forbidden_keys(self, appstruct: dict, omit=()):
        omit_keys = normalize_to_tuple(omit) + tuple(self._readonly_keys)
        return remove_keys_from_dict(appstruct, keys_to_remove=omit_keys)

    @reify
    def _readonly_keys(self):
        return [n.name for n in self.schema if getattr(n, 'readonly', False)]

    def _store_data(self, appstruct):
        self._data.update(appstruct)

    def _store_references(self, appstruct):
        if self._graph:
            self._graph.set_references_for_isheet(self.context,
                                                  self.meta.isheet,
                                                  appstruct,
                                                  self.registry)

    def _notify_resource_sheet_modified(self, send_event):
        if send_event:
            event = ResourceSheetModified(self.context,
                                          self.meta.isheet,
                                          self.registry)
            self.registry.notify(event)


sheet_metadata_defaults = sheet_metadata._replace(
    isheet=ISheet,
    sheet_class=GenericResourceSheet,
    schema_class=colander.MappingSchema,
    permission_view='view',
    permission_edit='edit',
    permission_create='create',
)


def add_sheet_to_registry(metadata: SheetMetadata, registry: Registry):
    """Register sheet adapter and metadata to registry.

    There registry should have an `content` attribute with
    :class:`adhocracy_core.registry.ResourceRegistry` to store the metadata.
    """
    assert metadata.isheet.isOrExtends(ISheet)
    if hasattr(registry, 'content'):
        sheets_meta = registry.content.sheets_meta
        sheets_meta[metadata.isheet.__identifier__] = metadata
    if metadata.create_mandatory:
        assert metadata.creatable and metadata.create_mandatory
    schema = metadata.schema_class()
    for child in schema.children:
        assert child.default != colander.null
        assert child.default != colander.drop
    assert issubclass(schema.__class__, colander.MappingSchema)
    _assert_schema_preserves_super_type_data_structure(schema)

    def generic_resource_property_sheet_adapter(context):
        return metadata.sheet_class(metadata, context)

    registry.registerAdapter(generic_resource_property_sheet_adapter,
                             required=(metadata.isheet,),
                             provided=IResourceSheet,
                             name=metadata.isheet.__identifier__
                             )


def _assert_schema_preserves_super_type_data_structure(
        schema: colander.MappingSchema):
    super_defaults = []
    for super_schema in schema.__class__.__bases__:
        for child in super_schema().children:
            super_defaults.append((child.name, child.default))
    class_defaults = []
    for child in schema.children:
        class_defaults.append((child.name, child.default))
    for name, value in super_defaults:
        assert (name, value) in class_defaults


def includeme(config):  # pragma: no cover
    """Include the sheets in this package."""
    config.include('.name')
    config.include('.pool')
    config.include('.document')
    config.include('.versions')
    config.include('.tags')
    config.include('.user')
    config.include('.metadata')
    config.include('.comment')
    config.include('.rate')
