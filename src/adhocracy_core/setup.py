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
    'pyramid_bpython',
    'gunicorn',
    'substanced',
    'pyramid_tm',
    'colander',
    'autobahn',
    'websocket-client',
    'Pillow',
    'requests',
    'pyrsistent',
    'multipledispatch',
    'PyYAML',
]

if sys.version_info < (3, 4):
    requires.append('asyncio')


test_requires = [
    'pytest',
    'polytester',
    'selenium',
    'webtest',
    'pytest-pyramid',
    'pytest-timeout',
    'pytest-mock',
    'pytest-localserver',
    'coverage',
    'python-coveralls',
    'babel',
    'lingua',
    'testfixtures',
    'Sphinx',
    'repoze.sphinx.autointerface',
    'sphinx-autodoc-annotation',
    'sphinxcontrib-blockdiag',
    'sphinxcontrib-actdiag',
    'sphinxcontrib-programoutput',
    'sphinx-rtd-theme',
]

debug_requires = [
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
      ad_start_ws_server = adhocracy_core.websockets.start_ws_server:main
      ad_import_users = adhocracy_core.scripts.import_users:import_users
      ad_import_groups = adhocracy_core.scripts.import_groups:import_groups
      ad_import_resources =\
          adhocracy_core.scripts.import_resources:import_resources
      ad_import_local_roles = \
          adhocracy_core.scripts.import_local_roles:import_local_roles
      ad_assign_badges =\
          adhocracy_core.scripts.assign_badges:assign_badges
      ad_set_workflow_state =\
          adhocracy_core.scripts.set_workflow_state:set_workflow_state
      ad_delete_stale_login_data =\
          adhocracy_core.scripts.delete_stale_login_data:delete_stale_login_data
      ad_delete_not_referenced_images =\
          adhocracy_core.scripts.delete_images:delete_not_referenced_images
      ad_export_users =\
          adhocracy_core.scripts.export_users:export_users
      ad_auto_transition_process_workflow=\
          adhocracy_core.scripts.auto_transition_process_workflow:auto_transition_process_workflow
      ad_fixtures =\
        adhocracy_core.scripts.fixtures:import_fixtures
      [pyramid.scaffold]
      adhocracy=adhocracy_core.scaffolds:AdhocracyExtensionTemplate
      """,
      )
