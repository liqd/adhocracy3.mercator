"""Scripts to migrate legacy objects in existing databases."""

from pyramid.threadlocal import get_current_registry

from adhocracy_core.evolution import log_migration
from adhocracy_core.workflows import setup_workflow


@log_migration
def setup_digital_leben_workflow_state_to_result(root):  # pragma: no cover
    """Reset workflow state to 'result'."""
    registry = get_current_registry()
    workflow = registry.content.workflows['digital_leben']
    setup_workflow(workflow,
                   root['digital_leben'],
                   ['participate'],
                   registry)


def includeme(config):  # pragma: no cover
    """Register evolution utilities and add evolution steps."""
    config.add_evolution_step(setup_digital_leben_workflow_state_to_result)
