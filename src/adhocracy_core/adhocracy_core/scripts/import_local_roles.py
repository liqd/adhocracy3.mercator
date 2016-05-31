"""Import local roles resources into the system.

This is registered as console script in setup.py.

"""
import argparse
import inspect
import transaction

from pyramid.paster import bootstrap

from . import import_local_roles as main_import_local_roles


roles_epilog = """The JSON file contains the resource path and the wanted
local :term:`roles` for principals.

.. WARN:: This overrides the existing local roles like for the `creator`.

Example::

[
 {"path": "/organisation/alt-treptow",
  "roles": {"initiators-treptow-koepenick": ["role:initiator"]}
 },
]
"""


def import_local_roles():  # pragma: no cover
    """Import/set local roles from a JSON file.

    usage::

        bin/import_local_roles etc/development.ini  <filename>
    """
    docstring = inspect.getdoc(import_local_roles)
    parser = argparse.ArgumentParser(description=docstring,
                                     epilog=roles_epilog)
    parser.add_argument('ini_file',
                        help='path to the adhocracy backend ini file')
    parser.add_argument('filename',
                        type=str,
                        help='file containing the resources descriptions')
    args = parser.parse_args()
    env = bootstrap(args.ini_file)
    main_import_local_roles(env['root'], env['registry'], args.filename)
    transaction.commit()
    env['closer']()
