"use strict";

var shared = require("./shared.js");
var UserPages = require("./UserPages.js");

describe("user page", function() {
    it("displays the correct name for each user", function() {
        var usersListing = new UserPages.UsersListing().get();

        var annotatorPage = usersListing.getUserPage("annotator");
        expect(annotatorPage.getUserName()).toBe("annotator");

        var contributorPage = usersListing.getUserPage("contributor");
        expect(contributorPage.getUserName()).toBe("contributor");

        var reviewerPage = usersListing.getUserPage("reviewer");
        expect(reviewerPage.getUserName()).toBe("reviewer");
    });

});