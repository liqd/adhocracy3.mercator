"""Logout page."""
from pyramid.httpexceptions import HTTPFound
from pyramid.security import forget
from pyramid.security import NO_PERMISSION_REQUIRED

from substanced.sdi import mgmt_view


@mgmt_view(name='logout',
           tab_condition=False,
           permission=NO_PERMISSION_REQUIRED
           )
def logout(request):
    """Logout user (remove authentication cookies)."""
    headers = forget(request)
    location = request.sdiapi.mgmt_path(request.context)
    return HTTPFound(location=location, headers=headers)
