"""Configure, add dependency packages/modules, start application."""
from pyramid.config import Configurator
from pyramid.interfaces import IAuthenticationPolicy
from pyramid.session import SignedCookieSessionFactory
from pyramid.authentication import AuthTktAuthenticationPolicy
from pyramid_zodbconn import get_connection
from substanced.db import RootAdded
from logging import getLogger

import transaction

from adhocracy_core.authentication import TokenHeaderAuthenticationPolicy
from adhocracy_core.authentication import MultiRouteAuthenticationPolicy
from adhocracy_core.interfaces import SDI_ROUTE_NAME
from adhocracy_core.resources.root import IRootPool
from adhocracy_core.resources.principal import groups_and_roles_finder
from adhocracy_core.resources.principal import get_user
from adhocracy_core.auditing import set_auditlog
from adhocracy_core.auditing import get_auditlog


logger = getLogger(__name__)


def root_factory(request):
    """A function which can be used as a Pyramid ``root_factory``."""
    # Don't get the root object if the request already has one.
    # Workaround to make the subrequests in adhocracy_core.rest.batchview work.
    if getattr(request, 'root', False):
        return request.root
    _set_app_root_if_missing(request)
    _set_auditlog_if_missing(request)
    add_after_commit_hooks(request)
    add_request_callbacks(request)
    return _get_zodb_root(request)['app_root']


def _set_app_root_if_missing(request):
    zodb_root = _get_zodb_root(request)
    if 'app_root' in zodb_root:
        return
    registry = request.registry
    app_root = registry.content.create(IRootPool.__identifier__,
                                       request=request,
                                       registry=request.registry)
    zodb_root['app_root'] = app_root
    transaction.savepoint()  # give app_root a _p_jar
    registry.notify(RootAdded(app_root))
    transaction.commit()


def _get_zodb_root(request):
    connection = get_connection(request)
    zodb_root = connection.root()
    return zodb_root


def _set_auditlog_if_missing(request):
    root = _get_zodb_root(request)
    if get_auditlog(root) is not None:
        return
    set_auditlog(root)
    transaction.commit()
    auditlog = get_auditlog(root)
    # auditlog can still be None after _set_auditlog if not audit
    # conn has been configured
    if auditlog is not None:
        logger.info('Auditlog created')


def add_after_commit_hooks(request):
    """Add after commit hooks."""
    from adhocracy_core.caching import purge_varnish_after_commit_hook
    from adhocracy_core.websockets.client import \
        send_messages_after_commit_hook
    current_transaction = transaction.get()
    registry = request.registry
    # Order matters here
    current_transaction.addAfterCommitHook(purge_varnish_after_commit_hook,
                                           args=(registry, request))
    current_transaction.addAfterCommitHook(send_messages_after_commit_hook,
                                           args=(registry,))


def add_request_callbacks(request):
    """Add request callbacks."""
    from adhocracy_core.auditing import audit_resources_changes_callback
    from adhocracy_core.changelog import clear_changelog_callback
    from adhocracy_core.changelog import clear_modification_date_callback
    request.add_response_callback(audit_resources_changes_callback)
    request.add_finished_callback(clear_changelog_callback)
    request.add_finished_callback(clear_modification_date_callback)


def includeme(config):
    """Setup basic adhocracy."""
    settings = config.registry.settings
    config.include('pyramid_zodbconn')
    config.include('pyramid_mako')
    config.include('pyramid_chameleon')
    config.include('.authorization')
    authn_policy = _create_authentication_policy(settings, config)
    config.set_authentication_policy(authn_policy)
    config.add_request_method(get_user, name='user', reify=True)
    config.include('.renderers')
    config.include('.authentication')
    config.include('.authorization')
    config.include('.evolution')
    config.include('.events')
    config.include('.content')
    config.include('.changelog')
    config.include('.graph')
    config.include('.catalog')
    config.include('.caching')
    config.include('.messaging')
    config.include('.sheets')
    config.include('.sdi')
    config.include('.resources')
    config.include('.workflows')
    config.include('.websockets')
    config.include('.rest')
    config.include('.stats')
    if settings.get('adhocracy.add_test_users', False):
        from adhocracy_core.testing import add_create_test_users_subscriber
        add_create_test_users_subscriber(config)


def _create_authentication_policy(settings, config: Configurator)\
        -> IAuthenticationPolicy:
    secret = settings.get('substanced.secret', 'secret')
    groupfinder = groups_and_roles_finder
    timeout = 60 * 60 * 24 * 30
    multi_policy = MultiRouteAuthenticationPolicy()
    token_policy = TokenHeaderAuthenticationPolicy(secret,
                                                   groupfinder=groupfinder,
                                                   timeout=timeout)
    multi_policy.add_policy(None, token_policy)
    session_factory = SignedCookieSessionFactory(secret,
                                                 httponly=True,
                                                 timeout=timeout)
    config.set_session_factory(session_factory)
    session_policy = AuthTktAuthenticationPolicy(secret,
                                                 hashalg='sha512',
                                                 http_only=True,
                                                 callback=groupfinder,
                                                 timeout=timeout)
    # TODO add secure cookie flag if https
    multi_policy.add_policy(SDI_ROUTE_NAME, session_policy)
    return multi_policy


def main(global_config, **settings):
    """Return a Pyramid WSGI application."""
    config = Configurator(settings=settings, root_factory=root_factory)
    includeme(config)
    app = config.make_wsgi_app()
    return app
