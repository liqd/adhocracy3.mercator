"use strict";

var shared = require("./shared.js");
var EmbeddedSharePage = require("./EmbeddedSharePage.js");


describe("sharing", function() {

    it("can be shared on Twitter", function() {
        var page = new EmbeddedSharePage().get();

        page.clickDummyTweetButton();

        var tweeterIframe = page.getTwitterIframe();
        expect(tweeterIframe.getAttribute("src")).toContain("twitter.com/widgets/tweet_button.html");
    });

    it("can be shared on Facebook", function() {
        var page = new EmbeddedSharePage().get();

        page.clickDummyFacebookLikeButton();

        var facebookIframe = page.getFacebookIframe();
        expect(facebookIframe.getAttribute("src")).toContain("www.facebook.com/plugins/like.php");
    });

});