"""Shared acceptance test functions."""
from time import sleep

from splinter.driver.webdriver import WebDriverElement

from adhocracy_core.testing import god_login
from adhocracy_core.testing import god_password
from adhocracy_core.testing import annotator_password
from adhocracy_core.testing import annotator_login


def wait(condition, step=0.1, max_steps=10) -> bool:
    """Wait for a condition to become true."""
    for i in range(max_steps - 1):
        if condition():
            return True
        else:
            sleep(step)
    return condition()


def login(browser, name_or_email, password,
          expect_success=True,
          visit_root=True):
    """Login user with name and password."""
    if is_logged_in(browser):
        return
    login_url = browser.app_url + 'login'
    browser.visit(login_url)
    fill_input(browser, '.login [name="nameOrEmail"]', name_or_email)
    fill_input(browser, '.login [name="password"]', password)
    click_button(browser, '.login [type="submit"]')
    if expect_success and not browser.wait_for_condition(is_logged_in, 20):
        raise Exception('login failed.')
    if visit_root:
        browser.visit(browser.root_url)


def login_god(browser):
    """Login god user."""
    login(browser, god_login, god_password)


def login_annotator(browser):
    """Login god user."""
    login(browser, annotator_login, annotator_password)


def logout(browser):
    """Logout user."""
    if is_logged_in(browser):
        click_button(browser, '.user-indicator-logout')
        browser.wait_for_condition(is_logged_out, 30)


def is_logged_in(browser):
    """Check if user is logged in."""
    return browser.browser.is_element_present_by_css('.user-indicator-logout')


def is_logged_out(browser):
    """Check if user is logged out."""
    return browser.browser.is_element_not_present_by_css(
        '.user-indicator-logout')


def fill_input(browser, css_selector, value):
    """Find `css_selector` and fill value."""
    element = browser.browser.find_by_css(css_selector).first
    element.fill(value)


def click_button(browser, css_selector):
    """Find `css_selector` and click."""
    element = browser.browser.find_by_css(css_selector).first
    element.click()


def title_is_in_listing(listing, title: str) -> bool:
    """Check that a listing element with text == `title` exists."""
    for element in listing.find_by_css('.listing-element'):
        wait(lambda: element.text, max_steps=5)
        if element.text == title:
            return True


def get_listing_create_form(listing) -> WebDriverElement:
    """Open and return the create form of a listing."""
    return listing.find_by_css('.listing-create-form').first


def get_column_listing(browser, column_name: str) -> WebDriverElement:
    """Return the listing in the content column ."""
    column = browser.browser.find_by_css('.moving-column-' + column_name)
    listing = column.first.find_by_css('.listing')
    return listing


def get_list_element(listing, text, descendant=None, max_steps=20):
    """Return list element with text == `text`."""
    for element in listing.find_by_css('.listing-element'):
        wait(lambda: element.text, max_steps=max_steps)
        if descendant is None:
            element_text = element.text
        else:
            element_text = element.find_by_css(descendant).first.text
        if element_text == text:
            return element
