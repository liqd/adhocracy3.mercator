from pytest import mark

from adhocracy_frontend.tests.acceptance.shared import login_god
from adhocracy_frontend.tests.acceptance.shared import login
from adhocracy_frontend.tests.acceptance.shared import wait


class TestMercatorForm:

    def test_edit_proposal_no_user(self, browser_with_proposal):
        browser = browser_with_proposal

        select_proposal(browser)
        assert not browser.is_text_present("edit")

    @mark.xfail
    def test_edit_proposal_other_user(self, browser_with_proposal, user):
        browser = browser_with_proposal

        login(browser, user[0], user[1])
        select_proposal(browser)

        assert not browser.is_text_present("edit")

    @mark.xfail(reason="Image is missing")
    def test_resubmitting_proposal(self, browser_with_proposal):
        browser = browser_with_proposal

        login_god(browser)
        select_proposal(browser)

        assert wait(lambda: browser.find_link_by_text("edit"))

        browser.find_link_by_text("edit").first.click()
        assert wait(lambda: browser.find_by_name('accept-disclaimer'))

        browser.find_by_name('accept-disclaimer').first.check()
        browser.find_by_css('input[type="submit"]').first.click()
        assert success(browser)


def success(browser):
    return wait(lambda: browser.url.endswith("/r/mercator/"))


def select_proposal(browser):
    """First click on proposal title in proposal list column and wait until
    proposal is properly loaded in content column. In order to verify proper
    proposal loading, check for the detail's commentary link to contain the
    correct proposal title."""
    proposal_list = browser.find_by_css(".moving-column-body").\
        first.find_by_tag("ol").first
    proposal_title = proposal_list.find_by_css(
        '.mercator-proposal-list-item-title').first

    assert wait(lambda: proposal_title.html)
    proposal_title.click()

    link = browser.find_by_css(".moving-column")[1].\
        find_by_css(".mercator-proposal-detail-cover h1 a")
    assert wait(lambda: proposal_title.html in link["href"])
