from pyramid import testing
from pytest import fixture
from pytest import mark
from pytest import raises
from unittest.mock import Mock


@fixture
def mock_metadata_sheet(context, mock_sheet, registry_with_content):
    from adhocracy_core.testing import register_sheet
    from .metadata import IMetadata
    mock_sheet.meta = mock_sheet.meta._replace(isheet=IMetadata)
    register_sheet(context, mock_sheet, registry_with_content)
    return mock_sheet



class TestIMetadataSchema:

    @fixture
    def request(self):
        return testing.DummyRequest()

    def _make_one(self, **kwargs):
        from adhocracy_core.sheets.metadata import MetadataSchema
        return MetadataSchema(**kwargs)

    def test_deserialize_empty(self):
        inst = self._make_one()
        result = inst.deserialize({})
        assert result == {'deleted': False, 'hidden': False}

    def test_serialize_empty(self):
        from colander import null
        inst = self._make_one()
        result = inst.serialize({})
        assert result['creation_date'] == null
        assert result['creator'] == ''
        assert result['item_creation_date'] == null
        assert result['modification_date'] == null
        assert result['modified_by'] == ''
        assert result['deleted'] == 'false'
        assert result['hidden'] == 'false'

    def test_serialize_empty_and_bind(self, context):
        from datetime import datetime
        inst = self._make_one().bind(context=context)
        result = inst.serialize({})
        this_year = str(datetime.now().year)
        assert this_year in result['creation_date']
        assert this_year in result['item_creation_date']
        assert this_year in result['modification_date']

    def test_deserialize_hiding_requires_permission(self, context, request):
        import colander
        inst = self._make_one().bind(context=context, request=request)
        request.has_permission = Mock(return_value=False)
        with raises(colander.Invalid):
            inst.deserialize({'hidden': False})
        request.has_permission = Mock(return_value=True)
        result = inst.deserialize({'hidden': False})
        assert result['hidden'] is False

    def test_deserialize_delete_doesnt_require_permission(self, context, request):
        inst = self._make_one().bind(context=context, request=request)
        request.has_permission = Mock(return_value=True)
        result = inst.deserialize({'deleted': False})
        assert result['deleted'] is False


class TestMetadataSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.metadata import metadata_metadata
        return metadata_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.metadata import IMetadata
        from adhocracy_core.sheets.metadata import MetadataSchema
        from . import AttributeStorageSheet
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IMetadata
        assert inst.meta.schema_class == MetadataSchema
        assert inst.meta.editable is True
        assert inst.meta.creatable is True
        assert inst.meta.readable is True
        assert inst.meta.sheet_class is AttributeStorageSheet


def test_index_creator_creator_exists(context, mock_metadata_sheet):
    from .metadata import index_creator
    context['user1'] = testing.DummyResource()
    mock_metadata_sheet.get.return_value = {'creator': context['user1']}
    assert index_creator(context, 'default') == '/user1'


def test_index_creator_creator_does_not_exists(context, mock_metadata_sheet):
    from .metadata import index_creator
    context['user1'] = testing.DummyResource()
    mock_metadata_sheet.get.return_value = {'creator': ''}
    assert index_creator(context, 'default') == ''


@fixture
def integration(config):
    config.include('adhocracy_core.catalog')
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.changelog')
    config.include('adhocracy_core.content')
    config.include('adhocracy_core.sheets.metadata')


@mark.usefixtures('integration')
def test_includeme_register_metadata_sheet(config):
    from adhocracy_core.sheets.metadata import IMetadata
    from adhocracy_core.utils import get_sheet
    context = testing.DummyResource(__provides__=IMetadata)
    assert get_sheet(context, IMetadata)


@mark.usefixtures('integration')
def test_includeme_register_index_creator(registry):
    from .metadata import IMetadata
    from substanced.interfaces import IIndexView
    assert registry.adapters.lookup((IMetadata,), IIndexView,
                                    name='adhocracy|creator')


class TestVisibility:

    @fixture
    def resource_with_metadata(self, integration):
        from adhocracy_core.interfaces import IResource
        from adhocracy_core.sheets.metadata import IMetadata
        return testing.DummyResource(__provides__=[IResource, IMetadata])

    def test_is_deleted_attribute_is_true(self, context):
        from adhocracy_core.sheets.metadata import is_deleted
        context.deleted = True
        assert is_deleted(context) is True

    def test_is_deleted_attribute_is_false(self, context):
        from adhocracy_core.sheets.metadata import is_deleted
        context.deleted = False
        assert is_deleted(context) is False

    def test_is_deleted_attribute_not_set(self, context):
        from adhocracy_core.sheets.metadata import is_deleted
        assert is_deleted(context) is False

    def test_is_deleted_parent_attribute_is_true(self, context):
        from adhocracy_core.sheets.metadata import is_deleted
        child = testing.DummyResource()
        context['child'] = child
        context.deleted = True
        assert is_deleted(child) is True

    def test_is_deleted_parent_attribute_is_false(self, context):
        from adhocracy_core.sheets.metadata import is_deleted
        child = testing.DummyResource()
        context['child'] = child
        context.deleted = False
        assert is_deleted(child) is False

    def test_is_deleted_parent_attribute_not_set(self, context):
        from adhocracy_core.sheets.metadata import is_deleted
        child = testing.DummyResource()
        context['child'] = child
        assert is_deleted(child) is False

    def test_is_deleted_parent_attrib_true_child_attrib_false(self, context):
        from adhocracy_core.sheets.metadata import is_deleted
        child = testing.DummyResource()
        context['child'] = child
        context.deleted = True
        child.deleted = False
        assert is_deleted(child) is True

    def test_is_hidden_attribute_is_true(self, context):
        from adhocracy_core.sheets.metadata import is_hidden
        context.hidden = True
        assert is_hidden(context) is True

    def test_is_hidden_attribute_is_false(self, context):
        from adhocracy_core.sheets.metadata import is_hidden
        context.hidden = False
        assert is_hidden(context) is False

    def test_is_hidden_attribute_not_set(self, context):
        from adhocracy_core.sheets.metadata import is_hidden
        assert is_hidden(context) is False

    def test_is_hidden_parent_attribute_is_true(self, context):
        from adhocracy_core.sheets.metadata import is_hidden
        child = testing.DummyResource()
        context['child'] = child
        context.hidden = True
        assert is_hidden(child) is True

    def test_is_hidden_parent_attribute_is_false(self, context):
        from adhocracy_core.sheets.metadata import is_hidden
        child = testing.DummyResource()
        context['child'] = child
        context.hidden = False
        assert is_hidden(child) is False

    def test_is_hidden_parent_attribute_not_set(self, context):
        from adhocracy_core.sheets.metadata import is_hidden
        child = testing.DummyResource()
        context['child'] = child
        assert is_hidden(child) is False

    def test_is_hidden_parent_attrib_true_child_attrib_false(self, context):
        from adhocracy_core.sheets.metadata import is_hidden
        child = testing.DummyResource()
        context['child'] = child
        context.hidden = True
        child.hidden = False
        assert is_hidden(child) is True

    def test_view_blocked_by_metadata_no_imetadata(self, registry):
        from adhocracy_core.interfaces import IResource
        from adhocracy_core.sheets.metadata import view_blocked_by_metadata
        resource = testing.DummyResource(__provides__=IResource)
        assert view_blocked_by_metadata(resource, registry, 'hidden') ==\
               {'reason': 'hidden'}

    def test_view_blocked_by_metadata_with_imetadata(
            self, pool_graph, resource_with_metadata, registry):
        from datetime import datetime
        from adhocracy_core.resources.principal import IUser
        from adhocracy_core.sheets.metadata import IMetadata
        from adhocracy_core.sheets.metadata import view_blocked_by_metadata
        from adhocracy_core.utils import get_sheet
        pool_graph['res'] = resource_with_metadata
        metadata = get_sheet(resource_with_metadata, IMetadata,
                             registry=registry)
        appstruct = metadata.get()
        user = testing.DummyRequest(__provides__=IUser)
        pool_graph['user'] = user
        now = datetime.now()
        appstruct['modified_by'] = user
        appstruct['modification_date'] = now
        metadata.set(appstruct, omit_readonly=False, send_event=False)
        resource_with_metadata.hidden = True
        result = view_blocked_by_metadata(resource_with_metadata, registry,
                                          'hidden')
        assert result['modified_by'] == user
        assert result['modification_date'] == now

    def test_index_visibility_visible(self, context):
        from adhocracy_core.sheets.metadata import index_visibility
        assert index_visibility(context, 'default') == ['visible']

    def test_index_visibility_deleted(self, context):
        from adhocracy_core.sheets.metadata import index_visibility
        context.deleted = True
        assert index_visibility(context, 'default') == ['deleted']

    def test_index_visibility_hidden(self, context):
        from adhocracy_core.sheets.metadata import index_visibility
        context.hidden = True
        assert index_visibility(context, 'default') == ['hidden']

    def test_index_visibility_both(self, context):
        from adhocracy_core.sheets.metadata import index_visibility
        context.deleted = True
        context.hidden = True
        assert sorted(index_visibility(context, 'default')) == ['deleted',
                                                                'hidden']
