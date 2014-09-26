from pyramid import testing
from pytest import raises
from pytest import fixture

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import sheet_metadata
from adhocracy_core.interfaces import IResourceCreatedAndAdded


class ISheetY(ISheet):
    pass


class ISheetX(ISheet):
    pass


def register_sheet(isheet, mock_sheet, registry):
    from adhocracy_core.interfaces import IResourceSheet
    mock_sheet.meta = mock_sheet.meta._replace(isheet=isheet)
    registry.registerAdapter(lambda x: mock_sheet, (isheet,),
                             IResourceSheet,
                             isheet.__identifier__)
    return mock_sheet

@fixture
def resource_meta(resource_meta):
    from adhocracy_core.resources.resource import Base
    return resource_meta._replace(iresource=IResource,
                                  content_class=Base)


class TestAddResourceTypeToRegistry:

    def make_one(self, *args):
        from adhocracy_core.resources import add_resource_type_to_registry
        return add_resource_type_to_registry(*args)

    def test_add_iresource_but_missing_content_registry(self, config, resource_meta):
        config.include('adhocracy_core.registry')
        del config.registry.content
        with raises(AssertionError):
            self.make_one(resource_meta, config)

    def test_add_resource_type(self, config, resource_meta):
        config.include('adhocracy_core.registry')
        self.make_one(resource_meta, config)
        resource = config.registry.content.create(IResource.__identifier__)
        assert IResource.providedBy(resource)

    def test_add_resource_type_metadata(self, config, resource_meta):
        config.include('adhocracy_core.registry')
        type_id = IResource.__identifier__
        self.make_one(resource_meta, config)
        assert config.registry.content.meta[type_id]['content_name'] == type_id
        assert config.registry.content.resources_meta[type_id] == resource_meta

    def test_add_resource_type_metadata_with_content_name(self, config, resource_meta):
        config.include('adhocracy_core.registry')
        type_id = IResource.__identifier__
        metadata_a = resource_meta._replace(content_name='Name')
        self.make_one(metadata_a, config)
        assert config.registry.content.meta[type_id]['content_name'] == 'Name'


class TestResourceFactory:

    def make_one(self, resource_meta):
        from adhocracy_core.resources import ResourceFactory
        return ResourceFactory(resource_meta)

    def test_create(self, resource_meta):
        inst = self.make_one(resource_meta)
        assert '__call__' in dir(inst)

    def test_call_with_iresource(self, resource_meta):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResource
        from zope.interface import directlyProvidedBy
        class IResourceX(IResource):
            pass
        meta = resource_meta._replace(iresource=IResourceX)

        inst = self.make_one(meta)()

        assert IResourceX in directlyProvidedBy(inst)
        assert verifyObject(IResourceX, inst)
        assert inst.__parent__ is None
        assert inst.__name__ == ''
        assert not hasattr(inst, '__oid__')

    def test_call_with_isheets(self, resource_meta):
        meta = resource_meta._replace(basic_sheets=[ISheetY],
                                      extended_sheets=[ISheetX])
        inst = self.make_one(meta)()
        assert ISheetX.providedBy(inst)
        assert ISheetY.providedBy(inst)

    def test_call_with_after_create(self, resource_meta, registry):
        def dummy_after_create(context, registry, options):
            context._options = options
            context._registry = registry
        meta = resource_meta._replace(iresource=IResource,
                                      after_creation=[dummy_after_create])

        inst = self.make_one(meta)(creator=None, kwarg1=True)

        assert inst._options == {'kwarg1': True, 'creator': None}
        assert inst._registry is registry

    def test_call_without_run_after_create(self, resource_meta):
        def dummy_after_create(context, registry, options):
            context._options = options
            context._registry = registry

        meta = resource_meta._replace(iresource=IResource,
                                      after_creation=[dummy_after_create])

        inst = self.make_one(meta)(run_after_create=False)

        with raises(AttributeError):
            inst.test

    def test_call_with_non_exisiting_sheet_appstructs_data(self, resource_meta):
        from zope.component import ComponentLookupError
        meta = resource_meta
        appstructs = {ISheetY.__identifier__: {'count': 0}}
        with raises(ComponentLookupError):
            self.make_one(meta)(appstructs=appstructs)

    def test_call_with_creatable_appstructs_data(self, resource_meta, registry, mock_sheet):
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[ISheetY])
        dummy_sheet = register_sheet(ISheetY, mock_sheet, registry)
        appstructs = {ISheetY.__identifier__: {'count': 0}}

        self.make_one(meta)(appstructs=appstructs)

        assert dummy_sheet.set.call_args[0] == ({'count': 0},)
        assert dummy_sheet.set.call_args[1]['send_event'] is False

    def test_call_with_not_creatable_appstructs_data(self, resource_meta, registry, mock_sheet):
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[ISheetY])
        dummy_sheet = register_sheet(ISheetY, mock_sheet, registry)
        dummy_sheet.meta = sheet_metadata._replace(creatable=False)
        appstructs = {ISheetY.__identifier__: {'count': 0}}

        self.make_one(meta)(appstructs=appstructs)

        assert not dummy_sheet.set.called

    def test_call_with_parent_and_appstructs_name_data(self, resource_meta, registry, pool, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[IName])
        dummy_sheet = register_sheet(IName, mock_sheet, registry)
        dummy_sheet.set.return_value = False
        appstructs = {IName.__identifier__: {'name': 'child'}}

        self.make_one(meta)(parent=pool, appstructs=appstructs)

        assert 'child' in pool
        assert dummy_sheet.set.called

    def test_call_with_parent_and_no_name_appstruct(self, resource_meta, pool):
        meta = resource_meta
        with raises(KeyError):
            self.make_one(meta)(parent=pool, appstructs={})

    def test_call_with_parent_and_name_appstruct(self, resource_meta, registry, pool, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[IName])
        appstructs = {IName.__identifier__: {'name': 'name'}}
        register_sheet(IName, mock_sheet, registry)
        inst = self.make_one(meta)(parent=pool, appstructs=appstructs)

        assert inst.__parent__ == pool
        assert inst.__name__ in pool
        assert inst.__name__ == 'name'

    def test_call_with_parent_and_non_unique_name_appstruct(self, resource_meta, registry, pool, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[IName])
        appstructs = {IName.__identifier__: {'name': 'name'}}
        register_sheet(IName, mock_sheet, registry)
        pool['name'] = testing.DummyResource()

        with raises(KeyError):
            self.make_one(meta)(parent=pool, appstructs=appstructs)

    def test_call_with_parent_and_empty_name_data(self, resource_meta, pool, registry, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[IName])
        appstructs = {'adhocracy_core.sheets.name.IName': {'name': ''}}
        register_sheet(IName, mock_sheet, registry)

        with raises(KeyError):
            self.make_one(meta)(parent=pool, appstructs=appstructs)

    def test_call_with_parent_and_use_autonaming(self, resource_meta, pool):
        meta = resource_meta._replace(iresource=IResource,
                                      use_autonaming=True)

        self.make_one(meta)(parent=pool)

        assert '_0000000' in pool

    def test_call_with_parent_and_use_autonaming_with_prefix(self, resource_meta, pool):
        meta = resource_meta._replace(iresource=IResource,
                                      use_autonaming=True,
                                      autonaming_prefix='prefix')

        self.make_one(meta)(parent=pool)

        assert 'prefix_0000000' in pool

    def test_with_parent_and_resource_implements_postpool(self, pool, resource_meta, registry, mock_sheet):
        from adhocracy_core.interfaces import IServicePool
        meta = resource_meta._replace(iresource=IServicePool,
                                      content_name='Service')

        resource = self.make_one(meta)(parent=pool)
        assert 'Service' in pool
        assert resource.__is_service__

    def test_without_creator_and_resource_implements_imetadata(self, resource_meta, registry, mock_sheet):
        from datetime import datetime
        from adhocracy_core.sheets.metadata import IMetadata
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[IMetadata])
        dummy_sheet = register_sheet(IMetadata, mock_sheet, registry)

        self.make_one(meta)()

        set_appstructs = dummy_sheet.set.call_args[0][0]
        assert set_appstructs['creator'] is None
        today = datetime.utcnow().date()
        assert set_appstructs['creation_date'].date() == today
        assert set_appstructs['item_creation_date'] == set_appstructs['creation_date']
        assert set_appstructs['modification_date'].date() == today
        set_send_event = dummy_sheet.set.call_args[1]['send_event']
        assert set_send_event is False

    def test_without_parent_and_resource_implements_imetadata_and_itemversion(self, resource_meta, registry, mock_sheet):
        from adhocracy_core.sheets.metadata import IMetadata
        from adhocracy_core.interfaces import IItemVersion
        meta = resource_meta._replace(iresource=IItemVersion,
                                      basic_sheets=[IMetadata])
        dummy_sheet = register_sheet(IMetadata, mock_sheet, registry)

        self.make_one(meta)()

        set_appstructs = dummy_sheet.set.call_args[0][0]
        assert set_appstructs['item_creation_date'] == set_appstructs['creation_date']

    def test_with_parent_and_resource_implements_imetadata_and_itemversion(self, item, resource_meta, registry, mock_sheet):
        from datetime import datetime
        from adhocracy_core.sheets.metadata import IMetadata
        from adhocracy_core.interfaces import IItemVersion
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IItemVersion,
                                      basic_sheets=[IMetadata, IName])
        dummy_sheet = register_sheet(IMetadata, mock_sheet, registry)
        register_sheet(IName, mock_sheet, registry)
        item_creation_date = datetime.today()
        dummy_sheet.get.return_value = {'creation_date': item_creation_date}

        self.make_one(meta)(parent=item, appstructs={IName.__identifier__: {'name': 'N'}})

        set_appstructs = dummy_sheet.set.call_args[0][0]
        assert set_appstructs['item_creation_date'] == item_creation_date

    def test_with_creator_and_resource_implements_imetadata(self, resource_meta, registry, mock_sheet):
        from adhocracy_core.sheets.metadata import IMetadata
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=[IMetadata])
        dummy_sheet = register_sheet(IMetadata, mock_sheet, registry)
        authenticated_user = object()

        self.make_one(meta)(creator=authenticated_user)

        set_appstructs = dummy_sheet.set.call_args[0][0]
        assert set_appstructs['creator'] == authenticated_user

    def test_with_creator_and_resource_implements_imetadata_and_iuser(self, resource_meta, registry, mock_sheet):
        from adhocracy_core.resources.principal import IUser
        from adhocracy_core.sheets.metadata import IMetadata
        meta = resource_meta._replace(iresource=IUser,
                                      basic_sheets=[IMetadata])
        dummy_sheet = register_sheet(IMetadata, mock_sheet, registry)
        authenticated_user = object()

        created_user = self.make_one(meta)(creator=authenticated_user)

        set_appstructs = dummy_sheet.set.call_args[0][0]
        assert set_appstructs['creator'] == created_user

    def test_notify_new_resource_created_and_added(self, resource_meta, config, pool):
        events = []
        listener = lambda event: events.append(event)
        config.add_subscriber(listener, IResourceCreatedAndAdded)

        meta = resource_meta._replace(iresource=IResource,
                                      use_autonaming=True)
        user = object()

        resource = self.make_one(meta)(parent=pool, creator=user)

        assert IResourceCreatedAndAdded.providedBy(events[0])
        assert events[0].object == resource
        assert events[0].parent == pool
        assert events[0].creator == user
