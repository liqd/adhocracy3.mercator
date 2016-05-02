# doctest: +ELLIPSIS
# doctest: +NORMALIZE_WHITESPACE

Admin interface (sdi)
=====================

A generic admin interface is provided based on :mod:`substanced.sdi`.

First you have to start adhocracy

    >>> from webtest import TestApp
    >>> log = getfixture('log')
    >>> app_router = getfixture('app_router')
    >>> testapp = TestApp(app_router)
    >>> rest_url = 'http://localhost'
    >>> xhr_headers = {'X-REQUESTED-WITH': 'XMLHttpRequest'}

If you got the sdi without login you get an error::

    >>> resp = testapp.get(rest_url + '/manage', headers=xhr_headers, expect_errors=True)
    >>> resp.status_code
    403

If you login as god user with the frontend application::

    >>> data = {'name': 'god',
    ...         'password': 'password'}
    >>> resp = testapp.post_json('/login_username', data, headers=xhr_headers)

you are redirected to the sdi contents listing::

    >>> resp = testapp.get(rest_url + '/manage')
    >>> resp.status_code
    302
    >>> resp.location
    '.../manage/@@contents'

    >>> html = testapp.get(resp.location).text
    >>> '/adhocracy' in html
    True

All following post requests are guarded with csrf tokens::

    >>> 'csrfToken' in html
    True
