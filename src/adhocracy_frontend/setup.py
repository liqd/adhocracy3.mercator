"""Adhocracy frontend package."""
import os
import version

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.txt')).read()
CHANGES = open(os.path.join(here, 'CHANGES.txt')).read()

requires = ['adhocracy_core',
            'pyramid_cachebust',
            'pyramid_mako',
            ]

test_requires = ['adhocracy_core[test]',
                 ]

debug_requires = ['adhocracy_core[debug]',
                  ]

setup(name='adhocracy_frontend',
      version=version.get_git_version(),
      description='Adhocracy frontend package.',
      long_description=README + '\n\n' + CHANGES,
      classifiers=["Programming Language :: Python",
                   "Framework :: Pylons",
                   "Topic :: Internet :: WWW/HTTP",
                   "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
                   ],
      author='',
      author_email='',
      url='',
      keywords='web pyramid pylons adhocracy',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      install_requires=requires,
      tests_require=requires,
      extras_require={'test': test_requires,
                      'debug': debug_requires,
                      },
      entry_points="""\
      [paste.app_factory]
      main = adhocracy_frontend:main
      [pytest11]
      adhocracy_frontend = adhocracy_frontend.testing
      [pyramid.scaffold]
      adhocracy_frontend=adhocracy_frontend.scaffolds:AdhocracyExtensionTemplate
      [console_scripts]
      ad_deps2dot=adhocracy_frontend.scripts.deps2dot:main
      ad_merge_messages=adhocracy_frontend.scripts.merge_messages:main
      """,
      )
