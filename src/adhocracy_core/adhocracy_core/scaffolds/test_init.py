"""Test adhocracy.scaffolds."""


def test_Adhocracyextensiontemplate_create():
    from adhocracy_core.scaffolds import AdhocracyExtensionTemplate
    inst = AdhocracyExtensionTemplate('example_project')
    assert inst.__dict__ ==  {'name': 'example_project'}
