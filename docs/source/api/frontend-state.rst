Frontend State
==============

The state
---------

There are three ways in which the application state is encoded:

Abstract state
~~~~~~~~~~~~~~

-   lives inside adhTopLevelState service
-   is always in sync with actual application state
-   does not cover all details of the application state
    -   current user
    -   form data

Example::

    {
        movingColumnsFocus: 2,
        movingColumnContentUrl: "/adhocracy/proposal1",
        movingColumnContentFilter: "hut"
    }

low level serialisation
~~~~~~~~~~~~~~~~~~~~~~~

-   there is a way to serialise the full abstract state into a query string
-   there is an inverse function that parses a query string into an abstract
    state

Example::

    ?movingColumnsFocus=2&movingColumnContentUrl=%2Fadhocracy%2Fproposal1&movingColumnContentFilter=hut


high level serialisation
~~~~~~~~~~~~~~~~~~~~~~~~

-   there may be aliases that map parts of the state to paths.
-   When serialising, aliases are preferred over low level serialisation
-   only those parts of the state that can not be serialised into a path are
    searialised using low level serialisation

Example::

    /content/proposal1?movingColumnContentFilter=hut


State changes
-------------

There are three ways in which the state can change.

Small changes
~~~~~~~~~~~~~

-   replaces browser history head (no new history entry)
-   does not change the URL path

Links
~~~~~

-   push a new browser history state
-   change the URL path

CameFrom stack
~~~~~~~~~~~~~~

-   like links, but the old state is pushed onto an additional stack so we
    can jump back there even after some link-type state changes.
-   Typical use case: You go to a login page and want to get back to your
    previous state after cancel/submit.


Syncing URL, state, and browser history
---------------------------------------

Whenever state or URL change, everything needs an update.

-   If state changes, it is serialised into an URL as described above and the browser history (and maybe the cameFrom stack) is updated.

-   If URL changes, it is parsed, replaced by a normalised (aliased) version and the state gets updated.


The link directive
------------------

To make state changes simple for frontend developers, there is a directive
that closely resembles the standard HTML `<a>` element. Especially, state
changes may be either absolute (replace state by specified) or relative
(change
specified aspects of state).
