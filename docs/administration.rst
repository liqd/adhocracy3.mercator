Administration
==============

Several console scripts are provided to facilitate the administration of
Adhocracy 3.


Importing Resources
-------------------

User, Groups and normal Resources can be imported with the `ad_fixtures` script.
You choose between fixtures registered in adhocracy python packages::

 ./bin/ad_fixtures etc/development.ini -c adhocracy_core:test_fixtures

Or from an absolute file system path::

 ./bin/ad_fixtures etc/development.ini -c /home/user/adhocracy_core/test_fixtures

The `-h` flag can be used to see a full description of the
options:

.. program-output:: ad_fixtures -h

Import Badges
-------------

Badges can be imported with the `ad_import_resources` script::

    ./bin/ad_import_resources etc/development.ini src/adhocracy_core/adhocracy_core/resources/user_badges_sample.json

Badges can be assigned to resources with the `ad_assign_badges` script::

    ./bin/ad_assign_badges etc/development.ini ./src/adhocracy_core/adhocracy_core/scripts/user_badge_assignments_sample.json


Set Workflow state
------------------

The state of the workflow can be changed with the `set_workflow_state`
command. The `-h` flag can be used to see a full description of the
options:

.. program-output:: set_workflow_state -h
