"""Root resource type."""
from pyramid.registry import Registry
from adhocracy_core.interfaces import IPool
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.root import create_initial_content_for_app_root
from adhocracy_core.resources.root import add_example_process
from adhocracy_core.resources.root import root_meta
from adhocracy_core.schema import ACM
from adhocracy_s1.resources.s1 import IProcess
import adhocracy_core.sheets


def add_s1_process(context: IPool, registry: Registry, options: dict):
    """Add spd specific process."""
    appstructs = {adhocracy_core.sheets.name.IName.__identifier__:
                  {'name': 's1'}}
    registry.content.create(IProcess.__identifier__,
                            parent=context,
                            appstructs=appstructs)


s1_acm = ACM().deserialize(
    {'principals': ['anonymous',
                    'participant',
                    'moderator',
                    'creator',
                    'initiator',
                    'admin'],
     'permissions': []})


s1_root_meta = root_meta._replace(
    after_creation=(create_initial_content_for_app_root,
                    add_s1_process,
                    add_example_process,
                    ))


def includeme(config):
    """Add resource type to content."""
    add_resource_type_to_registry(s1_root_meta, config)
