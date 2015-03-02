from unittest.mock import Mock

from pytest import mark
from pytest import raises
from pytest import fixture
from pyramid import testing


@fixture()
def integration(config):
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.changelog')


@mark.usefixtures('integration')
def test_add_changelog(registry):
    assert hasattr(registry, 'changelog')


@mark.usefixtures('integration')
def test_clear_changelog(context, registry, changelog):
    from . import clear_changelog_after_commit_hook
    changelog['/'] = changelog['/']._replace(resource=context)
    registry.changelog = changelog
    clear_changelog_after_commit_hook(True, registry)
    assert changelog['/'].resource is None


def test_clear_modification_date(registry):
    from adhocracy_core.utils import get_modification_date
    from . import clear_modification_date_after_commit_hook
    date_before = get_modification_date(registry)
    clear_modification_date_after_commit_hook(True, registry)
    date_after = get_modification_date(registry)
    assert date_before is not date_after
