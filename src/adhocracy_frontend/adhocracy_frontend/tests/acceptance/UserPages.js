"use strict";

var shared = require("./shared.js");

var participantName = "participant";
var participantEmail = "participant@example.org";
var participantPassword = "password";

var otherParticipantName = "participant2";
var otherParticipantPassword = "password";


var LoginPage = function() {
    this.loginInput = element(by.model("credentials.nameOrEmail"));
    this.passwordInput = element(by.model("credentials.password"));
    this.submitButton = element(by.css(".login [type=\"submit\"]"));

    this.get = function() {
        browser.get("/login");
        return this;
    };

    this.login = function(login, password) {
        this.loginInput.sendKeys(login);
        this.passwordInput.sendKeys(password);
        this.submitButton.click();
        browser.waitForAngular();

    };
};

var ResetPasswordCreatePage = function() {
    this.emailInput = element(by.model("input.email"));
    this.submitButton = element(by.css(".login [type=\"submit\"]"));

    this.get = function() {
        browser.get("/create_password_reset");
        return this;
    };

    this.fill = function(email) {
        this.emailInput.sendKeys(email)
        this.submitButton.click();
        browser.waitForAngular();
    };
};


var ResetPasswordPage = function() {
    this.password = element(by.model("input.password"));
    this.passwordRepeat = element(by.model("input.passwordRepeat"));
    this.submitButton = element(by.css(".login [type=\"submit\"]"));

    this.get = function(link) {
        browser.get(link);
        return this;
    };

    this.fill = function(password){
        this.password.sendKeys(password);
        this.passwordRepeat.sendKeys(password);
        this.submitButton.click();
    }
}

var RegisterPage = function() {
    this.nameInput = element(by.model("input.username"));
    this.emailInput = element(by.model("input.email"));
    this.passwordInput = element(by.model("input.password"));
    this.passwordRepeatInput = element(by.model("input.passwordRepeat"));
    this.registerCheck = element(by.model("input.registerCheck"));
    this.submitButton = element(by.css("[type=\"submit\"]"));

    this.get = function() {
        browser.get("/register");
        return this;
    };

    this.fill = function(username, email, password, password_repeat) {
        this.nameInput.sendKeys(username);
        this.emailInput.sendKeys(email);
        this.passwordInput.sendKeys(password);
        this.passwordRepeatInput.sendKeys(password_repeat);
        this.registerCheck.click();
    };

    this.register = function(username, email, password) {
        this.fill(username, email, password, password);
        this.submitButton.click();
        browser.waitForAngular();
    };
};

var register = function(username, email, password) {
    var registerPage = new RegisterPage().get();
    registerPage.register(username, email, password);
};

var login = function(username, password) {
    var loginPage = new LoginPage().get();
    loginPage.login(username, password);
};

var isLoggedIn = function() {
    return element(by.css(".user-indicator-logout")).isPresent();
}

var logout = function() {
    var link = element(by.css(".user-indicator-logout"));
    link.isPresent().then(function(present) {
        if (present) {
            link.click();
        }
    });

    browser.waitForAngular();
};

var loginParticipant = function() {
    login(participantName, participantPassword);
};

var loginOtherParticipant = function() {
    login(otherParticipantName, otherParticipantPassword);
};

var UserPage = function() {

    this.get = function(usernumber) {
        browser.get("/r/principals/users/" + usernumber);
        return this;
    };

    this.getUserName = function() {
        return element(by.css(".user-profile-info-name-text")).getText();
    };

    this.sendMessage = function(subject, content) {
        element(by.css(".user-profile-info-button")).click();
        element(by.css("input.user-message-subject")).sendKeys(subject);
        element(by.css("textarea.user-message-text")).sendKeys(content);
        element(by.css("input.button-cta")).click();
    };
};

var UsersListing = function() {
    this.listing = element(by.css(".user-list"));

    this.get = function() {
        browser.get("/r/principals/users/");
        return this;
    };

    this.getUserPage = function(user) {
        // ensures the list of users is visible
        this.get();

        var path = "(//a[span/text() = '" + user + "'])[1]";
        var userItem = element(by.xpath(path));

        userItem.click();
        return new UserPage();
    };
};


module.exports = {
    register: register,
    LoginPage: LoginPage,
    RegisterPage: RegisterPage,
    ResetPasswordCreatePage: ResetPasswordCreatePage,
    ResetPasswordPage: ResetPasswordPage,
    UsersListing: UsersListing,
    UserPage: UserPage,
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    participantName: participantName,
    participantEmail: participantEmail,
    participantPassword: participantPassword,
    loginParticipant: loginParticipant,
    loginOtherParticipant: loginOtherParticipant
}
