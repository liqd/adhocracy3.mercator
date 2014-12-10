# doctest: +ELLIPSIS
# doctest: +NORMALIZE_WHITESPACE

Default permissions
-------------------

Basic functional tests for roles and default permission settings.

Prerequisites
.............

Some imports to work with rest api calls::

    >>> from pprint import pprint
    >>> from adhocracy_core.testing import reader_header
    >>> from adhocracy_core.testing import annotator_header
    >>> from adhocracy_core.testing import contributor_header
    >>> from adhocracy_core.testing import editor_header
    >>> from adhocracy_core.testing import reviewer_header
    >>> from adhocracy_core.testing import manager_header
    >>> from adhocracy_core.testing import admin_header
    >>> from adhocracy_core.testing import god_header
    >>> from adhocracy_core.resources.sample_proposal import IProposal
    >>> from adhocracy_core.resources.sample_proposal import IProposalVersion

Start Adhocracy testapp::

    >>> from webtest import TestApp
    >>> app = getfixture('app')
    >>> testapp = TestApp(app)
    >>> rest_url = 'http://localhost'
    >>> platform = rest_url + '/adhocracy'
    >>> users = rest_url + '/principals/users/'
    >>> groups = rest_url + '/principals/groups/'

Create participation process structure by god (sysadmin)
(like :class:`adhocracy_core.interfaces.IIPool` subtypes) ::

    >>> prop = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'Proposals'}}}
    >>> resp = testapp.post_json(platform, prop, headers=god_header).json
    >>> pool = resp['path']

Create participation process content by contributor
(like :class:`adhocracy_core.interfaces.IItem` subtypes) ::

    >>> prop = {'content_type': 'adhocracy_core.resources.sample_proposal.IProposal',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'kommunismus'}}}
    >>> resp = testapp.post_json(pool, prop, headers=contributor_header).json
    >>> contributor_proposal = resp['path']
    >>> contributor_proposal_comments = resp['path'] + 'comments'
    >>> contributor_proposal_rates = resp['path'] + 'rates'


Create annotations by annotator
(like :class:`adhocracy_core.interfaces.IItem` subtypes) ::

    >>> prop = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'com'}}}
    >>> resp = testapp.post_json(contributor_proposal_comments, prop, headers=annotator_header).json
    >>> annotator_comment = resp['path']

    >>> prop = {'content_type': 'adhocracy_core.resources.rate.IRate', 'data': {}}
    >>> resp = testapp.post_json(contributor_proposal_rates, prop, headers=annotator_header).json
    >>> annotator_rate = resp['path']


Reader
------

Can read resources and normal sheets::

    >>> resp_data = testapp.options(pool, headers=reader_header).json
    >>> pprint(resp_data['GET']['response_body']['data'])
    {...'adhocracy_core.sheets.metadata.IMetadata': {}...}


Cannot create annotations for participation process content::

    >>> resp_data = testapp.options(contributor_proposal_comments, headers=reader_header).json
    >>> 'POST' not in resp_data
    True

Cannot edit annotations for participation process content::

    >>> resp_data = testapp.options(annotator_comment, headers=reader_header).json
    >>> 'POST' not in resp_data
    True

Cannot create process content::

    >>> resp_data = testapp.options(pool, headers=reader_header).json
    >>> 'POST' not in resp_data
    True

Cannot edit process content::

    >>> resp_data = testapp.options(contributor_proposal, headers=reader_header).json
    >>> 'POST' not in resp_data
    True

Cannot create process structure::

    >>> resp_data = testapp.options(pool, headers=reader_header).json
    >>> 'POST' not in resp_data
    True

Cannot edit process structure::

    >>> resp_data = testapp.options(pool, headers=reader_header).json
    >>> 'PUT' not in resp_data
    True


Annotator
---------

Can read resources and normal sheets::

    >>> resp_data = testapp.options(pool, headers=annotator_header).json
    >>> pprint(resp_data['GET']['response_body']['data'])
    {...'adhocracy_core.sheets.metadata.IMetadata': {}...}


Can create annotations ::

   >>> resp_data = testapp.options(contributor_proposal_comments, headers=annotator_header).json
   >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
   ['adhocracy_core.resources.comment.IComment']

   >>> resp_data = testapp.options(contributor_proposal_rates, headers=annotator_header).json
   >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
   ['adhocracy_core.resources.rate.IRate']

Can edit his own annotations::

    >>> resp_data = testapp.options(annotator_comment, headers=annotator_header).json
    >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
    ['adhocracy_core.resources.comment.ICommentVersion']

Cannot create process content::

    >>> resp_data = testapp.options(pool, headers=annotator_header).json
    >>> 'POST' not in resp_data
    True

Cannot edit process content::

    >>> resp_data = testapp.options(contributor_proposal, headers=annotator_header).json
    >>> 'POST' not in resp_data
    True

Cannot create process structure::

    >>> resp_data = testapp.options(pool, headers=annotator_header).json
    >>> 'POST' not in resp_data
    True

Cannot edit process structure::

    >>> resp_data = testapp.options(pool, headers=annotator_header).json
    >>> 'PUT' not in resp_data
    True

Contributor
-----------

Can read resources and normal sheets::

    >>> resp_data = testapp.options(pool, headers=contributor_header).json
    >>> pprint(resp_data['GET']['response_body']['data'])
    {...'adhocracy_core.sheets.metadata.IMetadata': {}...}


Cannot create annotations ::

   >>> resp_data = testapp.options(contributor_proposal, headers=contributor_header).json
   >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
   ['adhocracy_core.resources.sample_paragraph.IParagraph',
    'adhocracy_core.resources.sample_proposal.IProposalVersion',
    'adhocracy_core.resources.sample_section.ISection']


Can create process content::

    >>> resp_data = testapp.options(pool, headers=contributor_header).json
    >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
    ['adhocracy_core.resources.external_resource.IExternalResource',
     'adhocracy_core.resources.sample_proposal.IProposal']

Can edit his own process content::

    >>> resp_data = testapp.options(contributor_proposal, headers=contributor_header).json
    >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
    ['adhocracy_core.resources.sample_paragraph.IParagraph',
     'adhocracy_core.resources.sample_proposal.IProposalVersion',
     'adhocracy_core.resources.sample_section.ISection']

Cannot create process structure::

    >>> resp_data = testapp.options(pool, headers=contributor_header).json
    >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
    ['adhocracy_core.resources.external_resource.IExternalResource',
     'adhocracy_core.resources.sample_proposal.IProposal']

Cannot edit process structure::

    >>> resp_data = testapp.options(pool, headers=contributor_header).json
    >>> 'PUT' not in resp_data
    True

Reviewer
---------

Manager
--------

Admin
------

Can read resources and normal sheets::

    >>> resp_data = testapp.options(pool, headers=admin_header).json
    >>> pprint(resp_data['GET']['response_body']['data'])
    {...'adhocracy_core.sheets.metadata.IMetadata': {}...}


Cannot create annotations ::

   >>> resp_data = testapp.options(contributor_proposal, headers=admin_header).json
   >>> 'POST' not in resp_data
   True

Cannot create process content::

    >>> resp_data = testapp.options(pool, headers=admin_header).json
    >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
    ['adhocracy_core.resources.asset.IPoolWithAssets',
     'adhocracy_core.resources.pool.IBasicPool']

Can create process structure::

    >>> resp_data = testapp.options(pool, headers=admin_header).json
    >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
    ['adhocracy_core.resources.asset.IPoolWithAssets',
     'adhocracy_core.resources.pool.IBasicPool']

Can edit process structure::

    >>> resp_data = testapp.options(pool, headers=admin_header).json
    >>> 'adhocracy_core.sheets.metadata.IMetadata' in resp_data['PUT']['request_body']['data']
    True


Can create groups::

   >>> resp_data = testapp.options(groups, headers=admin_header).json
   >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
   ['adhocracy_core.resources.principal.IGroup']


Can create users::

   >>> resp_data = testapp.options(users, headers=admin_header).json
   >>> pprint(sorted([r['content_type'] for r in resp_data['POST']['request_body']]))
   ['adhocracy_core.resources.principal.IUser']


Can assign users to groups, and roles to users::

   >>> god = users + '0000000'
   >>> resp_data = testapp.options(god, headers=admin_header).json
   >>> pprint(sorted([s for s in resp_data['PUT']['request_body']['data']]))
   [...'adhocracy_core.sheets.principal.IPasswordAuthentication',
    'adhocracy_core.sheets.principal.IPermissions',
    'adhocracy_core.sheets.principal.IUserBasic',
    'adhocracy_core.sheets.rate.ICanRate'...]

