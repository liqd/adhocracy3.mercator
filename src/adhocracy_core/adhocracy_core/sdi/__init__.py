"""Admin interface based on substanced (sdi), url prefix is '/manage'."""
from pyramid.config import Configurator
from substanced.content import _ContentTypePredicate
from substanced.sdi import MANAGE_ROUTE_NAME
from substanced.sdi import sdiapi
from substanced.sdi import add_mgmt_view
from zope.interface.interfaces import IInterface

from adhocracy_core.interfaces import IPool
from .views.sheets import AddResourceSheetsBase


def add_sdi_add_view(config: Configurator,
                     iresource_: IInterface,
                     view_name: str,
                     ):
    """Create add view for `iresource` type and add to registry."""
    class AddResourceSheets(AddResourceSheetsBase):

        iresource = iresource_

    kwargs = {'context': IPool,
              'name': view_name,
              'tab_condition': False,
              'permission': 'sdi.add-content',
              'renderer': 'substanced.sdi:templates/form.pt',
              'view': AddResourceSheets,
              }
    config.add_mgmt_view(**kwargs)


def add_sdi_add_view_directive(config: Configurator,
                               iresource: IInterface,
                               view_name: str,
                               ):
    """Create `add_sdi_add_view` pyramid config directive.

    Example usage::

        config.add_sdi_add_view(IResource, 'add_iresource')
    """
    config.action(('add_sdi_add_view', iresource, view_name),
                  add_sdi_add_view,
                  args=(config, iresource, view_name))


def includeme(config):
    """Register sdi admin interface."""
    settings = config.registry.settings
    config.add_directive('add_mgmt_view', add_mgmt_view,
                         action_wrap=False)
    config.add_directive('add_sdi_add_view', add_sdi_add_view_directive,
                         action_wrap=False)
    _add_sdi_assets(config)
    _add_manage_route(settings, config)
    _add_sdi_request_extensions(config)
    config.add_view_predicate('content_type', _ContentTypePredicate)
    config.override_asset(to_override='substanced.sdi:templates/',
                          override_with='substanced.sdi.views:templates/')
    config.include('substanced.folder')
    config.scan('substanced.db.views')
    config.scan('.views.manage')
    config.scan('.views.login')
    config.scan('.views.contents')
    config.scan('.views.services')
    config.scan('.views.sheets')


def _add_sdi_assets(config: Configurator):
    year = 86400 * 365
    config.add_static_view('deformstatic', 'deform:static', cache_max_age=year)
    config.add_static_view('sdistatic',
                           'substanced.sdi:static',
                           cache_max_age=year)


def _add_manage_route(settings: dict, config: Configurator):
    manage_prefix = settings.get('substanced.manage_prefix', '/manage')
    manage_pattern = manage_prefix + '*traverse'
    config.add_route(MANAGE_ROUTE_NAME, manage_pattern)


def _add_sdi_request_extensions(config: Configurator):
    config.add_request_method(sdiapi, reify=True)
    config.add_permission('sdi.edit-properties')  # used by sheet machinery
    config.set_request_property(lambda r: r.user.locale, name='_LOCALE_')
