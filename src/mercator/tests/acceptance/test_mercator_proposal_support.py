from webtest import TestApp
from pytest import mark

from adhocracy_frontend.tests.acceptance.shared import login_god
from adhocracy_frontend.tests.acceptance.shared import logout
from adhocracy_frontend.tests.acceptance.shared import login
from adhocracy_frontend.tests.acceptance.shared import wait

supporters = 0

class TestMercatorSupport:

    def test_support_proposal(self, browser_with_proposal):
        browser = browser_with_proposal

        login_god(browser)
        select_proposal(browser)
        _support_proposal(browser)
        _validate_support(browser)

    def test_unsupport_proposal(self, browser_with_proposal):
        browser = browser_with_proposal

        select_proposal(browser)
        _unsupport_proposal(browser)
        _validate_unsupport(browser)

    def test_support_proposal_no_user(self, browser_with_proposal):
        browser = browser_with_proposal
        logout(browser)

        select_proposal(browser)
        _support_proposal(browser, expect_fail=True)
        assert browser.url.endswith('/login')

    @mark.xfail(reason="user creation fails")
    def test_support_other_user(self, browser_with_proposal, user):
        browser = browser_with_proposal
        login(browser, user[0], user[1])

        _support_proposal(browser)
        _validate_support(browser)

    @mark.xfail(reason="user creation fails")
    def test_unsupport_other_user(self, browser_with_proposal, user):
        browser = browser_with_proposal

        _unsupport_proposal(browser)
        _validate_unsupport(browser)


def _get_supporters(browser):
    amount_text = browser.find_by_css(
        '.mercator-propsal-list-item-meta-item-supporters').first.text
    return int(amount_text[:1])


def _support_proposal(browser, expect_fail=False):
    """Click on the support button and wait for the button to be triggerd
    'expect_fail' makes the test not to verify this triggering. """
    global supporters
    supporters = _get_supporters(browser)

    support = browser.find_by_css('.like-button').first
    assert not support.has_class('is-rate-button-active')

    support.click()
    browser.wait_for_condition(lambda browser:
        expect_fail or support.has_class('is-rate-button-active'), 30)


def _validate_support(browser):
    """Return to proposal list and check whether supporter is added to
    supporters count. """
    global supporters

    browser.visit(browser.app_url + 'r/mercator/')
    browser.wait_for_condition(lambda browser:
        browser.find_by_css('.mercator-proposal-list-item-body'), 30)
    browser.wait_for_condition(lambda browser:
        _get_supporters(browser) == supporters+1, 30)
    supporters += 1


def _unsupport_proposal(browser, expect_fail=False):
    """Click on the support button and wait for the button to be triggerd
    'expect_fail' makes the test not to verify this triggering. """
    global supporters
    supporters = _get_supporters(browser)

    support = browser.find_by_css('.like-button').first
    assert support.has_class('is-rate-button-active')

    support.click()
    browser.wait_for_condition(lambda browser:
        expect_fail or not support.has_class('is-rate-button-active'), 30)


def _validate_unsupport(browser):
    """Return to proposal list and check whether supporter is added to
    supporters count. """
    global supporters

    browser.visit(browser.app_url + 'r/mercator/')
    browser.wait_for_condition(lambda browser:
        browser.find_by_css('.mercator-proposal-list-item-body'), 30)
    browser.wait_for_condition(lambda browser:
        _get_supporters(browser) == supporters-1, 30)
    supporters -= 1


def select_proposal(browser):
    """First click on proposal title in proposal list column and wait until
    proposal is properly loaded in content column. In order to verify proper
    proposal loading, check for the detail's commentary link to contain the
    correct proposal title."""
    proposal_list = browser.find_by_css(".moving-column-body").\
        first.find_by_tag("ol").first
    proposal_title = proposal_list.find_by_css("h3 a").first
    assert wait(lambda: proposal_title.html)
    proposal_title.click()

    link = browser.find_by_css(".moving-column")[1].\
        find_by_css(".mercator-proposal-detail-cover h1 a")
    assert wait(lambda: proposal_title.html in link["href"])
