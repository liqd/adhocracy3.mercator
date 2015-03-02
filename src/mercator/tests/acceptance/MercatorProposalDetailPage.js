"use strict";

var EmbeddedCommentsPage = require("./core/EmbeddedCommentsPage.js");
var MercatorProposalFormPage = require("./MercatorProposalFormPage.js");

var MercatorProposalDetailPage = function() {
    this.column = element.all(by.tagName("adh-mercator-proposal-detail-column")).first();
    this.coverCommentsButton = element(by.css(".mercator-proposal-cover-show-comments"));
    this.editButton = this.column.element(by.cssContainingText("a", "edit"));
    this.rateWidget = element(by.css(".mercator-proposal-detail-view .mercator-propsal-detail-meta-item-rate"));
    this.rateDifference = this.rateWidget.element(by.css(".like-difference"));
    this.detailContainer = element(by.css("adh-mercator-proposal-detail-view .mercator-proposal-detail-container"));
    this.proposalDetails = this.detailContainer.all(by.css(".chapter")).get(2);
    this.goalsAndVision = this.detailContainer.all(by.css(".chapter")).get(3);
    this.title = element(by.css("adh-mercator-proposal-detail-view .mercator-proposal-cover-header"));
    this.teaser = this.detailContainer.all(by.css(".chapter section p")).first();
    this.requestedFunding = this.detailContainer.element(by.css(".mercator-proposal-budget-col.requested"));
    this.budget = this.detailContainer.all(by.css(".mercator-proposal-budget-col")).get(1);
    this.locationSpecific1 = this.detailContainer.all(by.css(".inline-boxes li")).first();
    this.locationSpecific2 = this.detailContainer.all(by.css(".inline-boxes li")).get(1);
    this.userInfo = this.detailContainer.element(by.css("adh-user-meta"));
    this.organizationName = this.detailContainer.all(by.css(".mercator-proposal-detail-orgs-columns li")).first();
    this.organizationCountry = this.detailContainer.all(by.css(".mercator-proposal-detail-orgs-columns li")).get(1);
    this.organizationNonProfit = this.detailContainer.all(by.css(".mercator-proposal-detail-orgs-columns li")).last();
    this.description = this.proposalDetails.all(by.css("section p")).first();
    this.story = this.proposalDetails.all(by.css("section p")).last();
    this.outcome = this.goalsAndVision.all(by.css("section p")).first();
    this.steps = this.goalsAndVision.all(by.css("section p")).get(1);
    this.addedValue = this.goalsAndVision.all(by.css("section p")).get(2);
    this.partners = this.goalsAndVision.all(by.css("section p")).last();
    this.experience = this.detailContainer.element(by.css("#mercator-detail-view-additional p"));

    this.getEditPage = function() {
        this.editButton.click();
        return new MercatorProposalFormPage();
    };

    this.getCommentPage = function(section) {
        var path = "//a[contains(@href, '@comments:" + section + "')]";
        var bubbleButton = element(by.xpath(path));
        bubbleButton.click();
        return new EmbeddedCommentsPage("");
    };

};

module.exports = MercatorProposalDetailPage;