"""Internal Exceptions."""


class ConfigurationError(Exception):

    """Raise when wrong values are supplied to the resources/sheet metadata."""


class RuntimeConfigurationError(ConfigurationError):

    """Raise when the ConfigurationError is detected during runtime."""
