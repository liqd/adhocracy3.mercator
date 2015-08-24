"""Agenda s1 workflow."""

# flake8: noqa
from pyramid.request import Request
from pyrsistent import freeze
from substanced.util  import find_service
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import search_query
from adhocracy_core.sheets.rate import IRateable
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.workflows import add_workflow


def change_children_to_voteable(context: IPool, request: Request, **kwargs):
    """Do transition from state proposed to voteable for all children."""
    for child in context.values():
        _do_transition(child, request, from_state='proposed', to_state='voteable')


def change_children_to_rejected_or_selected(context: IPool, request: Request, **kwargs):
    """Do transition from state proposed to rejected/selected for all children.

    The most rated child does transition to state selected, the other to rejected.
    """
    rated_children = _get_children_sort_by_rates(context)
    for pos,child in enumerate(rated_children):
        if pos == 0:
            _do_transition(child, request, from_state='voteable', to_state='selected')
        else:
            _do_transition(child, request, from_state='voteable', to_state='rejected')

def _get_children_sort_by_rates(context) -> []:
    catalog = find_service(context, 'catalogs')
    if catalog is None:
        return []  # ease testing
    result = catalog.search(search_query._replace(root=context,
                                                 depth=2,
                                                 only_visible=True,
                                                 interfaces=(IRateable, IVersionable),
                                                 sort_by='rates',
                                                 indexes={'tag': 'LAST'},
                                                 ))
    return (r.__parent__ for r in result.elements)


def _do_transition(context, request: Request, from_state: str, to_state: str):
    from adhocracy_core.sheets.workflow import IWorkflowAssignment
    from adhocracy_core.exceptions import RuntimeConfigurationError
    try:
        sheet = request.registry.content.get_sheet(context, IWorkflowAssignment)
    except RuntimeConfigurationError:
        pass
    else:
        current_state = sheet.get()['workflow_state']
        if current_state == from_state:
            sheet.set({'workflow_state': to_state}, request=request)

s1_meta = freeze({
    'initial_state': 'propose',
    'states': {
        'propose': {'title': 'Participate',
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
        'select': {'title': 'Evaluate',
                   'description': '',
                   'acm': {'principals':                     ['participant', 'moderator', 'creator', 'initiator'],
                           'permissions':
                             [['create_proposal',            'Allow',        None,        None,     'Allow'],
                              ['edit_proposal',               None,          None,       'Allow',    None],
                              ['create_rate',                'Allow',        None,        None,      None],
                              ['edit_rate',                   None,          None,       'Allow',    None],
                              ['create_comment',             'Allow',       'Allow',      None,     'Allow'],
                              ['edit_comment',                None,          None,       'Allow',    None],
                             ]}
        },
        'result': {'title': 'Result',
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
    },
    'transitions': {
        'to_select': {'from_state': 'propose',
                      'to_state': 'select',
                      'callback': 'adhocracy_s1.workflows.s1.change_children_to_voteable',
                      },
        'to_result': {'from_state': 'select',
                      'to_state': 'result',
                      'callback': 'adhocracy_s1.workflows.s1.change_children_to_rejected_or_selected',
                      },
        'to_propose': {'from_state': 'result',
                       'to_state': 'propose',
                      },
    },
})


s1_content_meta = freeze({
    'initial_state': 'proposed',
    'states': {
        'proposed': {},
        'voteable': {},
        'selected': {
               'acm': {'principals':                     ['participant', 'moderator', 'creator', 'initiator'],
                           'permissions':
                             [['edit_proposal',               None,          None,       'Deny',    None],
                              ['create_rate',                'Deny',         None,       'Deny',    None],
                              ['edit_rate',                   None,          None,       'Deny',    None],
                              ['create_comment',             'Deny',        'Deny',       None,    'Deny'],
                              ['edit_comment',                None,          None,       'Deny',    None],
                             ]}
        },
        'rejected': {
                'acm': {'principals':                     ['participant', 'moderator', 'creator', 'initiator'],
                           'permissions':
                             [['edit_proposal',               None,          None,       'Deny',    None],
                              ['create_rate',                'Deny',         None,       'Deny',    None],
                              ['edit_rate',                   None,          None,       'Deny',    None],
                              ['create_comment',             'Deny',        'Deny',       None,    'Deny'],
                              ['edit_comment',                None,          None,       'Deny',    None],
                             ]}
        },
    },
    'transitions': {
        'to_votable': {'from_state': 'proposed',
                       'to_state': 'voteable',
                       },
        'to_selected': {'from_state': 'voteable',
                        'to_state': 'selected',
                       },
        'to_rejected': {'from_state': 'voteable',
                        'to_state': 'rejected',
                        },
    },
})


def includeme(config):
    """Add workflow."""
    add_workflow(config.registry, s1_meta, 's1')
    add_workflow(config.registry, s1_content_meta, 's1_content')
