"""Import/create groups into the system.

This is registered as console script in setup.py.

"""
import argparse
import inspect
import logging
import json
import sys

import adhocracy_core.sheets.principal
import transaction
from adhocracy_core.interfaces import IResource
from pyramid.paster import bootstrap
from pyramid.registry import Registry
from substanced.util import find_service
from adhocracy_core.resources.principal import IGroup


logger = logging.getLogger(__name__)


groups_epilog = """The JSON file contains the name identifier of the user
group to create and a simplified serialization of the sheets data.

Example::

[
  {"name": "Alice", "roles": ["contributor"], "groups": ["gods"]},
]
"""


def import_groups():  # pragma: no cover
    """Import groups from a JSON file.

    Already existing groups will have their roles updated.

    usage::

        bin/import_groups etc/development.ini  <filename>
    """
    docstring = inspect.getdoc(import_groups)
    parser = argparse.ArgumentParser(description=docstring,
                                     epilog=groups_epilog)
    parser.add_argument('ini_file',
                        help='path to the adhocracy backend ini file')
    parser.add_argument('filename',
                        type=str,
                        help='file containing the groups')
    args = parser.parse_args()
    env = bootstrap(args.ini_file)
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)
    _import_groups(env['root'], env['registry'], args.filename)
    env['closer']()


def _import_groups(context: IResource, registry: Registry, filename: str):
    groups_info = _load_groups_info(filename)
    groups = find_service(context, 'principals', 'groups')
    for group_info in groups_info:
        name = group_info['name']
        if name in groups.keys():
            _update_group(group_info, groups, registry)
            logger.info('Updating group {}'.format(name))
        else:
            _create_group(group_info, registry, groups)
            logger.info('Creating group {}'.format(name))
    transaction.commit()


def _load_groups_info(filename: str) -> [dict]:
    with open(filename, 'r') as f:
        return json.load(f)


def _update_group(group_info: dict, groups: IResource, registry: Registry):
    group = groups[group_info['name']]
    group_sheet = registry.content.get_sheet(
        group,
        adhocracy_core.sheets.principal.IGroup)
    group_sheet.set({'roles': group_info['roles']})


def _create_group(group_info: dict, registry: Registry, groups: IResource):
    appstructs = {adhocracy_core.sheets.principal.IGroup.__identifier__:
                  {'roles': group_info['roles']},
                  adhocracy_core.sheets.name.IName.__identifier__:
                  {'name': group_info['name']},
                  }
    registry.content.create(IGroup.__identifier__, groups,
                            appstructs=appstructs,
                            registry=registry)
