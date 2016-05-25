"use strict";

var shared = require("./shared.js");
var UserPages = require("./UserPages.js");
var fs = require("fs");
var exec = require("sync-exec");
var EC = protractor.ExpectedConditions;
var _ = require("lodash");

describe("user page", function() {

    it("displays the correct name for each user", function() {
        var annotatorPage = new UserPages.UserPage().get("0000001");
        expect(annotatorPage.getUserName()).toBe("participant");

        var contributorPage = new UserPages.UserPage().get("0000002");
        expect(contributorPage.getUserName()).toBe("moderator");

        var reviewerPage = new UserPages.UserPage().get("0000004");
        expect(reviewerPage.getUserName()).toBe("admin");
    });

    var currentDate = Date.now().toString();
    var subject = "title" + currentDate;
    var content = "content" + currentDate;

    it("is possible to send a message", function(done) {
        shared.loginOtherParticipant();

        var annotatorPage = new UserPages.UserPage().get("0000001");

        annotatorPage.sendMessage(subject, content);

        // expect the message widget to disappear
        var button = element(by.css(".user-profile-info-button"));
        browser.wait(EC.elementToBeClickable(button), 5000);
        expect(EC.elementToBeClickable(button)).toBeTruthy();
        done();
    });

    it("backend sends message as email", function(done) {

            var newMails = fs.readdirSync(browser.params.mail.queue_path + "/new");
            var lastMail = newMails.length - 1
            var mailpath = browser.params.mail.queue_path + "/new/" + newMails[lastMail];
            shared.parseEmail(mailpath, function(mail) {
                expect(mail.text).toContain(content);
                expect(mail.subject).toContain(subject);
                expect(mail.from[0].address).toContain("noreply");
                expect(mail.to[0].address).toContain("participant");
                done();
            });
    });
});
