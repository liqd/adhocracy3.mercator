"""Public fixtures to work with the test browser and the adhocracy frontend."""
import subprocess
import time
import types
import json

from pytest import fixture
from splinter import Browser

from adhocracy_core.testing import _get_settings
from adhocracy_core.testing import _kill_pid_in_file
from adhocracy_core.testing import _is_running


def pytest_addoption(parser):
    """Add pytest option `frontend_pc`."""
    parser.addoption(
        '--frontend_pc',
        action='store',
        default='etc/frontend_test.ini',
        metavar='path',
        dest='frontend_pyramid_config',
    )


@fixture(scope='session')
def frontend_url(request) -> dict:
    """Return the frontend url."""
    settings = _get_settings(request, 'server:main', 'frontend_pyramid_config')
    host = settings['host']
    port = settings['port']
    url = 'http://{}:{}/'.format(host, port)
    return url


@fixture(scope='class')
def frontend(request) -> bool:
    """Return a http server that only serves the static frontend files."""
    pid_file = 'var/frontend_pyramid.pid'
    if _is_running(pid_file):
        return True

    def fin():
        print('teardown zeo server')
        process.kill()
        _kill_pid_in_file(pid_file)

    config_file = request.config.getvalue('frontend_pyramid_config')
    process = subprocess.Popen('bin/pserve ' + config_file
                               + ' --daemon --pid-file=' + pid_file,
                               shell=True,
                               stderr=subprocess.STDOUT)
    time.sleep(1)
    request.addfinalizer(fin)
    return True


def evaluate_script_with_kwargs(self, code: str, **kwargs) -> object:
    """Replace kwargs in javascript code and evaluate."""
    code_with_kwargs = self.compile_js_code(code, **kwargs)
    return self.evaluate_script(code_with_kwargs)


def compile_js_code(self, code: str, **kwargs) -> str:
    """Generate a single JavaScript expression from complex code.

    This is accomplished by wrapping the code in a JavaScript function
    and passing any key word arguments to that function.  All arguments
    will be JSON encoded.

    :param code: any JavaScript code
    :param kwargs: arguments that will be passed to the wrapper function

    :returns: a string containing a single JavaScript expression suitable
        for consumption by splinter's ``evaluate_script``

    >>> code = "var a = 1; test.y = a; return test;"
    >>> compile_js_code(code, test={"x": 2})
    '(function(test) {var a = 1; test.y = a; return test;})({"x": 2})'

    """
    # make sure keys and values are in the same order
    keys = []
    values = []
    for key in kwargs:
        keys.append(key)
        values.append(kwargs[key])

    keys = ', '.join(keys)
    values = ', '.join((json.dumps(v) for v in values))

    return '(function({}) {{{}}})({})'.format(keys, code, values)


def add_helper_methods_to_splinter_browser_wrapper(inst: Browser) -> Browser:
    """Add additional helper functions to the splinter browser wrapper."""
    inst.compile_js_code = types.MethodType(compile_js_code, inst)
    inst.evaluate_script_with_kwargs = types.MethodType(
        evaluate_script_with_kwargs, inst)
    return inst


def angular_app_loaded(browser: Browser) -> bool:
    """Check that the angular app is loaded."""
    code = 'window.hasOwnProperty("adhocracy") '\
           '&& window.adhocracy.hasOwnProperty("loadState") '\
           '&& window.adhocracy.loadState === "complete";'
    return browser.evaluate_script(code)


@fixture
def browser_root(browser, frontend, backend, frontend_url):
    """Return test browser, start application and go to `root.html`."""
    add_helper_methods_to_splinter_browser_wrapper(browser)
    browser.visit(frontend_url)
    browser.wait_for_condition(angular_app_loaded, 5)
    return browser


def browser_test_helper(browser, url) -> Browser:
    """Return test browser and go to url."""
    add_helper_methods_to_splinter_browser_wrapper(browser)

    browser.visit(url)

    def jasmine_finished(browser):
        code = 'jsApiReporter.finished'
        return browser.browser.evaluate_script(code)

    browser.wait_for_condition(jasmine_finished, 5)

    return browser


@fixture
def browser_test(browser, frontend, frontend_url) -> Browser:
    """Return test browser instance with url=test.html."""
    url = frontend_url + 'static/test.html'
    return browser_test_helper(browser, url)
