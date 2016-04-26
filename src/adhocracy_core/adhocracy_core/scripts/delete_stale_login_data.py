"""Delete stale login data.

This is registered as console script in setup.py.
"""
import transaction
import argparse
import inspect
import logging

from pyramid.paster import bootstrap
from pyramid.request import Request

from adhocracy_core.resources.principal import delete_password_resets
from adhocracy_core.resources.principal import delete_not_activated_users


logger = logging.getLogger(__name__)


def delete_stale_login_data():  # pragma: no cover
    """Remove expired login tokens, not active users, and old password resets.

    usage::

        bin/remove_stale_login_data etc/development.ini  --resets_max_age 10
        --not_active_users_max_age 10
    """
    docstring = inspect.getdoc(delete_stale_login_data)
    parser = argparse.ArgumentParser(description=docstring)
    parser.add_argument('ini_file',
                        help='path to the adhocracy backend ini file')
    parser.add_argument('-r',
                        '--resets_max_age',
                        help='Max age in days for unused password resets',
                        default=30,
                        type=int)
    parser.add_argument('-u',
                        '--not_active_users_max_age',
                        help='Max age in days for not activated users',
                        default=60,
                        type=int)
    args = parser.parse_args()
    env = bootstrap(args.ini_file)
    _delete_stale_login_data(env['root'],
                             env['request'],
                             args.resets_max_age,
                             args.not_active_users_max_age,
                             )
    transaction.commit()
    env['closer']()


def _delete_stale_login_data(root,
                             request: Request,
                             not_active_users_max_age: int,
                             resets_max_age: int,
                             ):
    request.root = root
    delete_not_activated_users(request, not_active_users_max_age)
    delete_password_resets(request, resets_max_age)
