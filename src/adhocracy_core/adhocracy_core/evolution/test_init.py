import unittest

from pyramid import testing


#############
#  helpers  #
#############

class DummyFolder(testing.DummyResource):

    def add(self, name, obj, **kwargs):
        self[name] = obj
        obj.__name__ = name
        obj.__parent__ = self
        obj.__oid__ = 1

    def check_name(self, name):
        if name == 'invalid':
            raise ValueError
        return name


################
#  tests       #
################

class ResourceFactoryIntegrationTest(unittest.TestCase):

    def setUp(self):
        self.config = testing.setUp()
        self.config.include('adhocracy_core.evolution')

    def tearDown(self):
        testing.tearDown()

    def test_includeme_add_directives(self):
        assert 'add_evolution_step' in self.config.registry._directives
