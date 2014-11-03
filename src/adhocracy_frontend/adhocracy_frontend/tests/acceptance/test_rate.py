from pytest import mark

from .shared import wait
from .shared import get_column_listing
from .shared import get_list_element
from .shared import login_god
from adhocracy_frontend.tests.acceptance.test_comment import create_comment
from adhocracy_frontend.tests.acceptance.test_comment import create_top_level_comment


@mark.skipif(True, reason='see src/mercator/static/js/Adhocracy.ts near "import AdhDocumentWorkbench"')
class TestRate:

    def test_create(self, browser):
        login_god(browser)
        comment = create_comment(browser, 'comment1')
        assert comment is not None

    @mark.skipif(True, reason='pending weil schlechtes wetter')
    def test_upvote(self, browser):
        rateable = get_column_listing(browser, 'content2').find_by_css('.comment').first
        button = rateable.find_by_css('.rate-pro').first
        button.click()
        def check_result():
            total = rateable.find_by_css('.rate-difference').first
            return total.text == '+1'
        assert wait(check_result)

    def test_downvote(self, browser):
        rateable = get_column_listing(browser, 'content2').find_by_css('.comment').first
        button = rateable.find_by_css('.rate-contra').first
        button.click()
        def check_result():
            total = rateable.find_by_css('.rate-difference').first
            return total.text == '-1'
        assert wait(check_result)

    def test_neutralvote(self, browser):
        rateable = get_column_listing(browser, 'content2').find_by_css('.comment').first
        button = rateable.find_by_css('.rate-neutral').first
        button.click()
        def check_result():
            total = rateable.find_by_css('.rate-difference').first
            return total.text == '0'
        assert wait(check_result)

    @mark.skipif(True, reason='pending weil schlechtes wetter')
    def test_detaillist(self, browser):

        # FIXME: the button appears to be surprisingly click
        # resistant.  since we don't have any clues as to why, we
        # postponed the investigations.

        rateable = get_column_listing(browser, 'content2').find_by_css('.comment').first
        button = rateable.find_by_css('.rate-difference').first
        button.click()

        def check_result():
            try:
                audit_trail = rateable.find_by_css('.rate-details').first
                print(audit_trail)
                return 'god' in audit_trail.text and '0' in audit_trail.text
            except Exception as e:
                print(e)
                return False
        assert wait(check_result)

    def test_multi_rateable(self, browser):
        content2 = get_column_listing(browser, 'content2')

        rateable1 = get_list_element(content2, 'comment1', descendant='.comment-content')
        button1 = rateable1.find_by_css('.rate-pro').first

        rateable2 = create_top_level_comment(content2,  'comment2')
        button2 = rateable2.find_by_css('.rate-contra').first

        button2.click()
        wait(lambda: button2.has_class('is-rate-button-active'))
        button1.click()

        def check_result():
            return (rateable1.find_by_css('.rate-difference').first.text == '+1'
                    and rateable2.find_by_css('.rate-difference').first.text == '-1')

        assert wait(check_result)

    @mark.skipif(True, reason='pending weil schlechtes wetter')
    def test_multi_user(self, browser):

        # FIXME: test many users and more interesting totals and audit
        # trails.

        pass

    @mark.skipif(True, reason='pending weil schlechtes wetter')
    def test_authorisations(self, browser):

        # FIXME: test replacing god user with one that is allowed to
        # rate, but not much more.

        pass
