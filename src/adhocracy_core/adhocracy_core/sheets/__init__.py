"""Data structures/validation, set/get for an isolated set of resource data."""

from logging import getLogger
from collections import defaultdict

from colander import deferred
from colander import drop
from colander import null
from colander import required
from persistent.mapping import PersistentMapping
from pyramid.decorator import reify
from pyramid.registry import Registry
from pyramid.settings import asbool
from pyramid.interfaces import IRequest
from substanced.util import find_service
from zope.interface import implementer
import colander

from adhocracy_core.events import ResourceSheetModified
from adhocracy_core.interfaces import IResourceSheet
from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import ResourceMetadata
from adhocracy_core.interfaces import SheetMetadata
from adhocracy_core.interfaces import Reference
from adhocracy_core.interfaces import SearchQuery
from adhocracy_core.interfaces import search_query
from adhocracy_core.schema import MappingSchema
from adhocracy_core.schema import UniqueReferences
from adhocracy_core.schema import Reference as ReferenceSchema
from adhocracy_core.utils import remove_keys_from_dict
from adhocracy_core.utils import normalize_to_tuple
from adhocracy_core.utils import find_graph
from adhocracy_core.utils import create_schema

logger = getLogger(__name__)


@implementer(IResourceSheet)
class BaseResourceSheet:

    __doc__ = IResourceSheet.__doc__

    def __init__(self, meta: SheetMetadata,
                 context: IResourceSheet,
                 registry: Registry,
                 request: IRequest=None,
                 creating: ResourceMetadata=None):
        self.meta = meta
        self.context = context
        self.registry = registry
        self.request = request
        self.creating = creating
        self.schema = meta.schema_class()
        self.extra_js_url = ''  # used for html forms :mod:`adhocracy_core.sdi`

    def get_schema_with_bindings(self) -> colander.MappingSchema:
        schema = create_schema(self.meta.schema_class,
                               self.context,
                               self.request,
                               registry=self.registry,
                               creating=self.creating
                               )
        schema.name = self.meta.isheet.__identifier__
        is_mandatory = self.creating and self.meta.create_mandatory
        schema.missing = required if is_mandatory else drop
        return schema

    @reify
    def _fields(self) -> dict:
        fields = defaultdict(dict)
        for node in self.schema.children:
            field = node.name
            if not hasattr(node, 'reftype'):
                fields['data'][field] = node
            elif not node.backref:
                fields['reference'][field] = node
            else:
                fields['back_reference'][field] = node
            if getattr(node, 'readonly', False):
                fields['readonly'][field] = node
        return fields

    @reify
    def _graph(self):
        graph = find_graph(self.context)
        return graph

    @reify
    def _catalogs(self):
        catalogs = find_service(self.context, 'catalogs')
        return catalogs

    def get(self, params: dict={},
            add_back_references=True,
            omit_defaults=False) -> dict:
        """Return appstruct data.

        Read :func:`adhocracy_core.interfaces.IResourceSheet.get`
        """
        appstruct = {}
        if not omit_defaults:
            appstruct.update(self._get_default_appstruct())
        appstruct.update(self._get_data_appstruct())
        query = self._get_references_query(params)
        appstruct.update(self._get_reference_appstruct(query))
        if add_back_references:
            appstruct.update(self._get_back_reference_appstruct(query))
        return appstruct

    def _get_default_appstruct(self) -> dict:
        appstruct = {}
        for node in self.schema:
            if isinstance(node.default, deferred):
                default = node.default(node, {'context': self.context,
                                              'registry': self.registry})
            else:
                default = node.default
            appstruct[node.name] = default
        return appstruct

    def _get_data_appstruct(self) -> dict:
        raise NotImplementedError

    def _get_references_query(self, params: dict) -> SearchQuery:
        """Might be overridden in subclasses."""
        default_params = {'only_visible': False,
                          'resolve': True,
                          'allows': (),
                          'references': [],
                          }
        query = search_query._replace(**default_params)
        if params:
            query = query._replace(**params)
        return query

    def _get_reference_appstruct(self, query: SearchQuery) -> iter:
        """Might be overridden in subclasses."""
        fields = self._fields['reference'].items()
        get_ref = lambda node: Reference(self.context, self.meta.isheet,
                                         node.name, None)
        return self._yield_references(fields, query, get_ref)

    def _get_back_reference_appstruct(self, query: SearchQuery) -> iter:
        fields = self._fields['back_reference'].items()

        def get_ref(node):
            isheet = node.reftype.getTaggedValue('source_isheet')
            isheet_field = node.reftype.getTaggedValue('source_isheet_field')
            return Reference(None, isheet, isheet_field, self.context)

        return self._yield_references(fields, query, get_ref)

    def _yield_references(self, fields, query, create_ref) -> iter:
        if not self._catalogs:
            return iter([])  # ease testing
        for field, node in fields:
            reference = create_ref(node)
            is_references_node = isinstance(node, UniqueReferences)\
                and not getattr(node, 'backref', False)
            if is_references_node:  # search references and preserve order
                query_field = query._replace(references=[reference],
                                             sort_by='reference')
            else:  # search single reference or back references
                query_field = query._replace(references=[reference])
            elements = self._catalogs.search(query_field).elements
            if len(elements) == 0:
                continue
            if isinstance(node, ReferenceSchema):
                yield(field, elements[0])
            else:
                yield(field, elements)

    def set(self,
            appstruct: dict,
            omit=(),
            send_event=True,
            send_reference_event=True,
            omit_readonly: bool=True) -> bool:
        """Store appstruct.

        Read :func:`adhocracy_core.interfaces.IResourceSheet.set`
        """
        appstruct_old = self.get(add_back_references=False)
        appstruct = self._omit_omit_keys(appstruct, omit)
        if omit_readonly:
            appstruct = self._omit_readonly_keys(appstruct)
        appstruct = self._filter_unchanged_data(appstruct, appstruct_old)
        self._store_data(appstruct)
        self._store_references(appstruct,
                               self.registry,
                               send_event=send_reference_event)
        if send_event:
            event = ResourceSheetModified(self.context,
                                          self.meta.isheet,
                                          self.registry,
                                          appstruct_old,
                                          appstruct,
                                          self.request)
            self.registry.notify(event)
        return bool(appstruct)

    def _filter_unchanged_data(self, new: dict, old: dict) -> dict:
        changed = {}
        for key, value in new.items():
            if value != old[key]:
                changed[key] = value
        return changed

    def _omit_readonly_keys(self, appstruct: dict):
        omit_keys = tuple(self._fields['readonly'])
        return remove_keys_from_dict(appstruct, keys_to_remove=omit_keys)

    def _omit_omit_keys(self, appstruct: dict, omit):
        omit_keys = normalize_to_tuple(omit)
        return remove_keys_from_dict(appstruct, keys_to_remove=omit_keys)

    def _store_data(self, appstruct):
        """Store data appstruct."""
        raise NotImplementedError

    def _store_references(self, appstruct, registry, send_event=True):
        """Might be overridden in subclasses."""
        if not self._graph:
            return  # ease testing
        self._graph.set_references_for_isheet(self.context,
                                              self.meta.isheet,
                                              appstruct,
                                              registry,
                                              send_event=send_event)

    def serialize(self, params: dict=None):
        """Get sheet appstruct data and serialize.

        Read :func:`adhocracy_core.interfaces.IResourceSheet.serialize`
        """
        params = params or {}
        filter_view_permission = asbool(self.registry.settings.get(
            'adhocracy.filter_by_view_permission', True))
        if filter_view_permission:
            params['allows'] = (self.request.effective_principals, 'view')
        filter_visible = asbool(self.registry.settings.get(
            'adhocracy.filter_by_visible', True))
        if filter_visible:
            params['only_visible'] = True
        appstruct = self.get(params=params, omit_defaults=True)
        schema = self.get_schema_with_bindings()
        cstruct = schema.serialize(appstruct)
        return cstruct

    def deserialize(self, cstruct: dict) -> dict:
        """Deserialize `ctruct`.

        Read :func:`adhocracy_core.interfaces.IResourceSheet.serialize`
        """
        schema = self.get_schema_with_bindings()
        cstruct = schema.deserialize(cstruct)
        return cstruct

    def delete_field_values(self, fields: [str]):
        """Delete value for every field name in `fields`."""
        raise NotImplementedError

    def after_set(self, changed: bool):
        """Hook to run after setting data. Not used."""
        raise NotImplementedError


@implementer(IResourceSheet)
class AnnotationRessourceSheet(BaseResourceSheet):
    """Resource Sheet that stores data in dictionary annotation."""

    @reify
    def _annotation_key(self):
        isheet_name = self.meta.isheet.__identifier__
        return '_sheet_' + isheet_name.replace('.', '_')

    def _get_data_appstruct(self) -> dict:
        """Get data appstruct."""
        data = getattr(self.context, self._annotation_key, {})
        return {k: v for k, v in data.items() if k in self._fields['data']}

    def _store_data(self, appstruct):
        """Store data appstruct."""
        data = getattr(self.context, self._annotation_key, None)
        if data is None:
            data = PersistentMapping()
            setattr(self.context, self._annotation_key, data)
        for key in self._fields['data']:
            if key in appstruct:
                data[key] = appstruct[key]

    def delete_field_values(self, fields: [str]):
        """Delete value for every field name in `fields`."""
        if not hasattr(self.context, self._annotation_key):
            return None
        appstruct = getattr(self.context, self._annotation_key, {})
        for key in fields:
            if key in appstruct:
                del appstruct[key]
        if appstruct == {}:
            delattr(self.context, self._annotation_key)


@implementer(IResourceSheet)
class AttributeResourceSheet(BaseResourceSheet):
    """Resource Sheet that stores data as context attributes."""

    def _get_data_appstruct(self) -> dict:
        """Get data appstruct."""
        data = self.context.__dict__
        return {k: v for k, v in data.items() if k in self._fields['data']}

    def _store_data(self, appstruct):
        """Store data appstruct."""
        for key in self._fields['data']:
            if key in appstruct:
                setattr(self.context, key, appstruct[key])

    def delete_field_values(self, fields: [str]):
        """Delete value for every field name in `fields`."""
        for key in fields:
            if hasattr(self.context, key):
                delattr(self.context, key)


sheet_meta = SheetMetadata(isheet=ISheet,
                           sheet_class=AnnotationRessourceSheet,
                           schema_class=MappingSchema,
                           permission_view='view',
                           permission_edit='edit',
                           permission_create='create',
                           readable=True,
                           editable=True,
                           creatable=True,
                           create_mandatory=False,
                           )


def add_sheet_to_registry(metadata: SheetMetadata, registry: Registry):
    """Register sheet adapter and metadata to registry.

    There registry should have an `content` attribute with
    :class:`adhocracy_core.registry.ResourceRegistry` to store the metadata.
    """
    assert metadata.isheet.isOrExtends(ISheet)
    isheet = metadata.isheet
    if metadata.create_mandatory:
        assert metadata.creatable and metadata.create_mandatory
    schema = metadata.schema_class()
    for child in schema.children:
        assert child.default != null
        assert child.default != drop
    assert issubclass(schema.__class__, colander.MappingSchema)
    _assert_schema_preserves_super_type_data_structure(schema)
    registry.content.sheets_meta[isheet] = metadata


def _assert_schema_preserves_super_type_data_structure(schema: MappingSchema):
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
    config.include('.principal')
    config.include('.relation')
    config.include('.metadata')
    config.include('.comment')
    config.include('.rate')
    config.include('.asset')
    config.include('.image')
    config.include('.geo')
    config.include('.workflow')
    config.include('.title')
    config.include('.description')
    config.include('.badge')
    config.include('.logbook')
    config.include('.embed')
