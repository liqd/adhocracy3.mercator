"""Internal Exceptions."""
from adhocracy_core.events import ISheetReferenceNewVersion


class ConfigurationError(Exception):
    """Raise when wrong values are supplied to the resources/sheet metadata."""

    def __init__(self, details=''):
        """Initialize self."""
        self.details = details
        """Arbitrary error description."""

    def __repr__(self):
        """Return the representation of self."""
        return self.details

    def __str__(self):
        """Return the string of self."""
        return self.details


class RuntimeConfigurationError(ConfigurationError):
    """Raise when the ConfigurationError is detected during runtime."""


class NoForkAllowedError(Exception):
    """Raise when a fork is created for non forkable itemversions."""

    def __init__(self, resource):
        """Initialize self."""
        self.resource = resource
        """Resource causing this error."""


class AutoUpdateNoForkAllowedError(NoForkAllowedError):
    """Raise when the automatic resource update causes a NoForkAllowedError.

    See :class:`adhocracy_core.interfaces.ISheetReferenceAutoUpdateMarker` for
    more information.
    """

    def __init__(self, resource, event: ISheetReferenceNewVersion):
        """Initialize self."""
        super().__init__(resource)
        self.event = event
        """Event causing the auto update process."""
