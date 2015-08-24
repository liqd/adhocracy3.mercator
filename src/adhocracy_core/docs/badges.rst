# doctest: +ELLIPSIS
# doctest: +NORMALIZE_WHITESPACE

Badges
------

Badges are resources that can be badged to mark special process content.

Prerequisites
~~~~~~~~~~~~~

Some imports to work with rest api calls::

    >>> from pprint import pprint
    >>> from adhocracy_core.resources.document import IDocument
    >>> from adhocracy_core.resources.document import IDocumentVersion

Start adhocracy app and log in some users::

    >>> participant = getfixture('app_participant')
    >>> initiator = getfixture('app_initiator')
    >>> admin = getfixture('app_admin')

Create participation process structure/content to get started::

    >>> prop = {'content_type': 'adhocracy_core.resources.organisation.IOrganisation',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'organisation'}}}
    >>> resp = admin.post('/', prop).json
    >>> prop = {'content_type': 'adhocracy_core.resources.process.IProcess',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'process'}}}
    >>> resp = admin.post('/organisation', prop)

    >>> prop = {'content_type': 'adhocracy_core.resources.document.IDocument',
    ...         'data': {}}
    >>> resp = participant.post('/organisation/process', prop).json
    >>> proposal_item = resp['path']
    >>> proposal_version = resp['first_version_path']

    >>> prop = {'content_type': 'adhocracy_core.resources.document.IDocument',
    ...         'data': {}}
    >>> resp = participant.post('/organisation/process', prop).json
    >>> proposal2_version = resp['first_version_path']

Create Badge
~~~~~~~~~~~~

Badges can be created in `badges` pools. The IHasBadgesPool sheet of the process
gives us the right pool:


    >>> resp = initiator.get('/organisation/process').json
    >>> badges_pool = resp['data']['adhocracy_core.sheets.badge.IHasBadgesPool']['badges_pool']

Now we can create a Badge::

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadge',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'badge1'},
    ...                  'adhocracy_core.sheets.title.ITitle': {'title': 'Badge 1'},
    ...                  'adhocracy_core.sheets.description.IDescription': {'description': 'This is 1'},
    ...                  },
    ...         }
    >>> resp = initiator.post(badges_pool, prop).json
    >>> badge = resp['path']

To add a badge to a badge group we first create the group::

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadgeGroup',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'group1'},
    ...                  },
    ...         }
    >>> resp = initiator.post(badges_pool, prop).json
    >>> group = resp['path']

then create the badge inside this group::

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadge',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'badge1'},
    ...                  },
    ...         }
    >>> resp = initiator.post(group, prop).json
    >>> badge_with_group = resp['path']

The badge groups hierarchy is also shown with the badge sheet::

    >>> resp = initiator.get(badge_with_group).json
    >>> resp['data']['adhocracy_core.sheets.badge.IBadge']
    {'groups': [.../group1/']}


Assign badges to process content
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To assign badges we have to post a badge assignment between user, content
and badge.

First we need the pool to post badge assignments to::

    >>> resp = initiator.get(proposal_version).json
    >>> post_pool = resp['data']['adhocracy_core.sheets.badge.IBadgeable']['post_pool']

To get assignable badges we send an options request to this post pool::

    >>> resp = initiator.options(post_pool).json
    >>> resp['POST']['request_body'][0]['data']['adhocracy_core.sheets.badge.IBadgeAssignment']['badge']
    [.../process/badges/badge1/',.../process/badges/group1/badge1/']

The user is typically the current logged in user::

    >>> user = initiator.header['X-User-Path']

Now we can post the assignment to a proposal version::

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadgeAssignment',
    ...         'data': {'adhocracy_core.sheets.badge.IBadgeAssignment':
    ...                      {'subject': user,
    ...                       'badge': badge,
    ...                       'object': proposal_version}
    ...          }}
    >>> resp = initiator.post(post_pool, prop)
    >>> resp.status_code
    200

or proposal item::

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadgeAssignment',
    ...         'data': {'adhocracy_core.sheets.badge.IBadgeAssignment':
    ...                      {'subject': user,
    ...                       'badge': badge,
    ...                       'object': proposal_item}
    ...          }}
    >>> resp = initiator.post(post_pool, prop)
    >>> resp.status_code
    200

Now the badged content shows the back reference targeting the badge assignment::

    >>> resp = participant.get(proposal_version).json
    >>> resp['data']['adhocracy_core.sheets.badge.IBadgeable']['assignments']
    [...0/badge_assignments/0000000/']

It is not possible to assign twice the same badge::

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadgeAssignment',
    ...         'data': {'adhocracy_core.sheets.badge.IBadgeAssignment':
    ...                      {'subject': user,
    ...                       'badge': badge,
    ...                       'object': proposal_version}
    ...          }}
    >>> resp = initiator.post(post_pool, prop).json
    >>> resp['errors'][0]['description']
    'Badge already assigned'

We can also use the filtering pool api to search for content with specific badge names::

    >>> prop = {'badge': 'badge1',
    ...         'depth': 'all'}
    >>> resp = initiator.get('/organisation/process', params=prop).json
    >>> resp['data']['adhocracy_core.sheets.pool.IPool']['elements']
    ['...document_0000000/',...document_0000000/VERSION_0000000/']

In addition we can search for versions that have a item with a specific badge::

    >>> prop = {'item_badge': 'badge1',
    ...         'depth': 'all'}
    >>> resp = initiator.get('/organisation/process', params=prop).json
    >>> resp['data']['adhocracy_core.sheets.pool.IPool']['elements']
    ['...0/']



PostPool and Assignable validation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


If we use the wrong post_pool we get an error::

    >>> resp = initiator.get(proposal2_version).json
    >>> wrong_post_pool = resp['data']['adhocracy_core.sheets.badge.IBadgeable']['post_pool']

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadgeAssignment',
    ...         'data': {'adhocracy_core.sheets.badge.IBadgeAssignment':
    ...                      {'subject': user,
    ...                       'badge': badge,
    ...                       'object': proposal_version}
    ...          }}
    >>> resp = initiator.post(wrong_post_pool, prop).json
    >>> resp
    {...'You can only add references inside ...0/badge_assignments...


TODO add validators for subject (assignable?)
TODO add options to make badges from one group exclusive


User Badges
~~~~~~~~~~~~

Badges can be assigned to users the same way as process content.
The principals pool gives us the badges pool::

    >>> resp = initiator.get('/principals').json
    >>> badges_pool = resp['data']['adhocracy_core.sheets.badge.IHasBadgesPool']['badges_pool']

There the admin can create badges::

    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadge',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'userbadge'},
    ...                  },
    ...         }
    >>> resp = admin.post(badges_pool, prop).json
    >>> badge = resp['path']

The user gives us the badge assignment post pool::

    >>> user_with_badge = initiator.header['X-User-Path']
    >>> resp = initiator.get(user_with_badge).json
    >>> post_pool = resp['data']['adhocracy_core.sheets.badge.IBadgeable']['post_pool']


to create badge assignments::

    >>> user = admin.header['X-User-Path']
    >>> prop = {'content_type': 'adhocracy_core.resources.badge.IBadgeAssignment',
    ...         'data': {'adhocracy_core.sheets.badge.IBadgeAssignment':
    ...                      {'subject': user,
    ...                       'badge': badge,
    ...                       'object': user_with_badge}
    ...          }}
    >>> resp = admin.post(post_pool, prop).json

Now the badged content shows the back reference targeting the badge assignment::

    >>> resp = participant.get(user_with_badge).json
    >>> resp['data']['adhocracy_core.sheets.badge.IBadgeable']['assignments']
    [.../users/badge_assignments/0000000/']
