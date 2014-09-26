import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.txt')).read()

requires = [
    'adhocracy_core',
    ]

test_requires = [
    'adhocracy_core[test]',
    ]

setup(name='adhocracy_sample',
      version='0.0',
      description='adhocracy sample app',
      long_description=README,
      classifiers=[
        "Programming Language :: Python",
        "Framework :: Pylons",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
        ],
      author='',
      author_email='',
      url='',
      keywords='web adhocracy',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      install_requires=requires,
      extras_require={'test': test_requires},
      entry_points="""\
      [paste.app_factory]
      main = adhocracy_core:main
      """,
      )
