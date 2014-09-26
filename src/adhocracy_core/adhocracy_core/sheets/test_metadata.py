from pyramid import testing
from pytest import fixture
from pytest import mark


def register_and_add_sheet(context, registry, mock_sheet):
    from zope.interface import alsoProvides
    from adhocracy_core.interfaces import IResourceSheet
    isheet = mock_sheet.meta.isheet
    alsoProvides(context, isheet)
    registry.registerAdapter(lambda x: mock_sheet, (isheet,),
                             IResourceSheet,
                             isheet.__identifier__)


class TestResourceModifiedMetadataSubscriber:

    def _call_fut(self, event):
        from adhocracy_core.sheets.metadata import resource_modified_metadata_subscriber
        return resource_modified_metadata_subscriber(event)

    def test_with_metadata_isheet(self, context, registry, mock_sheet):
        from datetime import datetime
        from adhocracy_core.sheets.metadata import IMetadata
        event = testing.DummyResource(object=context)
        mock_sheet.meta = mock_sheet.meta._replace(isheet=IMetadata)
        register_and_add_sheet(context, registry, mock_sheet)

        self._call_fut(event)

        set_modification_date = mock_sheet.set.call_args[0][0]['modification_date']
        assert set_modification_date.date() == datetime.now().date()


class TestIMetadataSchema:

    def _make_one(self, **kwargs):
        from adhocracy_core.sheets.metadata import MetadataSchema
        return MetadataSchema(**kwargs)

    def test_deserialize_empty(self):
        inst = self._make_one()
        result = inst.deserialize({})
        assert result == {}

    def test_serialize_empty(self):
        from colander import null
        inst = self._make_one()
        result = inst.serialize({})
        assert result['creation_date'] == null
        assert result['item_creation_date'] == null
        assert result['modification_date'] == null
        assert result['creator'] == ''

    def test_serialize_empty_and_bind(self):
        from datetime import datetime
        inst = self._make_one().bind()
        result = inst.serialize({})
        this_year = str(datetime.now().year)
        assert this_year in result['creation_date']
        assert this_year in result['item_creation_date']
        assert this_year in result['modification_date']


class TestMetadataSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.metadata import metadata_metadata
        return metadata_metadata

    def test_create(self, meta, context):
        from adhocracy_core.sheets.metadata import IMetadata
        from adhocracy_core.sheets.metadata import MetadataSchema
        inst = meta.sheet_class(meta, context)
        assert inst.meta.isheet == IMetadata
        assert inst.meta.schema_class == MetadataSchema
        assert inst.meta.editable is False
        assert inst.meta.creatable is False
        assert inst.meta.readable is True


@fixture
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.sheets.metadata')


@mark.usefixtures('integration')
def test_includeme_register_metadata_sheet(config):
    from adhocracy_core.sheets.metadata import IMetadata
    from adhocracy_core.utils import get_sheet
    context = testing.DummyResource(__provides__=IMetadata)
    assert get_sheet(context, IMetadata)


@mark.usefixtures('integration')
def test_includeme_register_metadata_update_subscriber(config):
    handlers = config.registry.registeredHandlers()
    handler_names = [x.handler.__name__ for x in handlers]
    assert 'resource_modified_metadata_subscriber' in handler_names
