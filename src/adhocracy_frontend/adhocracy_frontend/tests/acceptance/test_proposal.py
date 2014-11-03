"""User wants to create, edit and view proposal."""
from pytest import mark
from splinter.driver.webdriver import WebDriverElement

from adhocracy_frontend.tests.acceptance.shared import wait
from adhocracy_frontend.tests.acceptance.shared import get_listing_create_form
from adhocracy_frontend.tests.acceptance.shared import get_column_listing
from adhocracy_frontend.tests.acceptance.shared import get_list_element
from adhocracy_frontend.tests.acceptance.shared import login_god


@mark.skipif(True, reason='see src/mercator/static/js/Adhocracy.ts near "import AdhDocumentWorkbench"')
class TestProposal:


    def test_create(self, browser):
        login_god(browser)
        content = get_column_listing(browser, 'content')
        proposal = create_proposal(content, 'test proposal')
        assert proposal is not None


    def test_view(self, browser):
        content_listing = get_column_listing(browser, 'content')
        browser.click_link_by_partial_text('test proposal')
        assert proposal_details_are_in_listing(content_listing, 'test proposal')


def add_proposal_to_content_listing(browser, name) -> WebDriverElement:
    """Go to content listing and create proposal with title `test proposal`."""
    proposal = create_proposal(listing, name)
    return proposal


def create_proposal(listing: WebDriverElement, title: str, description='',
                    paragraphs=[]):
    """Create a new Proposal."""
    # FIXME Proposal creation is too slow!! (often takes more than 1sec)
    # This will hopefully be fixed by the batch+high-level API.
    # After fixing, the higher wait_time attribute should be removed.
    form = get_listing_create_form(listing)

    form.find_by_css('[name="title"]').first.fill(title)
    form.find_by_css('[name="description"]').first.fill(description)
    for paragraph in paragraphs:
        form.find_by_css('[name="add-paragraph"]').first.click()
        form.find_by_css('textarea')[-1].fill(paragraph)

    form.find_by_css('.save_button').first.click()

    # FIXME Remove max_steps param once proposal creation is faster, see above!
    wait(lambda: get_list_element(listing, title), max_steps=40)
    return get_list_element(listing, title, max_steps=40)


def proposal_details_are_in_listing(listing: WebDriverElement, title: str) -> bool:
    return listing.find_by_css('h1').first.text == title
