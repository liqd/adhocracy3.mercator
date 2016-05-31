"""Import fixtures."""
import argparse
import logging
import sys
from argparse import RawDescriptionHelpFormatter

from pyramid.paster import bootstrap

from adhocracy_core.interfaces import IFixtureAsset
from .import_users import users_epilog
from .import_groups import groups_epilog
from .import_resources import resources_epilog
from .import_local_roles import roles_epilog
from . import import_fixture


logger = logging.getLogger(__name__)


fixtures_epilog = """A `fixture` is a :term:`asset`
(`pkg_resource` or absolute file system path) referencing a directory with
subdirectories for different types of resource import files:

resources
~~~~~~~~~
{resources}

users
~~~~~
{users}

groups
~~~~~~
{users}

local_roles
~~~~~~~~~~~
{roles}

states
~~~~~~

Example::

The test file contains the name resource path and the want
workflow state transitions.


.. WARN:: the workflow state is reset, this might cause unwanted side effects
(like events/scripts that are triggered by transitions).

Example::

process/proposal:announce->participate
"""


def import_fixtures():  # pragma: no cover
    args = _argparse()
    env = bootstrap(args.ini_file)
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)
    _import_fixtures(env['root'],
                     env['registry'],
                     all=args.import_all,
                     custom=args.import_custom,
                     )
    env['closer']()


def _argparse():
    epilog = fixtures_epilog.format(resources=resources_epilog,
                                    groups=groups_epilog,
                                    users=users_epilog,
                                    roles=roles_epilog,
                                    )
    parser = argparse.ArgumentParser(description='Import resource fixtures.',
                                     epilog=epilog,
                                     formatter_class=RawDescriptionHelpFormatter)
    parser.add_argument('ini_file',
                        help='path to the adhocracy backend ini file',
                        default='etc/development.ini',
                        nargs='?')
    parser.add_argument('-a',
                        '--import_all',
                        help='Import all registered fixture directories.',
                        action='store_true')
    parser.add_argument('-c',
                        '--import_custom',
                        help='Import custom fixture name or file system path')
    return parser.parse_args()


def _import_fixtures(root,
                     registry,
                     all=False,
                     custom='',
                     ):
    assets = [x[0] for x in registry.getUtilitiesFor(IFixtureAsset)]
    log_only = False
    if custom:
        print('\nImport custom fixture:\n')
        assets = [custom]
    elif all:
        print('\nImport all fixtures:\n')
    else:
        print('\nThe following fixture directories are registered:')
        log_only = True
    for asset in assets:
        print('\nFixture {}'.format(asset))
        import_fixture(asset, root, registry, log_only=log_only)

