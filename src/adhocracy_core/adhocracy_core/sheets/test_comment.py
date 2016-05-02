from unittest.mock import Mock
from pyramid import testing
from pytest import fixture
from pytest import mark


@mark.usefixtures('integration')
def test_includeme_register_comment_sheet(config):
    from adhocracy_core.sheets.comment import IComment
    context = testing.DummyResource(__provides__=IComment)
    assert config.registry.content.get_sheet(context, IComment)


class TestCommentableSheet:

    @fixture
    def meta(self):
        from adhocracy_core.sheets.comment import commentable_meta
        return commentable_meta

    @fixture
    def context(self, pool, service):
        pool['comments'] = service
        return pool

    @fixture
    def inst(self, meta, context, registry):
        return meta.sheet_class(meta, context, registry)

    def test_meta(self, meta):
        from . import comment
        assert meta.isheet == comment.ICommentable
        assert meta.schema_class == comment.CommentableSchema
        assert meta.sheet_class == comment.CommentableSheet

    def test_create(self, inst, context):
        from zope.interface.verify import verifyObject
        from adhocracy_core.interfaces import IResourceSheet
        assert IResourceSheet.providedBy(inst)
        assert verifyObject(IResourceSheet, inst)

    def test_get_empty(self, inst, context):
        data = inst.get()
        assert data['post_pool'] == context['comments']
        assert data['comments_count'] == 0

    def test_get_with_comments_count(self, inst):
        from BTrees.Length import Length
        data = dict(comments_count=Length(4))
        setattr(inst.context, inst._annotation_key, data)
        assert inst.get()['comments_count'] == 4

    def test_set_initial_comments_count(self, inst):
        inst._get_data_appstruct = Mock(return_value={})
        inst.set({'comments_count': 4}, omit_readonly=False)
        data = getattr(inst.context, inst._annotation_key)
        assert data['comments_count'].value == 4

    def test_set_edit_comments_count(self, inst):
        from BTrees.Length import Length
        old_data = dict(comments_count=Length(3))
        setattr(inst.context, inst._annotation_key, old_data)
        inst.set({'comments_count': 4}, omit_readonly=False)
        data = getattr(inst.context, inst._annotation_key)
        assert data['comments_count'].value == 4

    @mark.usefixtures('integration')
    def test_includeme_register(self, meta, registry):
        context = testing.DummyResource(__provides__=meta.isheet)
        assert registry.content.get_sheet(context, meta.isheet)
