"""Rest API configuration."""


def includeme(config):  # pragma: no cover
    """Include all rest views configuration."""
    config.include('cornice')
    config.include('.views')
    config.include('.batchview')
    config.commit()  # override cornice exception views
    config.include('.exceptions')
