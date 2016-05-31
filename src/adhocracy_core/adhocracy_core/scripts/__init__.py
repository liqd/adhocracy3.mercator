"""adhocracy_core scripts."""

import logging
import json
import os
from pathlib import Path

from pyramid.asset import resolve_asset_spec
from pyramid.path import package_path
from pyramid.request import Request
from pyramid.registry import Registry
from pyramid.traversal import find_resource
from pyramid.traversal import get_current_registry
from pyramid.traversal import resource_path
from pyrsistent import PMap
from pyrsistent import freeze
from pyrsistent import ny
from substanced.interfaces import IUserLocator
from zope.interface.interfaces import IInterface

from adhocracy_core.authorization import create_fake_god_request
from adhocracy_core.authorization import set_local_roles
from adhocracy_core.exceptions import ConfigurationError
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import ISheet
from adhocracy_core.schema import ContentType
from adhocracy_core.sheets.name import IName
from adhocracy_core.scripts.import_groups import _import_groups
from adhocracy_core.scripts.import_users import _import_users
from adhocracy_core.scripts.set_workflow_state import _set_workflow_state

logger = logging.getLogger(__name__)


def import_resources(root: IResource, registry: Registry, filename: str):
    """Import resources from a JSON file with dummy `god` user."""
    request = create_fake_god_request(registry)
    resources_info = _load_info(filename)
    for resource_info in resources_info:
        expected_path = _get_expected_path(resource_info)
        if _resource_exists(expected_path, root):
            logger.info('Skipping {}'.format(expected_path))
        else:
            logger.info('Creating {}'.format(expected_path))
            _create_resource(freeze(resource_info), request, registry, root)


def _get_expected_path(resource_info: dict) -> str:
    name_field = resource_info['data'].get(IName.__identifier__, {})
    name = name_field.get('name', '')
    path = name and os.path.join(resource_info['path'], name)
    return path


def _resource_exists(expected_path: dict, context: IResource) -> bool:
    try:
        find_resource(context, expected_path)
        return True
    except KeyError:
        return False


def _create_resource(resource_info: PMap,
                     request: Request,
                     registry: Registry,
                     root: IPool):
    iresource = _deserialize_content_type(resource_info)
    parent = find_resource(root, resource_info['path'])
    resource_info = _resolve_users(resource_info, root, registry, request)
    appstructs = _deserialize_data(resource_info, parent, registry, request)
    creator = _get_creator(resource_info, root, registry, request)
    registry.content.create(iresource.__identifier__,
                            parent=parent,
                            appstructs=appstructs,
                            registry=registry,
                            request=request,
                            creator=creator,
                            )


def _load_info(filename: str) -> [dict]:
    with open(filename, 'r') as f:
        return json.load(f)


def _resolve_users(resource_info: PMap,
                   root: IResource,
                   registry: Registry,
                   request: Request) -> PMap:
    """Resolve strings containing "user_by_name: <username>".

    Strings of this form are resolved to the user's path.

    """
    def _resolve_user(s):
        if not isinstance(s, str) or not s.startswith('user_by_login:'):
            return s
        user_locator = registry.getMultiAdapter((root, request),
                                                IUserLocator)
        user_name = s.split('user_by_login:')[1]
        user = user_locator.get_user_by_login(user_name)
        if user is None:
            raise ValueError('No such user: {}.'.format(user_name))
        return resource_path(user)

    return resource_info.transform(['data', ny, ny], _resolve_user)


def _deserialize_content_type(resource_info: dict) -> IInterface:
    schema = ContentType().bind(creating=True)
    iresource = schema.deserialize(resource_info['content_type'])
    return iresource


def _deserialize_data(resource_info: dict,
                      parent: IPool,
                      registry: Registry,
                      request: Request) -> dict:
    appstructs = {}
    iresource = _deserialize_content_type(resource_info)
    data = resource_info['data']
    sheets = registry.content.get_sheets_create(parent, iresource=iresource,
                                                request=request)
    for sheet in sheets:
        sheet_name = sheet.meta.isheet.__identifier__
        if sheet_name not in data:
            continue
        appstruct = sheet.deserialize(data[sheet_name])
        appstructs[sheet_name] = appstruct
    return appstructs


def _get_creator(resource_info: dict,
                 context: IResource,
                 registry: Registry,
                 request: Request) -> IResource:
    creator_name = resource_info.get('creator', None)
    if not creator_name:
        return None
    locator = registry.getMultiAdapter((context, request), IUserLocator)
    creator = locator.get_user_by_login(creator_name)
    return creator


def import_local_roles(context: IResource, registry: Registry, filename: str):
    """Import/set local roles from a JSON file."""
    multi_local_roles_info = _load_info(filename)
    for local_roles_info in multi_local_roles_info:
        _set_local_roles(local_roles_info, context, registry)


def _set_local_roles(local_roles_info: dict, context: IResource,
                     registry: Registry):
    resource = find_resource(context, local_roles_info['path'])
    local_roles_info['roles'] = _deserialize_roles(local_roles_info['roles'])
    set_local_roles(resource, local_roles_info['roles'], registry=registry)


def _deserialize_roles(roles: dict) -> dict:
    for k, v in roles.items():
        roles[k] = set(v)
    return roles


def append_cvs_field(result: list, content: str):
    """Normalize and append content for CVS."""
    result.append(normalize_text_for_cvs(content))


def normalize_text_for_cvs(s: str) -> str:
    """Normalize text to put it in CVS."""
    return s.replace(';', '')


def get_sheet_field_for_partial(sheet: ISheet,
                                field: str,
                                resource: IResource) -> object:
    """Get sheet field with resource as last parameter to use with partial."""
    registry = get_current_registry(resource)
    return registry.content.get_sheet_field(resource, sheet, field)


def import_fixture(asset: str, root: IPool, registry: Registry,
                   log_only=False):
    """Import files in fixture directory defined by :term:`asset` ."""
    fixture = _asset_to_fixture(asset)
    imports = _get_import_files(fixture)
    for import_type, import_file in imports:
        print('Import type "{}" file "{}"'.format(import_type, import_file))
        if log_only:
            continue
        if import_type == 'groups':
            _import_groups(root, registry, import_file)
            # TODO don't use private functions
        elif import_type == 'users':
            _import_users(root, registry, import_file)
        elif import_type == 'resources':
            import_resources(root, registry, import_file)
        elif import_type == 'local_roles':
            import_local_roles(root, registry, import_file)
        elif import_type == 'states':
            _import_workflow_states(root, registry, import_file)


def _asset_to_fixture(asset: str) -> Path:
    """Translate :term:`asset` to absolute fixture path."""
    package_name, file_name = resolve_asset_spec(asset)
    if package_name:
        package = __import__(package_name)
        path = Path(package_path(package), file_name)
    else:
        path = Path(file_name)
    if not path.is_dir():
        msg = 'This is not a directory {}'.format(asset)
        raise ConfigurationError(details=msg)
    return path


def _get_import_files(fixture: Path) -> [tuple]:
    allowed_types = ['groups', 'users', 'resources', 'local_roles', 'states']
    import_files = []
    for sub_dir in fixture.iterdir():
        if sub_dir.name in allowed_types:
            for import_file in sub_dir.iterdir():
                import_files.append((sub_dir.name, str(import_file)))
        else:
            msg = 'This is not a valid type directory {}'.format(sub_dir)
            raise ConfigurationError(details=msg)
    return sorted(import_files, key=lambda x: allowed_types.index(x[0]))


def _import_workflow_states(root: IResource, registry: Registry,
                            filename: str):
    with open(filename) as import_file:
        lines = [str(line).strip() for line in import_file.readlines()]
    states = {line.split(':')[0]: line.split(':')[1].split('->')
              for line in lines}
    for path, states in states.items():
        logger.info('Set workflow state for {} to {}'.format(path, states))
        _set_workflow_state(root,
                            registry,
                            path,
                            states,
                            absolute=True,
                            reset=True)
