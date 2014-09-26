"""Section resource type."""
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import ITag
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources.itemversion import itemversion_metadata
from adhocracy_core.resources.item import item_metadata

import adhocracy_core.sheets.document


class ISectionVersion(IItemVersion):

    """Document section."""


sectionversion_meta = itemversion_metadata._replace(
    content_name='SectionVersion',
    iresource=ISectionVersion,
    extended_sheets=[adhocracy_core.sheets.document.ISection,
                     ],
)


class ISection(IItem):

    """Section Versions Pool."""


section_meta = item_metadata._replace(
    content_name='Section',
    iresource=ISection,
    element_types=[ITag,
                   ISectionVersion,
                   ],
    item_type=ISectionVersion,
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(sectionversion_meta, config)
    add_resource_type_to_registry(section_meta, config)
