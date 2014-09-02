"""User wants to register and login"""
from pytest import fixture
from .shared import fill_input
from .shared import click_button


@fixture
def user(browser):
    """Register a user and log them in."""
    register(browser, 'user1', 'email1@example.com', 'password1')
    return 'user1'


class TestUserLogin:

    def test_login_username(self, browser):
        register(browser, 'user1', 'email1@example.com', 'password1')
        logout(browser)
        # FIXME: Test that no error messages are shown
        login(browser, 'user1', 'password1')
        assert is_logged_in(browser)

    def test_login_email(self, browser):
        register(browser, 'user2', 'email2@example.com', 'password2')
        logout(browser)
        login(browser, 'email2@example.com', 'password2')
        assert is_logged_in(browser)

    def test_login_error(self, browser):
        register(browser, 'user3', 'email3@example.com', 'password3')
        logout(browser)
        login(browser, 'user3', 'other', expect_success=False)
        assert browser.is_element_present_by_css(
            '.login .form-error:not(.ng-hide)')
        assert not is_logged_in(browser)

    def test_register_error_wrong_password_repeat(self, browser):
        register(browser, 'user4', 'email4@example.com', 'password4',
                 'wrong_repeated_password')
        assert browser.browser.is_element_present_by_css(
            '.register [type="submit"]:disabled')

    def test_login_persistence(self, browser):
        register(browser, 'user5', 'email5@example.com', 'password5')
        logout(browser)
        login(browser, 'user5', 'password5')
        browser.reload()
        assert is_logged_in(browser)


def register(browser, name, email, password, repeated_password=None):
    register_url = browser.app_url + 'register'
    browser.visit(register_url)
    fill_input(browser, '.register [name="username"]', name)
    fill_input(browser, '.register [name="email"]', email)
    fill_input(browser, '.register [name="password"]', password)
    fill_input(browser, '.register [name="password_repeat"]',
               repeated_password or password)
    click_button(browser, '.register [type="submit"]')


def login(browser, name_or_email, password, expect_success=True):
    browser.visit(browser.root_url)
    fill_input(browser, '.login [name="nameOrEmail"]', name_or_email)
    fill_input(browser, '.login [name="password"]', password)
    click_button(browser, '.login [type="submit"]')
    if expect_success:
        browser.wait_for_condition(is_logged_in, 2)


def logout(browser):
    click_button(browser, '.user-indicator-logout')


def is_logged_in(browser):
    return browser.browser.is_element_present_by_css('.user-indicator-logout')
