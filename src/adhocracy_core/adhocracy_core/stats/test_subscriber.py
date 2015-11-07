from unittest.mock import patch
from pytest import mark
from pytest import fixture
from pyramid import testing


@fixture
def mock_statsd_incr(mock):
    return mock.patch('adhocracy_core.stats.subscriber.statsd_incr')


@fixture
def event():
    return testing.DummyResource()


class TestIncrEventMetric:

    def call_fut(self, *args):
        from .subscriber import incr_event_metric
        return incr_event_metric(*args)

    def test_increment_metric(self, mock_statsd_incr, event):
        self.call_fut('metricname', 1.0, event)
        assert mock_statsd_incr.call_args[0][0] == 'metricname'
        assert mock_statsd_incr.call_args[1]['value'] == 1
        assert mock_statsd_incr.call_args[1]['rate'] == 1.0

    def test_add_threadlocal_registry(self, mock_statsd_incr, event, registry):
        self.call_fut('metricname', 1.0, event)
        assert mock_statsd_incr.call_args[1]['registry'] == registry

    def test_add_event_registry_if_given(self, mock_statsd_incr, event):
        event.registry = object()
        self.call_fut('metricname', 1.0, event)
        assert mock_statsd_incr.call_args[1]['registry'] == event.registry


def test_incr_requests_metrics_http_methods(request_, mock_statsd_incr, event):
    from .subscriber import incr_requests
    request_.method = 'POST'
    event.request = request_
    incr_requests(event)
    mock_statsd_incr.assert_called_with('requests.post', value=1, rate=0.1,
                                        registry=request_.registry)

def test_incr_requests_metric_post_batch(request_, mock_statsd_incr, event):
    from .subscriber import incr_requests
    request_.method = 'POST'
    request_.path = '/batch'
    event.request = request_
    incr_requests(event)
    mock_statsd_incr.assert_called_with('requests.post.batch', value=1, rate=0.1,
                                        registry=request_.registry)


@mark.usefixtures('integration')
def test_register_subscriber(config, registry):
    from . import subscriber
    config.include(subscriber)
    handlers = [x.handler.__name__ for x in registry.registeredHandlers()]
    assert subscriber.incr_requests.__name__ in handlers
