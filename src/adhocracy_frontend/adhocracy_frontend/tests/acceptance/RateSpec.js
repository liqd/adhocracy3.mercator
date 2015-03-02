"use strict";

var shared = require("./shared.js");
var EmbeddedCommentsPage = require("./EmbeddedCommentsPage.js");


describe("ratings", function() {
    var page;

    beforeEach(function() {
        shared.loginAnnotator();
        page = new EmbeddedCommentsPage("c1").get();
    });

    it("can upvote", function() {
        var comment = page.createComment("c1");
        var rate = page.getRateWidget(comment);
        rate.element(by.css(".rate-pro")).click();
        expect(rate.element(by.css(".rate-difference")).getText()).toEqual("+1");
    });

    it("can downvote", function() {
        var comment = page.createComment("c2");
        var rate = page.getRateWidget(comment);
        rate.element(by.css(".rate-contra")).click();
        expect(rate.element(by.css(".rate-difference")).getText()).toEqual("-1");
    });

    it("can vote neutrally", function() {
        var comment = page.createComment("c3");
        var rate = page.getRateWidget(comment);
        rate.element(by.css(".rate-pro")).click();
        expect(rate.element(by.css(".rate-difference")).getText()).toEqual("+1");
        rate.element(by.css(".is-rate-button-active")).click();
        expect(rate.element(by.css(".rate-difference")).getText()).toEqual("0");
    });

    // fails when executed manually on the dev version
    // but not when executed manually or automatically on the test version
    xit("is not affected by the edition of the comment - issue #804", function() {
        var page = new EmbeddedCommentsPage("c2").get();
        var comment = page.createComment("c4");
        var rate = page.getRateWidget(comment);

        rate.element(by.css(".rate-pro")).click();

        var changedComment = page.editComment(comment, ["c4 - edited"]);
        var rate2 = page.getRateWidget(changedComment);
        expect(rate2.element(by.css(".rate-difference")).getText()).toEqual("+1");
    });
});
