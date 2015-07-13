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


class TestResourceMetadata:

    class ISample:
        pass

    class ISampleSheetA:
        pass

    class ISampleSheetB:
        pass

    def make_one(self):
        from .interfaces import ResourceMetadata
        meta = ResourceMetadata(content_name='',
                                iresource=self.ISample,
                                content_class=None,
                                permission_create='',
                                is_implicit_addable=False,
                                basic_sheets=[],
                                extended_sheets=[self.ISampleSheetA],
                                after_creation=[],
                                use_autonaming=False,
                                autonaming_prefix='',
                                use_autonaming_random=False,
                                element_types=[],
                                item_type=False,
        )
        return meta

    def after_creation_sample(self):
        pass

    def test_add(self):
        meta = self.make_one()
        new_meta = meta._add(extended_sheets=[self.ISampleSheetB],
                             after_creation=[self.after_creation_sample])
        assert new_meta.extended_sheets == [self.ISampleSheetA, self.ISampleSheetB]
        assert new_meta.after_creation == [self.after_creation_sample]
