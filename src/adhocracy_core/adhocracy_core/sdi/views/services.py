"""Services tab."""
from substanced.folder.views import FolderServices
from substanced.folder.views import folder_contents_views
from substanced.folder.views import RIGHT
from substanced.sdi import _


@folder_contents_views(name='services',
                       tab_title=_('Services'),
                       tab_near=RIGHT,
                       view_permission='sdi.view-services',
                       )
class AdhocracyFolderServices(FolderServices):
    """Services tab."""
