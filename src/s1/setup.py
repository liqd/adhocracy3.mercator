"""Adhocracy frontend customization package."""
import os
import version

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.rst')).read()
CHANGES = open(os.path.join(here, 'CHANGES.rst')).read()

requires = ['adhocracy_frontend',
            'adhocracy_s1',
            ]

test_requires = ['adhocracy_frontend[test]',
                 'adhocracy_s1[test]',
                 ]

debug_requires = ['adhocracy_frontend[debug]',
                  'adhocracy_s1[debug]',
                  ]

setup(name='s1',
      version=version.get_git_version(),
      description='Adhocracy meta package for backend/frontend customization.',
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
                      'debug': debug_requires},
      entry_points="""\
      [paste.app_factory]
      main = s1:main
      """,
      )
