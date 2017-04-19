"""Adhocracy extension."""
from pyramid.config import Configurator

from adhocracy_core import root_factory
from adhocracy_core.interfaces import IFixtureAsset


def includeme(config):
    """Setup adhocracy extension."""
    # include adhocracy_core
    config.include('adhocracy_core')
    # commit to allow overriding pyramid config
    config.commit()
    # include custom resource types
    config.include('.authorization')
    config.include('.catalog')
    config.include('.workflows')
    config.include('.sheets')
    config.include('.resources')
    config.include('.evolution')
    config.add_translation_dirs('adhocracy_core:locale/')
    config.registry.registerUtility('', IFixtureAsset,
                                    name='adhocracy_mercator:fixture')


def main(global_config, **settings):
    """Return a Pyramid WSGI application."""
    config = Configurator(settings=settings, root_factory=root_factory)
    includeme(config)
    app = config.make_wsgi_app()
    return app
