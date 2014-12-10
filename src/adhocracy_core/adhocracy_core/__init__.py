"""Setup pyramid wsgi app."""
from pyramid.config import Configurator
from pyramid_zodbconn import get_connection
from substanced.db import RootAdded
import transaction

from adhocracy_core.authentication import TokenHeaderAuthenticationPolicy
from adhocracy_core.authorization import RoleACLAuthorizationPolicy
from adhocracy_core.resources.root import IRootPool
from adhocracy_core.resources.principal import groups_and_roles_finder


def root_factory(request):
    """ A function which can be used as a Pyramid ``root_factory``."""
    # Don't get the root object if the request already has one.
    # Workaround to make the subrequests in adhocracy_core.rest.batchview work.
    if getattr(request, 'root', False):
        return request.root
    connection = get_connection(request)
    zodb_root = connection.root()
    if 'app_root' not in zodb_root:
        registry = request.registry
        app_root = registry.content.create(IRootPool.__identifier__,
                                           registry=request.registry)
        zodb_root['app_root'] = app_root
        transaction.savepoint()  # give app_root a _p_jar
        registry.notify(RootAdded(app_root))
        transaction.commit()
    add_after_commit_hooks(request)
    return zodb_root['app_root']


def add_after_commit_hooks(request):
    """Add after commit hook to notify the websocket server."""
    # FIXME this is a quick hack
    from adhocracy_core.websockets.client import \
        send_messages_after_commit_hook
    from adhocracy_core.resources.subscriber import\
        clear_transaction_changelog_after_commit_hook
    current_transaction = transaction.get()
    registry = request.registry
    current_transaction.addAfterCommitHook(send_messages_after_commit_hook,
                                           args=(registry,))
    current_transaction.addAfterCommitHook(
        clear_transaction_changelog_after_commit_hook, args=(registry,))


def includeme(config):
    """Setup basic adhocracy."""
    settings = config.registry.settings
    config.include('pyramid_zodbconn')
    config.include('pyramid_exclog')
    config.include('pyramid_mako')
    config.hook_zca()  # enable global adapter lookup (used by adhocracy.utils)
    authz_policy = RoleACLAuthorizationPolicy()
    config.hook_zca()  # global adapter lookup (used by adhocracy_core.utils)
    authz_policy = RoleACLAuthorizationPolicy()
    config.set_authorization_policy(authz_policy)
    authn_secret = settings.get('substanced.secret')
    authn_timeout = 60 * 60 * 24 * 30
    authn_policy = TokenHeaderAuthenticationPolicy(
        authn_secret,
        groupfinder=groups_and_roles_finder,
        timeout=authn_timeout)
    config.set_authentication_policy(authn_policy)
    config.include('.authentication')
    config.include('.evolution')
    config.include('.events')
    config.include('.registry')
    config.include('.graph')
    config.include('.catalog')
    config.include('.messaging')
    config.include('.sheets')
    config.include('.resources.asset')
    config.include('.resources.pool')
    config.include('.resources.root')
    config.include('.resources.tag')
    config.include('.resources.comment')
    config.include('.resources.external_resource')
    config.include('.resources.principal')
    config.include('.resources.rate')
    config.include('.resources.subscriber')
    config.include('.resources.sample_image')
    config.include('.websockets')
    config.include('.rest')


def main(global_config, **settings):
    """ Return a Pyramid WSGI application. """
    config = Configurator(settings=settings, root_factory=root_factory)
    includeme(config)
    app = config.make_wsgi_app()
    return app
