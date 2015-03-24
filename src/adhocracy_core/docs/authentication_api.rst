# doctest: +ELLIPSIS
# doctest: +NORMALIZE_WHITESPACE

User Registration and Login
===========================

Prerequisites
-------------

Some imports to work with rest api calls::

    >>> from pprint import pprint
    >>> from adhocracy_core.testing import admin_header, contributor_header, god_header

Start Adhocracy testapp::

    >>> from webtest import TestApp
    >>> app = getfixture('app')
    >>> testapp = TestApp(app)
    >>> rest_url = 'http://localhost'


Test that the relevant resources and sheets exist:

    >>> resp_data = testapp.get("/meta_api/").json
    >>> 'adhocracy_core.sheets.versions.IVersions' in resp_data['sheets']
    True
    >>> 'adhocracy_core.sheets.principal.IUserBasic' in resp_data['sheets']
    True
    >>> 'adhocracy_core.sheets.principal.IUserExtended' in resp_data['sheets']
    True
    >>> 'adhocracy_core.sheets.principal.IPasswordAuthentication' in resp_data['sheets']
    True

User Creation (Registration)
----------------------------

A new user is registered by creating a user object under the
``/principals/users`` pool. On success, the response contains the
path of the new user::

    >>> prop = {'content_type': 'adhocracy_core.resources.principal.IUser',
    ...         'data': {
    ...              'adhocracy_core.sheets.principal.IUserBasic': {
    ...                  'name': 'Anna Müller'},
    ...              'adhocracy_core.sheets.principal.IUserExtended': {
    ...                  'email': 'anna@example.org'},
    ...              'adhocracy_core.sheets.principal.IPasswordAuthentication': {
    ...                  'password': 'EckVocUbs3'}}}
    >>> resp_data = testapp.post_json(rest_url + "/principals/users", prop).json
    >>> resp_data["content_type"]
    'adhocracy_core.resources.principal.IUser'
    >>> user_path = resp_data["path"]
    >>> user_path
    '.../principals/users/00...

The "name" field in the "IUserBasic" schema is a non-empty string that
can contain any characters except '@' (to make user names distinguishable
from email addresses). The username must not contain any whitespace except
single spaces, preceded and followed by non-whitespace (no whitespace at
begin or end, multiple subsequent spaces are forbidden,
tabs and newlines are forbidden).

The "email" field in the "IUserExtended" sheet must be a valid email address.

Creating a new user will not automatically log them in. First, the backend
will send a registration message to the specified email address. Once the user
has clicked on the activation link in the message, the user account is ready
to be used (see "Account Activation" below).

On failure, the backend responds with status code 400 and an error message.
E.g. when we try to register a user with an empty password::

    >>> prop = {'content_type': 'adhocracy_core.resources.principal.IUser',
    ...         'data': {
    ...              'adhocracy_core.sheets.principal.IUserBasic': {
    ...                  'name': 'Other User'},
    ...              'adhocracy_core.sheets.principal.IUserExtended': {
    ...                  'email': 'annina@example.org'},
    ...              'adhocracy_core.sheets.principal.IPasswordAuthentication': {
    ...                  'password': ''}}}
    >>> resp_data = testapp.post_json(rest_url + "/principals/users", prop,
    ...                               status=400).json
    >>> pprint(resp_data)
    {'errors': [{'description': 'Required',
                 'location': 'body',
                 'name': 'data.adhocracy_core.sheets.principal.IPasswordAuthentication.password'}],
     'status': 'error'}

<errors> is a list of errors. The above error indicates that a required
field (the password field) is missing or empty. The following other error
conditions can occur:

  * username does already exist
  * email does already exist
  * email is invalid (doesn't look like an email address)
  * couldn't send a registration mail to the email address (description
    starts with 'Cannot send registration mail')
  * password is too short (less than 6 chars)
  * password is too long (more than 100 chars)
  * internal error: something went wrong in the backend

For example, if we try to register a user whose email address is already
registered::

    >>> prop = {'content_type': 'adhocracy_core.resources.principal.IUser',
    ...         'data': {
    ...              'adhocracy_core.sheets.principal.IUserBasic': {
    ...                  'name': 'New user with old email'},
    ...              'adhocracy_core.sheets.principal.IUserExtended': {
    ...                  'email': 'anna@example.org'},
    ...              'adhocracy_core.sheets.principal.IPasswordAuthentication': {
    ...                  'password': 'EckVocUbs3'}}}
    >>> resp_data = testapp.post_json(rest_url + "/principals/users", prop,
    ...                               status=400).json
    >>> pprint(resp_data)
    {'errors': [{'description': 'The user login email is not unique',
                 'location': 'body',
                 'name': 'data.adhocracy_core.sheets.principal.IUserExtended.email'}],
     'status': 'error'}

*Note:* in the future, the registration request may contain additional
personal data for the user. This data will probably be added to the
"IUserBasic" sheets, if it's generally public, to the "IUserExtended" sheet
otherwise (or maybe it'll be store in additional new sheets); e.g.::

    'data': {
        'adhocracy_core.sheets.principal.IUserBasic': {
            'name': 'Anna Müller',
            'forename': '...',
            'surname': '...'},
        'adhocracy_core.sheets.principal.IPasswordAuthentication': {
            'password': '...'},
        'adhocracy_core.sheets.principal.IUserExtended': {
            'email': 'anna@example.org',
            'day_of_birth': '...',
            'street': '...',
            'town': '...',
            'postcode': '...',
            'gender': '...'
        }
     }


Account Activation
------------------

Before they have confirmed their email address, new users are invisible
(hidden). They won't show up in user listings, and retrieving information
about them manually leads to a *410 Gone* response (see :doc:`deletion`)::

    >>> resp_data = testapp.get(user_path, status=410).json
    >>> resp_data['reason']
    'hidden'

On user registration, the backend sends a mail with an activation link
to the specified email address and sends a 2xx HTTP response to the
frontend, so the frontend can tell the user to expect an email.  The
user has to click on the activation link to activate their
account. The *path* component of all such links starts with
``/activate/``. Once the frontend receives a click on such a link, it
must post a JSON request containing the path to the
``activate_account`` endpoint of the backend::

    >>> newest_activation_path = getfixture('newest_activation_path')
    >>> prop = {'path': newest_activation_path}
    >>> resp_data = testapp.post_json('/activate_account', prop).json
    >>> pprint(resp_data)
    {'status': 'success',
     'user_path': '.../principals/users/...',
     'user_token': '...'}

The backend responds with either response code 200 and 'status':
'success' and 'user_path' and 'user_token', just like after a
successful login request (see next section).  This means that the user
account has been activated and the user is now logged in. ::

    >>> prop = {'path': '/activate/blahblah'}
    >>> resp_data = testapp.post_json('/activate_account', prop,
    ...                               status=400).json
    >>> pprint(resp_data)
    {'errors': [{'description': 'Unknown or expired activation path',
                 'location': 'body',
                 'name': 'path'}],
     'status': 'error'}

Or it responds with response code 400 and 'status': 'error'. Usually the error
description will be one of:

* 'String does not match expected pattern' if the path doesn't start with
  '/activate/'
* 'Unknown or expired activation path' if the activation path is unknown to
  the backend or if it has expired because it was generated more
  than 7 days ago. Note that activation links are deleted from the backend
  once the account has been successfully activated, and expired links may
  also be deleted. Therefore we don't know whether the activation link was
  never valid (the user mistyped it or just tried to guess one), or it used
  to be valid but has expired. The message displayed to the user should
  explain that.

If the link is expired, user activation is no longer possible for security
reasons and the user has to call support or register again, using a different
email. (More user-friendly options are planned but haven't been implemented
yet!)

Since the user account has been activated, the public part of the user
information is now visible to everybody::

    >>> resp_data = testapp.get(user_path).json
    >>> resp_data['data']['adhocracy_core.sheets.principal.IUserBasic']['name']
    'Anna Müller'

Like every resource, the user has a metadata sheet with creation information.
In the case of users, the creator is the user themselves::

    >>> resp_metadata = resp_data['data']['adhocracy_core.sheets.metadata.IMetadata']
    >>> resp_metadata['creator']
    '.../principals/users/00...
    >>> resp_metadata['creator'] == user_path
    True


User Login
----------

To log-in an existing and activated user via password, the frontend posts a
JSON request to the URL ``login_username`` with a user name and password::

    >>> prop = {'name': 'Anna Müller',
    ...         'password': 'EckVocUbs3'}
    >>> resp_data = testapp.post_json('/login_username', prop).json
    >>> pprint(resp_data)
    {'status': 'success',
     'user_path': '.../principals/users/...',
     'user_token': '...'}
    >>> user_path = resp_data['user_path']
    >>> user_token_via_username = resp_data['user_token']

Or to ``login_email``, specifying the user's email address instead of name::

    >>> prop = {'email': 'anna@example.org',
    ...        'password': 'EckVocUbs3'}
    >>> resp_data = testapp.post_json('/login_email', prop).json
    >>> pprint(resp_data)
    {'status': 'success',
     'user_path': '.../principals/users/...',
     'user_token': '...'}
    >>> user_token_via_email = resp_data['user_token']

On success, the backend sends back the path to the object
representing the logged-in user and a token that must be used to authorize
additional requests by the user.

An error is returned if the specified user name or email doesn't exist or if
the wrong password is specified. For security reasons, the same error message
(referring to the password) is given in all these cases::

    >>> prop = {'name': 'No such user',
    ...         'password': 'EckVocUbs3'}
    >>> resp_data = testapp.post_json('/login_username', prop, status=400).json
    >>> pprint(resp_data)
    {'errors': [{'description': "User doesn't exist or password is wrong",
                 'location': 'body',
                 'name': 'password'}],
     'status': 'error'}

A different error message is given if username and password are valid but
the user account hasn't been activated yet::

    {"description": "User account not yet activated",
     "location": "body",
     "name": "name"}


User Authentication
-------------------

Once the user is logged in, the backend must add two header fields to all
HTTP requests made for the user: "X-User-Path" and "X-User-Token". Their
values are the received "user_path" and "user_token",
respectively. The backend validates the token. If it's valid and not
expired, the requested action is performed in the name and with the rights
of the logged-in user.

Without authentication we may not post anything::    

    >>> resp_data = testapp.options(rest_url + "/adhocracy").json
    >>> 'POST' not in resp_data
    True

With authentication instead we may::

    >>> resp_data = testapp.options(rest_url + "/adhocracy", headers=god_header).json
    >>> pprint(resp_data['POST']['request_body'])
    [...'adhocracy_core.resources.pool.IBasicPool',...]

If the token is not valid or expired the backend responds with an error status
that identifies the "X-User-Token" header as source of the problem::

    >>> broken_header = {'X-User-Path': god_header['X-User-Path'],
    ...                  'X-User-Token': 'lalala'}
    >>> resp_data = testapp.get('/meta_api/', headers=broken_header,
    ...                         status=400).json
    >>> sorted(resp_data.keys())
    ['errors', 'status']
    >>> resp_data['status']
    'error'
    >>> resp_data['errors'][0]['location']
    'header'
    >>> resp_data['errors'][0]['name']
    'X-User-Token'
    >>> resp_data['errors'][0]['description']
    'Invalid user token'

Tokens will usually expire after some time. (In the current implementation,
they expire by default after 30 days, but configurations may change this.)
Once they are expired, they will be considered as invalid so any further
requests made by the user will lead to errors. To resolve this,
the user must log in again.

Viewing Users
-------------

Without proper authorization, only very limited information on each user is
visible::

    >>> resp_data = testapp.get (user_path).json
    >>> resp_data['data']['adhocracy_core.sheets.principal.IUserBasic']
    {'name': 'Anna Müller'}
    >>> 'adhocracy_core.sheets.principal.IUserExtended' in resp_data['data']
    False
    >>> 'adhocracy_core.sheets.principal.IPermissions' in resp_data['data']
    False

Only admins and the user herself can view extended information such as her
email address::

    >>> resp_data = testapp.get (user_path, headers=admin_header).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.principal.IUserExtended'])
    {'email': 'anna@example.org', 'tzname': 'UTC'}
    >>> 'adhocracy_core.sheets.principal.IPermissions' in resp_data['data']
    True
    >>> headers = {'X-User-Path': user_path,
    ...            'X-User-Token': user_token_via_username}
    >>> resp_data = testapp.get (user_path, headers=headers).json
    >>> 'adhocracy_core.sheets.principal.IUserExtended' in resp_data['data']
    True
    >>> 'adhocracy_core.sheets.principal.IPermissions' in resp_data['data']
    True

Other users, even if logged in, cannot::

    >>> resp_data = testapp.get (user_path, headers=contributor_header).json
    >>> 'adhocracy_core.sheets.principal.IUserExtended' in resp_data['data']
    False
    >>> 'adhocracy_core.sheets.principal.IPermissions' in resp_data['data']
    False


User Logout
-----------

For now, there is no explicit "logout" action that would discard a
generated user token. (*Note:* This may change in a future story.) To log a
user out, the frontend can simply "forget" the received user token and
never use it any more. The token will automatically expire in the backend
after a few hours.


User Re-Login
-------------

If a user logs in, any previous user tokens generated for the same user
will still remain valid until they expire in the normal way. This allows
the user to be logged in from different devices at the same time. ::

    >>> user_token_via_username != user_token_via_email
    True
    >>> headers = {'X-User-Path': user_path,
    ...            'X-User-Token': user_token_via_username }
    >>> resp_data = testapp.get('/meta_api/', headers=headers).json
    >>> 'resources' in resp_data.keys()
    True
    >>> headers['X-User-Token'] = user_token_via_email
    >>> resp_data = testapp.get('/meta_api/', headers=headers).json
    >>> 'resources' in resp_data.keys()
    True

User Password reset
--------------------

The frontend sends an email to the create password reset end point

    >>> prop = {'email': 'anna@example.org'}
    >>> resp = testapp.post_json(rest_url + "/create_password_reset", prop)
    >>> resp.status_code
    200

On Success the backend sends an email with the link to reset the password to
the user. The link contains the path to identify the password reset request::

    http://frontend_url/password_reset/?path=/1318...

If the user clicks on this link, the frontend has to send a post request with the
new password to the reset password end point::

    >>> newest_reset_path = getfixture('newest_reset_path')()
    >>> prop = {'path': newest_reset_path,
    ...         'password': 'new_password'}
    >>> resp_data = testapp.post_json('/password_reset', prop).json
    >>> pprint(resp_data)
    {'status': 'success',
     'user_path': 'http://localhost/principals/users/0000008/',
     'user_token':...

If the user is not activated yet::

    >>> prop = {'content_type': 'adhocracy_core.resources.principal.IUser',
    ...         'data': {
    ...              'adhocracy_core.sheets.principal.IUserBasic': {
    ...                  'name': 'Gerd Müller'},
    ...              'adhocracy_core.sheets.principal.IUserExtended': {
    ...                  'email': 'gerd@example.org'},
    ...              'adhocracy_core.sheets.principal.IPasswordAuthentication': {
    ...                  'password': 'EckVocUbs3'}}}
    >>> resp_data = testapp.post_json(rest_url + "/principals/users", prop).json
    >>> user_path = resp_data["path"]

    >>> resp_data = testapp.get(user_path, status=410).json
    >>> resp_data['reason']
    'hidden'

but does a successfull password reset::

    >>> prop = {'email': 'gerd@example.org'}
    >>> resp = testapp.post_json(rest_url + "/create_password_reset", prop)
    >>> resp.status_code
    200

    >>> newest_reset_path = getfixture('newest_reset_path')()
    >>> prop = {'path': newest_reset_path,
    ...         'password': 'new_password'}
    >>> resp_data = testapp.post_json('/password_reset', prop).json

he is activated ::

    >>> resp_data = testapp.get(user_path, status=200).json
    >>> resp_data['path'] == user_path
    True
