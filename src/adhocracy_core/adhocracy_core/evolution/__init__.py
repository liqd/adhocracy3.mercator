"""Scripts to migrate legacy objects in existing databases."""
import logging
from functools import wraps

from BTrees.Length import Length
from persistent.mapping import PersistentMapping
from pyramid.registry import Registry
from pyramid.threadlocal import get_current_registry
from substanced.evolution import add_evolution_step
from substanced.interfaces import IFolder
from substanced.util import find_service
from zope.interface import alsoProvides
from zope.interface import directlyProvides
from zope.interface import noLongerProvides
from zope.interface.interfaces import IInterface

from adhocracy_core.catalog import ICatalogsService
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import ISimple
from adhocracy_core.interfaces import ResourceMetadata
from adhocracy_core.interfaces import search_query
from adhocracy_core.resources.asset import IAsset
from adhocracy_core.resources.asset import IPoolWithAssets
from adhocracy_core.resources.asset import add_assets_service
from adhocracy_core.resources.badge import IBadgeAssignmentsService
from adhocracy_core.resources.badge import add_badge_assignments_service
from adhocracy_core.resources.badge import add_badges_service
from adhocracy_core.resources.comment import ICommentVersion
from adhocracy_core.resources.organisation import IOrganisation
from adhocracy_core.resources.pool import IBasicPool
from adhocracy_core.resources.principal import IUser
from adhocracy_core.resources.principal import IUsersService
from adhocracy_core.resources.process import IProcess
from adhocracy_core.resources.proposal import IProposal
from adhocracy_core.resources.proposal import IProposalVersion
from adhocracy_core.resources.relation import add_relationsservice
from adhocracy_core.sheets.asset import IHasAssetPool
from adhocracy_core.sheets.badge import IBadgeable
from adhocracy_core.sheets.badge import IHasBadgesPool
from adhocracy_core.sheets.badge import ICanBadge
from adhocracy_core.sheets.description import IDescription
from adhocracy_core.sheets.image import IImageReference
from adhocracy_core.sheets.pool import IPool
from adhocracy_core.sheets.principal import IUserExtended
from adhocracy_core.sheets.relation import ICanPolarize
from adhocracy_core.sheets.relation import IPolarizable
from adhocracy_core.sheets.title import ITitle
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.sheets.workflow import IWorkflowAssignment
from adhocracy_core.utils import has_annotation_sheet_data

logger = logging.getLogger(__name__)


def migrate_to_attribute_storage(context: IPool, isheet: IInterface):
    """Migrate sheet data for`isheet` from annotation to attribute storage."""
    registry = get_current_registry(context)
    sheet_meta = registry.content.sheets_meta[isheet]
    isheet_name = sheet_meta.isheet.__identifier__
    annotation_key = '_sheet_' + isheet_name.replace('.', '_')
    catalogs = find_service(context, 'catalogs')
    resources = _search_for_interfaces(catalogs, isheet)
    count = len(resources)
    logger.info('Migrating {0} resources with {1} to attribute storage'
                .format(count, isheet))
    for index, resource in enumerate(resources):
        data = resource.__dict__
        if annotation_key in data:
            logger.info('Migrating resource {0} of {1}'
                        .format(index + 1, count))
            for field, value in data[annotation_key].items():
                setattr(resource, field, value)
            delattr(resource, annotation_key)


def migrate_new_sheet(context: IPool,
                      iresource: IInterface,
                      isheet: IInterface,
                      isheet_old: IInterface=None,
                      remove_isheet_old=False,
                      fields_mapping: [(str, str)]=[]):
    """Add new `isheet` to `iresource` resources and migrate field values.

    :param context: Pool to search for `iresource` resources
    :param iresource: resource type to migrate
    :param isheet: new sheet interface to add
    :param isheet_old: old sheet interface to migrate,
        must not be None if `fields_mapping` or `remove_isheet_old` is set.
    :param remove_isheet_old: remove old sheet interface
    :param fields_mapping: list of (field name, old field name) to
                           migrate field values.
    """
    registry = get_current_registry(context)
    catalogs = find_service(context, 'catalogs')
    interfaces = isheet_old and (isheet_old, iresource) or iresource
    query = search_query._replace(interfaces=interfaces,
                                  resolve=True)
    resources = catalogs.search(query).elements
    count = len(resources)
    logger.info('Migrating {0} {1} to new sheet {2}'.format(count, iresource,
                                                            isheet))
    for index, resource in enumerate(resources):
        logger.info('Migrating {0} of {1}: {2}'.format(index + 1, count,
                                                       resource))
        logger.info('Add {0}  sheet'.format(isheet))
        alsoProvides(resource, isheet)
        if fields_mapping:
            _migrate_field_values(registry, resource, isheet, isheet_old,
                                  fields_mapping)
        if remove_isheet_old:
            logger.info('Remove {0} sheet'.format(isheet_old))
            noLongerProvides(resource, isheet_old)
        catalogs.reindex_index(resource, 'interfaces')


def migrate_new_iresource(context: IResource,
                          old_iresource: IInterface,
                          new_iresource: IInterface):
    """Migrate resources with `old_iresource` interface to `new_iresource`."""
    meta = _get_resource_meta(context, new_iresource)
    catalogs = find_service(context, 'catalogs')
    resources = _search_for_interfaces(catalogs, old_iresource)
    for resource in resources:
        logger.info('Migrate iresource of {0}'.format(resource))
        noLongerProvides(resource, old_iresource)
        directlyProvides(resource, new_iresource)
        for sheet in meta.basic_sheets + meta.extended_sheets:
            alsoProvides(resource, sheet)
        catalogs.reindex_index(resource, 'interfaces')


def _get_resource_meta(context: IResource,
                       iresource: IInterface) -> ResourceMetadata:
    registry = get_current_registry(context)
    meta = registry.content.resources_meta[iresource]
    return meta


def _search_for_interfaces(catalogs: ICatalogsService,
                           interfaces: (IInterface)) -> [IResource]:
    query = search_query._replace(interfaces=interfaces, resolve=True)
    resources = catalogs.search(query).elements
    return resources


def log_migration(func):
    """Decorator for the migration scripts.

    The decorator logs the call to the evolve script.
    """
    logger = logging.getLogger(func.__module__)

    @wraps(func)
    def logger_decorator(*args, **kwargs):
        logger.info('Running evolve step: ' + func.__doc__)
        func(*args, **kwargs)
        logger.info('Finished evolve step: ' + func.__doc__)

    return logger_decorator


def _migrate_field_values(registry: Registry, resource: IResource,
                          isheet: IInterface, isheet_old: IInterface,
                          fields_mapping=[(str, str)]):
    sheet = registry.content.get_sheet(resource, isheet)
    old_sheet = registry.content.get_sheet(resource, isheet_old)
    appstruct = {}
    for field, old_field in fields_mapping:
        old_appstruct = old_sheet.get()
        if old_field in old_appstruct:
            logger.info('Migrate value for field {0}'.format(field))
            appstruct[field] = old_appstruct[old_field]
            old_sheet.delete_field_values([old_field])
    sheet.set(appstruct)


def _get_autonaming_prefixes(registry: Registry) -> [str]:
    """Return all autonaming_prefixes defined in the resources metadata."""
    meta = registry.content.resources_meta.values()
    prefixes = [m.autonaming_prefix for m in meta if m.use_autonaming]
    return list(set(prefixes))


def _get_used_autonaming_prefixes(pool: IPool,  # pragma: no cover
                                  prefixes: [str]) -> [str]:
    used_prefixes = set()
    for child_name in pool:
        for prefix in prefixes:
            if child_name.startswith(prefix):
                used_prefixes.add(prefix)
    return list(used_prefixes)


@log_migration
def evolve1_add_title_sheet_to_pools(root: IPool,
                                     registry: Registry):  # pragma: no cover
    """Add title sheet to basic pools and asset pools."""
    migrate_new_sheet(root, IBasicPool, ITitle)
    migrate_new_sheet(root, IPoolWithAssets, ITitle)


def add_kiezkassen_permissions(root):  # pragma: no cover
    """(disabled) Add permission to use the kiezkassen process."""


@log_migration
def upgrade_catalogs(root, registry):  # pragma: no cover
    """Upgrade catalogs."""
    old_catalogs = root['catalogs']

    old_catalogs.move('system', root, 'old_system_catalog')
    old_catalogs.move('adhocracy', root, 'old_adhocracy_catalog')

    del root['catalogs']

    registry.content.create(ICatalogsService.__identifier__, parent=root)

    catalogs = root['catalogs']
    del catalogs['system']
    del catalogs['adhocracy']
    root.move('old_system_catalog', catalogs, 'system')
    root.move('old_adhocracy_catalog', catalogs, 'adhocracy')


@log_migration
def make_users_badgeable(root, registry):  # pragma: no cover
    """Add badge services and make user badgeable."""
    principals = find_service(root, 'principals')
    if not IHasBadgesPool.providedBy(principals):
        logger.info('Add badges service to {0}'.format(principals))
        add_badges_service(principals, registry, {})
        alsoProvides(principals, IHasBadgesPool)
    users = find_service(root, 'principals', 'users')
    assignments = find_service(users, 'badge_assignments')
    if assignments is None:
        logger.info('Add badge assignments service to {0}'.format(users))
        add_badge_assignments_service(users, registry, {})
    migrate_new_sheet(root, IUser, IBadgeable)


@log_migration
def make_proposals_badgeable(root, registry):  # pragma: no cover
    """Add badge services processes and make proposals badgeable."""
    catalogs = find_service(root, 'catalogs')
    proposals = _search_for_interfaces(catalogs, IProposal)
    for proposal in proposals:
        if not IBadgeable.providedBy(proposal):
            logger.info('add badgeable interface to {0}'.format(proposal))
            alsoProvides(proposal, IBadgeable)
        if 'badge_assignments' not in proposal:
            logger.info('add badge assignments to {0}'.format(proposal))
            add_badge_assignments_service(proposal, registry, {})
    processes = _search_for_interfaces(catalogs, IProcess)
    for process in processes:
        if not IHasBadgesPool.providedBy(process):
            logger.info('Add badges service to {0}'.format(process))
            add_badges_service(process, registry, {})
            alsoProvides(process, IHasBadgesPool)


@log_migration
def change_pools_autonaming_scheme(root, registry):  # pragma: no cover
    """Change pool autonaming scheme."""
    prefixes = _get_autonaming_prefixes(registry)
    catalogs = find_service(root, 'catalogs')
    pools = _search_for_interfaces(catalogs, (IPool, IFolder))
    count = len(pools)
    for index, pool in enumerate(pools):
        logger.info('Migrating {0} of {1}: {2}'.format(index + 1, count, pool))
        if hasattr(pool, '_autoname_last'):
            pool._autoname_lasts = PersistentMapping()
            for prefix in prefixes:
                pool._autoname_lasts[prefix] = Length(pool._autoname_last + 1)
            del pool._autoname_last
        elif not hasattr(pool, '_autoname_lasts'):
            pool._autoname_lasts = PersistentMapping()
            for prefix in prefixes:
                pool._autoname_lasts[prefix] = Length()
        if hasattr(pool, '_autoname_lasts'):
            # convert int to Length
            for prefix in pool._autoname_lasts.keys():
                if isinstance(pool._autoname_lasts[prefix], int):
                    pool._autoname_lasts[prefix] \
                        = Length(pool._autoname_lasts[prefix].value)
                elif isinstance(pool._autoname_lasts[prefix].value, Length):
                    pool._autoname_lasts[prefix] = Length(1)
            # convert dict to PersistentMapping
            if not isinstance(pool._autoname_lasts, PersistentMapping):
                pool._autoname_lasts = PersistentMapping(pool._autoname_lasts)


@log_migration
def hide_password_resets(root, registry):  # pragma: no cover
    """Add hide all password reset objects."""
    from adhocracy_core.resources.principal import hide
    from adhocracy_core.resources.principal import deny_view_permission
    resets = find_service(root, 'principals', 'resets')
    hidden = getattr(resets, 'hidden', False)
    if not hidden:
        logger.info('Deny view permission for {0}'.format(resets))
        deny_view_permission(resets, registry, {})

        logger.info('Hide {0}'.format(resets))
        hide(resets, registry, {})


@log_migration
def lower_case_users_emails(root, registry):  # pragma: no cover
    """Lower case users email, add 'private_user_email'/'user_name' index."""
    _update_adhocracy_catalog(root)
    catalogs = find_service(root, 'catalogs')
    users = find_service(root, 'principals', 'users')
    for user in users.values():
        if not IUserExtended.providedBy(user):
            return
        sheet = registry.content.get_sheet(user, IUserExtended)
        sheet.set({'email': user.email.lower()})
        catalogs.reindex_index(user, 'private_user_email')
        catalogs.reindex_index(user, 'user_name')


def _update_adhocracy_catalog(root):  # pragma: no cover
    """Add/Remove indexes for catalog `adhocracy`."""
    adhocracy = find_service(root, 'catalogs', 'adhocracy')
    adhocracy.update_indexes()


@log_migration
def remove_name_sheet_from_items(root, registry):  # pragma: no cover
    """Remove name sheet from items and items subtypes."""
    from adhocracy_core.sheets.name import IName
    from adhocracy_core.interfaces import IItem
    catalogs = find_service(root, 'catalogs')
    resources = _search_for_interfaces(catalogs, (IItem))
    count = len(resources)
    for index, resource in enumerate(resources):
        logger.info('Migrating {0} of {1}: {2}'.format(index + 1, count,
                                                       resource))
        logger.info('Remove {0} sheet'.format(IName))
        noLongerProvides(resource, IName)


@log_migration
def add_workflow_assignment_sheet_to_pools_simples(
        root, registry):  # pragma: no cover
    """Add generic workflow sheet to pools and simples."""
    migrate_new_sheet(root, IPool, IWorkflowAssignment)
    migrate_new_sheet(root, ISimple, IWorkflowAssignment)


@log_migration
def make_proposalversions_polarizable(root, registry):  # pragma: no cover
    """Make proposals polarizable and add relations pool."""
    catalogs = find_service(root, 'catalogs')
    proposals = _search_for_interfaces(catalogs, IProposal)
    for proposal in proposals:
        if 'relations' not in proposal:
            logger.info('add relations pool to {0}'.format(proposal))
            add_relationsservice(proposal, registry, {})
    migrate_new_sheet(root, IProposalVersion, IPolarizable)


@log_migration
def add_icanpolarize_sheet_to_comments(root, registry):  # pragma: no cover
    """Make comments ICanPolarize."""
    migrate_new_sheet(root, ICommentVersion, ICanPolarize)


@log_migration
def migrate_rate_sheet_to_attribute_storage(root,
                                            registry):  # pragma: no cover
    """Migrate rate sheet to attribute storage."""
    import adhocracy_core.sheets.rate
    migrate_to_attribute_storage(root, adhocracy_core.sheets.rate.IRate)


@log_migration
def move_autoname_last_counters_to_attributes(root,
                                              registry):  # pragma: no cover
    """Move autoname last counters of pools to attributes.

    Remove _autoname_lasts attribute.
    Instead add private attributes to store autoname last counter objects.
    Cleanup needless counter objects.
    """
    prefixes = _get_autonaming_prefixes(registry)
    catalogs = find_service(root, 'catalogs')
    pools = _search_for_interfaces(catalogs, (IPool, IFolder))
    count = len(pools)
    for index, pool in enumerate(pools):
        logger.info('Migrating resource {0} {1} of {2}'
                    .format(pool, index + 1, count))
        if hasattr(pool, '_autoname_last'):
            logger.info('Remove "_autoname_last" attribute')
            delattr(pool, '_autoname_last')
        if hasattr(pool, '_autoname_lasts'):
            used_prefixes = _get_used_autonaming_prefixes(pool, prefixes)
            for prefix in used_prefixes:
                is_badge_service = IBadgeAssignmentsService.providedBy(pool)
                if prefix == '' and not is_badge_service:
                    continue
                logger.info('Move counter object for prefix {0} to attribute'
                            .format(prefix))
                counter = pool._autoname_lasts.get(prefix, Length())
                if isinstance(counter, int):
                    counter = Length(counter)
                setattr(pool, '_autoname_last_' + prefix, counter)
            logger.info('Remove "_autoname_lasts" attribute')
            delattr(pool, '_autoname_lasts')


@log_migration
def move_sheet_annotation_data_to_attributes(root,
                                             registry):  # pragma: no cover
    """Move sheet annotation data to resource attributes.

    Remove `_sheets` dictionary to store sheets data annotations.
    Instead add private attributes for every sheet data annotation to resource.
    """
    catalogs = find_service(root, 'catalogs')
    query = search_query._replace(interfaces=(IResource,), resolve=True)
    resources = catalogs.search(query).elements
    count = len(resources)
    for index, resource in enumerate(resources):
        if not hasattr(resource, '_sheets'):
            continue
        logger.info('Migrating resource {0} of {1}'.format(index + 1, count))
        for data_key, appstruct in resource._sheets.items():
            annotation_key = '_sheet_' + data_key.replace('.', '_')
            if appstruct:
                setattr(resource, annotation_key, appstruct)
        delattr(resource, '_sheets')


@log_migration
def add_image_reference_to_users(root, registry):  # pragma: no cover
    """Add image reference to users and add assets service to users service."""
    users = find_service(root, 'principals', 'users')
    if not IHasAssetPool.providedBy(users):
        logger.info('Add assets service to {0}'.format(users))
        add_assets_service(users, registry, {})
    migrate_new_sheet(root, IUsersService, IHasAssetPool)
    migrate_new_sheet(root, IUser, IImageReference)


@log_migration
def remove_empty_first_versions(root, registry):  # pragma: no cover
    """Remove empty first versions."""
    catalogs = find_service(root, 'catalogs')
    items = _search_for_interfaces(catalogs, IItem)
    count = len(items)
    for index, item in enumerate(items):
        logger.info('Migrating resource {0} of {1}'.format(index + 1, count))
        if 'VERSION_0000000' not in item:
            continue
        first_version = item['VERSION_0000000']
        has_sheet_data = has_annotation_sheet_data(first_version)\
            or hasattr(first_version, 'rate')
        has_follower = _has_follower(first_version, registry)
        if not has_sheet_data and has_follower:
            logger.info('Delete empty version {0}.'.format(first_version))
            del item['VERSION_0000000']


def _is_version_without_data(version: IItemVersion)\
        -> bool:  # pragma: no cover
    for attribute in version.__dict__:
        if attribute.startswith('_sheet_'):
            return False
        if attribute == 'rate':
            return False
    else:
        return True


def _has_follower(version: IItemVersion,
                  registry: Registry) -> bool:  # pragma: no cover
    followed_by = registry.content.get_sheet_field(version,
                                                   IVersionable,
                                                   'followed_by')
    return followed_by != []


@log_migration
def update_asset_download_children(root, registry):  # pragma: no cover
    """Add asset downloads and update IAssetMetadata sheet."""
    from adhocracy_core.sheets.asset import IAssetMetadata
    from adhocracy_core.sheets.image import IImageMetadata
    from adhocracy_core.resources.asset import add_metadata
    from adhocracy_core.resources.image import add_image_size_downloads
    catalogs = find_service(root, 'catalogs')
    assets = _search_for_interfaces(catalogs, IAsset)
    count = len(assets)
    for index, asset in enumerate(assets):
        logger.info('Migrating resource {0} of {1}'.format(index + 1, count))
        old_downloads = [x for x in asset]
        for old in old_downloads:
            del asset[old]
        try:
            if IAssetMetadata.providedBy(asset):
                add_metadata(asset, registry)
            if IImageMetadata.providedBy(asset):
                add_image_size_downloads(asset, registry)
        except AttributeError:
            logger.warn('Asset {} has no downloads to migrate.'.format(asset))


@log_migration
def recreate_all_image_size_downloads(root, registry):  # pragma: no cover
    """Recreate all image size downloads to optimize file size."""
    from adhocracy_core.sheets.asset import IAssetMetadata
    from adhocracy_core.sheets.image import IImageMetadata
    from adhocracy_core.resources.image import add_image_size_downloads
    from adhocracy_core.resources.image import IImageDownload
    catalogs = find_service(root, 'catalogs')
    assets = _search_for_interfaces(catalogs, IAssetMetadata)
    images = [x for x in assets if IImageMetadata.providedBy(x)]
    count = len(images)
    for index, image in enumerate(images):
        logger.info('Migrating resource {0} of {1}'.format(index + 1, count))
        for old_download in image.values():
            if IImageDownload.providedBy(old_download):
                del image[old_download.__name__]
        add_image_size_downloads(image, registry)
        catalogs.reindex_index(image, 'interfaces')  # we missed reindexing


@log_migration
def remove_tag_resources(root, registry):  # pragma: no cover
    """Remove all ITag resources, create ITags sheet references instead."""
    from adhocracy_core.sheets.tags import ITags
    from adhocracy_core.interfaces import IItem
    catalogs = find_service(root, 'catalogs')
    items = _search_for_interfaces(catalogs, IItem)
    items_with_tags = [x for x in items if 'FIRST' in x]
    count = len(items_with_tags)
    for index, item in enumerate(items_with_tags):
        logger.info('Migrate tag resource {0} of {1}'.format(index + 1, count))
        del item['FIRST']
        del item['LAST']
        version_names = [x[0] for x in item.items()
                         if IItemVersion.providedBy(x[1])]
        version_names.sort()  # older version names are lower then younger ones
        first_version = version_names[0]
        last_version = version_names[-1]
        tags_sheet = registry.content.get_sheet(item, ITags)
        tags_sheet.set({'LAST': item[last_version],
                        'FIRST': item[first_version]})


@log_migration
def reindex_interfaces_catalog_for_root(root, registry):  # pragma: no cover
    """Reindex 'interfaces' catalog for root."""
    catalogs = find_service(root, 'catalogs')
    catalogs.reindex_index(root, 'interfaces')


@log_migration
def add_description_sheet_to_organisations(root, registry):  # pragma: no cover
    """Add description sheet to organisations."""
    migrate_new_sheet(root, IOrganisation, IDescription)


@log_migration
def add_description_sheet_to_processes(root, registry):  # pragma: no cover
    """Add description sheet to processes."""
    migrate_new_sheet(root, IProcess, IDescription)


@log_migration
def add_image_reference_to_organisations(root, registry):  # pragma: no cover
    """Add image reference to organisations and add assets service."""
    catalogs = find_service(root, 'catalogs')
    query = search_query._replace(interfaces=(IOrganisation,), resolve=True)
    organisations = catalogs.search(query).elements
    for organisation in organisations:
        if not IHasAssetPool.providedBy(organisation):
            logger.info('Add assets service to {0}'.format(organisation))
            add_assets_service(organisation, registry, {})
    migrate_new_sheet(root, IOrganisation, IHasAssetPool)
    migrate_new_sheet(root, IOrganisation, IImageReference)


def set_comment_count(root, registry):  # pragma: no cover
    """Set comment_count for all ICommentables."""
    from adhocracy_core.resources.subscriber import update_comments_count
    catalogs = find_service(root, 'catalogs')
    query = search_query._replace(interfaces=ICommentVersion,
                                  only_visible=True,
                                  resolve=True)
    comment_versions = catalogs.search(query).elements
    count = len(comment_versions)
    for index, comment in enumerate(comment_versions):
        logger.info('Set comment_count for resource {0} of {1}'
                    .format(index + 1, count))
        update_comments_count(comment, 1, registry)


def remove_duplicated_group_ids(root, registry):  # pragma: no cover
    """Remove duplicate group_ids from users."""
    from adhocracy_core.resources.principal import IUser
    catalogs = find_service(root, 'catalogs')
    users = _search_for_interfaces(catalogs, IUser)
    count = len(users)
    for index, user in enumerate(users):
        logger.info('Migrate user resource{0} of {1}'.format(index + 1, count))
        group_ids = getattr(user, 'group_ids', [])
        if not group_ids:
            continue
        unique_group_ids = list(set(group_ids))
        if len(unique_group_ids) < len(group_ids):
            logger.info('Remove duplicated groupd_ids for {0}'.format(user))
            user.group_ids = unique_group_ids


@log_migration
def add_image_reference_to_proposals(root, registry):  # pragma: no cover
    """Add description sheet to proposals."""
    migrate_new_sheet(root, IProposalVersion, IImageReference)


def reset_comment_count(root, registry):  # pragma: no cover
    """Reset comment_count for all ICommentables - See #2194, #2188."""
    from adhocracy_core.resources.comment import ICommentVersion
    from adhocracy_core.sheets.comment import ICommentable
    from adhocracy_core.resources.subscriber import update_comments_count
    catalogs = find_service(root, 'catalogs')
    query = search_query._replace(interfaces=ICommentable,
                                  only_visible=True,
                                  resolve=True)
    commentables = catalogs.search(query).elements
    count = len(commentables)
    for index, comment in enumerate(commentables):
        logger.info('Set comment_count to 0 for resource {0} of {1}'
                    .format(index + 1, count))
        commentable_sheet = registry.content.get_sheet(comment,
                                                       ICommentable)
        commentable_sheet.set({'comments_count': 0}, omit_readonly=False)

    query = search_query._replace(interfaces=ICommentVersion,
                                  only_visible=True,
                                  resolve=True,
                                  indexes={'tag': 'FIRST'})
    comment_versions = catalogs.search(query).elements
    count = len(comment_versions)
    for index, comment in enumerate(comment_versions):
        logger.info('Recalculate comment_count for resource {0} of {1}'
                    .format(index + 1, count))
        update_comments_count(comment, 1, registry)


@log_migration
def remove_is_service_attribute(root, registry):  # pragma: no cover
    """Remove __is_service__ attribute, use IService interface instead."""
    from adhocracy_core.interfaces import IServicePool
    catalogs = find_service(root, 'catalogs')
    for catalog in catalogs.values():
        if hasattr(catalog, '__is_service__'):
            delattr(catalog, '__is_service__')
        alsoProvides(catalogs, IServicePool)
        catalogs.reindex_index(catalog, 'interfaces')
    services = _search_for_interfaces(catalogs, IServicePool)
    for service in services:
        if hasattr(service, '__is_service__'):
            delattr(service, '__is_service__')


@log_migration
def add_canbadge_sheet_to_users(root, registry):  # pragma: no cover
    """Add canbadge sheet to users."""
    migrate_new_sheet(root, IUser, ICanBadge)


def enable_order_for_organisation(root, registry):  # pragma: no cover
    """Enable children order for organisations."""
    from adhocracy_core.resources.organisation import IOrganisation
    from adhocracy_core.resources.organisation import enabled_ordering
    catalogs = find_service(root, 'catalogs')
    resources = _search_for_interfaces(catalogs, IOrganisation)
    for resource in resources:
        logger.info('Enable ordering for {0}'.format(resource))
        enabled_ordering(resource, registry)


def includeme(config):  # pragma: no cover
    """Register evolution utilities and add evolution steps."""
    config.add_directive('add_evolution_step', add_evolution_step)
    config.scan('substanced.evolution.subscribers')
    config.add_evolution_step(upgrade_catalogs)
    config.add_evolution_step(evolve1_add_title_sheet_to_pools)
    config.add_evolution_step(add_kiezkassen_permissions)
    config.add_evolution_step(make_users_badgeable)
    config.add_evolution_step(change_pools_autonaming_scheme)
    config.add_evolution_step(hide_password_resets)
    config.add_evolution_step(lower_case_users_emails)
    config.add_evolution_step(remove_name_sheet_from_items)
    config.add_evolution_step(add_workflow_assignment_sheet_to_pools_simples)
    config.add_evolution_step(make_proposals_badgeable)
    config.add_evolution_step(move_sheet_annotation_data_to_attributes)
    config.add_evolution_step(migrate_rate_sheet_to_attribute_storage)
    config.add_evolution_step(move_autoname_last_counters_to_attributes)
    config.add_evolution_step(remove_empty_first_versions)
    config.add_evolution_step(make_proposalversions_polarizable)
    config.add_evolution_step(add_icanpolarize_sheet_to_comments)
    config.add_evolution_step(add_image_reference_to_users)
    config.add_evolution_step(update_asset_download_children)
    config.add_evolution_step(recreate_all_image_size_downloads)
    config.add_evolution_step(reindex_interfaces_catalog_for_root)
    config.add_evolution_step(remove_tag_resources)
    config.add_evolution_step(add_description_sheet_to_organisations)
    config.add_evolution_step(add_description_sheet_to_processes)
    config.add_evolution_step(add_image_reference_to_organisations)
    config.add_evolution_step(set_comment_count)
    config.add_evolution_step(remove_duplicated_group_ids)
    config.add_evolution_step(add_image_reference_to_proposals)
    config.add_evolution_step(reset_comment_count)
    config.add_evolution_step(remove_is_service_attribute)
    config.add_evolution_step(add_canbadge_sheet_to_users)
    config.add_evolution_step(enable_order_for_organisation)
