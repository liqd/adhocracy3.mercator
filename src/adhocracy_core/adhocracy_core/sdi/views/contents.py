"""Contents tab."""
from substanced.folder.views import FolderContents
from substanced.folder.views import folder_contents_views


@folder_contents_views()
class AdhocracyFolderContents(FolderContents):
    """Default contents tab."""

    def sdi_addable_content(self):
        registry = self.request.registry
        introspector = registry.introspector
        cts = []
        meta_addable = self.request.registry.content\
            .get_resources_meta_addable(self.context, self.request)
        content_types_addable = [m.iresource.__identifier__ for m
                                 in meta_addable]
        for data in introspector.get_category('substance d content types'):
            intr = data['introspectable']
            if intr['content_type'] in content_types_addable:
                cts.append(data)
        return cts
