"""Simple sample app using the Adhocracy core."""
from pyramid.config import Configurator

from adhocracy_core import root_factory


def includeme(config):
    """Setup sample app."""
    # include adhocracy_core
    config.include('adhocracy_core')
    # include custom resource types
    config.include('adhocracy_core.resources.sample_paragraph')
    config.include('adhocracy_core.resources.sample_section')
    config.include('adhocracy_core.resources.sample_proposal')
    # include custom sheets
    config.include('adhocracy_core.sheets.sample_sheets')


def main(global_config, **settings):
    """ Return a Pyramid WSGI application. """
    config = Configurator(settings=settings, root_factory=root_factory)
    includeme(config)
    return config.make_wsgi_app()
