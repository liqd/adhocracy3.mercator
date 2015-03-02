"use strict";

var shared = require("./shared.js");

var EmbeddedSharePage = function() {
    this.url = "/embed/social-share";
    this.dummyTweetButton = element(by.css(".tweet.dummy_btn"));
    this.dummyFacebookLikeButton = element(by.css(".fb_like.dummy_btn"));

    this.get = function() {
        browser.get(this.url);
        return this;
    }

    this.clickDummyTweetButton = function() {
        this.dummyTweetButton.click();
        browser.waitForAngular();
    };

    this.getTwitterIframe = function() {
        return this.dummyTweetButton.element(by.css("iframe"));
    };

    this.clickDummyFacebookLikeButton = function() {
        this.dummyFacebookLikeButton.click();
    };

    this.getFacebookIframe = function() {
        return this.dummyFacebookLikeButton.element(by.css("iframe"));
    };
};

module.exports = EmbeddedSharePage;
