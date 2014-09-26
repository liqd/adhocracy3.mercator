# doctest: +ELLIPSIS
# doctest: +NORMALIZE_WHITESPACE

User Registration and Login
===========================

Prerequisites
-------------

Some imports to work with rest api calls::

    >>> from pprint import pprint

Start Adhocracy testapp::

    >>> from webtest import TestApp
    >>> app = getfixture('app')
    >>> websocket = getfixture('websocket')
    >>> testapp = TestApp(app)
    >>> rest_url = 'http://localhost'


Test that the relevant resources and sheets exist:

    >>> resp_data = testapp.get("/meta_api/").json
    >>> 'adhocracy_core.sheets.versions.IVersions' in resp_data['sheets']
    True
    >>> 'adhocracy_core.sheets.user.IUserBasic' in resp_data['sheets']
    True
    >>> 'adhocracy_core.sheets.user.IPasswordAuthentication' in resp_data['sheets']
    True

User Creation (Registration)
----------------------------

A new user is registered by creating a user object under the
``/principals/users`` pool. On success, the response contains the
path of the new user::

    >>> prop = {'content_type': 'adhocracy_core.resources.principal.IUser',
    ...         'data': {
    ...              'adhocracy_core.sheets.user.IUserBasic': {
    ...                  'name': 'Anna Müller',
    ...                  'email': 'anna@example.org'},
    ...              'adhocracy_core.sheets.user.IPasswordAuthentication': {
    ...                  'password': 'EckVocUbs3'}}}
    >>> resp_data = testapp.post_json(rest_url + "/principals/users", prop).json
    >>> resp_data["content_type"]
    'adhocracy_core.resources.principal.IUser'
    >>> user_path = resp_data["path"]
    >>> user_path
    '.../principals/users/00...

Like every resource the user has a metadata sheet with creation information::
    >>> resp_data = testapp.get(user_path).json
    >>> resp_metadata = resp_data['data']['adhocracy_core.sheets.metadata.IMetadata']

Even though he is not logged in yet, the creator points to his user resource::

    >>> resp_metadata['creator']
    '.../principals/users/00...

The "name" field in the "IUserBasic" schema is a non-empty string that
can contain any characters except '@' (to make user names distinguishable
from email addresses). The username must not contain any whitespace except
single spaces, preceded and followed by non-whitespace (no whitespace at
begin or end, multiple subsequent spaces are forbidden,
tabs and newlines are forbidden).

The "email" field must be a valid email address.

Creating a new user will not automatically log them in. First, the backend
will send a registration message to the specified email address. Once the user
has clicked on the activation link in the message, the user account is ready
to be used (see "Account Activation" below).

On failure, the backend responds with status code 400 and an error message.
E.g. when we try to register a user with an empty password::

    >>> prop = {'content_type': 'adhocracy_core.resources.principal.IUser',
    ...         'data': {
    ...              'adhocracy_core.sheets.user.IUserBasic': {
    ...                  'name': 'Other User',
    ...                  'email': 'annina@example.org'},
    ...              'adhocracy_core.sheets.user.IPasswordAuthentication': {
    ...                  'password': ''}}}
    >>> resp_data = testapp.post_json(rest_url + "/principals/users", prop,
    ...                               status=400).json
    >>> pprint(resp_data)
    {'errors': [{'description': 'Required',
                 'location': 'body',
                 'name': 'data.adhocracy_core.sheets.user.IPasswordAuthentication.password'}],
     'status': 'error'}

<errors> is a list of errors. The above error indicates that a required
field (the password field) is missing or empty. The following other error
conditions can occur:

  * username does already exist
  * email does already exist
  * email is invalid (doesn't look like an email address)
  * couldn't send a registration mail to the email address
  * password is too short (less than 6 chars)
  * password is too long (more than 100 chars)
  * internal error: something went wrong in the backend

For example, if we try to register a user whose email address is already
registered:

    >>> prop = {'content_type': 'adhocracy_core.resources.principal.IUser',
    ...         'data': {
    ...              'adhocracy_core.sheets.user.IUserBasic': {
    ...                  'name': 'New user with old password',
    ...                  'email': 'anna@example.org'},
    ...              'adhocracy_core.sheets.user.IPasswordAuthentication': {
    ...                  'password': 'EckVocUbs3'}}}
    >>> resp_data = testapp.post_json(rest_url + "/principals/users", prop,
    ...                               status=400).json
    >>> pprint(resp_data)
    {'errors': [{'description': 'The user login email is not unique',
                 'location': 'body',
                 'name': 'data.adhocracy_core.sheets.user.IUserBasic.email'}],
     'status': 'error'}

*Note:* in the future, the registration request may contain additional
personal data for the user. This data will probably be collected in one or
several additional sheets, e.g.::

    'data': {
        'adhocracy_core.sheets.user.IUserBasic': {
            'name': 'Anna Müller',
            'email': 'anna@example.org'},
        'adhocracy_core.sheets.user.IPasswordAuthentication': {
            'password': '...'},
        'adhocracy_core.sheets.user.IUserDetails': {
          'forename': '...',
          'surname': '...',
          'day_of_birth': '...',
          'street': '...',
          'town': '...',
          'postcode': '...',
          'gender': '...'
        }
     }


Account Activation
------------------

On user registration, the backend sends a mail with an activation link
to the specified email address and sends a 2xx HTTP response to the
frontend, so the frontend can tell the user to expect an email.  The
user has to click on the activation link to activate their
account. The *path* component of all such links starts with
``/activate/``. Once the frontend receives a click on such a link, it
must post a JSON request containing the path to the
``activate_account`` endpoint of the backend::

    >> prop = {'path': '/activate/blahblah'}
    >> resp_data = testapp.post_json('/activate_account', prop).json
    >> pprint(resp_data)
    {'details': 'unknown_path',
     'status': 'error'}

FIXME Make the above a real test once that endpoint exists.

The backend responds with either 2xx response code and 'status':
'success' and 'user_path' and 'user_token', just like after a
successful login request (see next section).  This means that the user
account has been activated and the user is now logged in.

Or it responds with 4xx response code and 'status': 'error' and a
'details' field that contains one of the following values:

* 'unknown_path' if the activation path is unknown to the backend
* 'expired_path' if the activation path has expired since it was generated more
  than 7 days ago. In this case, user activation is no longer possible for
  security reasons and the user has to call support or register again,
  using a different email. (More user-friendly options are planned but haven't
  been implemented yet!)

Note that activation links are deleted from the backend once the account has
been successfully activated. (In the future, they may also be deleted if the
user didn't click on them within 7 days.) 'unknown_path' can therefore mean
two things: either the activation link was never valid (the user
mistyped it or just tried to guess one), or it used to be valid but has been
deleted. There is no way to distinguish between these cases.  The message
displayed to the user should explain that.

FIXME How to test this without actually sending an email?

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
the wrong password is specified. For security reasons,
the same error message (referring to the password) is given in all these
cases.

    >>> prop = {'name': 'No such user',
    ...         'password': 'EckVocUbs3'}
    >>> resp_data = testapp.post_json('/login_username', prop, status=400).json
    >>> pprint(resp_data)
    {'errors': [{'description': "User doesn't exist or password is wrong",
                 'location': 'body',
                 'name': 'password'}],
     'status': 'error'}

A different error message is given if username and password are valid but
the user account hasn't been activated yet:
FIXME document exact contents and test.


User Authentication
-------------------

Once the user is logged in, the backend must add two header fields to all
HTTP requests made for the user: "X-User-Path" and "X-User-Token". Their
values are the received "user_path" and "user_token",
respectively. The backend validates the token. If it's valid and not
expired, the requested action is performed in the name and with the rights
of the logged-in user.

If the token is not valid or expired and the tried to perform an action that
requires authentication, the backend responds with an error status that
identifies the "X-User-Token" header as source of the problem::

    FIXME Currently we don't have any actions that require authentication,
    hence we cannot provide the working example.

    >> headers = {'X-User-Path': user_path, 'X-User-Token': 'Blah'}
    >> resp_data = testapp.get('/meta_api/', headers=headers).json
    >> resp_data['status']
    'error'
    >> resp_data['errors'][0]['location']
    'header'
    >> resp_data['errors'][0]['name']
    'X-User-Token'
    >> resp_data['errors'][0]['description']
    'invalid user token'

Tokens will usually expire after some time. (In the current implementation,
they expire by default after 30 days, but configurations may change this.)
Once they are expired, they will be considered as invalid so any further
requests made by the user will lead to errors. To resolve this,
the user must log in again.


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
    >>> headers = {'X-User-Token': user_token_via_username }
    >>> resp_data = testapp.get('/meta_api/', headers=headers).json
    >>> 'resources' in resp_data.keys()
    True
    >>> headers = {'X-User-Token': user_token_via_email }
    >>> resp_data = testapp.get('/meta_api/', headers=headers).json
    >>> 'resources' in resp_data.keys()
    True
