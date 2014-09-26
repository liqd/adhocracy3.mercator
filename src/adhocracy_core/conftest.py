"""Additional pytest configuration."""
from pytest import mark


def pytest_collection_modifyitems(items):
    """Mark all doctest tests as functional tests."""
    for item in items:
        if '.rst' in item.nodeid:
            item.add_marker(mark.functional)
