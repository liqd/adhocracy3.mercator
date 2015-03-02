"use strict";

var shared = require("./shared.js");
var EmbeddedCommentsPage = require("./EmbeddedCommentsPage.js");


describe("comments", function() {
    beforeEach(function() {
        shared.loginAnnotator();
    });

    it("can be created", function() {
        var page = new EmbeddedCommentsPage("c1").get();
        var comment = page.createComment("comment 1");
        expect(comment.isPresent()).toBe(true);
        expect(page.getCommentText(comment)).toEqual("comment 1");
        expect(page.getCommentAuthor(comment)).toEqual(shared.annotatorName);
    });

    it("cannot be created empty", function() {
        var page = new EmbeddedCommentsPage("c2").get();
        var comment = page.createComment("");
        expect(comment.isPresent()).toBe(false);
    });

    it("can be created nested", function() {
        var createNestedReplies = function(parent, parentName, remaining) {
            var name = parentName + ".1";
            var reply = page.createReply(parent, name);
            expect(reply.isPresent()).toBe(true);
            expect(page.getCommentText(reply)).toEqual(name);
            if (remaining > 0) {
                createNestedReplies(reply, name, remaining - 1);
            }
        };

        var page = new EmbeddedCommentsPage("c3").get();
        var comment = page.createComment("comment 3");
        createNestedReplies(comment, "reply 3", 3);
    });

    it("can be edited", function() {
        var page = new EmbeddedCommentsPage("c4").get();
        var comment = page.createComment("comment 1");
        page.editComment(comment, [protractor.Key.BACK_SPACE, "0a"]);
        expect(page.getCommentText(comment)).toEqual("comment 0a");
    });

    it("can not be edited by anonymous", function() {
        var page = new EmbeddedCommentsPage("c5").get();
        var comment = page.createComment("comment 1");
        shared.logout();
        expect(page.getEditLink(comment).isPresent()).toBe(false);
    });

    it("can not be edited by other user", function() {
        var page = new EmbeddedCommentsPage("c6").get();
        var comment = page.createComment("comment 1");
        shared.logout();
        shared.loginContributor();
        page.get();
        expect(page.getEditLink(comment).isPresent()).toBe(false);
    });

    it("can not be replied to by anonymous", function() {
        var page = new EmbeddedCommentsPage("c7").get();
        var comment = page.createComment("comment 1");
        shared.logout();
        expect(page.getReplyLink(comment).isPresent()).toBe(false);
    });

    it("can be replied to by other user", function() {
        var page = new EmbeddedCommentsPage("c8").get();
        var comment = page.createComment("comment 1");
        shared.logout();
        shared.loginContributor();
        page.get();
        expect(page.getReplyLink(comment).isPresent()).toBe(true);
        var reply = page.createReply(comment, "reply 1");
        expect(page.getCommentText(reply)).toEqual("reply 1");
    });

    it("can be edited twice", function() {
        var page = new EmbeddedCommentsPage("c9").get();
        var comment = page.createComment("comment 1");
        page.editComment(comment, [protractor.Key.BACK_SPACE, "0a"]);
        expect(page.getCommentText(comment)).toEqual("comment 0a");
        page.editComment(comment, [protractor.Key.BACK_SPACE, "b1"]);
        expect(page.getCommentText(comment)).toEqual("comment 0b1");
    });

    it("can be edited after child edit", function() {
        var page = new EmbeddedCommentsPage("c10").get();
        var parent = page.createComment("comment 1");
        var reply = page.createReply(parent, "comment 1.1");
        var changedReply = page.editComment(reply, ["b"]);
        var changedParent = page.editComment(parent, ["b"]);
        expect(page.getCommentText(parent)).toEqual("comment 1b");
        expect(page.getCommentText(reply)).toEqual("comment 1.1b");
    });

    xit("can be edited and replied - fail due to #803", function() {
        var page = new EmbeddedCommentsPage("c11").get();
        var parent = page.createComment("comment 1");
        var changedComment = page.editComment(parent, ["comment 1 - edited"]);
        var reply = page.createReply(changedComment, "reply 1");

        expect(page.getCommentText(reply)).toEqual("reply 1");
    });
});
