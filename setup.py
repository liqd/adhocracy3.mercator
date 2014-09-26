import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.rst')).read()
CHANGES = open(os.path.join(here, 'CHANGES.rst')).read()

requires = [
    'adhocracy_core',
    'adhocracy_frontend',
    ]

test_requires = [
    'adhocracy_core[test]',
    'adhocracy_frontend[test]',
    ]

setup(name='adhocracy',
      version='0.0',
      description='Adhocracy backend and frontend server with default settings',
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
      keywords='web pyramid pylons adhocracy',
      package_dir={'': 'src'},
      packages=find_packages('src'),
      include_package_data=True,
      zip_safe=False,
      install_requires=requires,
      tests_require=requires,
      extras_require={'test': test_requires},
      entry_points="""\
      [paste.app_factory]
      main = adhocracy:main
      """,
      )

