from pytest import fixture

from .shared import wait
from .shared import get_column_listing
from .shared import get_list_element
from .shared import get_listing_create_form
from .test_proposal import proposal
from .test_user_login import user


@fixture
def comment(browser, proposal):
    """Go to content2 column and create comment with content 'comment1'."""
    show_proposal_comments(proposal)
    listing = get_column_listing(browser, 'content2')
    return create_top_level_comment(listing, 'comment1')


def test_create(browser, proposal):
    show_proposal_comments(proposal)
    listing = get_column_listing(browser, 'content2')
    comment = create_top_level_comment(listing, 'somecomment')
    assert comment is not None


def test_reply(browser, comment):
    parent = get_column_listing(browser, 'content2').find_by_css('.comment')
    element = create_reply_comment(parent, 'somereply')
    assert element is not None


def test_edit(browser, comment):
    edit_comment(comment, 'edited')
    assert comment.find_by_css('.comment-content').text == 'edited'

    browser.reload()

    proposal = browser.find_by_css('.listing-element')
    show_proposal_comments(proposal)
    assert len(browser.find_by_css('.comment-content')) == 1
    assert browser.find_by_css('.comment-content').text == 'edited'


def _ignored_test_multi_edits(browser, comment):
    # FIXME Test needs to be updated since the backend now throws a
    # 'No fork allowed' error
    parent = get_column_listing(browser, 'content2').find_by_css('.comment')
    reply = create_reply_comment(parent, 'somereply')
    edit_comment(reply, 'somereply edited')
    edit_comment(parent, 'edited')
    assert parent.find_by_css('.comment-content').first.text == 'edited'


def test_author(browser, user, comment):
    actual = comment.find_by_css("adh-user-meta").first.text
    # the captialisation might be changed by CSS
    assert actual.lower() == user.lower()


def show_proposal_comments(proposal):
    proposal.find_by_css('a').first.click()
    proposal.find_by_css('button').last.click()


def create_top_level_comment(listing, content):
    """Create a new top level Comment."""
    form = get_listing_create_form(listing)
    form.find_by_css('textarea').first.fill(content)
    form.find_by_css('input[type="submit"]').first.click()
    return get_list_element(listing, content, descendant='.comment-content')


def create_reply_comment(parent, content):
    """Create a new reply to an existing comment."""
    form = get_comment_create_form(parent)
    form.find_by_css('textarea').first.fill(content)
    form.find_by_css('input[type="submit"]').first.click()
    return get_reply(parent, content)


def edit_comment(comment, content):
    comment.find_by_css('.comment-meta a')[0].click()
    comment.find_by_css('textarea').first.fill(content)
    comment.find_by_css('.comment-meta a')[0].click()
    wait(lambda: comment.find_by_css('.comment-content').first.text == content)


def get_comment_create_form(comment):
    button = comment.find_by_css('.comment-meta a')[-1]
    button.click()
    return comment.find_by_css('.comment-create-form').first


def get_reply(parent, content):
    """Return reply to comment `parent` with content == `content`."""
    for element in parent.find_by_css('.comment'):
        wait(lambda: element.text)
        if element.find_by_css('.comment-content').first.text == content:
            return element
