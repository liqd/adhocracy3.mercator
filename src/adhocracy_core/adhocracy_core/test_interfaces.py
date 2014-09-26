import unittest

from adhocracy_core.interfaces import ISheet


class SheetToSheetUnitTests(unittest.TestCase):

    def test_create_valid(self):
        from adhocracy_core.interfaces import SheetToSheet as Reference
        # substanced standard tagged values
        assert Reference.getTaggedValue('source_integrity') is False
        assert Reference.getTaggedValue('target_integrity') is False
        assert Reference.getTaggedValue('source_ordered') is False
        assert Reference.getTaggedValue('target_ordered') is False
        # extra tagged values
        assert Reference.getTaggedValue('source_isheet') is ISheet
        assert Reference.getTaggedValue('source_isheet_field') == u''
        assert Reference.getTaggedValue('target_isheet') is ISheet

    def test_create_valid_custom_values(self):
        from adhocracy_core.interfaces import SheetToSheet
        from adhocracy_core.interfaces import ISheet

        class IA(ISheet):
            pass

        class Reference(SheetToSheet):
            source_integrity = True
            target_integrity = True
            target_ordered = True
            source_ordered = True
            source_isheet = IA
            source_isheet_field = u''
            target_isheet = IA

        # substanced standard tagged values
        assert Reference.getTaggedValue('source_integrity')
        assert Reference.getTaggedValue('target_integrity')
        assert Reference.getTaggedValue('source_ordered')
        assert Reference.getTaggedValue('target_ordered')
        # extra tagged values
        assert Reference.getTaggedValue('source_isheet') is IA
        assert Reference.getTaggedValue('source_isheet_field') == u''
        assert Reference.getTaggedValue('target_isheet') is IA
