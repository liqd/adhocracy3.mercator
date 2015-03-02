from pytest import fixture
from pytest import raises
from pytest import mark
import os

from adhocracy_frontend.tests.acceptance.shared import login_god
from mercator.tests.fixtures.fixturesMercatorProposals1 import create_proposals
from adhocracy_frontend.tests.acceptance.shared import wait

TITLE = 'title'
IMAGE = '%s/docs/source/_static/python.jpg' % os.environ.get('A3_ROOT', '.')

@fixture(scope='class')
def browser(browser):
    login_god(browser, visit_root=False)
    browser.visit(browser.app_url + 'r/mercator/@create_proposal')
    browser.is_element_present_by_name('user-info-first-name', wait_time=10)
    return browser


class TestMercatorForm:

    def test_fill_all_fields(self, browser):
        fill_all(browser)
        assert is_valid(browser)

    def test_field_extra_exprerience_is_optional(self, browser):
        browser.find_by_name('experience').first.fill('')
        assert is_valid(browser)

    def test_field_status_text_is_not_shown_if_non_custom_status(self, browser):
        browser.find_by_name('organization-info-status-enum').first.check()
        status_text = 'organization-info-status-other'
        assert browser.is_element_not_present_by_name(status_text)
        assert is_valid(browser)

    def test_field_status_text_is_required_if_custom_status(self, browser):
        browser.find_by_name('organization-info-status-enum').last.check()
        status_text = 'organization-info-status-other'
        assert browser.is_element_present_by_name(status_text)
        assert not is_valid(browser)
        browser.find_by_name(status_text).first.fill('statustext')
        assert is_valid(browser)

    def test_location_is_required(self, browser):
        browser.uncheck('location-location-is-specific')
        browser.uncheck('location-location-is-online')
        browser.uncheck('location-location-is-linked-to-ruhr')
        assert not is_valid(browser)
        browser.check('location-location-is-online')
        assert is_valid(browser)

    def test_field_name_is_required(self, browser):
        browser.find_by_name('user-info-first-name').first.fill('')
        assert not is_valid(browser)

        browser.find_by_name('user-info-first-name').first.fill('user name')
        assert is_valid(browser)

    def test_heard_of_is_required(self, browser):
        browser.find_by_name('heard-from-colleague').first.uncheck()
        assert not is_valid(browser)

        browser.find_by_name('heard-from-colleague').first.check()
        assert is_valid(browser)

    @mark.xfail # fails in phantomJs & firefox, succeeds in chrome
    def test_image_is_required(self, browser):
        browser.find_by_css('input[type="submit"]').first.click()
        assert not is_valid(browser)

        browser.find_by_css('input[type=file]').first.fill(IMAGE)
        assert is_valid(browser)

    @mark.xfail  # 500 Internal Server Error: Unsupported: Storing Blobs in <ZODB.Map
    def test_submitting_creates_a_new_proposal(self, browser, app):
        browser.find_by_css('input[type="submit"]').first.click()
        assert wait(lambda: browser.url.endswith("/r/mercator/"), max_steps=20)

        browser.find_link_by_text(TITLE).first.click()
        assert wait(lambda: not browser.url.endswith("/r/mercator/"))

    @mark.xfail
    def test_heard_of_is_not_changed_after_submission(self, browser):
        heard_of = browser.find_by_xpath('//*[@id="mercator-detail-view-additional"]/section/div/p').first
        assert not heard_of.text == ""

    def test_login_is_required(self):
        with raises(AssertionError):
            create_proposals(n=1)


def is_valid(browser):
    form = browser.find_by_css('.mercator-proposal-form').first
    return not form.has_class('ng-invalid')


def fill_all(browser):
    browser.find_by_name('user-info-first-name').first.fill('name')
    browser.find_by_name('user-info-last-name').first.fill('lastname')

    # NOTE: Due to angular magic used in ng-options, the value which is
    # stored in the respective ng-model (e.g. 'DE') isn't reflected in the
    # DOM, and an index is used instead.
    browser.select('user-info-country', '1')

    browser.find_by_name('organization-info-status-enum').first.check()
    browser.find_by_name('organization-info-name').first.fill(
        'organisation name')
    browser.find_by_name('organization-info-country').first.select('2')
    browser.find_by_name('organization-info-website').first.fill(
        'http://example.com')

    browser.find_by_name('introduction-title').first.fill(TITLE)
    browser.find_by_name('introduction-teaser').first.fill('teaser')

    browser.find_by_name('description-description').first.fill('description')
    browser.find_by_name('location-location-is-specific').first.check()
    browser.find_by_name('location-location-specific-1').first.fill('Bonn')
    browser.find_by_name('location-location-is-linked-to-ruhr').first.check()
    browser.find_by_name('story').first.fill('story')

    browser.find_by_name('outcome').first.fill('success')
    browser.find_by_name('steps').first.fill('plan')
    browser.find_by_name('value').first.fill('relevance')
    browser.find_by_name('partners').first.fill('partners')

    browser.find_by_name('finance-budget').first.fill(1000)
    browser.find_by_name('finance-requested-funding').first.fill(1000)

    browser.find_by_name('experience').first.fill('experience')
    browser.find_by_name('heard-from-colleague').first.check()

    browser.find_by_name('accept-disclaimer').first.check()
