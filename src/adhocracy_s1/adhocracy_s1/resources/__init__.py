"""Resource type configuration and default factory."""


def includeme(config):
    """Include resource types and subscribers."""
    config.include('.s1')
    config.include('.root')
    config.include('.subscriber')
