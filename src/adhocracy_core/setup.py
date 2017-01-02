"""Adhocracy core backend package."""
import os
import sys
import version

from setuptools import setup
from setuptools import find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.rst')).read()
CHANGES = open(os.path.join(here, 'CHANGES.rst')).read()

requires = [
    'pyramid_chameleon',
    'pyramid',
    'pyramid_exclog',
    'pyramid_bpython',
    'pyramid_jwt',
    'tzf.pyramid_yml',
    'gunicorn',
    'substanced',
    'pyramid_tm',
    'colander',
    'deform_markdown',
    'autobahn',
    'websocket-client',
    'Pillow',
    'requests',
    'pyrsistent',
    'multipledispatch',
    'PyYAML',
    'lxml',
    'osa',
]

if sys.version_info < (3, 4):
    requires.append('asyncio')


test_requires = [
    'pytest',
    'polytester',
    'selenium',
    'pyramid_debugtoolbar',
    'webtest',
    'pytest-timeout',
    'pytest-mock',
    'pytest-localserver',
    'coverage',
    'python-coveralls',
    'babel',
    'lingua',
    'testfixtures',
    'Sphinx',
    'sphinxcontrib_programoutput',
    'repoze.sphinx.autointerface',
    'sphinx-autodoc-annotation',
    'sphinxcontrib-blockdiag',
    'sphinxcontrib-actdiag',
    'sphinx-rtd-theme',
    'requires.io',
]

debug_requires = [
    'pudb',  # Graphical debugger
    'contexttimer',  # decorator to measure time
    'profilehooks',  # decorator to run/output cprofile
    'pycallgraph',  # Make png with call graph and hot spot visualization
    # GUI Viewer for Python profiling, needs wxgtk and python2:
    # http://www.vrplumber.com/programming/runsnakerun
]

setup(name='adhocracy_core',
      version=version.get_git_version(),
      description='Adhocracy core backend package.',
      long_description=README + '\n\n' + CHANGES,
      classifiers=[
          'Programming Language :: Python',
          'Framework :: Pylons',
          'Topic :: Internet :: WWW/HTTP',
          'Topic :: Internet :: WWW/HTTP :: WSGI :: Application',
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
      ad_import_users = adhocracy_core.scripts.ad_import_users:main
      ad_import_groups = adhocracy_core.scripts.ad_import_groups:main
      ad_import_resources = adhocracy_core.scripts.ad_import_resources:main
      ad_import_local_roles = adhocracy_core.scripts.ad_import_local_roles:main
      ad_assign_badges = adhocracy_core.scripts.ad_assign_badges:main
      ad_set_workflow_state = adhocracy_core.scripts.ad_set_workflow_state:main
      ad_delete_stale_login_data =\
          adhocracy_core.scripts.ad_delete_stale_login_data:main
      ad_delete_not_referenced_images =\
          adhocracy_core.scripts.ad_delete_images:main
      ad_export_users = adhocracy_core.scripts.ad_export_users:main
      ad_auto_transition_process_workflow=\
       adhocracy_core.scripts.ad_auto_transition_process_workflow:main
      ad_fixtures = adhocracy_core.scripts.ad_fixtures:main
      ad_auditlog = adhocracy_core.scripts.ad_auditlog:main
      [pyramid.scaffold]
      adhocracy=adhocracy_core.scaffolds:main
      """,
      )
