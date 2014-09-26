Development
============

Development
-----------

Use test driven development and check code style bevore pushing commits
(see `Coding Style Guideline` ).

Manually check pyflake, pep257::

    bin/check_code src/adhocracy src/adhocracy_sample

Example Vim config according to coding guideline::

    https://github.com/liqd/vim_config


Running the Testsuite
---------------------

frontend unit tests:

    A.  Integrated with py.test::

            bin/py.test ./src/adhocracy/adhocracy/frontend/tests/unit/

    B.  In browser::

            make -C ./src/adhocracy/adhocracy/frontend/static/js/ compile_tests_browser
            xdg-open http://localhost:6541/static/test.html

        Make sure backend is running (or some means of delivering html
        and js to the browser).

        This is the best way to develop, as it lets you run tests
        indiviually and repeatedly and enter the debugger.

        .. note::

           In the debugger, it helps to disable the script tag about
           blanket in test.html.  You can do this thusly::

               make -C ./src/adhocracy/adhocracy/frontend/static/js/ compile_tests_browser test_no_blanket
               xdg-open http://localhost:6541/static/test-no-blanket.html

    C.  With node.js::

            make -C ./src/adhocracy/adhocracy/frontend/static/js/ compile_tests_node
            bin/jasmine-node ./src/adhocracy/adhocracy/frontend/static/js/

        .. note::

           Node only works with the commonjs module system;
           whereas the frontend currently uses requirejs and the amd
           module system (rationale: requirejs is more powerful with
           importing module-system-oblivious libraries like angular,
           underscore, ...).  You know that you have run into this
           problem if this appears in your browser console::

               Uncaught Error: Module name "Adhocracy/UtilSpec" has not been loaded yet for context: _. Use require([])
               http://requirejs.org/docs/errors.html#notloaded

           In order for the javascript code to work in the browser, you
           need to revert to adm::

               make -C ./src/adhocracy/adhocracy/frontend/static/js/ compile_tests_browser

frontend integration tests:

    Frontend integration tests behave like unit tests in the sense
    that they are driven by jasmine and can access all exports of all
    typescript modules; they behave like end-to-end tests in that they
    can talk to a running backend, angular runtime, etc..

    This makes it possible to write integration tests that reproduce
    any possible bug once it is reported (even though it may sometimes
    be better to write a unit or an acceptance test).

    For instance, one can write
    a test that registers and injects the AdhHttp service, renders
    some directive into the DOM, sends some keys to some input fields
    and clicks "save", and, once the object has been saved to the
    database, gets it from the backend and compares it to the one
    rendered in the directive.

    Integration tests do not support nodejs.  They can only be run in
    browser manually or via py.test.

    A.  Integrated with py.test::

            bin/py.test ./tests/integration/

    B.  In browser::

            make -C ./src/adhocracy/adhocracy/frontend/static/js/ compile_tests_browser
            xdg-open http://localhost:6541/static/igtest.html

        .. note::

           As with the unit tests (see above), when running
           integration tests in the browser manually, you are
           responsible for making sure the backend is running.  In
           contrast to unit tests, debugging works smoothly without
           any tricks, because we don't run blanket for test coverage
           reporting.

frontend functional tests::

    bin/py.test ./src/adhocracy/adhocracy/frontend/tests/functional

frontend acceptance tests::

    bin/py.test tests/

   .. note::
      The embed tests assume aliases for localhost to exist. If it is
      not already there, please add the following line to /etc/hosts::

          127.0.0.1  adhocracy.embeddee.goo adhocracy.embedder.gaa

      then start the testrunner with enabled embed testing::

          bin/py.test --run_embed_tests tests

run backend functional tests::

    bin/py.test -m"functional" src/adhocrac/adhocracy/websocket src/adhocracy_sample/adhocracy_sample/docs

run backend unit tests and show python test code coverage::

    bin/py.test_run_unittests_with_coverage

run all tests::

    bin/py.test_run_all

delete database (works best on development systems without valuable data!)::

    rm -f ./var/Data.*
    supervisorctl restart all

Generate html documentation
---------------------------

Recreate api documentation source files::

    bin/sphinx-apidoc -fo docs/source src/adhocracy  **/test*

Generate html documentation::

    bin/sphinx_build_adhocracy

Create scaffold for extension packages
---------------------------------------
::

    bin/pcreate -s adocracy_extension adhocracy_XX

Update Python packages
----------------------

Check whether new Python versions exist::

    bin/checkversions -v -l 0 versions.cfg | grep was

You may then update the pinned Python versions in `versions.cfg` if
appropriate.
