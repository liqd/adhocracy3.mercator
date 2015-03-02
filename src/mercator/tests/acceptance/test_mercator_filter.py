from webtest import TestApp
from pytest import fixture

from mercator.tests.fixtures.fixturesMercatorProposals1 import create_proposals
from adhocracy_frontend.tests.acceptance.shared import api_login_god
from adhocracy_frontend.tests.acceptance.shared import wait

class TestMercatorFilter(object):

    @fixture(scope='class')
    def sidebar(self, browser):
        return browser.find_by_css('.moving-column-sidebar').first.find_by_tag('ul')

    @fixture(scope='class')
    def locations(self, browser, sidebar):
        return sidebar[1].find_by_tag('li')

    @fixture(scope='class')
    def requested_fundings(self, browser, sidebar):
        return sidebar[2].find_by_tag('li')

    @fixture(scope='class')
    def browser(self, browser, app):
        TestApp(app)
        browser.visit(browser.app_url + 'r/mercator/')
        assert wait(lambda: browser.find_link_by_text('filters'))

        browser.find_link_by_text('filters').first.click()
        assert wait(lambda: browser.find_by_css('.moving-column-sidebar').visible)

        return browser

    def test_filter_location(self, browser, locations, proposals):
        for location in locations:
            location.find_by_css('a').first.click()
            assert wait(lambda:
                is_filtered(browser, proposals, location=location))

    def test_unfilter_location(self, browser, locations, proposals):
        locations[-1].find_by_css('a').first.click()
        assert wait(lambda: is_filtered(browser, proposals))

    def test_filter_requested_funding(self, browser, requested_fundings, proposals):
        for requested_funding in requested_fundings:
            requested_funding.find_by_css('a').first.click()
            assert wait(lambda:
                is_filtered(browser, proposals, requested_funding=requested_funding))

    def test_unfilter_requested_funding(self, browser, requested_fundings, proposals):
        requested_fundings[-1].find_by_css('a').first.click()
        assert wait(lambda: is_filtered(browser, proposals))

    def test_filter_combinations(self, browser, locations, requested_fundings, proposals):
        for location in locations:
            location.find_by_css('a').first.click()
            for requested_funding in requested_fundings:
                requested_funding.find_by_css('a').first.click()
                assert wait(lambda:
                    is_filtered(browser, proposals, location=location,
                                requested_funding=requested_funding))



def is_filtered(browser, proposals, location=None, requested_funding=None):
    try:
        title_sheet = 'adhocracy_mercator.sheets.mercator.ITitle'
        title = lambda p: p[23]['body']['data'][title_sheet]['title']
        expected_titles = [title(p) for p in proposals
            if _verify_location(location, p) and
            _verify_requested_funding(requested_funding, p)]

        proposal_list = browser.find_by_css('.moving-column-body').first.\
                                find_by_tag('ol').first
        actual_titles = [a.text for a in
                proposal_list.find_by_css('.mercator-proposal-list-item-title')]

        return set(expected_titles) == set(actual_titles)
    except:
        # If the DOM still changes there may be StaleElementReferenceExceptions.
        # In that case, we should return False rather than crashing.
        return False


def _verify_location(location, proposal):
    '''Return whether the passed proposal is of given location.'''
    data = proposal[18]['body']['data']
    data_location = data['adhocracy_mercator.sheets.mercator.ILocation']

    if location is None:
        return True

    elif location.has_class('facet-item-specific'):
        return data_location['location_is_specific']

    elif location.has_class('facet-item-online'):
        return data_location['location_is_online']

    elif location.has_class('facet-item-linked_to_ruhr'):
        return data_location['location_is_linked_to_ruhr']

    return False


def _verify_requested_funding(requested_funding, proposal):
    '''Return whether the passed proposal is of given requested_funding.'''
    data = proposal[4]['body']['data']
    finance = data['adhocracy_mercator.sheets.mercator.IFinance']

    if requested_funding is None:
        return True

    elif requested_funding.has_class('facet-item-5000'):
        return 0 <= finance['requested_funding'] <= 5000

    elif requested_funding.has_class('facet-item-10000'):
        return 5000 <= finance['requested_funding'] <= 10000

    elif requested_funding.has_class('facet-item-20000'):
        return 10000 <= finance['requested_funding'] <= 20000

    elif requested_funding.has_class('facet-item-50000'):
        return 20000 <= finance['requested_funding'] <= 50000

    return False
