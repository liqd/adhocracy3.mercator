"use strict";

var path = require("path");

var shared = require("./core/shared.js");


var MercatorProposalFormPage = function() {

    this.form = element(by.css("adh-mercator-proposal-create form"));
    this.userInfoFirstName = this.form.element(by.model("data.user_info.first_name"));
    this.userInfoLastName = this.form.element(by.model("data.user_info.last_name"));

    // NOTE: Due to angular magic used in ng-options, the value which is
    // stored in the respective ng-model (e.g. 'DE') isn't reflected in the
    // DOM, and an index is used instead.
    this.userInfoCountry = this.form.element(by.model("data.user_info.country"));
    this.organizationInfoStatusEnum = this.form.all(by.model("data.organization_info.status_enum")).first();
    this.organizationInfoName = this.form.element(by.model("data.organization_info.name"));
    this.organizationInfoCountry = this.form.element(by.model("data.organization_info.country"));
    this.organizationInfoWebsite = this.form.element(by.model("data.organization_info.website"));
    this.title = this.form.element(by.model("data.title"));
    this.introductionTeaser = this.form.element(by.model("data.introduction.teaser"));
    this.descriptionDescription = this.form.element(by.model("data.description.description"));
    this.locationLocationIsSpecific = this.form.element(by.model("data.location.location_is_specific"));
    this.locationLocationSpecific1 = this.form.element(by.model("data.location.location_specific_1"));
    this.locationLocationSpecific2 = this.form.element(by.model("data.location.location_specific_2"));
    this.locationLocationSpecific3 = this.form.element(by.model("data.location.location_specific_3"));
    this.locationLocationIsLinkedToRuhr = this.form.element(by.model("data.location.location_is_linked_to_ruhr"));
    this.story = this.form.element(by.model("data.story"));
    this.outcome = this.form.element(by.model("data.outcome"));
    this.steps = this.form.element(by.model("data.steps"));
    this.value = this.form.element(by.model("data.value"));
    this.partners = this.form.element(by.model("data.partners"));
    this.financeBudget = this.form.element(by.model("data.finance.budget"));
    this.financeRequestedFunding = this.form.element(by.model("data.finance.requested_funding"));
    this.financeOtherSource = this.form.element(by.model("data.finance.other_sources"))
    this.financeGrantedYes = this.form.all(by.model("data.finance.granted")).first();
    this.experience = this.form.element(by.model("data.experience"));
    this.heardFromColleague = this.form.element(by.model("data.heard_from.colleague"));
    this.acceptDisclaimer = this.form.element(by.model("data.accept_disclaimer"));
    this.image = this.form.element(by.css("input[type=\"file\"]"));
    this.submitButton = this.form.element(by.css("input[type=\"submit\"]"));

    this.setImage = function(filename) {
        var fileToUpload = filename;
        var imagePath = path.resolve(__dirname, fileToUpload);
        this.image.sendKeys(imagePath);
    };

    this.fillValid = function() {
        this.userInfoFirstName.sendKeys("pita");
        this.userInfoLastName.sendKeys("pasta");
        this.userInfoCountry.element(by.cssContainingText("option", "Germany")).click();
        this.organizationInfoStatusEnum.click();
        this.organizationInfoName.sendKeys("organization name");
        this.organizationInfoCountry.element(by.cssContainingText("option", "France")).click();
        this.organizationInfoWebsite.sendKeys("http://example.org");
        this.title.sendKeys("protitle");
        this.introductionTeaser.sendKeys("proteaser");
        this.setImage("./proposalImageValid.png");
        this.descriptionDescription.sendKeys("prodescription");
        this.locationLocationIsSpecific.click();
        this.locationLocationSpecific1.sendKeys("Bonn");
        this.locationLocationIsLinkedToRuhr.click();
        this.story.sendKeys("story");
        this.outcome.sendKeys("success");
        this.steps.sendKeys("plan");
        this.value.sendKeys("relevance");
        this.partners.sendKeys("partners");
        this.financeBudget.sendKeys("1200");
        this.financeRequestedFunding.sendKeys("1000");
        this.financeOtherSource.sendKeys("other source");
        this.financeGrantedYes.click();
        this.experience.sendKeys("experience");
        this.heardFromColleague.click();
        this.acceptDisclaimer.click();
    };

    this.create = function() {
        browser.get("/r/mercator/@create_proposal");
        return this;
    };

    this.createProposal = function(content) {
        this.fillValid();
        this.submitButton.click();
        // FIXME: Return created comment
        return this.listing.element(by.tagName("adh-comment-resource"));

        /*
        return all.reduce(function(acc, elem) {
            return protractor.promise.all(
                acc.getAttribute("data-path"),
                elem.getAttribute("data-path")
            ).then(function(paths) {
                return (path[0] > path[1] ? acc : elem);
            })
        });*/
    };

    this.isValid = function() {
        return (shared.hasClass(this.form, "ng-valid"));
    }

    this.getEditLink = function(comment) {
        return comment.element(by.css("[data-ng-click=\"edit()\"]"));
    };
};

module.exports = MercatorProposalFormPage;
