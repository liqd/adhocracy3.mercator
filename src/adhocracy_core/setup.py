"""Adhocracy core backend package."""
import os
import sys

from setuptools import setup
from setuptools import find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.rst')).read()
CHANGES = open(os.path.join(here, 'CHANGES.rst')).read()

requires = [
    'pyramid_chameleon',
    'pyramid',
    'pyramid_debugtoolbar',
    'pyramid_exclog',
    'gunicorn',
    'substanced',
    'pyramid_tm',
    'cornice < 0.18',  # We allow sequence data but cornice only dicts (#273)
    'colander',
    'autobahn',
    'websocket-client',
    'Pillow',
    'requests',
]

if sys.version_info < (3, 4):
    requires.append('asyncio')


test_requires = [
    'pytest',
    'polytester',
    'selenium',
    'webtest',
    'pytest-splinter',
    'pytest-pyramid',
    'pytest-timeout',
    'coverage',
    'python-coveralls',
]

debug_requires = [
    'ipdb',  # ipython pdb
    'pudb',  # Graphical debugger
    'contexttimer',  # decorator to measure time
    'profilehooks',  # decorator to run/output cprofile
    'pycallgraph',  # Make png with call graph and hot spot visualization
    # GUI Viewer for Python profiling, needs wxgtk and python2:
    # http://www.vrplumber.com/programming/runsnakerun
]

import version
setup(name='adhocracy_core',
      version=version.get_git_version(),
      description='Adhocracy core backend package.',
      long_description=README + '\n\n' + CHANGES,
      classifiers=[
          "Programming Language :: Python",
          "Framework :: Pylons",
          "Topic :: Internet :: WWW/HTTP",
          "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
      ],
      author='',
      author_email='',
      url='',
      keywords='web pyramid pylons substanced',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      install_requires=requires,
      extras_require={'test': test_requires,
                      'debug': test_requires + debug_requires,
                      },
      entry_points="""\
      [paste.app_factory]
      main = adhocracy_core:main
      [pytest11]
      adhocracy_core = adhocracy_core.testing
      [console_scripts]
      start_ws_server = adhocracy_core.websockets.start_ws_server:main
      [pyramid.scaffold]
      adhocracy=adhocracy_core.scaffolds:AdhocracyExtensionTemplate
      """,
      )
