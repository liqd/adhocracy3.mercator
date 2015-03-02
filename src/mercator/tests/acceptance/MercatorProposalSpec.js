"use strict";

var shared = require("./core/shared.js");
var MercatorProposalFormPage = require("./MercatorProposalFormPage.js");
var MercatorProposalListing = require("./MercatorProposalListing.js");
var MercatorProposalDetailPage = require("./MercatorProposalDetailPage.js");

describe("mercator proposal form", function() {
    afterEach(function() {
        shared.logout();
    });

    it("is validated correctly", function() {
        shared.loginAnnotator();

        var page = new MercatorProposalFormPage().create();
        expect(page.isValid()).toBe(false);

        // make all good
        page.fillValid();
        expect(page.isValid()).toBe(true);

        // experience is optional
        page.experience.clear();
        expect(page.isValid()).toBe(true);

        // location is required
        page.locationLocationIsSpecific.click();
        page.locationLocationIsLinkedToRuhr.click();
        expect(page.isValid()).toBe(false);
        page.locationLocationIsLinkedToRuhr.click();
        expect(page.isValid()).toBe(true);

        // name is required
        page.userInfoFirstName.clear();
        expect(page.isValid()).toBe(false);
        page.userInfoFirstName.sendKeys("pizza");
        expect(page.isValid()).toBe(true);

        // heard_from is required
        page.heardFromColleague.click();
        expect(page.isValid()).toBe(false);
        page.heardFromColleague.click();
        expect(page.isValid()).toBe(true);

        // image has min width
        page.setImage("./proposalImageTooSmall.png");
        expect(shared.hasClass(page.form, "ng-invalid-too-narrow"));
        expect(page.isValid()).toBe(false);
        page.setImage("./proposalImageValid.png");
        expect(page.isValid()).toBe(true);
    });

    it("is submitted properly", function() {
        shared.loginAnnotator();

        var page = new MercatorProposalFormPage().create();
        page.fillValid();
        page.submitButton.click();
        expect(browser.getCurrentUrl()).not.toContain("@create");

        var detailPage = new MercatorProposalDetailPage();

        // proposal pitch
        expect(detailPage.title.getText()).toContain("protitle");
        expect(detailPage.teaser.getText()).toBe("proteaser");
        expect(detailPage.requestedFunding.getText()).toContain("1,000");
        expect(detailPage.budget.getText()).toContain("1,200");
        expect(detailPage.locationSpecific1.getText()).toContain("Bonn");
        expect(detailPage.locationSpecific2.getText()).toContain("Ruhr Gebiet, Germany");

        // proposal whos
        expect(detailPage.userInfo.getText()).toContain("pita pasta");
        expect(detailPage.organizationName.getText()).toContain("organization name");
        expect(detailPage.organizationCountry.getText()).toContain("France");
        expect(detailPage.organizationNonProfit.getText()).toContain("Non Profit");

        // proposal details
        expect(detailPage.description.getText()).toBe("prodescription");
        expect(detailPage.story.getText()).toBe("story");

        // proposal goals and vision
        expect(detailPage.outcome.getText()).toBe("success");
        expect(detailPage.steps.getText()).toContain("plan");
        expect(detailPage.addedValue.getText()).toContain("relevance");
        expect(detailPage.partners.getText()).toContain("partners");

        // proposal additional information
        expect(detailPage.experience.getText()).toContain("experience");
    });

    it("can be commented by the contributor", function() {
        shared.loginContributor();

        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);
        var commentContent = "some comment on the proposal";
        var introCommentPage = page.getCommentPage("introduction");
        var comment = introCommentPage.createComment(commentContent);

        expect(introCommentPage.getCommentText(comment)).toBe(commentContent);
    });

    it("can be upvoted by the annotator", function() {
        shared.loginAnnotator();

        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);

        expect(page.rateDifference.getText()).toEqual("0");
        page.rateWidget.click();
        expect(page.rateDifference.getText()).toEqual("+1");
    });

    it("can be downvoted by the annotator", function() {
        shared.loginAnnotator();

        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);

        // annotator has upvoted once in the previous test
        expect(page.rateDifference.getText()).toEqual("+1");
        page.rateWidget.click();
        expect(page.rateDifference.getText()).toEqual("0");
    });

    it("can be upvoted and then downvoted by the annotator", function() {
        shared.loginAnnotator();

        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);

        expect(page.rateDifference.getText()).toEqual("0");
        page.rateWidget.click();
        expect(page.rateDifference.getText()).toEqual("+1");
        page.rateWidget.click();
    });

    it("can be upvoted by the contributor", function() {
        shared.loginContributor();

        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);

        expect(page.rateDifference.getText()).toEqual("0");
        page.rateWidget.click();
        expect(page.rateDifference.getText()).toEqual("+1");
    });

    it("can be downvoted by the contributor", function() {
        shared.loginContributor();

        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);

        // contributor has upvoted once in the previous test
        expect(page.rateDifference.getText()).toEqual("+1");
        page.rateWidget.click();
        expect(page.rateDifference.getText()).toEqual("0");
    });

    it("can be upvoted and then downvoted by the contributor", function() {
        shared.loginContributor();

        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);

        expect(page.rateDifference.getText()).toEqual("0");
        page.rateWidget.click();
        expect(page.rateDifference.getText()).toEqual("+1");
        page.rateWidget.click();
    });

    it("can not be rated by anonymous", function() {
        var list = new MercatorProposalListing().get();
        var page = list.getDetailPage(0);

        page.rateWidget.click();
        expect(browser.getCurrentUrl()).toContain("login");
    });

    it("allows creator to edit existing proposals (depends on submit)", function() {
        shared.loginAnnotator();

        var list = new MercatorProposalListing().get();
        browser.waitForAngular();
        var form = list.getDetailPage(0).getEditPage();
        form.userInfoLastName.clear();
        expect(form.isValid()).toBe(false);
        form.userInfoLastName.sendKeys("rasta");

        form.acceptDisclaimer.click();
        form.submitButton.click();
        expect(browser.getCurrentUrl()).not.toContain("@edit");
        browser.waitForAngular();
        expect(element(by.tagName("adh-mercator-proposal-detail-view")).element(by.tagName("adh-user-meta")).getText()).toContain("pita rasta");
    });

    it("disallows anonymous to edit existing proposals (depends on submit)", function() {
        var list = new MercatorProposalListing().get();
        var editButton = list.getDetailPage(0).editButton;
        expect(editButton.isPresent()).toBe(false);
    });

    it("disallows other users to edit existing proposals (depends on submit)", function() {
        shared.loginContributor();
        var list = new MercatorProposalListing().get();
        var editButton = list.getDetailPage(0).editButton;
        expect(editButton.isPresent()).toBe(false);
    });
});

describe("column navigation (depends on created proposal)", function() {
    it("allows to navigate around", function() {
        var list = new MercatorProposalListing().get();

        var column1 = list.columns.get(0).element(by.css(".moving-column"));
        var column2 = list.columns.get(1).element(by.css(".moving-column"));
        var column3 = list.columns.get(2).element(by.css(".moving-column"));

        expect(shared.hasClass(column1, "is-show"));
        expect(shared.hasClass(column2, "is-hide"));
        expect(shared.hasClass(column3, "is-hide"));

        var proposal = list.getDetailPage(0);

        expect(shared.hasClass(column1, "is-show"));
        expect(shared.hasClass(column2, "is-show"));
        expect(shared.hasClass(column3, "is-hide"));

        expect(proposal.coverCommentsButton.isPresent()).toBe(true);
        proposal.coverCommentsButton.click();

        expect(shared.hasClass(column1, "is-collapse"));
        expect(shared.hasClass(column2, "is-show"));
        expect(shared.hasClass(column3, "is-show"));

        column3.all(by.css(".moving-column-menu-nav a")).last().click();

        expect(shared.hasClass(column1, "is-show"));
        expect(shared.hasClass(column2, "is-show"));
        expect(shared.hasClass(column3, "is-hide"));

        column2.all(by.css(".moving-column-menu-nav a")).last().click();

        expect(shared.hasClass(column1, "is-show"));
        expect(shared.hasClass(column2, "is-hide"));
        expect(shared.hasClass(column3, "is-hide"));
    });

    it("allows a single column design when the screen size is small", function() {
        var list = new MercatorProposalListing().get();
        var proposal = list.getDetailPage(0);

        var leftColumn = element.all(by.css("adh-moving-column div.moving-column"))
                         .first();

        expect(shared.hasClass(leftColumn, "is-show"));

        // if using a tiling window manager, be sure your browser
        // window is floating otherwise the following call won't work
        browser.driver.manage().window().setSize(640, 480);
        expect(shared.hasClass(leftColumn, "is-collapse"));

        browser.driver.manage().window().setSize(1024, 1280);
        expect(shared.hasClass(leftColumn, "is-show"));
    });
});

describe("space navigation", function() {
    it("content of comment being written is kept when switching", function() {
        shared.loginAnnotator();

        var list = new MercatorProposalListing().get();
        var proposal = list.getDetailPage(0);
        var introComment = proposal.getCommentPage("introduction");
        var commentMsg = "a comment about the intro";

        introComment.fillComment(commentMsg);

        var userSpaceButton = element(by.css(".space-switch-user"));
        userSpaceButton.click();

        var contentSpaceButton = element(by.css(".space-switch-content"));

        contentSpaceButton.click();

        expect(element(by.css("adh-comment-create form textarea"))
               .getAttribute("value")).toBe(commentMsg);
    });
});
