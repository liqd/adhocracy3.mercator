from pytest import fixture
from pytest import mark


@fixture
def integration(integration):
    integration.include('pyramid_mailer.testing')
    return integration


def test_root_meta():
    from adhocracy_core.resources.root import root_meta
    from adhocracy_core.resources.root import \
        create_initial_content_for_app_root
    from .root import add_s1_process
    from .root import s1_root_meta
    assert add_s1_process not in root_meta.after_creation
    assert add_s1_process in s1_root_meta.after_creation
    assert create_initial_content_for_app_root in\
           s1_root_meta.after_creation


@mark.usefixtures('integration')
def test_add_spd_process(pool, registry):
    from .s1 import IProcess
    from .root import add_s1_process
    add_s1_process(pool, registry, {})
    IProcess.providedBy(pool['s1'])

