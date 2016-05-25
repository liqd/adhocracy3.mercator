B-PLAN API
==========

This document specifies the API used to a manage B-Plan processes in the a3
platform.

Process
-------

The full process of creation and management of a B-Plan:

1. Create a B-Plan process
2. Edit an unpublished B-Plan
3. Get the HTML embed code and external URL to integrate the B-Plan
4. Make a B-Plan accessible
5. Edit a published B-Plan

Data fields
-----------

The following data needs to be provided to create a B-Plan:

- *organization*: The organization the B-Plan belongs to
- *bplan_number*: Number of the BPlan
- *bplan_name*: Could be the same as bplan_number
- *bplan_titile*: Could be the same as bplan_number
- *participation_kind*: Kind of participation, e.g. 'öffentliche Auslegung'
- *office_worker_email*: Email address to receive the B-Plan statements
- *short_description*: Teaser text
- *description*: Full description of the BPlan
- *external_picture_url*: External URL to the BPlan picture
- *picture_description*: Picture copyright notice
- *start_date*: Start time of the praticipation phase
- *end_date*: End of the participation phase, i.e. start time of the closed
  phase

Workflows
---------

A B-Plan process transits the following workflows:

1. *draft*: Initial worflow state used for editing, the B-Plan is not public
2. *announce*: The B-Plan information is accessible, but no statements can be
   send
3. *participate*: B-Plan participation is active, statements can be issued
4. *closed*: The B-Plan is not accessible anymore

The transition from the *draft* state to the *announce* state has to be done
via an API call. The further transitions to *participate* and *closed* are
performed automatically by the a3 platform depending on the provided
*start_date* and *end_date*.

API Calls
---------

The following API calls are required to implement the process:

- login
- create a B-Plan process
- get the B-Plan workflow state
- make the B-Plan accessible
- get the B-Plan embed HTML snippet and external URL
- edit a B-Plan process

**Initialization**


Start Adhocracy test application::

    >>> from webtest import TestApp
    >>> from adhocracy_core.testing import god_login
    >>> from adhocracy_core.testing import god_password
    >>> log = getfixture('log')
    >>> app_router = getfixture('app_router_filestorage')
    >>> testapp = TestApp(app_router)
    >>> rest_url = 'http://localhost'
    >>> data = {'name': god_login,
    ...         'password': god_password}
    >>> resp = testapp.post_json(rest_url + '/login_username', data).json
    >>> god_header = {'X-User-Token': resp['user_token']}

A working image url is needed to test referencing external images::

    >>> import os
    >>> import adhocracy_core
    >>> httpserver = getfixture('httpserver')
    >>> base_path = adhocracy_core.__path__[0]
    >>> test_image_path = os.path.join(base_path, '../', 'docs', 'test_image.png')
    >>> httpserver.serve_content(open(test_image_path, 'rb').read())
    >>> httpserver.headers['ContentType'] = 'image/png'
    >>> test_image_url = httpserver.url

For the example API calls an organisation "orga" is created.
The organization for the B-Plan needs to exist beforehand in the a3
platform::

    >>> data = {'content_type':
    ...                'adhocracy_core.resources.organisation.IOrganisation',
    ...         'data': {
    ...             'adhocracy_core.sheets.name.IName':
    ...                 {'name': 'orga'}
    ...         }}
    >>> resp = testapp.post_json(rest_url + '/', data, headers=god_header)


**Login**::

    >>> data = {'name': 'god',
    ...         'password': 'password'}
    >>> resp = testapp.post_json('/login_username', data)
    >>> resp.status_code
    200
    >>> user_token = resp.json['user_token']
    >>> auth_header = {'X-User-Token': user_token}

To login post the username and password.
The 'user_token' from  the response is used in a HTTP custom header in the
following communication.
The username here is just an example, please use your credentials.


**Create a new bplan process**::

    >>> data = {'content_type': 'adhocracy_meinberlin.resources.bplan.IProcess',
    ...         'data': {
    ...             'adhocracy_core.sheets.name.IName':
    ...                 {'name': '1-23'},
    ...             'adhocracy_core.sheets.title.ITitle':
    ...                 {'title': 'Bplan 1-23'},
    ...             'adhocracy_meinberlin.sheets.bplan.IProcessSettings':
    ...                 {'plan_number': '1-23',
    ...                  'participation_kind': 'öffentliche Auslegung'},
    ...             'adhocracy_meinberlin.sheets.bplan.IProcessPrivateSettings':
    ...                 {'office_worker_email': 'moderator@bplan.de'},
    ...             'adhocracy_core.sheets.description.IDescription':
    ...                 {'description': 'Full description',
    ...                  'short_description':'Teaser text'},
    ...             'adhocracy_core.sheets.image.IImageReference':
    ...                 {'picture_description': 'copyright notice',
    ...                  'external_picture_url': test_image_url},
    ...             'adhocracy_core.sheets.workflow.IWorkflowAssignment':
    ...                 {'state_data':
    ...                  [{'name': 'participate', 'description': '',
    ...                    'start_date': '2016-03-01T12:00:09'},
    ...                   {'name': 'closed', 'description': '',
    ...                    'start_date': '2016-03-01T12:00:09'}]}
    ...             }}
    >>> resp = testapp.post_json('/orga/', data, headers=auth_header)
    >>> resp.status_code
    200

The creation of a bplan consist of a post request containing all the
required fields.

**Get the workflow state**::

    >>> resp = testapp.get('/orga/1-23/', headers=auth_header)
    >>> resp.status_code
    200
    >>> resp.json['data'] \
    ...     ['adhocracy_core.sheets.workflow.IWorkflowAssignment'] \
    ...     ['workflow_state']
    'draft'

**Perform a workflow state transition**::

    >>> data = {'content_type': 'adhocracy_meinberlin.resources.bplan.IProcess',
    ...         'data': {
    ...             'adhocracy_core.sheets.workflow.IWorkflowAssignment':
    ...                 {'workflow_state': 'announce'}
    ...             }}
    >>> resp = testapp.put_json('/orga/1-23/', data, headers=auth_header)
    >>> resp.status_code
    200
    >>> resp = testapp.get('/orga/1-23/', headers=auth_header)
    >>> resp.status_code
    200
    >>> resp.json['data'] \
    ...     ['adhocracy_core.sheets.workflow.IWorkflowAssignment'] \
    ...     ['workflow_state']
    'announce'


**Get the HTML code snipped to embed the bplan and its external URL**::

    >>> resp = testapp.get('/orga/1-23/', headers=auth_header)
    >>> resp.status_code
    200
    >>> embed_code = (resp.json['data'] \
    ...     ['adhocracy_core.sheets.embed.IEmbed'] \
    ...     ['embed_code'])
    >>> print(embed_code)
    <BLANKLINE>
    <script src="http://localhost:6551/AdhocracySDK.js"></script>
    <script> adhocracy.init('http://localhost:6551',
                            function(adhocracy) {adhocracy.embed('.adhocracy_marker');
                            });
    </script>
    <div class="adhocracy_marker"
         data-path="http://localhost/orga/1-23/"
         data-widget="mein-berlin-bplaene-proposal-embed"
         data-autoresize="false"
         data-locale="en"
         data-autourl="false"
         data-nocenter="true"
         style="height: 650px">
    </div>
    <BLANKLINE>


**Edit a B-Plan process**:

To edit a B-Plan the fields set in the initial post requests can be used.

E.g. Changing the description::

    >>> data = {'content_type': 'adhocracy_meinberlin.resources.bplan.IProcess',
    ...         'data': {
    ...             'adhocracy_core.sheets.description.IDescription':
    ...                 {'description': 'Updated description'}
    ...             }}
    >>> resp = testapp.put_json('/orga/1-23', data, headers=auth_header)
    >>> resp.status_code
    200

E.g. Changing the participation dates::

    >>> data = {'content_type': 'adhocracy_meinberlin.resources.bplan.IProcess',
    ...         'data': {
    ...             'adhocracy_core.sheets.workflow.IWorkflowAssignment':
    ...                 {'state_data':
    ...                  [{'name': 'participate', 'description': 'test',
    ...                    'start_date': '2016-03-03T12:00:09'},
    ...                   {'name': 'closed', 'description': 'test',
    ...                    'start_date': '2016-05-01T12:00:09'}]}}}
    >>> resp = testapp.put_json('/orga/1-23', data, headers=auth_header)
    >>> resp.status_code
    200
