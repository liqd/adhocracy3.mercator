"""Base views."""
from pyramid.security import NO_PERMISSION_REQUIRED
from pyramid.httpexceptions import HTTPFound
from pyramid.httpexceptions import HTTPForbidden

from substanced.sdi import mgmt_view
from substanced.sdi import sdi_mgmt_views


class ManagementViews(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    @mgmt_view(tab_condition=False,
               permission=NO_PERMISSION_REQUIRED,
               )
    @mgmt_view(name='manage_main',
               tab_condition=False,
               permission=NO_PERMISSION_REQUIRED,
               )
    def manage_main(self):
        view_data = sdi_mgmt_views(self.context, self.request)
        if not view_data:
            raise HTTPForbidden()
        else:
            view_name = '@@%s' % (view_data[0]['view_name'],)
            location = self.request.sdiapi.mgmt_path(self.request.context,
                                                     view_name)
            return HTTPFound(location=location)
