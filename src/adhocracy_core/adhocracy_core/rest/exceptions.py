"""Rest API exceptions."""
import logging

from cornice.util import _JSONError
from pyramid.security import NO_PERMISSION_REQUIRED
from pyramid.view import view_config
import colander

from adhocracy_core.utils import exception_to_str
from adhocracy_core.utils import log_compatible_datetime


logger = logging.getLogger(__name__)


@view_config(
    context=colander.Invalid,
    permission=NO_PERMISSION_REQUIRED,
)
def handle_error_400_colander_invalid(error, request):
    """Return 400 JSON error."""
    errors = []
    for path, description in error.asdict().items():
        errors.append(_build_error_dict('body', path, description))
    return _JSONError(errors, 400)


def _build_error_dict(location, name, description):
    return {'location': location, 'name': name, 'description': description}


@view_config(
    context=Exception,
    permission=NO_PERMISSION_REQUIRED,
)
def handle_error_500_exception(error, request):
    """Return 500 JSON error."""
    error_dict = internal_exception_to_dict(error)
    logger.exception('internal')
    return _JSONError([error_dict], 500)


def internal_exception_to_dict(error: Exception) -> dict:
    """Convert an internal exception into a Colander-style dictionary."""
    description = '{}; time: {}'.format(exception_to_str(error),
                                        log_compatible_datetime())
    return _build_error_dict('internal', '', description)


def includeme(config):  # pragma: no cover
    """Include pyramid configuration."""
    config.scan('.exceptions')
