""" Evolve scripts to migrate legacy objects in existing databases."""
import logging

from substanced.evolution import add_evolution_step


logger = logging.getLogger(__name__)


def includeme(config):  # pragma: no cover
    """Register evolution utilities and add evolution steps."""
    config.add_directive('add_evolution_step', add_evolution_step)
    config.scan('substanced.evolution.subscribers')
