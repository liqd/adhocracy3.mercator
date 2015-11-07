"""Send counter runtime statistics to statsd server."""
from functools import partial
from pyramid.events import ApplicationCreated
from pyramid.events import NewRequest
from pyramid.threadlocal import get_current_registry
from substanced.stats import statsd_incr
from adhocracy_core.resources.principal import IPasswordReset
from adhocracy_core.resources.principal import IUser
from adhocracy_core.interfaces import IResourceCreatedAndAdded


def incr_event_metric(name: str, rate: float, event: object):
    """Increment statsd metric `name`.

    :param `name`: the metric name send to the stats server
    :param `rate`: sample rate (>=0 and <= 1) to reduce the number of values
    :param `event`: object with optional `registry` attribute to retrieve the
                    pyramid registry.

    """
    registry = getattr(event, 'registry', None)
    if registry is None:
        registry = get_current_registry()
    statsd_incr(name, value=1, rate=rate, registry=registry)

incr_started = partial(incr_event_metric, 'app.started', 1)
incr_resource_created = partial(incr_event_metric, 'resources.created', .05)
incr_pwordreset_created = partial(incr_event_metric, 'pwordresets.created', 1)
incr_user_created = partial(incr_event_metric, 'users.created', 1)


def incr_requests(event):
    """Increment statsd metrics to count requests."""
    method = event.request.method.lower()
    path = event.request.path
    name = 'requests.' + method
    if path == '/batch':
        name += '.batch'
    incr_event_metric(name, .1, event)


def includeme(config):
    """Include subscriber to send runtime statistics."""
    config.add_subscriber(incr_started, ApplicationCreated)
    config.add_subscriber(incr_requests, NewRequest)
    config.add_subscriber(incr_resource_created,
                          IResourceCreatedAndAdded)
    config.add_subscriber(incr_pwordreset_created,
                          IResourceCreatedAndAdded,
                          object_iface=IPasswordReset)
    config.add_subscriber(incr_user_created,
                          IResourceCreatedAndAdded,
                          object_iface=IUser)
