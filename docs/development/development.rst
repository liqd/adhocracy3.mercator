Development Tasks
=================

General Remarks
---------------

When changing the api, the frontend needs to re-generate the
TypeScript modules providing the resource classes.  This may trigger
compiler errors that have to be resolved manually.  For more details,
see comment in the beginning of mkResources.ts.

Frontend workflow
----------------

Run buildout once after switching project or the git branch. For changes to the
TypeScript code it will now be sufficient to use `bin/tsc` or `bin/tsc --watch`
(see tsconfig.json for settings used).

Running the Testsuite
---------------------

frontend unit tests:

A.  In node::

       bin/polytester jsunit

B.  In browser::

       bin/supervisorctl start adhocracy:frontend
       xdg-open http://localhost:6551/static/test.html

    .. note::

       For debugging, it helps to disable blanket.

    .. note::

       Running JS unit test in the browser with blanket enabled is
       currently broken.

protractor acceptance tests::

    bin/polytester acceptance

.. NOTE::

    You need to have chrome/chromium installed in order to run the
    acceptance tests.

run backend functional tests::

    bin/polytester pyfunc

run backend unit tests and show python test code coverage::

    bin/polytester pyunit
    xdg-open ./htmlcov/index.html

run all test::

    bin/polytester

to display console output::

    bin/polytester -v

modify test config:

     tests.ini  (run all tests with polytester)
     pytest.ini (python/jasmin tests with pytest)
     etc/protractorConf (acceptantance tests with protractor)

delete database (works best on development systems without valuable data!)::

    rm -f ./var/Data.*
    bin/supervisorctl restart adhocracy:*

If you are using the `supervisor group adhocracy_test:*`, you don't have
to delete anything.  The database is in-memory and will die with the
test_zodb service.

Generate html documentation
---------------------------

Recreate api documentation source files::

    bin/ad_build_api_rst_files

Generate html documentation::

    bin/ad_build_doc

Open html documentation::

   xdg-open docs/build/html/index.html

Create scaffold for extension packages
---------------------------------------

1.  Run the following commands::

        bin/pcreate -s adhocracy adhocracy_xx
        bin/pcreate -s adhocracy_frontend xx

    In the current repository layout, you then need to move the
    generated directories (``adhocracy_xx/`` and ``xx/``) to ``src/``.

2.  Add the new paths to ``develop`` and ``eggs`` in ``base.cfg``.

3.  Create ``buildout-xx.cfg``

4.  Add ``src/adhocracy_xx`` to ``.coveragerc``

5.  Add ``src/xx/xx/build`` to ``.gitignore``

You may then want to run ``bin/buildout -c buildout-xx.cfg`` to check
that everything works fine.

Update packages
---------------

python
``````

Check whether new Python versions exist::

    bin/requires.io update-site -t a54831113b039e9edbb2d26c2d2f9a9c99887437 -r adhocracy3
    xdg-open https://requires.io/github/liqd/adhocracy3/requirements/?branch=master

You may then update the pinned Python versions in `versions.cfg` if
appropriate.

ruby
````
::

    bin/gem outdated  # binary may also be called bin/gem1.9.1 or bin/gem2.1

node.js
```````
::

    bin/npm --prefix node_modules --depth 0 outdated

bower
`````

::

    cd .../lib  # where bower installs the libraries
    bower list

Release Adhocracy
-----------------

Adhocracy uses `semantic versions <http://semver.org/>`_ with one
extra rule:

    Versions 0.0.* are considered alpha and do not have to follow the
    major-minor-patch rules of semantic versioning.

Git tag and `setup.py`-version must be the same string.

In order to create a new version, first make sure that:

    1. you are on master.  (this rule is motivated by the fact that
       rebasing tags is really nothing we want to have to deal with.)

    2. the last commit contains everything you want to release and
       nothing else.

    3. you have git-pushed everything to origin.

Then, to upgrade to version 0.0.3, carry out the following steps:

    4. update `setup.py` to the new version (search for `name=...` and
       `version=...`).  Commit this change.

    5. `git tag -a 0.0.3 -m '...'`.  The commit comment can be
       literally `'...'` if there is nothing special to say about this
       release, or something like e.g. `Presentation <customer>
       <date>`.

    6. `git push --tags` (I think `git push` and `git fetch` treat
       tags and commits separately these days; for the convoluted
       details, consult the man pages).

Browse existing tags and check out a specific release::

    git tag
    git checkout 1.8.19

Apply a hotfix to an old release::

    git checkout -b 1.8.19-hotfix-remote-root-exploit 1.8.19
    ...  # (edit)
    git commit ...
    git tag -a 1.8.20 -m 'Fix: remote-root exploit'

There is more to tags, such as deleting and signing.  See `git tag
--help`.


Update translations backend
---------------------------

create new language::

   bin/ad_i18n en

extract message ids, update po and create mo files::

   bin/ad_i18n

compile custom po file in extension package::

    cd src/adhocracy_meinberlin/adhocracy_meinberlin/locale/en/LC_MESSAGES/
    msgfmt --statistics -o adhocracy.mo adhocracy.po

#TODO helper script that updates/compiles all po files
