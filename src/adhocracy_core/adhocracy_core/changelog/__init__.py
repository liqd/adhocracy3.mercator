"""Transaction changelog for resources."""
from collections import defaultdict
from pyramid.registry import Registry
from adhocracy_core.interfaces import ChangelogMetadata
from adhocracy_core.interfaces import VisibilityChange


changelog_metadata = ChangelogMetadata(False, False, None, None, None,
                                       False, False, VisibilityChange.visible)


def clear_changelog_after_commit_hook(success: bool, registry: Registry):
    """Delete all entries in the transaction changelog."""
    changelog = getattr(registry, 'changelog', dict())
    changelog.clear()


def create_changelog() -> dict:
    """Return dict that maps resource path to :class:`ChangelogMetadata`."""
    metadata = lambda: changelog_metadata
    return defaultdict(metadata)


def clear_modification_date_after_commit_hook(success: bool,
                                              registry: Registry):
    """Delete the shared modification date for the transaction.

    The date is set by :func:`adhocracy_utils.get_modification_date`.
    """
    if getattr(registry, '__modification_date__',  # pragma: no branch
               None) is not None:
        del registry.__modification_date__


def includeme(config):
    """Add transaction changelog to the registry and register subscribers."""
    changelog = create_changelog()
    config.registry.changelog = changelog
    config.include('.subscriber')
