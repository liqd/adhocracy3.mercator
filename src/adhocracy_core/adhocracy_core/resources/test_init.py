from mock import MagicMock
from pyramid import testing
from pytest import raises
from pytest import fixture

from adhocracy_core.interfaces import ISheet
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.sheets import sheet_meta
from adhocracy_core.testing import create_event_listener
from adhocracy_core.testing import register_sheet


class ISheetY(ISheet):
    pass


class ISheetX(ISheet):
    pass


@fixture
def resource_meta(resource_meta):
    from adhocracy_core.resources.base import Base
    return resource_meta._replace(iresource=IResource,
                                  content_class=Base)


class TestAddResourceTypeToRegistry:

    def make_one(self, *args):
        from adhocracy_core.resources import add_resource_type_to_registry
        return add_resource_type_to_registry(*args)

    def test_raise_if_duplicated_sheets(self, config, resource_meta):
        from adhocracy_core.exceptions import ConfigurationError
        config.include('adhocracy_core.content')
        resource_meta = resource_meta._replace(basic_sheets=(ISheet,),
                                               extended_sheets=(ISheet,))
        with raises(ConfigurationError):
            self.make_one(resource_meta, config)

    def test_add_resource_type(self, config, resource_meta):
        config.include('adhocracy_core.content')
        self.make_one(resource_meta, config)
        resource = config.registry.content.create(IResource.__identifier__)
        assert IResource.providedBy(resource)

    def test_add_resource_type_metadata(self, config, registry, resource_meta):
        config.include('adhocracy_core.content')
        iresource = IResource
        resource_type = iresource.__identifier__
        self.make_one(resource_meta, config)
        assert registry.content.meta[resource_type]['content_name'] ==\
               resource_type  # substance uses strings for content type ids
        assert registry.content.resources_meta[iresource] == \
               resource_meta  # adhocracy uses interfaces for content types ids

    def test_add_resource_type_metadata_with_content_name(self, config, resource_meta):
        config.include('adhocracy_core.content')
        type_id = IResource.__identifier__
        metadata_a = resource_meta._replace(content_name='Name')
        self.make_one(metadata_a, config)
        assert config.registry.content.meta[type_id]['content_name'] == 'Name'

    def test_add_sdi_view_name_if_is_sdi_addable(self, config, resource_meta):
        from adhocracy_core.sdi import add_sdi_add_view
        config.include('adhocracy_core.content')
        config.add_sdi_add_view = MagicMock(spec=add_sdi_add_view)
        type_id = IResource.__identifier__
        resource_meta = resource_meta._replace(is_sdi_addable=True)
        self.make_one(resource_meta, config)
        assert config.registry.content.meta[type_id]['add_view']\
               == 'add_' + type_id
        config.add_sdi_add_view.assert_called_with(resource_meta.iresource,
                                                   'add_' + type_id)


class TestResourceFactory:

    @fixture
    def registry(self, registry_with_content):
        return registry_with_content

    @fixture
    def mock_mod_date(self, monkeypatch):
        from adhocracy_core.utils import now
        date = now()
        monkeypatch.setattr('adhocracy_core.resources.get_modification_date',
                            lambda x: date)
        return date

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
        meta = resource_meta._replace(basic_sheets=(ISheetY,),
                                      extended_sheets=(ISheetX,))
        inst = self.make_one(meta)()
        assert ISheetX.providedBy(inst)
        assert ISheetY.providedBy(inst)

    def test_call_with_after_create(self, resource_meta, registry):
        def dummy_after_create(context, registry, options):
            context._options = options
            context._registry = registry
        meta = resource_meta._replace(iresource=IResource,
                                      after_creation=(dummy_after_create,))

        inst = self.make_one(meta)(creator=None, kwarg1=True)

        assert inst._options == {'kwarg1': True, 'creator': None}
        assert inst._registry is registry

    def test_call_without_run_after_create(self, resource_meta):
        def dummy_after_create(context, registry, options):
            context._options = options
            context._registry = registry

        meta = resource_meta._replace(iresource=IResource,
                                      after_creation=(dummy_after_create,))

        inst = self.make_one(meta)(run_after_create=False)

        with raises(AttributeError):
            inst.test

    def test_call_with_non_exisiting_sheet_appstructs_data(
            self, resource_meta, registry):
        from adhocracy_core.exceptions import RuntimeConfigurationError
        meta = resource_meta
        appstructs = {ISheetY.__identifier__: {'count': 0}}
        registry.content.get_sheet.side_effect = RuntimeConfigurationError
        with raises(RuntimeConfigurationError):
            self.make_one(meta)(appstructs=appstructs, registry=registry)

    def test_call_with_creatable_appstructs_data(self, resource_meta, registry,
                                                 mock_sheet):
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(ISheetY,))
        register_sheet(None, mock_sheet, registry, ISheetY)
        appstructs = {ISheetY.__identifier__: {'count': 0}}

        self.make_one(meta)(appstructs=appstructs)

        assert mock_sheet.set.call_args[0] == ({'count': 0},)
        assert mock_sheet.set.call_args[1]['send_event'] is False

    def test_call_with_not_creatable_appstructs_data(self, resource_meta,
                                                     registry, mock_sheet):
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(ISheetY,))
        register_sheet(None, mock_sheet, registry, ISheetY)
        mock_sheet.meta = sheet_meta._replace(creatable=False)
        appstructs = {ISheetY.__identifier__: {'count': 0}}

        self.make_one(meta)(appstructs=appstructs)

        assert not mock_sheet.set.called

    def test_call_with_parent_and_appstructs_name_data(
            self, resource_meta, registry, pool, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(IName,))
        register_sheet(None, mock_sheet, registry, IName)
        mock_sheet.set.return_value = False
        appstructs = {IName.__identifier__: {'name': 'child'}}

        self.make_one(meta)(parent=pool, appstructs=appstructs)

        assert 'child' in pool
        assert mock_sheet.set.called

    def test_call_with_parent_and_no_name_appstruct(self, resource_meta, pool):
        meta = resource_meta
        with raises(KeyError):
            self.make_one(meta)(parent=pool, appstructs={})

    def test_call_with_parent_and_name_appstruct(self, resource_meta, registry,
                                                 pool, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(IName,))
        appstructs = {IName.__identifier__: {'name': 'name'}}
        register_sheet(None, mock_sheet, registry, IName)
        inst = self.make_one(meta)(parent=pool, appstructs=appstructs)

        assert inst.__parent__ == pool
        assert inst.__name__ in pool
        assert inst.__name__ == 'name'

    def test_call_with_parent_and_non_unique_name_appstruct(
            self, resource_meta, registry, pool, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(IName,))
        appstructs = {IName.__identifier__: {'name': 'name'}}
        register_sheet(None, mock_sheet, registry, IName)
        pool['name'] = testing.DummyResource()

        with raises(KeyError):
            self.make_one(meta)(parent=pool, appstructs=appstructs)

    def test_call_with_parent_and_empty_name_data(self, resource_meta, pool,
                                                  registry, mock_sheet):
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(IName,))
        appstructs = {'adhocracy_core.sheets.name.IName': {'name': ''}}
        register_sheet(None, mock_sheet, registry, IName)

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

    def test_call_with_parent_and_use_autonaming_random(self, resource_meta,
                                                       pool):
        meta = resource_meta._replace(iresource=IResource,
                                      use_autonaming_random=True)

        resource = self.make_one(meta)(parent=pool)
        assert len(resource.__name__) >= 40

    def test_with_parent_and_resource_implements_postpool(self, pool, resource_meta, registry, mock_sheet):
        from adhocracy_core.interfaces import IServicePool
        meta = resource_meta._replace(iresource=IServicePool,
                                      content_name='Service')

        resource = self.make_one(meta)(parent=pool)
        assert 'Service' in pool


    def test_without_creator_and_resource_implements_imetadata(
            self, resource_meta, registry, mock_sheet, mock_mod_date):
        from adhocracy_core.sheets.metadata import IMetadata
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(IMetadata,))
        register_sheet(None, mock_sheet, registry, IMetadata)

        self.make_one(meta)()

        set_appstructs = mock_sheet.set.call_args[0][0]
        assert set_appstructs['creator'] is None
        assert set_appstructs['modified_by'] is None
        assert set_appstructs['creation_date'] == mock_mod_date
        assert set_appstructs['item_creation_date'] == mock_mod_date
        assert set_appstructs['modification_date'] == mock_mod_date
        set_send_event = mock_sheet.set.call_args[1]['send_event']
        assert set_send_event is False

    def test_without_parent_and_resource_implements_imetadata_and_itemversion(
            self, resource_meta, registry, mock_sheet):
        from adhocracy_core.sheets.metadata import IMetadata
        from adhocracy_core.interfaces import IItemVersion
        meta = resource_meta._replace(iresource=IItemVersion,
                                      basic_sheets=(IMetadata,))
        register_sheet(None, mock_sheet, registry, IMetadata)

        self.make_one(meta)()

        set_appstructs = mock_sheet.set.call_args[0][0]
        assert set_appstructs['item_creation_date'] == set_appstructs['creation_date']

    def test_with_parent_and_resource_implements_imetadata_and_itemversion(
            self, item, resource_meta, registry, mock_sheet):
        from datetime import datetime
        from adhocracy_core.sheets.metadata import IMetadata
        from adhocracy_core.interfaces import IItemVersion
        from adhocracy_core.sheets.name import IName
        meta = resource_meta._replace(iresource=IItemVersion,
                                      basic_sheets=(IMetadata, IName))
        registry.content.get_sheet.side_effect = [mock_sheet, mock_sheet,
                                                  mock_sheet, mock_sheet]
        item_creation_date = datetime.today()
        mock_sheet.get.return_value = {'creation_date': item_creation_date}

        self.make_one(meta)(parent=item, appstructs={IName.__identifier__: {'name': 'N'}})

        set_appstructs = mock_sheet.set.call_args[0][0]
        assert set_appstructs['item_creation_date'] == item_creation_date

    def test_with_creator_and_resource_implements_imetadata(
            self, resource_meta, registry, mock_sheet):
        from adhocracy_core.sheets.metadata import IMetadata
        from pyramid.traversal import resource_path
        meta = resource_meta._replace(iresource=IResource,
                                      basic_sheets=(IMetadata,))
        register_sheet(None, mock_sheet, registry, IMetadata)
        authenticated_user = testing.DummyResource()

        resource = self.make_one(meta)(creator=authenticated_user)

        set_appstructs = mock_sheet.set.call_args[0][0]
        assert set_appstructs['creator'] == authenticated_user
        assert set_appstructs['modified_by'] == authenticated_user
        userid = resource_path(authenticated_user)
        assert resource.__local_roles__ == {userid: {'role:creator'}}

    def test_with_creator_and_resource_implements_imetadata_and_iuser(
            self, resource_meta, registry, mock_sheet):
        from adhocracy_core.resources.principal import IUser
        from adhocracy_core.sheets.metadata import IMetadata
        from pyramid.traversal import resource_path
        meta = resource_meta._replace(iresource=IUser,
                                      basic_sheets=(IMetadata,))
        register_sheet(None, mock_sheet, registry, IMetadata)
        authenticated_user = object()

        created_user = self.make_one(meta)(creator=authenticated_user)

        set_appstructs = mock_sheet.set.call_args[0][0]
        assert set_appstructs['creator'] == created_user
        assert set_appstructs['modified_by'] == created_user
        userid = resource_path(created_user)
        assert created_user.__local_roles__[userid] == {'role:creator'}

    def test_notify_new_resource_created_and_added(self, resource_meta, config, pool):
        events = create_event_listener(config, IResourceCreatedAndAdded)
        meta = resource_meta._replace(iresource=IResource, use_autonaming=True)
        user = testing.DummyResource()

        resource = self.make_one(meta)(parent=pool, creator=user)

        assert IResourceCreatedAndAdded.providedBy(events[0])
        assert events[0].object == resource
        assert events[0].parent == pool

    def test_notify_new_resource_created_and_added_ignore_if_not_send_event(
            self, resource_meta, config, pool):
        events = create_event_listener(config, IResourceCreatedAndAdded)
        meta = resource_meta._replace(iresource=IResource, use_autonaming=True)
        user = testing.DummyResource()

        self.make_one(meta)(parent=pool, creator=user, send_event=False)

        assert len(events) == 0

    def test_notify_new_resource_created_and_added_without_parent(
        self, resource_meta, config, pool):
        events = create_event_listener(config, IResourceCreatedAndAdded)
        meta = resource_meta._replace(iresource=IResource, use_autonaming=True)
        self.make_one(meta)(parent=None)
        assert len(events) == 0

    def test_notify_new_resource_created_and_added_without_parent_but_is_IRootPool(
        self, resource_meta, config, pool):
        from adhocracy_core.resources.root import IRootPool
        events = create_event_listener(config, IResourceCreatedAndAdded)
        meta = resource_meta._replace(iresource=IRootPool, use_autonaming=True)
        self.make_one(meta)(parent=None)
        assert len(events) == 1
