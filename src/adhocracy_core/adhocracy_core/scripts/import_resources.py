"""Import/create resources into the system.

This is registered as console script in setup.py.

"""
import argparse
import inspect
import logging
import sys
import transaction

from pyramid.paster import bootstrap

from . import import_resources as main_import_resources


resources_epilog = """The JSON file contains the interface name of the resource
type to create and a serialization of the sheets data.

Strings having the form 'user_by_login: <username>' are resolved
to the user's path.

Example::

[
 {"path": "/organisation",
  "creator": "god",
  "content_type": "adhocracy_core.resources.organisation.IOrganisation",
  "data": {"adhocracy_core.sheets.name.IName": {"name": "alt-treptow"}},
 },
]
"""


def import_resources():  # pragma: no cover
    """Import resources from a JSON file.

    usage::

        bin/import_resources etc/development.ini  <filename>
    """
    docstring = inspect.getdoc(import_resources)
    parser = argparse.ArgumentParser(description=docstring,
                                     epilog=resources_epilog)
    parser.add_argument('ini_file',
                        help='path to the adhocracy backend ini file')
    parser.add_argument('filename',
                        type=str,
                        help='file containing the resources descriptions')
    args = parser.parse_args()
    env = bootstrap(args.ini_file)
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)
    main_import_resources(env['root'], env['registry'], args.filename)
    transaction.commit()
    env['closer']()
