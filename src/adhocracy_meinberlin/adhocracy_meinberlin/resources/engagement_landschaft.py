"""Resource types for digital leben process."""
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources import document_process


class IProcess(document_process.IDocumentProcess):
    """Engagement Landschaft participation process."""


process_meta = document_process.document_process_meta._replace(
    iresource=IProcess,
    workflow_name='engagement_landschaft'
)


def includeme(config):
    """Add resource type to content."""
    add_resource_type_to_registry(process_meta, config)
