Installation
==============

Installation with Vagrant virtual machine
-----------------------------------------

Requirements:

1. virtualbox: https://virtualbox.org/wiki/Downloads
2. vagrant: http://docs.vagrantup.com/v2/installation/index.html

create virtual machine and login:

    (LINUX:)    wget https://raw.githubusercontent.com/liqd/adhocracy3/master/Vagrantfile
    (OSX:)      curl https://raw.githubusercontent.com/liqd/adhocracy3/master/Vagrantfile
    vagrant up
    vagrant ssh


Installation (backend)
----------------------

Requirements (Tested on Debian\Ubuntu,  64-Bit is mandatory):

1. git
2. python python-setuptools python-docutils
3. build-essential libssl-dev libbz2-dev libyaml-dev libncurses5-dev
4. graphviz
5. ruby ruby-dev

If you don't use the custom compiled python (see below) you need some
some basic dependencies to build PIL (python image library):

6. libjpeg8-dev zlib1g-dev (http://pillow.readthedocs.org/en/latest/installation.html)

create SSH key and upload to github ::

    ssh-keygen -t rsa -C "your_email@example.com"

checkout source code ::

    git clone git@github.com:liqd/adhocracy3.git
    cd adhocracy3
    git submodule update --init

compile python 3.4 and PIL ::

    cd python
    python ./bootstrap.py
    ./bin/buildout
    ./bin/install-links
    cd ..

install adhocracy ::

    ./bin/python ./bootstrap.py -v 2.3.1 --setuptools-version=12.1
    ./bin/buildout

update your shell environment::

    source ./source_env


Documentation
-------------

build sphinx documentation ::

    bin/sphinx_build_adhocracy
    xdg-open docs/build/html/index.html  # (alternatively, cut & paste the url into your browser)


Run the application
-------------------

Start supervisor (which manages the ZODB database, the Pyramid application
and the Autobahn websocket server)::

    ./bin/supervisord
    ./bin/supervisorctl start adhocracy:*

Check that everything is running smoothly::

    ./bin/supervisorctl status


Open the javascript front-end with your web browser::

    xdg-open http://localhost:6551/

Shutdown everything nicely::

    ./bin/supervisorctl shutdown


Run test suites
---------------

Run pytest suite::

    bin/py.test_run_all

Run protractor acceptance tests::

    bin/protractor etc/protractorConf.js
