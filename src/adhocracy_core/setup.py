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
    'waitress',
    'substanced',
    'pyramid_tm',
    'cornice',
    'colander',
    'autobahn',
    'websocket-client',
]

if sys.version_info < (3, 4):
    requires.append('asyncio')


test_requires = [
    'pytest',
    'selenium',
    'webtest',
    'pytest-splinter',
    'pytest-pyramid',
    'pytest-timeout',
    'coverage',
    'requests',
    'ipdb',
]


setup(name='adhocracy_core',
      version='0.0',
      description='adhocracy_core',
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
      extras_require={'test': test_requires},
      entry_points="""\
      [paste.app_factory]
      main = adhocracy_core:main
      [pytest11]
      adhocracy_core = adhocracy_core.testing
      [console_scripts]
      start_ws_server = adhocracy_core.websockets.start_ws_server:main
      [pyramid.scaffold]
      adhocracy_extension=adhocracy_core.scaffolds:AdhocracyExtensionTemplate
      """,
      )
