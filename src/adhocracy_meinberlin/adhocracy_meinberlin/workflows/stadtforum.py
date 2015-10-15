"""Stadtforum workflow."""

# flake8: noqa


from pyrsistent import freeze

from adhocracy_core.workflows import add_workflow
from adhocracy_core.workflows.standard import standard_meta

stadtforum_meta = standard_meta \
             .transform(('states', 'participate', 'acm'),
                        {'principals':                    ['moderator', 'participant', 'creator', 'initiator'],
                         'permissions':
                         [['create_proposal',               None,        'Deny',        None,     'Allow'],
                          ['edit_proposal',                 None,         None,        'Allow',    None],
                          ]})

def includeme(config):
    """Add workflow."""
    add_workflow(config.registry, stadtforum_meta, 'stadtforum')
