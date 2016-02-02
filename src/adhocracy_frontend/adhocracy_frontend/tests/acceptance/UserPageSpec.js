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

    it("is possible to send a message", function() {
        shared.loginOtherParticipant();

        var mailsBeforeMessaging =
            fs.readdirSync(browser.params.mail.queue_path + "/new");

        var annotatorPage = new UserPages.UserPage().get("0000001");
        var currentDate = Date.now().toString();
        var subject = "title" + currentDate;
        var content = "content" + currentDate;

        annotatorPage.sendMessage(subject, content);

        // expect the message widget to disappear
        var button = element(by.css(".user-profile-info-button"));
        browser.wait(EC.elementToBeClickable(button), 5000);
        expect(EC.elementToBeClickable(button)).toBeTruthy();

        var flow = browser.controlFlow();
        // ensures the tests are executed after the click() from sendMessage()
        // and after the previous expectation.
        // see http://spin.atomicobject.com/2014/12/17/asynchronous-testing-protractor-angular/
        // and https://code.google.com/p/selenium/wiki/WebDriverJs#Control_Flows
        // for an explanation
        flow.execute(function() {
            var mailsAfterMessaging =
                fs.readdirSync(browser.params.mail.queue_path + "/new");

            expect(mailsAfterMessaging.length).toEqual(mailsBeforeMessaging.length + 1);

            var newMails = _.difference(mailsAfterMessaging, mailsBeforeMessaging);
            expect(newMails.length).toEqual(1);

            var mailpath = browser.params.mail.queue_path + "/new/" + newMails[0];

            shared.parseEmail(mailpath, function(mail) {
                // console.log('mail', mail);
                expect(mail.text).toContain(content);
                expect(mail.subject).toContain(subject);
                expect(mail.from[0].address).toContain("participant2");
                expect(mail.to[0].address).toContain("participant");
            });
        });
    });
});