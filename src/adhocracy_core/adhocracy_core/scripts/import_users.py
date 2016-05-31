"""Import/create users into the system.

This is registered as console script in setup.py.

"""
import argparse
import inspect
import logging
import json
import string
import os

import transaction
from pyramid.paster import bootstrap
from pyramid.registry import Registry
from pyramid.request import Request
from substanced.interfaces import IUserLocator
from substanced.util import find_service

from adhocracy_core.interfaces import IResource
from adhocracy_core.resources.principal import IUser
from adhocracy_core.resources.principal import IPasswordReset
from adhocracy_core.resources.badge import IBadge
from adhocracy_core.resources.subscriber import _get_default_group
from adhocracy_core import sheets
from adhocracy_core.scripts.assign_badges import create_badge_assignment
from adhocracy_core.sheets.name import IName


logger = logging.getLogger(__name__)


users_epilog = """The JSON file contains the name identifier of the user
to create and a simplified serialization of the sheets data.
Already existing users will have their groups, roles and emails updated.

In addition you can enable sending an inviation email

Example::

[
  {
    "name": "user0",
    "email": "test@test.de",
    "initial-password": "secret",
    "roles": [],
    "groups": ["gods"],
    "badges": ["god"],
    "send_invitation_mail": true,
    "subject_tmpl_invitation_mail": "adhocracy_core:templates/invite_subject_sample.txt.mako",
    "body_tmpl_invitation_mail": "adhocracy_core:templates/invite_body_sample.txt.mako"
  },
]
"""  # flake8: noqa


def import_users():  # pragma: no cover
    """Import users from a JSON file.

    usage::

        bin/import_users etc/development.ini  <filename>
    """
    docstring = inspect.getdoc(import_users)
    parser = argparse.ArgumentParser(description=docstring,
                                     epilog=users_epilog)
    parser.add_argument('ini_file',
                        help='path to the adhocracy backend ini file')
    parser.add_argument('filename',
                        type=str,
                        help='file containing the users')
    args = parser.parse_args()
    env = bootstrap(args.ini_file)
    _import_users(env['root'], env['registry'], args.filename)
    env['closer']()


def _import_users(context: IResource, registry: Registry, filename: str):
    users_info = _load_users_info(filename)
    users_info = [_normalize_user_info(u) for u in users_info]
    users = find_service(context, 'principals', 'users')
    groups = find_service(context, 'principals', 'groups')
    for user_info in users_info:
        user_by_name, user_by_email = _locate_user(user_info,
                                                   context,
                                                   registry)
        if user_by_name or user_by_email:
            logger.info('Updating user {} ({})'.format(user_info['name'],
                                                       user_info['email']))
            _update_user(user_by_name,
                         user_by_email,
                         user_info,
                         groups, registry)
        else:
            logger.info('Creating user {}'.format(user_info['name']))
            send_invitation = user_info.get('send_invitation_mail', False)
            activate = not send_invitation
            user = _create_user(user_info, users, registry, groups,
                                activate=activate)
            if send_invitation:
                logger.info('Sending invitation mail to {}'.format(user.name))
                _send_invitation_mail(user, user_info, registry)
            badge_names = user_info.get('badges', [])
            if badge_names:
                logger.info('Assign badge for user {}'.format(user.name))
                badges = _create_badges(user, badge_names, registry)
                _assign_badges(user, badges, registry)
    transaction.commit()


def _load_users_info(filename: str) -> [dict]:
    with open(filename, 'r') as f:
        return json.load(f)


def _normalize_user_info(user_info: dict):
    user_info['email'] = user_info['email'].lower()
    return user_info


def _locate_user(user_info, context, registry):
    locator = _get_user_locator(context, registry)
    user_by_name = locator.get_user_by_login(user_info['name'])
    user_by_email = locator.get_user_by_email(user_info['email'])
    return (user_by_name, user_by_email)


def _update_user(user_by_name: IUser,
                 user_by_email: IUser,
                 user_info: dict,
                 groups: IResource,
                 registry: Registry):
    if user_by_name is not None\
            and user_by_email is not None\
            and user_by_name != user_by_email:
        msg = 'Trying to update user but name or email already used for anoth'\
              'er user.\nUpdate: {} ({}). Existing users: {} ({}) and {} ({}).'
        raise ValueError(msg.format(user_info['name'],
                                    user_info['email'],
                                    user_by_name.name,
                                    user_by_name.email,
                                    user_by_email.name,
                                    user_by_email.email))
    user = user_by_name or user_by_email
    if user_by_name is None:
        userbasic_sheet = registry.content.get_sheet(
            user,
            sheets.principal.IUserBasic)
        userbasic_sheet.set({'name': user_info['name']})
    if user_by_email is None:
        userextended_sheet = registry.content.get_sheet(
            user,
            sheets.principal.IUserExtended)
        userextended_sheet.set({'email': user_info['email']})
    groups_names = user_info.get('groups', [])
    user_groups = _get_groups(groups_names, groups)
    permissions_sheet = registry.content.get_sheet(
        user,
        sheets.principal.IPermissions)
    roles_names = user_info.get('roles', [])
    permissions_sheet.set({'roles': roles_names,
                           'groups': user_groups})
    badges_names = user_info.get('badges', [])
    _update_badges_assignments(user, badges_names, registry)


def _update_badges_assignments(user: IUser,
                               badges_names: [str],
                               registry: Registry) -> None:
    _delete_badges_assignments(user, registry)
    badges = _create_badges(user, badges_names, registry)
    normalized_badges_names = [_normalize_badge_name(b) for b in badges_names]
    get_sheet_field = registry.content.get_sheet_field
    badges_to_assign = [b for b in badges
                        if get_sheet_field(b, IName, 'name')
                        in normalized_badges_names]
    _assign_badges(user, badges_to_assign, registry)


def _get_groups(groups_names: [str], groups: IResource) -> [IResource]:
    """Map groups names to their instances."""
    return [groups[name] for name in groups_names]


def _create_user(user_info: dict, users: IResource, registry: Registry,
                 groups: IResource, activate=True) -> IUser:
    groups_names = user_info.get('groups', [])
    groups = _get_groups(groups_names, groups)
    if groups == []:
        default = _get_default_group(users)
        groups = [default]
    roles_names = user_info.get('roles', [])
    password = user_info.get('initial-password', _gen_password())
    appstruct = {sheets.principal.IUserBasic.__identifier__:
                 {'name': user_info['name']},
                 sheets.principal.IUserExtended.__identifier__:
                 {'email': user_info['email']},
                 sheets.principal.IPermissions.__identifier__:
                 {'roles': roles_names,
                  'groups': groups},
                 sheets.principal.IPasswordAuthentication.
                 __identifier__: {'password': password},
                 }
    user = registry.content.create(IUser.__identifier__,
                                   users,
                                   appstruct,
                                   registry=registry,
                                   send_event=False)
    if activate:
        user.activate()
    return user


def _gen_password():
    chars = string.ascii_letters + string.digits + '+_'
    pwd_len = 20
    return ''.join(chars[int(c) % len(chars)] for c in os.urandom(pwd_len))


def _send_invitation_mail(user: IUser, user_info: dict, registry: Registry):
    resets = find_service(user, 'principals', 'resets')
    reset = registry.content.create(IPasswordReset.__identifier__,
                                    parent=resets,
                                    creator=user,
                                    send_event=False,
                                    )
    subject_tmpl = user_info.get('subject_tmpl_invitation_mail', None)
    body_tmpl = user_info.get('body_tmpl_invitation_mail', None)
    registry.messenger.send_invitation_mail(user, reset,
                                            subject_tmpl=subject_tmpl,
                                            body_tmpl=body_tmpl,
                                            )
    return user


def _get_user_locator(context: IResource, registry: Registry) -> IUserLocator:
    request = Request.blank('/dummy')
    request.registry = registry
    locator = registry.getMultiAdapter((context, request), IUserLocator)
    return locator


def _create_badges(user: IUser, badge_names: [str],
                   registry: Registry) -> [IBadge]:
    badges_service = find_service(user, 'badges')
    badges = []
    for name in badge_names:
        normalized_name = _normalize_badge_name(name)
        badge = badges_service.get(normalized_name, None)
        if badge is None:
            appstructs = {sheets.name.IName.__identifier__:
                          {'name': normalized_name},
                          sheets.title.ITitle.__identifier__:
                          {'title': name}}
            badge = registry.content.create(IBadge.__identifier__,
                                            parent=badges_service,
                                            appstructs=appstructs)
        badges.append(badge)
    return badges


def _normalize_badge_name(name: str) -> str:
    return name.lower()


def _assign_badges(user: IUser, badges: [IBadge], registry: Registry):
    for badge in badges:
        create_badge_assignment(user, badge, user, '', registry)


def _delete_badges_assignments(user: IUser, registry: Registry) -> None:
    assignments = find_service(user, 'badge_assignments')
    to_delete = []
    for assignment in assignments.values():
        appstruct = registry.content.get_sheet(
            assignment,
            sheets.badge.IBadgeAssignment).get()
        subject, object = appstruct['subject'], appstruct['object']
        is_user_assignment = subject == object == user
        if is_user_assignment:  # pragma: no branch
            to_delete.append(assignment.__name__)
    for assignment_name in to_delete:
        assignments.remove(assignment_name)
