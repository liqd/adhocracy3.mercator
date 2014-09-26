from pyramid import testing
from pytest import mark
from pytest import fixture


@fixture
def integration(config):
    config.include('adhocracy_core.registry')
    config.include('adhocracy_core.events')
    config.include('adhocracy_core.sheets.metadata')
    config.include('adhocracy_core.resources.pool')

@mark.usefixtures('integration')
def test_includeme_registry_register_factories(config):
    from adhocracy_core.resources.pool import IBasicPool
    content_types = config.registry.content.factory_types
    assert IBasicPool.__identifier__ in content_types

@mark.usefixtures('integration')
def test_includeme_registry_register_meta(config):
    from adhocracy_core.resources.pool import IBasicPool
    meta = config.registry.content.meta
    assert IBasicPool.__identifier__ in meta


@mark.usefixtures('integration')
def test_includeme_registry_create_content(config):
    from adhocracy_core.resources.pool import IBasicPool
    assert config.registry.content.create(IBasicPool.__identifier__)


class TestPool:

    def _makeOne(self, d=None):
        from adhocracy_core.resources.pool import Pool
        return Pool(d)

    def test_create(self):
        from adhocracy_core.interfaces import IPool
        from zope.interface.verify import verifyObject
        inst = self._makeOne()
        assert verifyObject(IPool, inst)
        assert IPool.providedBy(inst)

    def test_next_name_empty(self, context):
        inst = self._makeOne()
        assert inst.next_name(context) == '0'.zfill(7)
        assert inst.next_name(context) == '1'.zfill(7)

    def test_next_name_nonempty(self, context):
        inst = self._makeOne({'nonintifiable': context})
        assert inst.next_name(context) == '0'.zfill(7)

    def test_next_name_nonempty_intifiable(self, context):
        inst = self._makeOne({'0000000': context})
        assert inst.next_name(context).startswith('0'.zfill(7) + '_20')

    def test_next_name_empty_prefix(self, context):
        inst = self._makeOne()
        assert inst.next_name(context, prefix='prefix')\
            == 'prefix' + '0'.zfill(7)
        assert inst.next_name(context) == '1'.zfill(7)

    def test_add(self, context):
        inst = self._makeOne()
        inst.add('name', context)
        assert 'name' in inst

    def test_add_next(self, context):
        inst = self._makeOne()
        inst.add_next(context)
        assert '0'.zfill(7) in inst

    def test_add_next_prefix(self, context):
        inst = self._makeOne()
        inst.add_next(context, prefix='prefix')
        assert 'prefix' + '0'.zfill(7) in inst

    def test_find_service(self):
        inst = self._makeOne()
        inst['service'] = testing.DummyResource()
        inst['service'].__is_service__ = True
        service = inst.find_service('service')
        assert service is inst['service']
