Adhocracy customizations for advocate-europe
============================================

.. image:: https://api.travis-ci.org/liqd/adhocracy3.mercator.png?branch=master
    :target: http://travis-ci.org/liqd/adhocracy3.mercator
.. image:: https://coveralls.io/repos/liqd/adhocracy3.mercator/badge.png?branch=master
    :target: https://coveralls.io/r/liqd/adhocracy3.mercator
.. image:: https://readthedocs.org/projects/adhocracy3mercator/badge/?version=latest
    :target: https://adhocracy3mercator.readthedocs.org/
    
This repository contains the source code of the Adhocracy 3 backend and
frontend cores as well as customizations for the advocate-europe project.

Note::

    This isn't meant for general consumption at this stage. Many expected
    things do not work yet!

This project (i.e. all files in this repository if not declared otherwise) is
licensed under the GNU Affero General Public License (AGPLv3), see
LICENSE.txt.


Further reading :doc:`installation`


Softwarestack
-------------

Server (backend):

- `Python 3 <http://www.python.org>`_ (programming language)

- `Pyramid <http://pylonsproject.org>`_  (web framework)

- `substance D <http://docs.pylonsproject.org/projects/substanced/en/latest>`_ (application framework/server)

- `hypatia <https://github.com/Pylons/hypatia>`_ (search)

- `ZODB <http://zodb.org>`_ (database)

- `colander <http://docs.pylonsproject.org/projects/colander/en/latest/>`_ (data schema)

- `Autobahn|Python <http://autobahn.ws/python/>`_ (websocket servers)

- `websocket-client <https://github.com/liris/websocket-client>`_ (websocket
  client)

- `asyncio <https://pypi.python.org/pypi/asyncio>`_ (required in Python 3.3
  for Autobahn; comes pre-packaged with Python 3.4)

- `buildout <http://www.buildout.org/en/latest/>`_ (build system)


Client (frontend):

- `JavaScript` (programming language)

- `TypeScript <http://www.typescriptlang.org/>`_ (programming language)

- `RequireJS <http://requirejs.org/>`_ (module system)

- `AngularJS <http://angularjs.org/>`_ (application framework)

- `JQuery <https://jquery.com/>`_ (javascript helper library)

- `Lodash <https://lodash.com/>`_ (functional javascript helper library)

- `Splinter <http://splinter.cobrateam.info/>`_ (acceptance and frontend tests)

- `Jasmine <https://jasmine.github.io/>`_ (unit tests)

- `Sass <http://sass-lang.com/>`_/`Compass <http://compass-style.org/>`_
  (CSS preprocessor)

- `Grunt <http://gruntjs.com/>`_ (build system)
