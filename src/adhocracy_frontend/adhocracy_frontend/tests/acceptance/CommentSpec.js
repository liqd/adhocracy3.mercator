"use strict";

var shared = require("./shared.js");
var EmbeddedCommentsPage = require("./EmbeddedCommentsPage.js");
var UserPages = require("./UserPages.js");

describe("comments", function() {

    beforeAll(function() {
        shared.loginParticipant();
    });

    it("can be created", function() {
        var page = new EmbeddedCommentsPage("c1").get();
        var comment = page.createComment("comment 1");
        expect(comment.isPresent()).toBe(true);
        expect(page.getCommentText(comment)).toEqual("comment 1");
        expect(page.getCommentAuthor(comment)).toEqual(shared.participantName);
    });

    it("cannot be created empty", function() {
        var page = new EmbeddedCommentsPage("c2").get();
        var comment = page.createEmptyComment();
        expect(comment.isPresent()).toBe(false);
    });
});
