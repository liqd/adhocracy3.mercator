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

Start Adhocracy testapp::

    >>> from webtest import TestApp
    >>> app = getfixture('app')
    >>> testapp = TestApp(app)
    >>> rest_url = 'http://localhost'

Resource structure
------------------

Resources have one content interface to set its type, like
"adhocracy_core.resources.pool.IBasicPool".

Terminology: we refer to content interfaces and the objects specified
by content interfaces as "resources"; resources consist of "sheets"
which are based on the substance-d concept of property sheet
interfaces.

Every Resource has multiple sheets that define schemata to set/get data.

There are 4 main types of resources:

* Pool: folder content in the object hierarchy, can contain other Pools
  (subfolders) and Items of any kind.
* Item (old name: FubelVersions-Pool): base class of any versionable items,
  such as Proposals, Documents, Sections etc. Contains a list of
  ItemVersions, sub-Items (e.g. Sections within Documents), and meta-data
  such as Tags.
* ItemVersion (old name: Versionable-Fubel): a specific version of a
  versionable item, e.g. a ProposalVersion, DocumentVersion, or
  SectionVersion.
* Simple: Base class of anything that is neither versionable nor a
  container (old name: any Fubel that is not a Versionable-Fubel).  For
  versionables, use Item instead; for non-versionable containers, use Pool
  instead.

A frequently used derived type is:

* Tag: a subtype of Simple, points to one (or sometimes zero or many)
  ItemVersion, e.g. the current HEAD or the last APPROVED version of a
  Document (old name: Tag-Fubel). Can be modified but doesn't have its own
  version history, hence it's a Simple instead of an Item.

Example resource hierarchy::

    Pool:         categories
    Simple:       categories/blue

    Pool:         proposals
    Item:         proposals/proposal1
    ItemVersion:  proposals/proposal1/v1
    Tag:          proposals/proposal1/head

    Item:         proposals/proposal1/section1
    ItemVersion:  proposals/proposal1/section1/v1
    Tag:          proposals/proposal1/section1/head


Meta-API
--------

The backend needs to answer to kinds of questions:

 1. Globally: What resources (content types) exist?  What sheets may or
    must they contain?  (What parts of) what sheets are
    read-only?  mandatory?  optional?

 2. In the context of a given session and URL: What HTTP methods are
    allowed?  With what resource objects in the body?  What are the
    authorizations (display / edit / vote-on / ...)?

The second kind is implemented with the OPTIONS method on the existing
URLs.  The first is implemented with the GET method on a dedicated URL.


Global Info
~~~~~~~~~~~

The dedicated prefix defaults to "/meta_api/", but can be customized. The
result is a JSON object with two main keys, "resources" and "sheets"::

    >>> resp_data = testapp.get("/meta_api/").json
    >>> sorted(resp_data.keys())
    ['resources', 'sheets']

The "resources" key points to an object whose keys are all the resources
(content types) defined by the system::

    >>> sorted(resp_data['resources'].keys())
    [...'adhocracy_core.resources.pool.IBasicPool', ...'adhocracy_core.resources.sample_section.ISection'...]

Each of these keys points to an object describing the resource. If the
resource implements sheets (and a resource that doesn't would be
rather useless!), the object will have a "sheets" key whose value is a list
of the sheets implemented by the resource::

    >>> basicpool_desc = resp_data['resources']['adhocracy_core.resources.pool.IBasicPool']
    >>> sorted(basicpool_desc['sheets'])
    ['adhocracy_core.sheets.metadata.IMetadata', 'adhocracy_core.sheets.name.IName', 'adhocracy_core.sheets.pool.IPool'...]

If the resource is an item, it will also have a "item_type" key whose value
is the type of versions managed by this item (e.g. a Section will manage
SectionVersions as main element type)::

    >>> section_desc = resp_data['resources']['adhocracy_core.resources.sample_section.ISection']
    >>> section_desc['item_type']
    'adhocracy_core.resources.sample_section.ISectionVersion'

If the resource is a pool or item that can contain resources, it will also
have an "element_types" key whose value is the list of all resources the
pool/item can contain (including the "item_type" if it's an item). For
example, a pool can contain other pools; a section can contain tags. ::

    >>> basicpool_desc['element_types']
    ['adhocracy_core.interfaces.IPool'...]
    >>> sorted(section_desc['element_types'])
    ['adhocracy_core.interfaces.ITag', ...'adhocracy_core.resources.sample_section.ISectionVersion'...]

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

For example, the 'subsections' field of ISection is an ordered list
pointing to other ISection's:

    >>> secfields = resp_data['sheets']['adhocracy_core.sheets.document.ISection']['fields']
    >>> for field in secfields:
    ...     if field['name'] == 'subsections':
    ...         pprint(field)
    ...         break
    {'containertype': 'list',
     'creatable': True,
     'create_mandatory': False,
     'editable': True,
     'name': 'subsections',
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

OPTIONS
~~~~~~~

Returns possible methods for this resource, example request/response data
structures and available interfaces with resource data. The result is a
JSON object that has the allowed request methods as keys::

    >>> resp_data = testapp.options(rest_url + "/adhocracy", headers=god_header).json
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

    >>> data_post_pool = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
    ...                   'data': {'adhocracy_core.sheets.metadata.IMetadata': {},
    ...                            'adhocracy_core.sheets.name.IName': {}}}
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
    >>> resp.headerlist # doctest: +ELLIPSIS +NORMALIZE_WHITESPACE
    [...('Content-Type', 'application/json; charset=UTF-8'), ...
    >>> resp.text
    ''

The caching headers are set to no-cache to ease testing::

   >>> resp.headers['X-Caching-Mode']
   'no_cache'

GET
~~~

Returns resource and child elements meta data and all sheet with data::

    >>> resp_data = testapp.get(rest_url + "/adhocracy").json
    >>> pprint(resp_data["data"])
    {'adhocracy_core.sheets.metadata.IMetadata': ...
     'adhocracy_core.sheets.name.IName': {'name': 'adhocracy'},
     'adhocracy_core.sheets.pool.IPool': {'elements': [...]}}

POST
~~~~

Create a new resource ::

    >>> prop = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
    ...         'data': {
    ...              'adhocracy_core.sheets.name.IName': {
    ...                  'name': 'Proposals'}}}
    >>> resp_data = testapp.post_json(rest_url + "/adhocracy", prop, headers=god_header).json
    >>> resp_data["content_type"]
    'adhocracy_core.resources.pool.IBasicPool'

The response object has 3 top-level entries:

* The content type and the path of the new resource::

      >>> resp_data['content_type']
      'adhocracy_core.resources.pool.IBasicPool'
      >>> resp_data['path']
      '.../adhocracy/Proposals/'

* A listing of resources affected by the transaction::

      >>> sorted(resp_data['updated_resources'])
      ['changed_descendants', 'created', 'modified', 'removed']

  The subkey 'created' lists any resources that have been created by the
  transaction::

      >>> resp_data['updated_resources']['created']
      ['http://localhost/adhocracy/Proposals/']

  The subkey 'modified' lists any resources that have been modified::

      >>> sorted(resp_data['updated_resources']['modified'])
      ['http://localhost/adhocracy/', 'http://localhost/principals/users/0000000/']

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
  transaction (see "Filtering Pools" section below)::

      >>> sorted(resp_data['updated_resources']['changed_descendants'])
      ['http://localhost/', 'http://localhost/principals/', 'http://localhost/principals/users/']


PUT
~~~

Modify data of an existing resource ::

    FIXME: disable because IName.name is not editable.  use another example!
    FIXME: what we do here is a `patch` actually, so we should rename this.

...    >>> data = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
...    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'youdidntexpectthis'}}}
...    >>> resp_data = testapp.put_json(rest_url + "/adhocracy/Proposals", data, headers=god_header).json
...    >>> pprint(resp_data)
...    {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
...     'path': rest_url + '/adhocracy/Proposals'}

Check the changed resource ::

...   >>> resp_data = testapp.get(rest_url + "/adhocracy/Proposals").json
...   >>> resp_data["data"]["adhocracy_core.sheets.name.IName"]["name"]
...   'youdidntexpectthis'

FIXME: write test cases for attributes with "create_mandatory",
"editable", etc.  (those work the same in PUT and POST, and on any
attribute in the json tree.)

PUT responses have the same fields as POST responses.

ERROR Handling
~~~~~~~~~~~~~~

FIXME: ... is not working anymore in this doctest

The normal return code is 200 ::

    >>> data = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'Proposals'}}}

.. >>> testapp.put_json(rest_url + "/adhocracy/Proposals", data, headers=god_header)
.. 200 OK application/json ...

If you submit invalid data the return error code is 400 ::

    >>> data = {'content_type': 'adhocracy_core.resources.pool.IBasicPool',
    ...         'data': {'adhocracy_core.sheets.example.WRONGINTERFACE': {'name': 'Proposals'}}}

.. >>> testapp.put_json(rest_url + "/adhocracy/Proposals", data, headers=god_header)
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

This section explains updates to resources with version control.  Two
sheets are central to version control in adhocracy: IDAG and
IVersion.  IVersion is in all resources that support version
control, and IDAG is a container that manages all versions of a
particular content element in a directed acyclic graph.

IDAGs as well as IVersions need to be created
explicitly by the frontend.

The server supports updating a resource that implements IVersion by
letting you post a content element with missing IVersion sheet
to the DAG (IVersion is read-only and managed by the server), and
passing a list of parent versions in the post parameters of the
request.  If there is only one parent version, the new version either
forks off an existing branch or just continues a linear history.  If
there are several parent versions, we have a merge commit.

Example: If a new versionable content element has been created by the
user, the front-end first posts an IDAG.  The IDAG works a little like
an IPool in that it allows posting versions to it.  The front-end will
then simply post the initial version into the IDAG with an empty
predecessor version list.

IDAGs may also implement the IPool sheet for
containing further IDAGs for sub-structures of
structured versionable content types.  Example: A document may consist
of a title, description, and a list of references to sections.
There is a DAG for each document and each such dag contains one DAG
for each section that occurs in any version of the document.
Section refs in the document object point to specific versions in
those DAGs.

When posting updates to nested sub-structures, the front-end must
decide for which parent objects it wants to trigger an update.  To
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
on each other.  But when the update to Par2 is posted, the server has
no way of knowing that it should update v1 of Doc, BUT NOT v0!


Create
~~~~~~

Create a Proposal (a subclass of Item which pools ProposalVersions) ::

    >>> pdag = {'content_type': 'adhocracy_core.resources.sample_proposal.IProposal',
    ...         'data': {
    ...              'adhocracy_core.sheets.name.IName': {
    ...                  'name': 'kommunismus'}
    ...              }
    ...         }
    >>> resp = testapp.post_json(rest_url + "/adhocracy/Proposals", pdag, headers=god_header)
    >>> pdag_path = resp.json["path"]
    >>> pdag_path
    '.../adhocracy/Proposals/kommunismus/'

The return data has the new attribute 'first_version_path' to get the path first Version::

    >>> pvrs0_path = resp.json['first_version_path']
    >>> pvrs0_path
    '.../adhocracy/Proposals/kommunismus/VERSION_0000000/'


Version IDs are numeric and assigned by the server.  The front-end has
no control over them, and they are not supposed to be human-memorable.
For human-memorable version pointers that also allow for complex
update behavior (fixed-commit, always-newest, ...), consider
sheet ITags.

The Proposal has the IVersions and ITags interfaces to work with Versions::

    >>> resp = testapp.get(pdag_path)
    >>> resp.json['data']['adhocracy_core.sheets.versions.IVersions']['elements']
    ['.../adhocracy/Proposals/kommunismus/VERSION_0000000/']

    >>> resp.json['data']['adhocracy_core.sheets.tags.ITags']['elements']
    ['.../adhocracy/Proposals/kommunismus/FIRST/', '.../adhocracy/Proposals/kommunismus/LAST/']


Update
~~~~~~

Fetch the first Proposal version, it is empty ::

    >>> resp = testapp.get(pvrs0_path)
    >>> pprint(resp.json['data']['adhocracy_core.sheets.document.IDocument'])
    {'description': '', 'elements': [], 'picture': '', 'title': ''}

    >>> pprint(resp.json['data']['adhocracy_core.sheets.versions.IVersionable'])
    {'followed_by': [], 'follows': []}

Create a new version of the proposal that follows the first version ::

    >>> pvrs = {'content_type': 'adhocracy_core.resources.sample_proposal.IProposalVersion',
    ...         'data': {'adhocracy_core.sheets.document.IDocument': {
    ...                     'title': 'kommunismus jetzt!',
    ...                     'description': 'blabla!',
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
      'creatable': False,
      'create_mandatory': False,
      'editable': False,
      'name': 'followed_by',
      'readable': True,
      'targetsheet': 'adhocracy_core.sheets.versions.IVersionable',
      'valuetype': 'adhocracy_core.schema.AbsolutePath'},
     {'containertype': 'list',
      'creatable': True,
      'create_mandatory': False,
      'editable': True,
      'name': 'follows',
      'readable': True,
      'targetsheet': 'adhocracy_core.sheets.versions.IVersionable',
      'valuetype': 'adhocracy_core.schema.AbsolutePath'}]

The 'follows' element must be set by the client when it creates a new
version that is the successor of one or several earlier versions. The
'followed_by' element is automatically populated by the server by
"reversing" any 'follows' links pointing to the version in question.
Therefore 'followed_by' is read-only, while 'follows' is writable.

Create a Section item inside the Proposal item ::

    >>> sdag = {'content_type': 'adhocracy_core.resources.sample_section.ISection',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'kapitel1'},}
    ...         }
    >>> resp = testapp.post_json(pdag_path, sdag, headers=god_header)
    >>> sdag_path = resp.json["path"]
    >>> svrs0_path = resp.json["first_version_path"]

and a second Section ::

    >>> sdag = {'content_type': 'adhocracy_core.resources.sample_section.ISection',
    ...         'data': {'adhocracy_core.sheets.name.IName': {'name': 'kapitel2'},}
    ...         }
    >>> resp = testapp.post_json(pdag_path, sdag, headers=god_header)
    >>> s2dag_path = resp.json["path"]
    >>> s2vrs0_path = resp.json["first_version_path"]

Create a third Proposal version and add the two Sections in their
initial versions ::

    >>> pvrs = {'content_type': 'adhocracy_core.resources.sample_proposal.IProposalVersion',
    ...         'data': {'adhocracy_core.sheets.document.IDocument': {
    ...                     'elements': [svrs0_path, s2vrs0_path]},
    ...                  'adhocracy_core.sheets.versions.IVersionable': {
    ...                     'follows': [pvrs1_path],}
    ...                 },
    ...          'root_versions': [pvrs1_path]}
    >>> resp = testapp.post_json(pdag_path, pvrs, headers=god_header)
    >>> pvrs2_path = resp.json["path"]

If we create a second version of kapitel1 ::

    >>> svrs = {'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...         'data': {
    ...              'adhocracy_core.sheets.document.ISection': {
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
proposal version containing the section to update.

The 'root_versions' set allows automatical updates of items that embedding
or otherwise linking to the updated item. In this case, a fourth Proposal
version is automatically created along with the updated Section version::

    >>> resp = testapp.get(pdag_path)
    >>> pprint(resp.json['data']['adhocracy_core.sheets.versions.IVersions'])
    {'elements': ['.../adhocracy/Proposals/kommunismus/VERSION_0000000/',
                  '.../adhocracy/Proposals/kommunismus/VERSION_0000001/',
                  '.../adhocracy/Proposals/kommunismus/VERSION_0000002/',
                  '.../adhocracy/Proposals/kommunismus/VERSION_0000003/']}

    >>> resp = testapp.get(rest_url + '/adhocracy/Proposals/kommunismus/VERSION_0000003')
    >>> pvrs3_path = resp.json['path']

    >>> s2vrs1_path = resp.json['path']
    >>> s2vrs1_path != s2vrs0_path
    True

More interestingly, if we try to create a second version of kapitel2 we
get an error because this would automatically create two new version for pvrs3
and pvrs2 (both contain s2vrs0_path)::

    >>> svrs = {'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...         'data': {
    ...              'adhocracy_core.sheets.document.ISection': {
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

But if we set the `root_version` to the last  Proposal version (pvrs3)::
    >>> svrs = {'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...         'data': {
    ...              'adhocracy_core.sheets.document.ISection': {
    ...                  'title': 'on the hardness of version control',
    ...                  'elements': []},
    ...               'adhocracy_core.sheets.versions.IVersionable': {
    ...                  'follows': [s2vrs0_path]
    ...                  }
    ...          },
    ...          'root_versions': [pvrs3_path]
    ...         }
    >>> resp = testapp.post_json(s2dag_path, svrs, headers=god_header)

a new version is automatically created only for pvrs3, not for pvrs2::

    >>> resp = testapp.get(pdag_path)
    >>> pprint(resp.json['data']['adhocracy_core.sheets.versions.IVersions'])
    {'elements': ['.../adhocracy/Proposals/kommunismus/VERSION_0000000/',
                  '.../adhocracy/Proposals/kommunismus/VERSION_0000001/',
                  '.../adhocracy/Proposals/kommunismus/VERSION_0000002/',
                  '.../adhocracy/Proposals/kommunismus/VERSION_0000003/',
                  '.../adhocracy/Proposals/kommunismus/VERSION_0000004/']}

    >>> resp = testapp.get(rest_url + '/adhocracy/Proposals/kommunismus/VERSION_0000004')
    >>> pvrs4_path = resp.json['path']
    >>> resp = testapp.get(rest_url + '/adhocracy/Proposals/kommunismus/VERSION_0000002')
    >>> len(resp.json['data']['adhocracy_core.sheets.versions.IVersionable']['followed_by'])
    1

    >>> len(resp.json['data']['adhocracy_core.sheets.versions.IVersionable']['followed_by'])
    1

    >>> resp = testapp.get(rest_url + '/adhocracy/Proposals/kommunismus/VERSION_0000004')
    >>> len(resp.json['data']['adhocracy_core.sheets.versions.IVersionable']['followed_by'])
    0



FIXME: If two frontends post competing sections simultaneously,
neither knows which proposal version belongs to whom.  Proposed
solution: the post response must tell the frontend the changed
``root_version``.


Tags
~~~~

Each Versionable has a FIRST tag that points to the initial version::

    >>> resp = testapp.get(rest_url + '/adhocracy/Proposals/kommunismus/FIRST')
    >>> pprint(resp.json)
    {'content_type': 'adhocracy_core.interfaces.ITag',
     'data': {...
              'adhocracy_core.sheets.name.IName': {'name': 'FIRST'},
              'adhocracy_core.sheets.tags.ITag': {'elements': ['.../adhocracy/Proposals/kommunismus/VERSION_0000000/']}},
     'path': '.../adhocracy/Proposals/kommunismus/FIRST/'}

It also has a LAST tag that points to the newest versions -- any versions
that aren't 'followed_by' any later version::

    >>> resp = testapp.get(rest_url + '/adhocracy/Proposals/kommunismus/LAST')
    >>> pprint(resp.json)
    {'content_type': 'adhocracy_core.interfaces.ITag',
     'data': {...
              'adhocracy_core.sheets.name.IName': {'name': 'LAST'},
              'adhocracy_core.sheets.tags.ITag': {'elements': ['.../adhocracy/Proposals/kommunismus/VERSION_0000004/']}},
     'path': '.../adhocracy/Proposals/kommunismus/LAST/'}

FIXME: the elements listing in the ITags interface is not very helpful, the
tag names (like 'FIRST') are missing.


Forks and forkability
~~~~~~~~~~~~~~~~~~~~~

This api has been designed to allow implementation of complex merge
conflict resolution, both automatic and with user-involvement. Many
resource types, however, only supports a simplified version control strategy
with a *linear history*: If any version that is not head is used as a
predecessor, the backend responds with an error.  The frontend has to handle
these errors, as they can always occur in race conditions with other users.

Current and potential future conflict resolution strategies are:

1. If a race condition is reported by the backend, the frontend
   updates the predecessor version to head and tries again.  (In the
   unlikely case where lots of post activity is going on, it may be
   necessary to repeat this several times.)

   Example: IRatingVersion can only legally be modified by one user
   and should not experience any race conditions.  If it does, the
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

   v0' is a copy of v0 that differs only in its predecessor.  It is
   called a 'revert' version.  (FIXME: is there a way to enrich the
   data with a 'is_revert' flag?)

   This must be done in a batch request (a transaction) in order to
   avoid that only the revert is successfully posted, but the actual
   change fails.  Again, it is possible that this batch request fails,
   and has to be attempted several times.

   Example: IProposalVersion can be modified by many users
   concurrently.

3. (Future work) Both authors of the conflict are notified (email,
   dashboard, ...), and explained how they can inspect the situation
   and add new versions.  (The email should probably contain a warning
   that it's best to get on the phone and talk it through before
   generating more merge conflicts.  :)

4. (Future work) Ideally, the user would to be notified that there
   is a conflict, display the differences between the three versions,
   and allow the user to merge his changes into the current HEAD.

5. (Future work) It is allowed to have multiple heads in the DAG, e.g.
   different preferred versions by different principals. This however still
   requires a lot of UX work to be done.

To give an example, *Comments* only allow a linear version history (just a
single heads). Lets create a comment with an initial version (see below
for more on comments and *post pools*)::

    >>> resp = testapp.get('/adhocracy/Proposals/kommunismus/VERSION_0000004')
    >>> commentable = resp.json['data']['adhocracy_core.sheets.comment.ICommentable']
    >>> post_pool_path = commentable['post_pool']
    >>> comment = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...            'data': {'adhocracy_core.sheets.name.IName': {'name': 'com'}}}
    >>> resp = testapp.post_json(post_pool_path, comment, headers=god_header)
    >>> comment_path = resp.json["path"]
    >>> first_commvers_path = resp.json['first_version_path']
    >>> first_commvers_path
    '.../adhocracy/Proposals/kommunismus/comments/comment_000.../VERSION_0000000/'

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
    '.../adhocracy/Proposals/kommunismus/comments/comment_000.../VERSION_0000001/'

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

    >>> resp = testapp.get('/adhocracy/Proposals/kommunismus/VERSION_0000004')
    >>> commentable = resp.json['data']['adhocracy_core.sheets.comment.ICommentable']

This sheet has a special field :term:`post_pool` referencing a pool::

    >>> post_pool_path = commentable['post_pool']

We can post comments to this pool only::

    >>> comment = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...            'data': {'adhocracy_core.sheets.name.IName': {'name': 'c1'}}}
    >>> resp = testapp.post_json(post_pool_path, comment, headers=god_header)
    >>> comment_path = resp.json["path"]
    >>> comment_path
    '.../adhocracy/Proposals/kommunismus/comments/comment_000...'
    >>> first_commvers_path = resp.json['first_version_path']
    >>> first_commvers_path
    '.../adhocracy/Proposals/kommunismus/comments/comment_000.../VERSION_0000000/'

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
    '.../adhocracy/Proposals/kommunismus/comments/comment_000.../VERSION_0000001/'

Comments can be about any versionable that allows posting comments. Hence
it's also possible to write a comment about another comment::

    >>> metacomment = {'content_type': 'adhocracy_core.resources.comment.IComment',
    ...                 'data': {'adhocracy_core.sheets.name.IName': {'name': 'c2'}}}
    >>> resp = testapp.post_json(post_pool_path, metacomment, headers=god_header)
    >>> metacomment_path = resp.json["path"]
    >>> metacomment_path
    '.../adhocracy/Proposals/kommunismus/comments/comment_000...'
    >>> comment_path != metacomment_path
    True
    >>> first_metacommvers_path = resp.json['first_version_path']
    >>> first_metacommvers_path
    '.../adhocracy/Proposals/kommunismus/comments/comment_000.../VERSION_0000000/'

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
    '.../adhocracy/Proposals/kommunismus/comments/comment_000.../VERSION_0000001/'


Lets view all the comments referring to the proposal.
First find the path of the newest version of the proposal::

    >>> resp = testapp.get(pdag_path + '/LAST')
    >>> newest_prop_vers = resp.json['data']['adhocracy_core.sheets.tags.ITag']['elements'][-1]

Now we can retrieve that version and consult the 'comments' fields of its
'adhocracy_core.sheets.comment.ICommentable' sheet::

    >>> resp = testapp.get(newest_prop_vers)
    >>> comlist = resp.json['data']['adhocracy_core.sheets.comment.ICommentable']['comments']
    >>> snd_commvers_path in comlist
    True

Any commentable resource has this sheet. Since comments can refer to other
comments, they have it as well. Lets find out which other comments refer to
this comment version::

    >>> resp = testapp.get(snd_commvers_path)
    >>> comlist = resp.json['data']['adhocracy_core.sheets.comment.ICommentable']['comments']
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
    '...adhocracy/Proposals/kommunismus/rates/rate_0000000/VERSION_0000001/'

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
    'Another rate by the same user already exists'

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
    'Must be the currently logged-in user'


Batch requests
--------------

The following URL accepts batch requests ::

    >>> batch_url = '/batch'

A batch request a POST request with a json array in the body that
contains certain HTTP requests encoded in a certain way.

A success response contains in its body an array of encoded HTTP
responses.  This way, the client can see what happened to the
individual POSTS, and collect all the paths of the individual
resources that were posted.

Batch requests are processed as a transaction.  By this, we mean that
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
this document are allowed in batch requests.  POST differs in that it
yields *preliminary resource paths*.  To understand what that is,
consider this example: In step 4 of a batch request, the front-end
wants to post to the path that resulted from posting the parent
resource in step 3 of the same request, so batch requests need to
allow for an abstraction over the resource paths resulting from POST
requests.  POST yields preliminary paths instead of actual ones, and
POST, GET, and PUT are all allowed to use preliminary paths in
addition to the "normal" ones.  Apart from this, nothing changes in
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
    ...     'path': rest_url + '/adhocracy/Proposal/kommunismus',
    ...     'body': { 'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraph' },
    ...     'result_path': '@par1_item',
    ...     'result_first_version_path': '@par1_item/v1'
    ... }

Preliminary paths can be used anywhere in subsequent requests, either
in the 'path' item of the request itself, or anywhere in the json data
in the body where the schemas expect to find resource paths.  It must
be prefixed with "@" in order to mark it as preliminary.  Right
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

Let's add some more paragraphs to the second section above ::

    >>> section_item = s2dag_path
    >>> batch = [ {
    ...             'method': 'POST',
    ...             'path': pdag_path,
    ...             'body': {
    ...                 'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraph',
    ...                 'data': {'adhocracy_core.sheets.name.IName':
    ...                              {'name': 'par1'}
    ...                         }
    ...             },
    ...             'result_path': '@par1_item',
    ...             'result_first_version_path': '@par1_item/v1'
    ...           },
    ...           {
    ...             'method': 'POST',
    ...             'path': '@par1_item',
    ...             'body': {
    ...                 'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraphVersion',
    ...                 'data': {
    ...                     'adhocracy_core.sheets.versions.IVersionable': {
    ...                         'follows': ['@par1_item/v1']
    ...                     },
    ...                     'adhocracy_core.sheets.document.IParagraph': {
    ...                         'content': 'sein blick ist vom vorüberziehn der stäbchen'
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
    >>> 'http://localhost/adhocracy/Proposals/' in updated_resources['changed_descendants']
    True
    >>> 'http://localhost/adhocracy/Proposals/kommunismus/par1/VERSION_0000001/' in updated_resources['created']
    True

Lets inspect some of the responses. The 'code' field contains the HTTP status
code. The 'body' field contains the JSON dict that would normally be sent as
body of the request, except that its 'updated_resources' field (if any) is
omitted::

    >>> len(batch_resp['responses'])
    3
    >>> pprint(batch_resp['responses'][0])
    {'body': {'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraph',
              'first_version_path': '.../adhocracy/Proposals/kommunismus/par1/VERSION_0000000/',
              'path': '.../adhocracy/Proposals/kommunismus/par1/'},
     'code': 200}
    >>> pprint(batch_resp['responses'][1])
    {'body': {'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraphVersion',
              'path': '.../adhocracy/Proposals/kommunismus/par1/VERSION_0000001/'},
     'code': 200}
    >>> pprint(batch_resp['responses'][2])
    {'body': {'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraphVersion',
              'data': {...},
              'path': '.../adhocracy/Proposals/kommunismus/par1/VERSION_0000001/'},
     'code': 200}
     >>> batch_resp['responses'][2]['body']['data']['adhocracy_core.sheets.document.IParagraph']['content']
     'sein blick ist vom vorüberziehn der stäbchen'


Now the first, empty paragraph version should contain the newly
created paragraph version as its only successor ::

    .. >>> v1 = batch_resp[2]['body']['data']['adhocracy_core.sheets.versions.IVersionable']['followed_by']
    .. >>> v2 = [batch_resp[1]['path']]
    .. >>> v1 == v2
    .. True
    .. >>> print(v1, v2)
    .. ...

The LAST tag should point to the version we created within the batch request::

    >>> resp_data = testapp.get(rest_url + "/adhocracy/Proposals/kommunismus/par1/LAST").json
    >>> resp_data['data']['adhocracy_core.sheets.tags.ITag']['elements']
    ['.../adhocracy/Proposals/kommunismus/par1/VERSION_0000001/']

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
    ...                 'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraph',
    ...                 'data': {'adhocracy_core.sheets.name.IName':
    ...                              {'name': 'par2'}
    ...                         }
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
    [{'body': {'content_type': 'adhocracy_core.resources.sample_paragraph.IParagraph',
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

Filtering Pools
---------------

It's possible to filter and aggregate the information collected in pools by
adding suitable GET parameters. For example, we can only retrieve children
of a specific content type::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'content_type': 'adhocracy_core.resources.sample_section.ISection'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/adhocracy/Proposals/kommunismus/kapitel1/',
     'http://localhost/adhocracy/Proposals/kommunismus/kapitel2/']

Or only children that implement a specific sheet::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'sheet': 'adhocracy_core.sheets.tags.ITag'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/adhocracy/Proposals/kommunismus/FIRST/',
     'http://localhost/adhocracy/Proposals/kommunismus/LAST/']

Note that multiple filters are combined by AND. If we specify a content_type
filter and a sheet filter, only the elements matched by *both* filters will be
returned. The same applies to all other filters as well.

Note: Currently it's not possible to specify multiple values for the *sheet*
filter (which would be combined by AND or possibly -- using a different
syntax -- by OR). We may add this functionality in the future if there is a
need for it.

By default, only direct children of a pool are listed as elements,
i.e. the standard depth is 1. Setting the *depth* filter to a higher
value allows also including grandchildren (depth=2) or even great-grandchildren
(depth=3) etc. Allowed values are arbitrary positive numbers and *all*.
*all* can be used to get nested elements of arbitrary nesting depth::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...             'depth': 'all'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    [...'http://localhost/adhocracy/Proposals/kommunismus/kapitel1/VERSION_0000001/'...]

Without specifying a deeper depth, the above query for ISectionVersions
wouldn't have found anything, since they are children of children of the pool::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion'
    ...             }).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    []

To retrieve a count of the elements matching your query, specify
*count=true* or just *count*. If you do so, an additional *count* field will
be added to the returned IPool sheet::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'sheet': 'adhocracy_core.sheets.tags.ITag',
    ...             'count': 'true'}).json
    >>> resp_data['data']['adhocracy_core.sheets.pool.IPool']['count']
    '2'

*Note:* due to limitations of our (de)serialization library (Colander),
the count is returned as a string, though it is actually a number.

If you specify *count* without any other query parameters,
you'll get the number of children in the pool::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'count': 'true'}).json
    >>> child_count = resp_data['data']['adhocracy_core.sheets.pool.IPool']['count']
    >>> assert int(child_count) >= 10

If you specify *sort* you can set a *<custom>* filter (see below) that supports
sorting to sort the result::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'sort': 'name'}).json
    >>> resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements']
    ['http://localhost/adhocracy/Proposals/kommunismus/FIRST/', ...

*Note* All resource in the result set must have a value in the chosen sort
filter. For example if you use *rates* you have to limit the result to resources
with :class:`adhocracy_core.sheets.rate.IRateable` sheet.

Not supported filters cannot be used for sorting::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...                         params={'sort': 'path'},
    ...                         status=400).json
    >>> resp_data['errors'][0]['description']
    '"path" is not one of content_type, name, text,...

The *elements* parameter allows controlling how matching element are
returned. By default, 'elements' in the IPool sheet contains a list of paths.
This corresponds to setting *elements=paths*.

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'sheet': 'adhocracy_core.sheets.tags.ITag',
    ...             'elements': 'paths'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/adhocracy/Proposals/kommunismus/FIRST/',
     'http://localhost/adhocracy/Proposals/kommunismus/LAST/']

Setting *elements=omit* will yield a response with an empty 'elements' listing.
This makes only sense if you ask for something else instead, e.g. a count of
elements::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'sheet': 'adhocracy_core.sheets.tags.ITag',
    ...             'elements': 'omit', 'count': 'true'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool'])
    {'count': '2', 'elements': []}

Setting *elements=content* will instead return the complete contents of all
matching elements -- what you would get by making a GET request on each of
their paths::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'sheet': 'adhocracy_core.sheets.tags.ITag',
    ...             'elements': 'content'}).json
    >>> tag = resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'][0]
    >>> pprint(tag)
    {'content_type': 'adhocracy_core.interfaces.ITag',...'path': 'http://localhost/adhocracy/Proposals/kommunismus/FIRST/'...


*tag* is a filter that allows filtering only resources with a
specific tag. Often we are only interested in the newest versions of
Versionables. We can get them by setting *tag=LAST*. Let's find the latest
versions of all sections::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...             'depth': 'all', 'tag': 'LAST'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/adhocracy/Proposals/kommunismus/kapitel1/VERSION_0000001/',
     'http://localhost/adhocracy/Proposals/kommunismus/kapitel2/VERSION_0000001/']

*<custom>* filter: depending on the backend configuration there are additional
custom filters:

* *rate* the rate value of resources with :class:`adhocracy_core.sheets.rate.IRate`
  sheet. This is mostly useful for the requests with the *aggregated* filter.
  Supports sorting.

* *rates* the aggregated value of all :class:`adhocracy_core.sheets.rate.IRate`
  resources referencing a resource with :class:`adhocracy_core.sheets.rate.IRateable`.
  Only the LAST version of each rate is counted. Supports sorting.

* *name* the identifier value of all resources (last part in the resource url).
  This is the same value like the name in the :class:`adhocracy_core.sheets.name.IName`
  sheet.
  Supports sorting.

* *creator* the :term:`userid` of the resource creator. This is the path of the
  user resource url.
  Supports sorting.

*<package.sheets.sheet.ISheet:FieldName>* filters: you can add arbitrary custom
filters that refer to sheet fields with references. The key is the name of
the isheet plus the field name separated by ':' The value is the wanted
reference target. ::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...             'adhocracy_core.sheets.versions.IVersionable:follows':
    ...             'http://localhost/adhocracy/Proposals/kommunismus/kapitel2/VERSION_0000000/',
    ...             'depth': 'all', 'tag': 'LAST'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['elements'])
    ['http://localhost/adhocracy/Proposals/kommunismus/kapitel2/VERSION_0000001/']

If the specified sheet or field doesn't exist or if the field exists but is
not a reference field, the backend responds with an error::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'adhocracy_core.sheets.NoSuchSheet:nowhere':
    ...             'http://localhost/adhocracy/Proposals/kommunismus/kapitel2/VERSION_0000000/'},
    ...     status=400).json
    >>> resp_data['errors'][0]['description']
    'No such sheet or field'
    >>> resp_data['errors'][0]['location']
    'querystring'

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'adhocracy_core.sheets.name.IName:name':
    ...             'http://localhost/adhocracy/Proposals/kommunismus/kapitel2/VERSION_0000000/'},
    ...     status=400).json
    >>> resp_data['errors'][0]['description']
    'Not a reference node'
    >>> resp_data['errors'][0]['name']
    'adhocracy_core.sheets.name.IName:name'

You'll also get an error if try to filter by a catalog that doesn't exist::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...             'foocat': 'whatever'},
    ...     status=400).json
    >>> resp_data['errors'][0]['description']
    'No such catalog'

*aggregateby* allows you to add the additional field `aggregateby` with
aggregated index values of all result resources. You have to set the value
to an existing filter like *aggregateby=tag*. Only index values that exist in
the query result will be reported, i.e. the count reported for each value
will be 1 or higher. ::

    >>> resp_data = testapp.get('/adhocracy/Proposals/kommunismus',
    ...     params={'content_type': 'adhocracy_core.resources.sample_section.ISectionVersion',
    ...             'depth': 'all', 'aggregateby': 'tag'}).json
    >>> pprint(resp_data['data']['adhocracy_core.sheets.pool.IPool']['aggregateby'])
    {'tag': {'FIRST': 2, 'LAST': 2}}

Other stuff
-----------

GET /interfaces/..::

    Get schema/interface information: attribute type/required/readonly, ...
    Get interface inheritage


GET/POST /workflows/..::

    Get workflow, apply workflow to resource.


GET/POST /transitions/..::

    Get available workflow transitions for resource, execute transition.


GET /query/..::

    query catalog to find content below /instances/spd


GET/POST /users::

    Get/Add user
