"""Basic Pool for specific Itemversions typically to create process content."""
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import ITag
from adhocracy_core.interfaces import IItem
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.pool import pool_meta
import adhocracy_core.sheets.name
import adhocracy_core.sheets.tags
import adhocracy_core.sheets.pool
import adhocracy_core.sheets.versions
from adhocracy_core.utils import get_iresource


def create_initial_content_for_item(context, registry, options):
    """Add first version and the Tags LAST and FIRST."""
    iresource = get_iresource(context)
    metadata = registry.content.resources_meta[iresource]
    item_type = metadata.item_type
    create = registry.content.create
    first_version = create(item_type.__identifier__, parent=context)

    tag_first_data = {'adhocracy_core.sheets.tags.ITag': {'elements':
                                                          [first_version]},
                      'adhocracy_core.sheets.name.IName': {'name': u'FIRST'}}
    create(ITag.__identifier__, parent=context, appstructs=tag_first_data)
    tag_last_data = {'adhocracy_core.sheets.tags.ITag': {'elements':
                                                         [first_version]},
                     'adhocracy_core.sheets.name.IName': {'name': u'LAST'}}
    create(ITag.__identifier__, parent=context, appstructs=tag_last_data)


item_meta = pool_meta._replace(
    iresource=IItem,
    basic_sheets=(adhocracy_core.sheets.tags.ITags,
                  adhocracy_core.sheets.versions.IVersions,
                  adhocracy_core.sheets.pool.IPool,
                  adhocracy_core.sheets.metadata.IMetadata,
                  adhocracy_core.sheets.workflow.IWorkflowAssignment,
                  ),
    element_types=(IItemVersion,
                   ITag,
                   ),
    after_creation=(create_initial_content_for_item,),
    item_type=IItemVersion,
    permission_create='create_item',
    use_autonaming=True,
    autonaming_prefix='item_'
)


item_basic_sheets_without_name = tuple([x for x in item_meta.basic_sheets if
                                        x != adhocracy_core.sheets.name.IName])


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(item_meta, config)
