from unittest.mock import Mock

from pyramid import testing
from pytest import fixture
from pytest import raises


def test_includeme_register_has_asset_pool_sheet(config):
    from adhocracy_core.sheets.asset import IHasAssetPool
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.asset')
    context = testing.DummyResource(__provides__=IHasAssetPool)
    assert get_sheet(context, IHasAssetPool)


class TestIHasAssetPoolSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.asset import has_asset_pool_meta
        return has_asset_pool_meta

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_core.sheets.asset import IHasAssetPool
        from adhocracy_core.sheets.asset import HasAssetPoolSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IHasAssetPool
        assert inst.meta.schema_class == HasAssetPoolSchema

    def test_get_without_asset_service(self, meta, context, mock_graph):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        inst = meta.sheet_class(meta, context)
        mock_graph.get_references_for_isheet.return_value = {}
        mock_graph.get_back_references_for_isheet.return_value = {}
        with raises(RuntimeConfigurationError):
            inst.get()

    @fixture
    def mock_asset_pool(self, monkeypatch):
        from adhocracy_core import schema
        asset_pool = testing.DummyResource()
        mock_get_post_pool = Mock(spec=schema._get_post_pool,
                                  return_value=asset_pool)
        monkeypatch.setattr(schema, '_get_post_pool', mock_get_post_pool)
        return asset_pool

    def test_get_with_asset_service(self, meta, context, mock_graph,
                                          mock_asset_pool):
        inst = meta.sheet_class(meta, context)
        mock_graph.get_references_for_isheet.return_value = {}
        mock_graph.get_back_references_for_isheet.return_value = {}
        data = inst.get()
        assert data['asset_pool'] == mock_asset_pool


def test_includeme_register_asset_metadata_sheet(config):
    from adhocracy_core.sheets.asset import IAssetMetadata
    from adhocracy_core.utils import get_sheet
    config.include('adhocracy_core.sheets.asset')
    context = testing.DummyResource(__provides__=IAssetMetadata)
    assert get_sheet(context, IAssetMetadata)


class TestIAssetMetadata:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.asset import asset_metadata_meta
        return asset_metadata_meta

    def test_create_valid(self, meta, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        from adhocracy_core.sheets.asset import IAssetMetadata
        from adhocracy_core.sheets.asset import AssetMetadataSchema
        inst = meta.sheet_class(meta, context)
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)
        assert inst.meta.isheet == IAssetMetadata
        assert inst.meta.schema_class == AssetMetadataSchema

    def test_get(self, meta, context):
        inst = meta.sheet_class(meta, context)
        assert inst.get() == {'attached_to': [],
                              'filename': '',
                              'mime_type': '',
                              'size': 0}

    def test_get_with_backreference(self, meta, context, mock_graph):
        context.__graph__ = mock_graph
        inst = meta.sheet_class(meta, context)
        attacher = testing.DummyResource()
        mock_graph.get_back_references_for_isheet.return_value = {
            'picture': [attacher]}
        assert inst.get() == {'attached_to': [attacher],
                              'filename': '',
                              'mime_type': '',
                              'size': 0}

    def test_get_with_multiple_backreferences(self, meta, context, mock_graph):
        context.__graph__ = mock_graph
        inst = meta.sheet_class(meta, context)
        pic_attacher1 = testing.DummyResource()
        pic_attacher2 = testing.DummyResource()
        img_attacher = testing.DummyResource()
        mock_graph.get_back_references_for_isheet.return_value = {
            'picture': [pic_attacher1, pic_attacher2],
            'image': [img_attacher]}
        appstruct = inst.get()
        assert set(appstruct['attached_to']) == {pic_attacher1,
                                                 pic_attacher2,
                                                 img_attacher}

    def test_set_and_get(self, meta, context):
        inst = meta.sheet_class(meta, context)
        inst.set({'filename': 'dummy.jpg',
                  'mime_type': 'image/jpeg',
                  'size': 890828},
                 omit_readonly=False)
        assert inst.get() == {'attached_to': [],
                              'filename': 'dummy.jpg',
                              'mime_type': 'image/jpeg',
                              'size': 890828}


class TestAssetFileView:

    def test_get_response_without_dimensions_and_file(self, context,
                                                      registry, monkeypatch):
        from adhocracy_core.sheets.asset import AssetFileView
        from adhocracy_core.sheets import asset
        from substanced.file import File
        inst = AssetFileView()
        parent = testing.DummyResource()
        context.__parent__ = parent
        file = Mock(spec=File)
        dummy_response = testing.DummyResource()
        file.get_response.return_value = dummy_response
        mock_retrieve_asset_file = Mock(spec=asset.retrieve_asset_file,
                                        return_value=file)
        monkeypatch.setattr(asset, 'retrieve_asset_file',
                            mock_retrieve_asset_file)
        assert inst.get_response(context, registry) == dummy_response
        assert mock_retrieve_asset_file.called
        assert mock_retrieve_asset_file.call_args[0] == (parent, registry)

    def test_get_response_with_dimensions_and_without_file(self, context,
                                                           registry,
                                                           monkeypatch):
        from adhocracy_core.sheets.asset import AssetFileView
        from adhocracy_core.interfaces import Dimensions
        from substanced.file import File
        inst = AssetFileView(Dimensions(width=200, height=100))
        file = Mock(spec=File)
        dummy_response = testing.DummyResource()
        file.get_response.return_value = dummy_response
        mock_crop_and_resize_image = Mock(
            spec=AssetFileView._crop_and_resize_image, return_value=file)
        monkeypatch.setattr(inst, '_crop_and_resize_image',
                            mock_crop_and_resize_image)
        assert inst.get_response(context, registry) == dummy_response
        assert mock_crop_and_resize_image.called
        assert mock_crop_and_resize_image.call_args[0] == (context, registry)

    def test_get_response_with_file(self, context, registry):
        from adhocracy_core.sheets.asset import AssetFileView
        from substanced.file import File
        inst = AssetFileView()
        file = Mock(spec=File)
        dummy_response = testing.DummyResource()
        file.get_response.return_value = dummy_response
        inst.file = file
        assert inst.get_response(context, registry) == dummy_response
