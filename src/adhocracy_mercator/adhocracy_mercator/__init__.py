"""Adhocracy extension."""
from pyramid.config import Configurator
from pyramid import testing

from adhocracy_core import root_factory
from adhocracy_core.interfaces import IResource
from adhocracy_core.rest.views import ResourceRESTView


def includeme(config):
    """Setup adhocracy extension."""
    # include adhocracy_core
    config.include('adhocracy_core')
    # include custom resource types
    config.include('adhocracy_core.resources.sample_paragraph')
    config.include('adhocracy_core.resources.sample_section')
    config.include('adhocracy_core.resources.sample_proposal')
    config.include('.catalog')
    config.include('.sheets.mercator')
    config.include('.resources.mercator')


def main(global_config, **settings):
    """ Return a Pyramid WSGI application. """
    config = Configurator(settings=settings, root_factory=root_factory)
    includeme(config)
    app = config.make_wsgi_app()
    # warm_up_database(app)
    # FIXME: disabled warm_up_database is temporary workaround to prevent
    # ComponentLookupError: (<..interfaces.ICatalogFactory>, 'system')
    # if you start adhocracy the first time
    return app


def warm_up_database(app):
    """Fill the zodb connection pool to make the application start faster."""
    request = _create_dummy_request(app)
    root = app.root_factory(request)
    _warm_up_reference_map(root)
    _warm_up_all_resources(root, request)


def _create_dummy_request(app):
    request = testing.DummyRequest()
    request.registry = app.registry
    request.content_type = 'application/json'
    request.validated = {}
    request.errors = []
    return request


def _warm_up_reference_map(root):
    om = root.__objectmap__
    [x for x in om.referencemap.refmap.values()]
    [x for x in om.referencemap.refmap.keys()]


def _warm_up_all_resources(root, request):
    # FIXME This makes not much sense for really big databases
    om = root.__objectmap__
    resolve = om.object_for
    resources = [resolve(p) for p in om.pathlookup(('',))]
    for resource in [r for r in resources if IResource.providedBy(r)]:
        view = ResourceRESTView(resource, request)
        appstruct = view.get()
        del appstruct
