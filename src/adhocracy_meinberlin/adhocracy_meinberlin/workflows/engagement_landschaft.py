"""Example workflow."""
from adhocracy_core.workflows import add_workflow
from adhocracy_core.workflows.standard import standard_meta


def includeme(config):
    """Add workflow."""
    add_workflow(config.registry, standard_meta, 'engagement_landschaft')
