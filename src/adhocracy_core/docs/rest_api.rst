# doctest: +ELLIPSIS
# doctest: +NORMALIZE_WHITESPACE

REST-API (with loose coupling)
==============================

Prerequisites
-------------

Some imports to work with rest api calls::

    >>> import copy
    >>> from functools import reduce
    >>> from operator import itemgetter
    >>> import os
    >>> import requests
    >>> from pprint import pprint
    >>> from adhocracy_core.testing import god_header
    >>> from adhocracy_core.testing import god_path

Start Adhocracy testapp::

    >>> from webtest import TestApp
    >>> log = getfixture('log')
    >>> app_router = getfixture('app_router')
    >>> testapp = TestApp(app_router)
    >>> rest_url = 'http://localhost'

Resource structure
------------------

Resources have one content interface to set its type, like
"adhocracy_core.resources.organisation.IOrganisation".

Terminology: we refer to content interfaces and the objects specified
by content interfaces as "resources"; resources consist of "sheets"
which are based on the substance-d concept of property sheet
interfaces.

Every Resource has multiple sheets that define schemata to set/get data.

There are 5 base types of resources:

* `Pool`: folder in the resource hierarchy, can contain other Pools of any kind.

* `Item`: container Pool for ItemVersions of a specific type that belong to the
  same :term:`DAG`
  `Sub-Items` that are closely related (e.g. Sections within Documents)

* `ItemVersion`: a specific version of an item (SectionVersion, DocumentVersion)

* `Simple`: Anything that is neither versionable/item nor a pool.

To model the application domain we have some frequently use derived types with
semantics::

* `Organisation`: a subtype of Pool to do basic structuring for the resource
                  hierarchy. Typical subtypes are other Organisations or
                  `Process`.

* `Process`: a subtype of Pool to add configuration and resources for a specific
             participation process. Typical subtypes are `Proposal`s

* `Proposal`: a subtype of Item, this is normally content created by participants
              during a paticipation process.

Example resource hierarchy::

    Pool:         locations
    Simple:       locations/berlin

    Pool:         proposals
    Item:         proposals/proposal1
    ItemVersion:  proposals/proposal1/v1

    Item:         proposals/proposal1/document1
    ItemVersion:  proposals/proposal1/document1/v1


Meta-API
--------

The backend needs to answer to kinds of questions:

 1. Globally: What resources (content types) exist? What sheets may or
    must they contain? (What parts of) what sheets are
    read-only? mandatory? optional?

 2. In the context of a given session and URL: What HTTP methods are
    allowed? With what resource objects in the body? What are the
    authorizations (display / edit / vote-on / ...)?

The second kind is implemented with the OPTIONS method on the existing
URLs. The first is implemented with the GET method on a dedicated URL.


Global Info
~~~~~~~~~~~

The dedicated prefix defaults to "/meta_api/", but can be customized. The
result is a JSON object with two main keys, "resources" and "sheets"::

    >>> resp_data = testapp.get("/meta_api/").json
    >>> sorted(resp_data.keys())
    ['resources', 'sheets', 'workflows']

The "resources" key points to an object whose keys are all the resources
(content types) defined by the system::

    >>> sorted(resp_data['resources'].keys())
    [...'adhocracy_core.resources.organisation.IOrganisation'...]

Each of these keys points to an object describing the resource. If the
resource implements sheets (and a resource that doesn't would be
rather useless!), the object will have a "sheets" key whose value is a list
of the sheets implemented by the resource::

    >>> organisation_desc = resp_data['resources']['adhocracy_core.resources.organisation.IOrganisation']
    >>> sorted(organisation_desc['sheets'])
    ['adhocracy_core.sheets.asset.IHasAssetPool', 'adhocracy_core.sheets.description.IDescription'...]

In addition we get the listing of resource super types (excluding IResource)::

    >>> document_desc = resp_data['resources']['adhocracy_core.resources.document.IDocument']
    >>> sorted(document_desc['super_types'])
    ['adhocracy_core.interfaces.IItem', 'adhocracy_core.interfaces.IPool']

If the resource is an item, it will also have a "item_type" key whose value
is the type of versions managed by this item (e.g. a Section will manage
SectionVersions as main element type)::

    >>> document_desc['item_type']
    'adhocracy_core.resources.document.IDocumentVersion'

If the resource is a pool or item that can contain resources, it will also
have an "element_types" key whose value is the list of all resources the
pool/item can contain (including the "item_type" if it's an item). For
example, a pool can contain other pools; a document can contain tags. ::

    >>> organisation_desc['element_types']
    [...adhocracy_core.resources.process.IProcess...
    >>> sorted(document_desc['element_types'])
    [...'adhocracy_core.resources.paragraph.IParagraph']

The "sheets" key points to an object whose keys are all the sheets
implemented by any of the resources::

     >>> sorted(resp_data['sheets'].keys())
     [...'adhocracy_core.sheets.name.IName', ...'adhocracy_core.sheets.pool.IPool'...]

Each of these keys points to an object describing the resource. Each of
these objects has a "fields" key whose value is a list of objects
describing the fields defined by the sheet:

    >>> pprint(resp_data['sheets']['adhocracy_core.sheets.name.IName']['fields'][0])
    {'creatable': True,
     'create_mandatory': True,
     'editable': False,
     'name': 'name',
     'readable': True,
     'valuetype': 'adhocracy_core.schema.Name'}

Each field definition has the following keys:

name
    The field name

create_mandatory
    Flag specifying whether the field must be set if the sheet is created
    (post requests).

readable
    Flag specifying whether the field can be read (get requests).

editable
    Flag specifying whether the field can be set to edit an existing sheet
    (put requests).

creatable
    Flag specifying whether the field can be set if the sheet is created
    (post requests).

valuetype
    The type of values stored in the field, either a basic type (as defined
    by Colander) such as "String" or "Integer", or a custom-defined type
    such as "adhocracy_core.schema.AbsolutePath"

There also are some optional keys:

containertype
    Only present if the field can store multiple values (each of the type
    specified by the "valuetype" attribute). If present, the value of this
    attribute is either "list" (a list of values: order matters, duplicates
    are allowed) or "set" (a set of values: unordered, no duplicates).

targetsheet
    Only present if "valuetype" is a path
    ("adhocracy_core.schema.AbsolutePath"). If present, it gives the name of the
    sheet that all pointed-to resources will implement (they might possibly
    be of different types, but they will always implement the given sheet
    or they wouldn't be valid link targets).

For example, the 'subdocuments' field of IDocument is an ordered list
pointing to other IDocument's:

    >>> secfields = resp_data['sheets']['adhocracy_core.sheets.document.IDocument']['fields']
    >>> for field in secfields:
    ...     if field['name'] == 'elements':
    ...         pprint(field)
    ...         break
    {'containertype': 'list',
     'creatable': True,
     'create_mandatory': False,
     'editable': True,
     'name': 'elements',
     'readable': True,
     'targetsheet': 'adhocracy_core.sheets.document.ISection',
     'valuetype': 'adhocracy_core.schema.AbsolutePath'}

The 'follows' field of IVersionable is an unordered set pointing to other
IVersionable's:

...    >>> verfields = resp_data['sheets']['adhocracy_core.sheets.versions.IVersionable']['fields']
...    >>> for field in verfields:
...    ...     if field['name'] == 'follows':
...    ...         pprint(field)
...    ...         break
...    {'containertype': 'set',
...     'creatable': True,
...     'create_mandatory': False,
...     'name': 'follows',
...     'editable': True,
...     'readable': True,
...     'targetsheet': 'adhocracy_core.sheets.versions.IVersionable',
...     'valuetype': 'adhocracy_core.schema.AbsolutePath'}


In addition we get the listing of sheet super types (excluding ISheet)::

    >>> pprint(resp_data['sheets']['adhocracy_core.sheets.comment.IComment']['super_types'])
    ['adhocracy_core.interfaces.ISheetReferenceAutoUpdateMarker']


OPTIONS
~~~~~~~

Returns possible methods for this resource, example request/response data
structures and available interfaces with resource data. The result is a
JSON object that has the allowed request methods as keys::

    >>> resp_data = testapp.options(rest_url + "/", headers=god_header).json
    >>> sorted(resp_data.keys())
    ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

If a GET, POST, or PUT request is allowed, the corresponding key will point
to an object that contains at least "request_body" and "response_body" as
keys::

    >>> sorted(resp_data['GET'].keys())
    [...'request_body', ...'response_body'...]
    >>> sorted(resp_data['POST'].keys())
    [...'request_body', ...'response_body'...]

The "response_body" sub-key returned for a GET request gives a stub view of
the actual response body that will be returned::

    >>> pprint(resp_data['GET']['response_body'])
    {'content_type': '',
     'data': {...'adhocracy_core.sheets.name.IName': {}...},
     'path': ''}

"content_type" and "path" will be filled in responses returned by an actual
GET request. "data" points to an object whose keys are the property sheets
that are part of the returned resource. The corresponding values will be
filled during actual GET requests; the stub contains just empty objects
("{}") instead.

If the current user has the right to post new versions of the resource or
add new details to it, the "request_body" sub-key returned for POST points
to a array of stub views of allowed requests::

    >>> data_post_pool = {'content_type': 'adhocracy_core.resources.organisation.IOrganisation',
    ...                   'data': {'adhocracy_core.sheets.metadata.IMetadata': {},
    ...                            'adhocracy_core.sheets.title.ITitle': {},
    ...                            'adhocracy_core.sheets.name.IName': {},
    ...                            'adhocracy_core.sheets.description.IDescription': {},
    ...                            'adhocracy_core.sheets.image.IImageReference': {},
    ...                            'adhocracy_core.sheets.workflow.IWorkflowAssignment': {}}}
    >>> data_post_pool in resp_data["POST"]["request_body"]
    True

The "response_body" sub-key again gives a stub view of the response
body::

     >>> pprint(resp_data['POST']['response_body'])
     {'content_type': '', 'path': ''}

If the current user has the right to modify the resource in-place, the
"request_body" sub-key returned for PUT gives a stub view of how the actual
request should look like::

..     >>> pprint(resp_data['PUT']['request_body'])
..     {'data': {...'adhocracy_core.sheets.name.IName': {}...}}

FIXME: PUT is missing, because the current test pool resource type has not
editable sheet.

The "response_body" sub-key gives, as usual, a stub view of the resulting
response body::

..     >>> pprint(resp_data['PUT']['response_body'])
..     {'content_type': '', 'path': ''}


Basic calls
-----------

We can use the following http verbs to work with resources.


HEAD
~~~~

Returns only http headers::

    >>> resp = testapp.head(rest_url + "/adhocracy")
    >>> resp.headerlist
    [...('Content-Type', 'application/json; charset=UTF-8'), ...
    >>> resp.text
    ''

The caching headers are set to no-cache to ease testing::

   >>> resp.headers['X-Caching-Mode']
   'no_cache'

GET
~~~

Returns resource and child elements meta data and all sheet with data::

    >>> resp_data = testapp.get(rest_url + "/").json
    >>> pprint(resp_data["data"])
    {...'adhocracy_core.sheets.metadata.IMetadata': ...

POST
~~~~

Create a new resource ::

    >>> prop = {'content_type': 'adhocracy_core.resources.process.IProcess',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'Documents'}}}
    >>> resp_data = testapp.post_json(rest_url + "/", prop, headers=god_header).json
    >>> resp_data["content_type"]
    'adhocracy_core.resources.process.IProcess'

The response object has 3 top-level entries:

* The content type and the path of the new resource::

      >>> resp_data['content_type']
      'adhocracy_core.resources.process.IProcess'
      >>> resp_data['path']
      '.../Documents/'

* A listing of resources affected by the transaction::

      >>> sorted(resp_data['updated_resources'])
      ['changed_descendants', 'created', 'modified', 'removed']

  The subkey 'created' lists any resources that have been created by the
  transaction::

      >>> sorted(resp_data['updated_resources']['created'])
      ['http://localhost/Documents/', 'http://localhost/Documents/assets/', 'http://localhost/Documents/badges/']

  The subkey 'modified' lists any resources that have been modified::

      >>> sorted(resp_data['updated_resources']['modified'])
      ['http://localhost/', 'http://localhost/principals/users/0000000/']

  Modifications also include that case that a reference from another
  resource has been added or removed, since references are often exposed in
  both directions (the reserve direction is called "backreference").
  In this case, the user is shown as modified since the new resource
  contains a reference to its creator.

  The subkey 'removed' lists any resources that have been removed
  by marking them as deleted or hidden (see :doc:`deletion`)::

      >>> resp_data['updated_resources']['removed']
      []

  A resource will be shown it at most *one* of the 'created', 'modified', or
  'removed' lists, never in two or more of them.

  The subkey 'changed_descendants' lists the parent (and grandparent etc.)
  pools of all the resources that have been created, modified, or removed.
  Any *query* to such pools may have become outdated as a result of the
  transaction (see "Filtering Pools" document below)::

      >>> sorted(resp_data['updated_resources']['changed_descendants'])
      ['http://localhost/', 'http://localhost/principals/', 'http://localhost/principals/users/']


PUT
~~~

Modify data of an existing resource ::

    FIXME: disable because IName.name is not editable. use another example!
    FIXME: what we do here is a `patch` actually, so we should rename this.

...    >>> data = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
...    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'youdidntexpectthis'}}}
...    >>> resp_data = testapp.put_json(rest_url + "/Documents", data, headers=god_header).json
...    >>> pprint(resp_data)
...    {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
...     'path': rest_url + '/Documents'}

Check the changed resource ::

...   >>> resp_data = testapp.get(rest_url + "/Documents").json
...   >>> resp_data["data"]["adhocracy_core.sheets.name.IName"]["name"]
...   'youdidntexpectthis'

FIXME: write test cases for attributes with "create_mandatory",
"editable", etc. (those work the same in PUT and POST, and on any
attribute in the json tree.)

PUT responses have the same fields as POST responses.

ERROR Handling
~~~~~~~~~~~~~~

FIXME: ... is not working anymore in this doctest

The normal return code is 200 ::

    >>> data = {'content_type': 'adhocracy_core.resources.process.IProcess',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'Documents'}}}

.. >>> testapp.put_json(rest_url + "/Documents", data, headers=god_header)
.. 200 OK application/json ...

If you submit invalid data the return error code is 400 ::

    >>> data = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
    ...         'data': {'adhocracy_core.sheets.example.WRONGINTERFACE': {'name': 'Documents'}}}

.. >>> testapp.put_json(rest_url + "/Documents", data, headers=god_header)
.. Traceback (most recent call last):
.. ...
.. {"errors": [{"description": ...

and you get data with a detailed error description::

     {
       'status': 'error',
       'errors': errors.
     }

With errors being a JSON dictionary with the keys “location”, “name”
and “description”.

location is the location of the error. It can be “querystring”,
“header” or “body”
name is the eventual name of the value that caused problems
description is a description of the problem encountered.

If all goes wrong the return code is 500.


Create and Update Versionable Resources
---------------------------------------


Introduction and Motivation
~~~~~~~~~~~~~~~~~~~~~~~~~~~

This section explains updates to resources with version control. Two
sheets are central to version control in adhocracy: IDAG and
IVersion. IVersion is in all resources that support version
control, and IDAG is a container that manages all versions of a
particular content element in a directed acyclic graph.

IDAGs as well as IVersions need to be created
explicitly by the frontend.

The server supports updating a resource that implements IVersion by
letting you post a content element with missing IVersion sheet
to the DAG (IVersion is read-only and managed by the server), and
passing a list of parent versions in the post parameters of the
request. If there is only one parent version, the new version either
forks off an existing branch or just continues a linear history. If
there are several parent versions, we have a merge commit.

Example: If a new versionable content element has been created by the
user, the front-end first posts an IDAG. The IDAG works a little like
an IPool in that it allows posting versions to it. The front-end will
then simply post the initial version into the IDAG with an empty
predecessor version list.

IDAGs may also implement the IPool sheet for
containing further IDAGs for sub-structures of
structured versionable content types. Example: A document may consist
of a title, description, and a list of references to sections.
There is a DAG for each document and each such dag contains one DAG
for each document that occurs in any version of the document.
Section refs in the document object point to specific versions in
those DAGs.

When posting updates to nested sub-structures, the front-end must
decide for which parent objects it wants to trigger an update. To
stay in the example above: If we have a document with two sections,
and update a section, the post request must contain both the parent
version(s) of the section, but also the parent version(s) of the
document that it is supposed to update.

To see why, consider the following situation::

    Doc     v0       v1      v2
                    /       /
    Par1    v0    v1       /
                          /
    Par2    v0          v1

          >-----> time >-------->

We want Doc to be available in 3 versions that are linearly dependent
on each other. But when the update to Par2 is posted, the server has
no way of knowing that it should update v1 of Doc, BUT NOT v0!


Create
~~~~~~

Create a Document (a subclass of Item which pools DocumentVersions) ::

    >>> pdag = {'content_type': 'adhocracy_core.resources.document.IDocument',
    ...         'data': {},
    ...         }
    >>> resp = testapp.post_json(rest_url + "/Documents", pdag, headers=god_header)
    >>> pdag_path = resp.json["path"]
    >>> pdag_path
    '.../Documents/document_0000000/'

The return data has the new attribute 'first_version_path' to get the path first Version::

    >>> pvrs0_path = resp.json['first_version_path']
    >>> pvrs0_path
    '.../Documents/document_0000000/VERSION_0000000/'


Version IDs are numeric and assigned by the server. The front-end has
no control over them, and they are not supposed to be human-memorable.
For human-memorable version pointers that also allow for complex
update behavior (fixed-commit, always-newest, ...), consider
sheet ITags.

The Document has the IVersions and ITags interfaces to work with Versions::

    >>> resp = testapp.get(pdag_path)
    >>> resp.json['data']['adhocracy_core.sheets.versions.IVersions']['elements']
    ['.../Documents/document_0000000/VERSION_0000000/']

    >>> resp.json['data']['adhocracy_core.sheets.tags.ITags']['LAST']
    '.../Documents/document_0000000/VERSION_0000000/'

    >>> resp.json['data']['adhocracy_core.sheets.tags.ITags']['FIRST']
    '.../Documents/document_0000000/VERSION_0000000/'


Update
~~~~~~

Fetch the first Document version, it is empty ::

    >>> resp = testapp.get(pvrs0_path)
    >>> pprint(resp.json['data']['adhocracy_core.sheets.document.IDocument'])
    {'elements': []}

    >>> pprint(resp.json['data']['adhocracy_core.sheets.versions.IVersionable'])
    {'follows': []}

but owned by the Document item creator::
    >>> pprint(resp.json['data']['adhocracy_core.sheets.metadata.IMetadata']['creator'])
    'http://localhost/principals/users/0000000/'


Create a new version of the proposal that follows the first version ::

    >>> pvrs = {'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...         'data': {'adhocracy_core.sheets.document.IDocument': {
    ...                     'elements': []},
    ...                  'adhocracy_core.sheets.versions.IVersionable': {
    ...                     'follows': [pvrs0_path]}},
    ...          'root_versions': [pvrs0_path]}
    >>> resp = testapp.post_json(pdag_path, pvrs, headers=god_header)
    >>> pvrs1_path = resp.json["path"]
    >>> pvrs1_path != pvrs0_path
    True

Add and update child resource
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

We expect certain Versionable fields for the rest of this test suite
to work ::

    >>> resp = testapp.get('/meta_api')
    >>> vers_fields = resp.json['sheets']['adhocracy_core.sheets.versions.IVersionable']['fields']
    >>> pprint(sorted(vers_fields, key=itemgetter('name')))
    [{'containertype': 'list',
      'creatable': True,
      'create_mandatory': False,
      'editable': True,
      'name': 'follows',
      'readable': True,
      'targetsheet': 'adhocracy_core.sheets.versions.IVersionable',
      'valuetype': 'adhocracy_core.schema.AbsolutePath'}]

The 'follows' element must be set by the client when it creates a new
version that is the successor of one or several earlier versions.

Create a Section item inside the Document item ::

    >>> sdag = {'content_type': 'adhocracy_core.resources.paragraph.IParagraph',
    ...         'data': {}
    ...         }
    >>> resp = testapp.post_json(pdag_path, sdag, headers=god_header)
    >>> sdag_path = resp.json["path"]
    >>> svrs0_path = resp.json["first_version_path"]

and a second Section ::

    >>> sdag = {'content_type': 'adhocracy_core.resources.paragraph.IParagraph',
    ...         'data': {}
    ...         }
    >>> resp = testapp.post_json(pdag_path, sdag, headers=god_header)
    >>> s2dag_path = resp.json["path"]
    >>> s2vrs0_path = resp.json["first_version_path"]

Create a third Document version and add the two Sections in their
initial versions ::

    >>> pvrs = {'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...         'data': {'adhocracy_core.sheets.document.IDocument': {
    ...                     'elements': [svrs0_path, s2vrs0_path]},
    ...                  'adhocracy_core.sheets.versions.IVersionable': {
    ...                     'follows': [pvrs1_path],}
    ...                 },
    ...          'root_versions': [pvrs1_path]}
    >>> resp = testapp.post_json(pdag_path, pvrs, headers=god_header)
    >>> pvrs2_path = resp.json["path"]

If we create a second version of kapitel1 ::

    >>> svrs = {'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...         'data': {
    ...              'adhocracy_core.sheets.document.IParagraph': {
    ...                  'title': 'Kapitel Überschrift Bla',
    ...                  'elements': []},
    ...               'adhocracy_core.sheets.versions.IVersionable': {
    ...                  'follows': [svrs0_path]
    ...                  }
    ...          },
    ...          'root_versions': [pvrs2_path]
    ...         }
    >>> resp = testapp.post_json(sdag_path, svrs, headers=god_header)
    >>> svrs1_path = resp.json['path']
    >>> svrs1_path != svrs0_path
    True

Whenever a IVersionable contains 'follows' link(s) to preceding versions,
there should be a top-level 'root_versions' element listing the version of
their root elements. 'root_versions' is a set, which means that order
doesn't matter and duplicates are ignored. In this case, it points to the
proposal version containing the document to update.

The 'root_versions' set allows automatical updates of items that embedding
or otherwise linking to the updated item. In this case, a fourth Document
version is automatically created along with the updated Section version::

    >>> resp = testapp.get(pdag_path)
    >>> pprint(resp.json['data']['adhocracy_core.sheets.versions.IVersions'])
    {'count': '4',
     'elements': ['.../Documents/document_0000000/VERSION_0000000/',
                  '.../Documents/document_0000000/VERSION_0000001/',
                  '.../Documents/document_0000000/VERSION_0000002/',
                  '.../Documents/document_0000000/VERSION_0000003/']}

    >>> resp = testapp.get(rest_url + '/Documents/document_0000000/VERSION_0000003')
    >>> pvrs3_path = resp.json['path']

    >>> s2vrs1_path = resp.json['path']
    >>> s2vrs1_path != s2vrs0_path
    True

More interestingly, if we try to create a second version of kapitel2 we
get an error because this would automatically create two new version for pvrs3
and pvrs2 (both contain s2vrs0_path)::

    >>> svrs = {'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...         'data': {
    ...              'adhocracy_core.sheets.document.IParagraph': {
    ...                  'title': 'on the hardness of version control',
    ...                  'elements': []},
    ...               'adhocracy_core.sheets.versions.IVersionable': {
    ...                  'follows': [s2vrs0_path]
    ...                  }
    ...          },
    ...          'root_versions': []
    ...         }
    >>> resp = testapp.post_json(s2dag_path, svrs, headers=god_header, status=400)
    >>> pprint(resp.json['errors'][0])
    {'description': 'No fork allowed - The auto update ...

But if we set the `root_version` to the last  Document version (pvrs3)::
    >>> svrs = {'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...         'data': {
    ...              'adhocracy_core.sheets.document.IParagraph': {
    ...                  'title': 'on the hardness of version control',
    ...                  'elements': []},
    ...               'adhocracy_core.sheets.versions.IVersionable': {
    ...                  'follows': [s2vrs0_path]
    ...                  }
    ...          },
    ...          'root_versions': [pvrs3_path]
    ...         }
    >>> resp = testapp.post_json(s2dag_path, svrs, headers=god_header)

a new version pvrs4 is automatically created following only pvrs3, not pvrs2::

    >>> resp = testapp.get(pdag_path)
    >>> pprint(resp.json['data']['adhocracy_core.sheets.versions.IVersions'])
    {'count': '5',
     'elements': ['.../Documents/document_0000000/VERSION_0000000/',
                  '.../Documents/document_0000000/VERSION_0000001/',
                  '.../Documents/document_0000000/VERSION_0000002/',
                  '.../Documents/document_0000000/VERSION_0000003/',
                  '.../Documents/document_0000000/VERSION_0000004/']}

    >>> resp = testapp.get(rest_url + '/Documents/document_0000000/VERSION_0000004')
    >>> pvrs4_path = resp.json['path']
    >>> resp.json['data']['adhocracy_core.sheets.versions.IVersionable']['follows']
    [.../Documents/document_0000000/VERSION_0000003/']

    >>> resp = testapp.get(rest_url + '/Documents/document_0000000/VERSION_0000003')
    >>> resp.json['data']['adhocracy_core.sheets.versions.IVersionable']['follows']
    [.../Documents/document_0000000/VERSION_0000002/']



FIXME: If two frontends post competing documents simultaneously,
neither knows which proposal version belongs to whom.  Proposed
solution: the post response must tell the frontend the changed
``root_version``.


Tags
~~~~

Each Versionable has a FIRST tag that points to the initial version::

    >>> resp = testapp.get(rest_url + '/Documents/document_0000000')
    >>> pprint(resp.json['data']['adhocracy_core.sheets.tags.ITags']['FIRST'])
    '.../Documents/document_0000000/VERSION_0000000/'

It also has a LAST tag that points to the newest versions -- any versions
that aren't 'followed_by' any later version::

    >>> pprint(resp.json['data']['adhocracy_core.sheets.tags.ITags']['LAST'])
    '.../Documents/document_0000000/VERSION_0000004/'


Forks and forkability
~~~~~~~~~~~~~~~~~~~~~

This api has been designed to allow implementation of complex merge
conflict resolution, both automatic and with user-involvement. Many
resource types, however, only supports a simplified version control strategy
with a *linear history*: If any version that is not head is used as a
predecessor, the backend responds with an error. The frontend has to handle
these errors, as they can always occur in race conditions with other users.

Current and potential future conflict resolution strategies are:

1. If a race condition is reported by the backend, the frontend
   updates the predecessor version to head and tries again. (In the
   unlikely case where lots of post activity is going on, it may be
   necessary to repeat this several times.)

   Example: IRatingVersion can only legally be modified by one user
   and should not experience any race conditions. If it does, the
   second post wins and silently reverts the previous one.

2. (Future work) Like 1., but the frontend posts two new versions on top of
   HEAD. If this is the situation of the conflict::

    Doc     v0----v1
                \
                 -----v1'

          >-----> time >-------->

   Then it is resolved as follows (by the frontend of the author of
   v1')::

    Doc     v0----v1
                    \
                     -----v0'----v1'

          >-----> time >-------->

   v0' is a copy of v0 that differs only in its predecessor. It is
   called a 'revert' version. (FIXME: is there a way to enrich the
   data with a 'is_revert' flag?)

   This must be done in a batch request (a transaction) in order to
   avoid that only the revert is successfully posted, but the actual
   change fails. Again, it is possible that this batch request fails,
   and has to be attempted several times.

   Example: IDocumentVersion can be modified by many users
   concurrently.

3. (Future work) Both authors of the conflict are notified (email,
   dashboard, ...), and explained how they can inspect the situation
   and add new versions. (The email should probably contain a warning
   that it's best to get on the phone and talk it through before
   generating more merge conflicts.)

4. (Future work) Ideally, the user would to be notified that there
   is a conflict, display the differences between the three versions,
   and allow the user to merge his changes into the current HEAD.

5. (Future work) It is allowed to have multiple heads in the DAG, e.g.
   different preferred versions by different principals. This however still
   requires a lot of UX work to be done.

To give an example, *Comments* only allow a linear version history (just a
single heads). Lets create a comment with an initial version (see below
for more on comments and *post pools*)::

    >>> resp = testapp.get('/Documents/document_0000000/VERSION_0000004')
    >>> commentable = resp.json['data']['adhocracy_core.sheets.comment.ICommentable']
    >>> post_pool_path = commentable['post_pool']
    >>> comment = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...            'data': {}}
    >>> resp = testapp.post_json(post_pool_path, comment, headers=god_header)
    >>> comment_path = resp.json["path"]
    >>> first_commvers_path = resp.json['first_version_path']
    >>> first_commvers_path
    '.../Documents/document_0000000/comments/comment_000.../VERSION_0000000/'

We can create a second version that refers to the first (auto-created)
version as predecessor::

    >>> commvers = {'content_type': 'adhocracy_core.resources.comment.ICommentVersion',
    ...             'data': {
    ...                 'adhocracy_core.sheets.comment.IComment': {
    ...                     'refers_to': pvrs4_path,
    ...                     'content': 'Bla bla bla!'},
    ...                 'adhocracy_core.sheets.versions.IVersionable': {
    ...                     'follows': [first_commvers_path]}},
    ...             'root_versions': [first_commvers_path]}
    >>> resp = testapp.post_json(comment_path, commvers, headers=god_header)
    >>> snd_commvers_path = resp.json['path']
    >>> snd_commvers_path
    '.../Documents/document_0000000/comments/comment_000.../VERSION_0000001/'

However, if we try to add another version that *also* gives the first
version (no longer head) as predecessor, we get an error::

    >>> resp_data = testapp.post_json(comment_path, commvers, status=400, headers=god_header).json
    >>> pprint(resp_data)
    {'errors': [{'description': 'No fork allowed ...
                 'location': 'body',
                 'name': 'data.adhocracy_core.sheets.versions.IVersionable.follows'}],
     'status': 'error'}

The *description* of the error will always be 'No fork allowed'. This allows
distinguishing this error from other kinds of errors.

Only resources that implement the
`adhocracy_core.sheets.versions.IForkableVersionable` sheet (instead of
`adhocracy_core.sheets.versions.IVersionable`) allow forking (multiple heads).
For now, none of our standard resource types does this.


Resources with PostPool, example Comments
-----------------------------------------

To give another example of a versionable content type, we can write comments
about proposals.
The proposal has a commentable sheet::

    >>> resp = testapp.get(pvrs4_path)
    >>> commentable = resp.json['data']['adhocracy_core.sheets.comment.ICommentable']

This sheet has a special field :term:`post_pool` referencing a pool::

    >>> post_pool_path = commentable['post_pool']

We can post comments to this pool only::

    >>> comment = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...            'data': {}}
    >>> resp = testapp.post_json(post_pool_path, comment, headers=god_header)
    >>> comment_path = resp.json["path"]
    >>> comment_path
    '.../Documents/document_0000000/comments/comment_000...'
    >>> first_commvers_path = resp.json['first_version_path']
    >>> first_commvers_path
    '.../Documents/document_0000000/comments/comment_000.../VERSION_0000000/'

The first comment version is empty (as with all versionables), so lets add
another version to say something meaningful. A comment contains *content*
(arbitrary text) and *refers_to* a specific version of a proposal. ::

    >>> commvers = {'content_type': 'adhocracy_core.resources.comment.ICommentVersion',
    ...             'data': {
    ...                 'adhocracy_core.sheets.comment.IComment': {
    ...                     'refers_to': pvrs4_path,
    ...                     'content': 'Gefällt mir, toller Vorschlag!'},
    ...                 'adhocracy_core.sheets.versions.IVersionable': {
    ...                     'follows': [first_commvers_path]}},
    ...             'root_versions': [first_commvers_path]}
    >>> resp = testapp.post_json(comment_path, commvers, headers=god_header)
    >>> snd_commvers_path = resp.json['path']
    >>> snd_commvers_path
    '.../Documents/document_0000000/comments/comment_000.../VERSION_0000001/'

Comments can be about any versionable that allows posting comments. Hence
it's also possible to write a comment about another comment::

    >>> metacomment = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...                 'data': {}}
    >>> resp = testapp.post_json(post_pool_path, metacomment, headers=god_header)
    >>> metacomment_path = resp.json["path"]
    >>> metacomment_path
    '.../Documents/document_0000000/comments/comment_000...'
    >>> comment_path != metacomment_path
    True
    >>> first_metacommvers_path = resp.json['first_version_path']
    >>> first_metacommvers_path
    '.../Documents/document_0000000/comments/comment_000.../VERSION_0000000/'

As usual, we have to add another version to actually say something::

    >>> metacommvers = {'content_type': 'adhocracy_core.resources.comment.ICommentVersion',
    ...                 'data': {
    ...                     'adhocracy_core.sheets.comment.IComment': {
    ...                         'refers_to': snd_commvers_path,
    ...                         'content': 'Find ich nicht!'},
    ...                     'adhocracy_core.sheets.versions.IVersionable': {
    ...                         'follows': [first_metacommvers_path]}},
    ...                 'root_versions': [first_metacommvers_path]}
    >>> resp = testapp.post_json(metacomment_path, metacommvers, headers=god_header)
    >>> snd_metacommvers_path = resp.json['path']
    >>> snd_metacommvers_path
    '.../Documents/document_0000000/comments/comment_000.../VERSION_0000001/'


Let view all the comments referring to the proposal with a query on
the comments pool::

    >>> resp_data = testapp.get(post_pool_path,
    ...     params={'content_type': 'adhocracy_core.resources.comment.ICommentVersion',
    ...             'depth': 2}).json
    >>> commvers = resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements']
    >>> snd_commvers_path in commvers
    True

Since comments can refer to other comments, we can also find out which
other comments refer to this comment version::

    >>> resp_data = testapp.get(post_pool_path,
    ...     params={'content_type': 'adhocracy_core.resources.comment.ICommentVersion',
    ...             'adhocracy_core.sheets.comment.IComment:refers_to': snd_commvers_path,
    ...             'depth': 2}).json
    >>> comlist = resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements']
    >>> comlist == [snd_metacommvers_path]
    True


Rates
-----

We can rate objects that provide the `adhocracy_core.sheets.rate.IRateable`
sheet (or a subclass of it), e.g. comment versions. Rateables have their own
post pool, so we ask the comment where to send rates about it::

    >>> resp = testapp.get(snd_commvers_path)
    >>> rateable_post_pool = resp.json['data']['adhocracy_core.sheets.rate.IRateable']['post_pool']

`IRate` objects are versionable too, so we first have to create a `IRate`
resource and then post a `IRateVersion` resource below it::

    >>> rate = {'content_type': 'adhocracy_core.resources.rate.IRate',
    ...         'data': {}}
    >>> resp = testapp.post_json(rateable_post_pool, rate, headers=god_header)
    >>> rate_path = resp.json["path"]
    >>> first_ratevers_path = resp.json['first_version_path']
    >>> ratevers = {'content_type': 'adhocracy_core.resources.rate.IRateVersion',
    ...             'data': {
    ...                 'adhocracy_core.sheets.rate.IRate': {
    ...                     'subject': 'http://localhost/principals/users/0000000/',
    ...                     'object': snd_commvers_path,
    ...                     'rate': '1'},
    ...                 'adhocracy_core.sheets.versions.IVersionable': {
    ...                     'follows': [first_ratevers_path]}},
    ...             'root_versions': [first_ratevers_path]}
    >>> resp = testapp.post_json(rate_path, ratevers, headers=god_header)
    >>> snd_ratevers_path = resp.json['path']
    >>> snd_ratevers_path
    '...Documents/document_0000000/rates/rate_0000000/VERSION_0000001/'

If we want to change our rate, we can post a new version::

    >>> ratevers['data']['adhocracy_core.sheets.rate.IRate']['rate'] = '0'
    >>> ratevers['data']['adhocracy_core.sheets.versions.IVersionable']['follows'] = [snd_ratevers_path]
    >>> ratevers['root_versions'] = [snd_ratevers_path]
    >>> resp = testapp.post_json(rate_path, ratevers, headers=god_header)
    >>> third_ratevers_path = resp.json['path']
    >>> third_ratevers_path != snd_ratevers_path
    True

But creating a second rate is not allowed to prevent people from voting
multiple times::

    >>> resp = testapp.post_json(rateable_post_pool, rate, headers=god_header)
    >>> rate2_path = resp.json["path"]
    >>> first_rate2vers_path = resp.json['first_version_path']
    >>> ratevers['data']['adhocracy_core.sheets.versions.IVersionable']['follows'] = [first_rate2vers_path]
    >>> ratevers['root_versions'] = [first_rate2vers_path]
    >>> resp_data = testapp.post_json(rate2_path, ratevers, headers=god_header,
    ...                               status=400).json
    >>> resp_data['errors'][0]['name']
    'data.adhocracy_core.sheets.rate.IRate.object'
    >>> resp_data['errors'][0]['description']
    '; Another rate by the same user already exists'

 ...TODO: remove ';' suffix of error description, :mod:`colander` bug

The *subject* of a rate must always be the user that is currently logged in --
it's not possible to vote for other users::

    >>> ratevers['data']['adhocracy_core.sheets.rate.IRate']['subject'] = 'http://localhost/principals/users/0000001/'
    >>> ratevers['data']['adhocracy_core.sheets.versions.IVersionable']['follows'] = [third_ratevers_path]
    >>> ratevers['root_versions'] = [third_ratevers_path]
    >>> resp_data = testapp.post_json(rate_path, ratevers, headers=god_header,
    ...                               status=400).json
    >>> resp_data['errors'][0]['name']
    'data.adhocracy_core.sheets.rate.IRate.subject'
    >>> resp_data['errors'][0]['description']
    '; Must be the currently logged-in user'


Likes
-----

Similar to rates, we can 'like' objects that provide the
`adhocracy_core.sheets.rate.ILikeable` sheet to represent a support
vote.


Batch requests
--------------

The following URL accepts batch requests ::

    >>> batch_url = '/batch'

A batch request a POST request with a json array in the body that
contains certain HTTP requests encoded in a certain way.

A success response contains in its body an array of encoded HTTP
responses. This way, the client can see what happened to the
individual POSTS, and collect all the paths of the individual
resources that were posted.

Batch requests are processed as a transaction. By this, we mean that
either all encoded HTTP requests succeed and the response to the batch
request is a success response, or any one of them fails, the database
state is rolled back to the beginning of the request, and the response
is an error, explaining which request failed for which reason.

Things that are different in individual requests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

*Forks and multiple versions*

During one Batch request you can create only one new version.
The first version created (with an explicit post request or auto updated)
is used to store all modifications.

*Preliminary resource paths: motivation and general idea.*

All requests with methods POST, GET, PUT as allowed in the rest of
this document are allowed in batch requests. POST differs in that it
yields *preliminary resource paths*. To understand what that is,
consider this example: In step 4 of a batch request, the front-end
wants to post to the path that resulted from posting the parent
resource in step 3 of the same request, so batch requests need to
allow for an abstraction over the resource paths resulting from POST
requests. POST yields preliminary paths instead of actual ones, and
POST, GET, and PUT are all allowed to use preliminary paths in
addition to the "normal" ones. Apart from this, nothing changes in
the individual requests.

*Preliminary resource paths: implementation.*

The encoding of a request consist of an object with attributes for
method (aka HTTP verb), path, and body. A further attribute, 'result_path',
defines a name for the preliminary path of the object created by the request.
The preliminary path is like an *AbsolutePath*, but it starts with '@'
instead of '/'. If the preliminary name will not be used, this attribute can be
omitted or left empty. ::

    >>> encoded_request_with_name = {
    ...     'method': 'POST',
    ...     'path': rest_url + '/Proposal/document_0000000',
    ...     'body': { 'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraph' },
    ...     'result_path': '@par1_item',
    ...     'result_first_version_path': '@par1_item/v1'
    ... }

Preliminary paths can be used anywhere in subsequent requests, either
in the 'path' item of the request itself, or anywhere in the json data
in the body where the schemas expect to find resource paths. It must
be prefixed with "@" in order to mark it as preliminary. Right
before executing the request, the backend will traverse the request
object and replace all preliminary paths with the actual ones that
will be available by then.

In order to post the first *real* item version, we must use
'first_version_path' as the predecessor version, but we can't know its
value before the post of the item version. This would not be a
problem if the item would be created empty.

*FIXME: change the api accordingly so that this problem goes away!*

In order to work around you can set the optional field
'result_first_version_path' with a *preliminary resource path*.


Examples
~~~~~~~~

Let's add some more paragraphs to the second document above ::

    >>> document_item = s2dag_path
    >>> batch = [ {
    ...             'method': 'POST',
    ...             'path': pdag_path,
    ...             'body': {
    ...                 'content_type': 'adhocracy_core.resources.paragraph.IParagraph',
    ...                 'data': {}
    ...             },
    ...             'result_path': '@par1_item',
    ...             'result_first_version_path': '@par1_item/v1'
    ...           },
    ...           {
    ...             'method': 'POST',
    ...             'path': '@par1_item',
    ...             'body': {
    ...                 'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...                 'data': {
    ...                     'adhocracy_core.sheets.versions.IVersionable': {
    ...                         'follows': ['@par1_item/v1']
    ...                     },
    ...                     'adhocracy_core.sheets.document.IParagraph': {
    ...                         'text': 'sein blick ist vom vorüberziehn der stäbchen'
    ...                     }
    ...                 },
    ...             },
    ...             'result_path': '@par1_item/v2'
    ...           },
    ...           {
    ...             'method': 'GET',
    ...             'path': '@par1_item/v2'
    ...           },
    ...         ]

The batch response is a dictionary with two fields::

    >>> batch_resp = testapp.post_json(batch_url, batch, headers=god_header).json
    >>> sorted(batch_resp)
    ['responses', 'updated_resources']

'responses' is an array of the individual responses.

'updated_resources' lists all the resources affected by the POST and PUT
requests in the batch request. If the batch requests doesn't contain any such
requests (only GET etc.), all of its sub-entries will be empty. ::

    >>> updated_resources = batch_resp['updated_resources']
    >>> 'http://localhost/Documents/' in updated_resources['changed_descendants']
    True
    >>> 'http://localhost/Documents/document_0000000/PARAGRAPH_0000002/' in updated_resources['created']
    True

Lets inspect some of the responses. The 'code' field contains the HTTP status
code. The 'body' field contains the JSON dict that would normally be sent as
body of the request, except that its 'updated_resources' field (if any) is
omitted::

    >>> len(batch_resp['responses'])
    3
    >>> pprint(batch_resp['responses'][0])
    {'body': {'content_type': 'adhocracy_core.resources.paragraph.IParagraph',
              'first_version_path': '.../Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/',
              'path': '.../Documents/document_0000000/PARAGRAPH_0000002/'},
     'code': 200}
    >>> pprint(batch_resp['responses'][1])
    {'body': {'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
              'path': '.../Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/'},
     'code': 200}
    >>> pprint(batch_resp['responses'][2])
    {'body': {'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
              'data': {...},
              'path': '.../Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/'},
     'code': 200}
     >>> batch_resp['responses'][2]['body']['data']['adhocracy_core.sheets.document.IParagraph']['text']
     'sein blick ist vom vorüberziehn der stäbchen'


New Versions are only created once within one batch request. That means the second
subrequest does not create a second version, but updates the existing first version:

    >>> v0 = batch_resp['responses'][0]['body']['first_version_path']
    >>> v0_again = batch_resp['responses'][1]['body']['path']
    >>> v0 == v0_again
    True

The follow reference points to None:

    >>> batch_resp['responses'][2]['body']['data']['adhocracy_core.sheets.versions.IVersionable']['follows']
    []

The LAST tag should point to the last version we created within the batch request::

    >>> resp_data = testapp.get(rest_url + "/Documents/document_0000000/PARAGRAPH_0000002").json
    >>> resp_data['data']['adhocracy_core.sheets.tags.ITags']['LAST']
    '.../Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/'

All creation and modification dates are equal for one batch request:

    >>> pdag_metadata = testapp.get(pdag_path).json['data']['adhocracy_core.sheets.metadata.IMetadata']
    >>> pv0_path =  batch_resp['responses'][0]['body']['first_version_path']
    >>> pv0_metadata = testapp.get(pv0_path).json['data']['adhocracy_core.sheets.metadata.IMetadata']
    >>> pv1_path =  batch_resp['responses'][0]['body']['path']
    >>> pv1_metadata = testapp.get(pv1_path).json['data']['adhocracy_core.sheets.metadata.IMetadata']
    >>> pv0_metadata['creation_date'] \
    ... == pv0_metadata['modification_date']\
    ... == pv1_metadata['creation_date']\
    ... == pv1_metadata['modification_date']
    True

Post another paragraph item and a version.  If the version post fails,
the paragraph will not be present in the database ::

    >>> invalid_batch = [ {
    ...             'method': 'POST',
    ...             'path': pdag_path,
    ...             'body': {
    ...                 'content_type': 'adhocracy_core.resources.paragraph.IParagraph',
    ...                 'data': {}
    ...             },
    ...             'result_path': '@par2_item'
    ...           },
    ...           {
    ...             'method': 'POST',
    ...             'path': '@par2_item',
    ...             'body': {
    ...                 'content_type': 'NOT_A_CONTENT_TYPE_AT_ALL',
    ...                 'data': {
    ...                     'adhocracy_core.sheets.versions.IVersionable': {
    ...                         'follows': ['@par2_item/v1']
    ...                     },
    ...                     'adhocracy_core.sheets.document.IParagraph': {
    ...                         'content': 'das wird eh nich gepostet'
    ...                     }
    ...                 }
    ...             },
    ...             'result_path': '@par2_item/v2'
    ...           }
    ...         ]
    >>> invalid_batch_resp = testapp.post_json(batch_url, invalid_batch,
    ...                                        status=400, headers=god_header).json
    >>> pprint(sorted(invalid_batch_resp['updated_resources']))
    ['changed_descendants', 'created', 'modified', 'removed']
    >>> pprint(invalid_batch_resp['responses'])
    [{'body': {'content_type': 'adhocracy_core.resources.paragraph.IParagraph',
               'first_version_path': '...',
               'path': '...'},
      'code': 200},
     {'body': {'errors': [...],
               'status': 'error'},
      'code': 400}]
    >>> get_nonexistent_obj = testapp.get(invalid_batch_resp['responses'][0]['body']['path'], status=404)
    >>> get_nonexistent_obj.status
    '404 Not Found'

Note that the response will contain embedded responses for all successful
encoded requests (if any) and also for the first failed encoded request (if
any), but not for any further failed requests. The backend stops processing
encoded requests once the first of them has failed, since further processing
would probably only lead to further errors.


Filtering Pools / Search
------------------------

By default resources with IPool sheets do not list the child elements but
only the `count`:

    >>> resp_data = testapp.get('/Documents/document_0000000/comments/').json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool'])
    {'count': '3', 'elements': []}

*Note:* due to limitations of our (de)serialization library (Colander),
-the count is returned as a string, though it is actually a number.

To list child elements you have to do a search query with `elements=paths`
 (see below for more detailed examples):

    >>> resp_data = testapp.get('/Documents/document_0000000/comments',
    ...     params={'elements': 'paths'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool'])
    {'count': '3',
     'elements': ['http://localhost...]}

It's possible to filter and aggregate the elements listed in the IPool sheet
by additional GET parameters. For example, we can only retrieve children
that have specific resource type (*content_type'):

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.paragraph.IParagraph'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/PARAGRAPH_0000000/',
     'http://localhost/Documents/document_0000000/PARAGRAPH_0000001/',
     'http://localhost/Documents/document_0000000/PARAGRAPH_0000002/']

Note that multiple filters are combined by AND. If we specify a content_type
filter and a sheet filter, only the elements matched by *both* filters will be
returned. The same applies to all other filters as well.

For more sophisticated queries you can add various comparator suffix to your
parameter value. The available comparators depend on the choosedn filter.

*eq* 'equal to' is the default comparator we already used implicit::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': '["eq", "adhocracy_core.resources.paragraph.IParagraph"]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/PARAGRAPH_0000000/'...

*noteq* not equal to::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': '["noteq", "adhocracy_core.resources.paragraph.IParagraph"]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/VERSION_0000000/',...

*gt* greater then::

    >>> resp_data = testapp.get('/Documents/document_0000000/rates/',
    ...     params={'name': '["gt", "rate_0000000"]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/rates/rate_0000001/']

*ge* greater or equal to::

    >>> resp_data = testapp.get('/Documents/document_0000000/rates/',
    ...     params={'name': '["ge", "rate_0000000"]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/rates/rate_0000000/',
     'http://localhost/Documents/document_0000000/rates/rate_0000001/']


*lt* lower then::

    >>> resp_data = testapp.get('/Documents/document_0000000/rates/',
    ...     params={'name': '["lt", "rate_0000001"]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/rates/rate_0000000/']

*le* lower or equal to::

    >>> resp_data = testapp.get('/Documents/document_0000000/rates/',
    ...     params={'name': '["le", "rate_0000001"]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/rates/rate_0000000/',
     'http://localhost/Documents/document_0000000/rates/rate_0000001/']

Some comparators can handle a list of query values.

*any*::

    >>> resp_data = testapp.get('/Documents/document_0000000/rates/',
    ...     params={'name': '["any", ["rate_0000000", "rate_0000001"]]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/rates/rate_0000000/',
     'http://localhost/Documents/document_0000000/rates/rate_0000001/']

*notany*::

    >>> resp_data = testapp.get('/Documents/document_0000000/rates/',
    ...     params={'name': '["notany", ["rate_0000000", "rate_0000001"]]'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    []

By default, only direct children of a pool are listed as elements,
i.e. the standard depth is 1. Setting the *depth* filter to a higher
value allows also including grandchildren (depth=2) or even great-grandchildren
(depth=3) etc. Allowed values are arbitrary positive numbers and *all*.
*all* can be used to get nested elements of arbitrary nesting depth::

    >>> resp_data = testapp.get('/Documents',
    ...     params={'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...             'depth': 'all'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    [...'http://localhost/Documents/document_0000000/VERSION_0000001/'...]

    >>> resp_data = testapp.get('/Documents',
    ...     params={'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...             'depth': '2'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    [...'http://localhost/Documents/document_0000000/VERSION_0000001/'...]

Without specifying a deeper depth, the above query for IDocumentVersions
wouldn't have found anything, since they are children of children of the pool::

    >>> resp_data = testapp.get('/Documents',
    ...     params={'content_type': 'adhocracy_core.resources.document.IDocumentVersion'
    ...             }).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    []

If you specify *sort* you can set a *<custom>* filter (see below) that supports
sorting to sort the result::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'sort': 'name'}).json
    >>> resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements']
    ['http://localhost/Documents/document_0000000/PARAGRAPH_0000000/',...

*Note* All resource in the result set must have a value in the chosen sort
filter. For example if you use *rates* you have to limit the result to resources
with :class:`adhocracy_core.sheets.rate.IRateable` sheet.

Not supported filters cannot be used for sorting::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...                         params={'sort': 'path'},
    ...                         status=400).json
    >>> resp_data['errors'][0]['description']
    '"path" is not one of content_type, name, text,...

If *reverse* is set to ``True`` the sorting will be reversed::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'sort': 'name', 'reverse': True}).json
    >>> resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements']
    ['http://localhost/Documents/document_0000000/rates/',...

You can also specifiy a *limit* and an *offset* for pagination::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'sort': 'name', 'limit': 1, 'offset': 0}).json
    >>> resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements']
    ['http://localhost/Documents/document_0000000/PARAGRAPH_0000000/']

The *count* is not affected by *limit*::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'count': 'true', 'limit': 1}).json
    >>> child_count = resp_data['data']['adhocracy_core.sheets.pool.IPool']['count']
    >>> assert int(child_count) >= 10

The *elements* parameter allows controlling how matching element are
returned. By default, 'elements' in the IPool sheet contains nothing.
This corresponds to setting *elements=omit*

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...             'elements': 'omit'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    []

Setting *elements=paths* will yield a response with a listing of resource paths.

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...             'elements': 'paths'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/VERSION_0000000/',...

Setting *elements=content* will instead return the complete contents of all
matching elements -- what you would get by making a GET request on each of
their paths::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
    ...             'elements': 'content'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool'])
    {'count': '5',
     'elements': [{'content_type': 'adhocracy_core.resources.document.IDocumentVersion',
                   'data': ...

*sheet* filter resources with a specific sheet type::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.sheets.document.IDocument'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/VERSION_0000000/',...

Valid query comparables: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'

*tag* is a filter that allows filtering only resources with a
specific tag. Often we are only interested in the newest versions of
Versionables. We can get them by setting *tag=LAST*. Let's find the latest
versions of all documents::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...             'depth': 'all', 'tag': 'LAST'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/PARAGRAPH_0000000/VERSION_0000001/',
     'http://localhost/Documents/document_0000000/PARAGRAPH_0000001/VERSION_0000001/',
     'http://localhost/Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/']

Valid query comparables: 'eq', 'noteq', 'any', 'notany'

*<custom>* filter: depending on the backend configuration there are additional
custom filters:

* *rate* the rate value of resources with :class:`adhocracy_core.sheets.rate.IRate`
  sheet. This is mostly useful for the requests with the *aggregated* filter.
  Supports sorting.
  Valid query comparable: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'

* *rates* the aggregated value of all :class:`adhocracy_core.sheets.rate.IRate`
  resources referencing a resource with :class:`adhocracy_core.sheets.rate.IRateable`.
  Only the LAST version of each rate is counted. Supports sorting.
  Valid query comparable: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'

* *name* the identifier value of all resources (last part in the resource url).
  This is the same value like the name in the :class:`adhocracy_core.sheets.name.IName`
  sheet.
  Valid query comparable: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'
  Supports sorting.

* *creator* the :term:`userid` of the resource creator. This is the path of the
  user resource url.
  Valid query comparable: 'eq'
  Supports sorting.

    >>> resp_data = testapp.get('/Documents', params={'creator': god_path}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/']

* *item_creation_date* the the item_creation_date value of resources with :class:`adhocracy_core.sheets.metadata.IMetadata`.
  Valid query comparable: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'

* *workflow_state* workflow state, see :doc:`workflows`, the state of versions is the same as for its item.
  Valid query comparable: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'

* *badge* the badge names of resources with :class:`adhocracy_core.sheets.badge.IBadgeable`
  sheet.
  Valid query comparable: 'eq', 'noteq', 'any', 'notany'

* *title* the title of resources with :class:`adhocracy_core.sheets.title.ITitle`
  sheet.
  Valid query comparable: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'

* *user_name* the login name of users.
  Valid query comparable: 'eq', 'noteq', 'lt', 'le', 'gt', 'ge', 'any', 'notany'

*<package.sheets.sheet.ISheet:FieldName>* filters: you can add arbitrary custom
filters that refer to sheet fields with references. The key is the name of
the isheet plus the field name separated by ':' The value is the wanted
reference target.

First we create more paragraphs versions::

    >>> pvrs0_path = 'http://localhost/Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/'
    >>> pvrs = {'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...         'data': {'adhocracy_core.sheets.versions.IVersionable': {
    ...                  'follows': [pvrs0_path]}},
    ...          'root_versions': [pvrs0_path]}
    >>> resp = testapp.post_json('http://localhost/Documents/document_0000000/PARAGRAPH_0000002',
    ...                           pvrs, headers=god_header)
    >>> pvrs1_path = resp.json["path"]

Now we can search references::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...             'adhocracy_core.sheets.versions.IVersionable:follows':
    ...             'http://localhost/Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/',
    ...             'depth': 'all', 'tag': 'LAST'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000001/']

Valid query comparable: 'eq'

If the specified sheet or field doesn't exist or if the field exists but is
not a reference field, the backend responds with an error::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'adhocracy_core.sheets.NoSuchSheet:nowhere':
    ...             'http://localhost/Documents/document_0000000/PARAGRAPH_0000002/VERSION_0000000/'},
    ...     status=400).json
    >>> resp_data['errors'][0]['description']
    'No such sheet or field'
    >>> resp_data['errors'][0]['location']
    'querystring'

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'adhocracy_core.sheets.name.IName:name':
    ...             'http://localhost/Documents/document_0000000/kapitel2/VERSION_0000000/'},
    ...     status=400).json
    >>> resp_data['errors'][0]['description']
    'Not a reference node'
    >>> resp_data['errors'][0]['name']
    'adhocracy_core.sheets.name.IName:name'

You'll also get an error if you try to filter by a catalog that doesn't exist::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...             'foocat': 'whatever'},
    ...     status=400).json
    >>> resp_data['errors'][0]['description']
    'Unrecognized keys in mapping: "{\'foocat\': \'whatever\'}"'

*aggregateby* allows you to add the additional field `aggregateby` with
aggregated index values of all result resources. You have to set the value
to an existing filter like *aggregateby=tag*. Only index values that exist in
the query result will be reported, i.e. the count reported for each value
will be 1 or higher. ::

    >>> resp_data = testapp.get('/Documents/document_0000000',
    ...     params={'content_type': 'adhocracy_core.resources.paragraph.IParagraphVersion',
    ...             'depth': 'all', 'aggregateby': 'tag'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['aggregateby'])
    {'tag': {'FIRST': 3, 'LAST': 3}}

