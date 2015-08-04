"""Standard workflow."""

# flake8: noqa

from adhocracy_core.workflows import add_workflow
from pyrsistent import freeze

standard_meta = freeze({
    'initial_state': 'draft',
    'states': {
        'draft': {'title': 'Draft',
                  'description': 'This phase is for internal review.',
                  'acm': {'principals':         ['anonymous', 'initiator', 'participant', 'moderator', 'creator'],
                          'permissions':
                          [['view',              'Deny',      'Allow',     'Deny',        'Allow',     'Allow'],
                           ['create_proposal',    None,       'Allow',      None,          None,        None],
                           ['edit_proposal',      None,       'Allow',      None,          None,       'Allow'],
                          ]},
                  'display_only_to_roles': ['admin', 'initiator', 'moderator'],
                  },
        'announce': {'title': 'Announce',
                     'description': '',
        },
        'participate': {'title': 'Participate',
                        'description': '',
                        'acm': {'principals':                    ['participant', 'moderator', 'creator', 'initiator'],
                                'permissions':
                                  [['create_proposal',            'Allow',        None,        None,     'Allow'],
                                   ['edit_proposal',               None,          None,       'Allow',    None],
                                   ['create_comment',             'Allow',       'Allow',      None,     'Allow'],
                                   ['edit_comment',                None,          None,       'Allow',    None],
                                   ['create_rate',                'Allow',        None,        None,      None],
                                   ['edit_rate',                   None,          None,       'Allow',    None],
                                   ]},
                        },
        'evaluate': {'title': 'Evaluate',
                     'description': '',
                     'acm': {'principals':                      ['participant', 'moderator', 'creator', 'initiator'],
                             'permissions':
                             [['create_proposal',                 None,          None,        None,      None],
                              ['edit_proposal',                   None,          None,        None,      None],
                              ['create_comment',                 'Allow',       'Allow',      None,     'Allow'],
                              ['edit_comment',                    None,          None,       'Allow',    None],
                             ]}
        },
        'result': {'title': 'Result',
                   'description': '',
                   'acm': {'principals':                        ['participant', 'moderator', 'creator', 'initiator'],
                             'permissions':
                             [['create_proposal',                 None,          None,        None,      None],
                              ['edit_proposal',                   None,          None,        None,      None],
                              ['create_comment',                  None,         'Allow',      None,     'Allow'],
                              ['edit_comment',                    None,          None,       'Allow',    None],
                             ]}
                   },
        'closed': {'title': 'Closed',
                   'description': '',
                   },
    },
    'transitions': {
        'to_announce': {'from_state': 'draft',
                        'to_state': 'announce',
                        },
        'to_participate': {'from_state': 'announce',
                           'to_state': 'participate',
                           },
        'to_participate': {'from_state': 'announce',
                           'to_state': 'participate',
                           },
        'to_evaluate': {'from_state': 'participate',
                        'to_state': 'evaluate',
                      },
        'to_result': {'from_state': 'evaluate',
                      'to_state': 'result',
                      },
        'to_closed': {'from_state': 'result',
                      'to_state': 'closed',
                      },
    },
})


def includeme(config):
    """Add workflow."""
    add_workflow(config.registry, standard_meta, 'standard')
