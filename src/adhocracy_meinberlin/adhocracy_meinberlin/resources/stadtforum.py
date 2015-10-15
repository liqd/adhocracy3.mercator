"""Stadtforum process resources."""

"""Comment resource type."""
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources import process
from adhocracy_core.resources.proposal import IProposal


class IProcess(process.IProcess):

    """Stadtforum participation process."""

process_meta = process.process_meta._replace(
    iresource=IProcess,
    element_types=(IProposal,
                   ),
    is_implicit_addable=True,
    workflow_name = 'stadtforum',
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(process_meta, config)
