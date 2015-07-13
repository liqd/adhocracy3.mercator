# doctest: +ELLIPSIS
# doctest: +NORMALIZE_WHITESPACE

Default permissions
-------------------

Basic functional tests for roles and default permission settings.

Prerequisites
~~~~~~~~~~~~~


Some imports to work with rest api calls::

    >>> from pprint import pprint
    >>> from adhocracy_core.resources.document import IDocument
    >>> from adhocracy_core.resources.document import IDocumentVersion
    >>> from adhocracy_core.resources.organisation import IOrganisation

Start adhocracy app and log in some users::

    >>> anonymous = getfixture('app_anonymous')
    >>> participant = getfixture('app_participant')
    >>> participant2 = getfixture('app_participant2')
    >>> moderator = getfixture('app_moderator')
    >>> initiator = getfixture('app_initiator')
    >>> admin = getfixture('app_admin')
    >>> god = getfixture('app_god')

Create participation process structure by god (sysadmin)
(like :class:`adhocracy_core.interfaces.IPool` subtypes) ::

    >>> prop = {'content_type': 'adhocracy_core.resources.organisation.IOrganisation',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'organisation'}}}
    >>> resp = god.post('/', prop).json
    >>> prop = {'content_type': 'adhocracy_core.resources.process.IProcess',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'process'}}}
    >>> resp = god.post('/organisation', prop)

Create participation process content by participant::

    >>> prop = {'content_type': 'adhocracy_core.resources.document.IDocument',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'prop'}}}
    >>> resp = participant.post('/organisation/process', prop).json
    >>> participant_proposal = resp['path']
    >>> participant_proposal_comments = resp['path'] + 'comments'
    >>> participant_proposal_rates = resp['path'] + 'rates'

    >>> prop = {'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...         'data': {}}
    >>> resp = participant.post(participant_proposal, prop).json

Create content annotations by participant::

    >>> prop = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'com'}}}
    >>> resp = participant.post('/organisation/process/prop/comments', prop).json
    >>> participant_comment = resp['path']
    >>> prop = {'content_type': 'adhocracy_core.resources.comment.ICommentVersion',
    ...         'data': {'adhocracy_core.sheets.comment.IComment': {'comment': 'com'}}}
    >>> resp = participant.post(participant_comment, prop)

    >>> prop = {'content_type': 'adhocracy_core.resources.rate.IRate', 'data': {}}
    >>> resp = participant.post('/organisation/process/prop/rates', prop).json
    >>> participant_rate = resp['path']


Anonymous
~~~~~~~~~

Can read resources and normal sheets::

    >>> resp = anonymous.options('/organisation').json
    >>> pprint(resp['GET']['response_body']['data'])
    {...'adhocracy_core.sheets.metadata.IMetadata': {}...}


Cannot create comments annotations for participation process content::

    >>> 'POST' in anonymous.options('/organisation/process/prop/comments').json
    False

Cannot create rate annotations for participation process content::

    >>> 'POST' in anonymous.options('/organisation/process/prop/rates').json
    False

Cannot edit annotations for participation process content::

    >>> 'POST' in anonymous.options(participant_comment).json
    False

Cannot create process content::

    >>> 'POST' in anonymous.options('/organisation/process').json
    False

Cannot edit process content::

    >>> 'POST' in anonymous.options(participant_proposal).json
    False

Cannot create process structure::

    >>> 'POST' in anonymous.options('/organisation/process').json
    False

Cannot edit process structure::

    >>> 'PUT' in anonymous.options('/organisation/process').json
    False


Participant
~~~~~~~~~~~~

Can read resources and normal sheets::

    >>> resp = participant.options('/organisation').json
    >>> pprint(resp['GET']['response_body']['data'])
    {...'adhocracy_core.sheets.metadata.IMetadata': {}...}

Can create comments annotations for participation process content::

   >>> resp = participant.options('/organisation/process/prop/comments').json
   >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
   ['adhocracy_core.resources.comment.IComment']

Can create rate annotations for participation process content::

   >>> resp = participant.options('/organisation/process/prop/rates').json
   >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
   ['adhocracy_core.resources.rate.IRate']

Can edit his own annotations::

    >>> resp = participant.options(participant_comment).json
    >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
    ['adhocracy_core.resources.comment.ICommentVersion']

Cannot edit annotations::

    >>> 'POST' in participant2.options(participant_comment).json
    False

Can create process content::

    >>> resp = participant.options('/organisation/process').json
    >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
    ['adhocracy_core.resources.document.IDocument',
     'adhocracy_core.resources.external_resource.IExternalResource',
     'adhocracy_core.resources.proposal.IProposal']

Can edit his own process content::

    >>> resp = participant.options('/organisation/process/prop').json
    >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
    ['adhocracy_core.resources.document.IDocumentVersion',
     'adhocracy_core.resources.paragraph.IParagraph']


Cannot edit process content::

    >>> 'POST' in participant2.options('/organisation/process/prop').json
    False

Cannot create process structure::

    >>> 'POST' in participant.options('/organisation').json
    False

Cannot edit process structure::

    >>> 'PUT' in participant.options('/organisation').json
    False

Moderator
~~~~~~~~~~

Can create comments annotations for participation process content::

   >>> resp = moderator.options('/organisation/process/prop/comments').json
   >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
   ['adhocracy_core.resources.comment.IComment']

Cannot create rate annotations for participation process content::

    >>> 'POST' in moderator.options('/organisation/process/prop/rates').json
    False

Cannot edit annotations for participation process content::

    >>> 'POST' in moderator.options(participant_comment).json
    False

Cannot create process content::

    >>> 'POST' in moderator.options('/organisation/process').json
    False

Cannot edit process content::

    >>> 'POST' in moderator.options(participant_proposal).json
    False

Can hide and delete process content
    >>> resp = moderator.options('/organisation/process/prop').json
    >>> sorted(resp['PUT']['request_body']['data']
    ...                  ['adhocracy_core.sheets.metadata.IMetadata'])
    ['deleted', 'hidden']

Can hide and delete process structure
    >>> resp = moderator.options('/organisation').json
    >>> sorted(resp['PUT']['request_body']['data']
    ...                  ['adhocracy_core.sheets.metadata.IMetadata'])
    ['deleted', 'hidden']


Initiator
~~~~~~~~~

Cannot create process structure organisation::

   >>> resp = initiator.options('/organisation').json
   >>> postables = sorted([r['content_type'] for r in resp['POST']['request_body']])
   >>> IOrganisation.__identifier__ not in postables
   True

Can edit process structure organisation::

   >>> 'PUT' in initiator.options('/organisation').json
   False

Can create process structure process::

   >>> resp = initiator.options('/organisation').json
   >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
   ['adhocracy_core.resources.document_process.IDocumentProcess',
    'adhocracy_core.resources.process.IProcess']


Admin
~~~~~

Cannot create rate annotations for participation process content::

    >>> 'POST' in admin.options('/organisation/process/prop/rates').json
    False

Cannot edit annotations for participation process content::

    >>> 'POST' in admin.options(participant_comment).json
    False

Can create process structure::

    >>> resp = admin.options('/organisation').json
    >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
    ['adhocracy_core.resources.document_process.IDocumentProcess',
     'adhocracy_core.resources.organisation.IOrganisation',
     'adhocracy_core.resources.process.IProcess']

Cannot edit process structure::

   >>> 'PUT' in admin.options('/organisation').json
   True

   >>> 'PUT' in admin.options('/organisation/process').json
   True

Can create groups::

   >>> resp = admin.options('http://localhost/principals/groups').json
   >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
   ['adhocracy_core.resources.principal.IGroup']

Can create users::

   >>> resp = admin.options('http://localhost/principals/users').json
   >>> pprint(sorted([r['content_type'] for r in resp['POST']['request_body']]))
   ['adhocracy_core.resources.principal.IUser']

Can assign users to groups, and roles to users::

   >>> god_user = 'http://localhost/principals/users/0000000'
   >>> resp = admin.options(god_user).json
   >>> pprint(sorted([s for s in resp['PUT']['request_body']['data']]))
   [...'adhocracy_core.sheets.principal.IPasswordAuthentication',
    'adhocracy_core.sheets.principal.IPermissions',
    'adhocracy_core.sheets.principal.IUserBasic',
    'adhocracy_core.sheets.principal.IUserExtended',
    'adhocracy_core.sheets.rate.ICanRate'...]

