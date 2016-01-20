/// <reference path="../../../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

import * as AdhBadge from "../Badge/Badge";
import * as AdhConfig from "../Config/Config";
import * as AdhHttp from "../Http/Http";
import * as AdhMovingColumns from "../MovingColumns/MovingColumns";
import * as AdhPermissions from "../Permissions/Permissions";
import * as AdhResourceArea from "../ResourceArea/ResourceArea";
import * as AdhTopLevelState from "../TopLevelState/TopLevelState";
import * as AdhUtil from "../Util/Util";

import * as AdhCredentials from "./Credentials";
import * as AdhUser from "./User";

import RIComment from "../../Resources_/adhocracy_core/resources/comment/IComment";
import RIProposal from "../../Resources_/adhocracy_core/resources/proposal/IProposal";
import RIRate from "../../Resources_/adhocracy_core/resources/rate/IRate";
import RIUser from "../../Resources_/adhocracy_core/resources/principal/IUser";
import * as SIHasAssetPool from "../../Resources_/adhocracy_core/sheets/asset/IHasAssetPool";
import * as SIImageReference from "../../Resources_/adhocracy_core/sheets/image/IImageReference";
import * as SIMetadata from "../../Resources_/adhocracy_core/sheets/metadata/IMetadata";
import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";
import * as SIUserBasic from "../../Resources_/adhocracy_core/sheets/principal/IUserBasic";

var pkgLocation = "/User";


/**
 * register / password reset flow
 * ------------------------------
 *
 * Register and password reset require that a user reacts to an email.  The flow is
 * initiated by visiting a page.  After that, a mail containing a link is sent to
 * the user.  When the user clicks the link, a new tab is opened in which the flow
 * can be completed.
 *
 * There are several issues related to this flow:
 *
 * -   After the flow is completed, we would like to offer a way back to the
 *     location where it was initiated.  As this information is not dragged along,
 *     we can only save it as `cameFrom` in the initial tab.  If that information
 *     is not available (e.g. because the initial tab has been closed) we fall back
 *     to a fixed location.
 *
 * -   Having two open tabs in the end could confuse users.
 *
 * -   The user might have closed the initial tab in the meantime or react to
 *     the mail on a different device.  If password reset is (mis)used for
 *     inviting new users, that initial tab will never have existed in the first
 *     place.
 *
 * -   If the flow is completed successfully, we would like to notify the initial
 *     tab.  That might be prohibited by security policies (3rd party cookie).
 *
 * -   If `cameFrom` is not available we need to redirect to a fixed location. It
 *     is not clear what this would be if there is no central platform but many
 *     independent embedded instances of adhocracy.
 *
 * -   We could drag along the `cameFrom` information. In that case, we should also
 *     drag along the information on where it was embedded. On the other hand, we
 *     should not pass any sensitive information to the embedding page (e.g.
 *     password reset token).
 *
 * There are basically two options to implement this:
 *
 * -   Prompt the user to close the second tab and continue using the first one.
 *     This way they end up with a single tab that contains the `cameFrom`
 *     information, but are lost if the initial tab does not exist.
 *
 * -   Let the user use the second tab.  They then might have two open tabs and
 *     have lost the `cameFrom` information but are not lost completely.
 *
 * Currently, both options are implemented. The first version is avoided because
 * of the risk of dead ends.  However, if there is no central platform
 * (`custom.embed_only` config) the first version is used.
 */


export interface IScopeLogin extends angular.IScope {
    user : AdhUser.Service;
    loginForm : angular.IFormController;
    credentials : {
        nameOrEmail : string;
        password : string;
    };
    errors : string[];
    supportEmail : string;

    resetCredentials : () => void;
    cancel : () => void;
    logIn : () => angular.IPromise<void>;
    showError;
}


export interface IScopeRegister extends angular.IScope {
    registerForm : angular.IFormController;
    input : {
        username : string;
        email : string;
        password : string;
        passwordRepeat : string;
        captchaGuess : string;
    };
    loggedIn : boolean;
    userName : string;
    siteName : string;
    termsUrl : string;
    captcha : {
        enabled : boolean;
        audioEnabled : boolean;
        toggleAudio : () => void;
        refreshCaptcha : () => void;
        id : string;
        imageData : string;
        audioData : string;
    };
    errors : string[];
    supportEmail : string;
    success : boolean;

    register : () => angular.IPromise<void>;
    cancel : () => void;
    showError;
    logOut : () => void;
    goBack : () => void;
}


var bindServerErrors = (
    $scope : {errors : string[]},
    errors : AdhHttp.IBackendErrorItem[]
) => {
    $scope.errors = [];
    if (!errors.length) {
        $scope.errors.push("Unknown error from server (no details provided)");
    } else {
        errors.forEach((e) => {
            $scope.errors.push(e.description);
        });
    }
};

export var activateArea = (
    adhConfig : AdhConfig.IService,
    adhUser : AdhUser.Service,
    adhDone,
    $scope,
    $location : angular.ILocationService
) : AdhTopLevelState.IAreaInput => {
    $scope.translationData = {
        supportEmail: adhConfig.support_email
    };
    $scope.success = false;
    $scope.ready = false;
    $scope.siteName = adhConfig.site_name;
    $scope.embedOnly = adhConfig.custom["embed_only"] && adhConfig.custom["embed_only"].toLowerCase() === "true";
    $scope.user = adhUser;

    $scope.goBack = () => {
         $location.url("/");
    };

    var key = $location.path().split("/")[2];
    var path = "/activate/" + key;

    adhUser.activate(path)
        .then(() => {
            $scope.success = true;
        })
        .finally(() => {
            $scope.ready = true;
            adhDone();
        });

    return {
        templateUrl: "/static/js/templates/Activation.html"
    };
};


export var loginDirective = (
    adhConfig : AdhConfig.IService,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhPermissions : AdhPermissions.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Login.html",
        scope: {},
        link: (scope : IScopeLogin) => {
            scope.errors = [];
            scope.supportEmail = adhConfig.support_email;
            scope.showError = adhShowError;

            adhPermissions.bindScope(scope, "/principals/users");

            scope.credentials = {
                nameOrEmail: "",
                password: ""
            };

            scope.resetCredentials = () => {
                scope.credentials.nameOrEmail = "";
                scope.credentials.password = "";
            };

            scope.cancel = () => {
                 adhTopLevelState.goToCameFrom("/");
            };

            scope.logIn = () => {
                return adhUser.logIn(
                    scope.credentials.nameOrEmail,
                    scope.credentials.password
                ).then(() => {
                    adhTopLevelState.goToCameFrom("/", true);
                }, (errors) => {
                    bindServerErrors(scope, errors);
                    scope.credentials.password = "";
                    scope.loginForm.$setPristine();
                });
            };
        }
    };
};


var captchaImageEmpty : string
    = "iVBORw0KGgoAAAANSUhEUgAAAFcAAAAgCAAAAABChLvJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA"
    + "B3RJTUUH4AEHCB0YmDQF2QAAAbJJREFUSMftlj9oFEEUxn9z2dld9e7wDynC5apc5CBoJWm0CNyh"
    + "hQiCCIKgXVwLhUBIaW1hmoAWCjZ2NoJkj4gEoo0ICoJ/coqCiNEzSggkyF5APovdOyOaSyAk1b5m"
    + "4Pve/Bjem3mMEVsSGVJuyk25KXdD3BvGbGyfacZrzV2tFsyRNc6b29R8m6usXYda/kSXHYcx1xTq"
    + "AIy4mYElzlmTneJiuc/kp9jHru+xTDXjjJO4q0J/xfWcQo79GMzqMVc/lIqS9MDcnNl5/ikTb0tl"
    + "BZyZHfR/iSiWQ44uVPJKXFUOJ6D/cSPdszrZJ82yIqlyULo7sfhE84eKCnzpp3koolgOiXTfU+L+"
    + "4Tr/Fsl6uPC1F8rUD8CXEpymOfbcc3zYDTv8V9WWXLMeXeAn7vr3rGcO6uwHuj/DrWD02cuFU8Ai"
    + "NKNyW06yW+763Mvvr3083usBl17cfjTS+ObueXNnBaKz74a8KjRiOcluuZ36ZqXQSqOWnteSpGGH"
    + "/uVPe03uSuZC0F0gOykVmR926F8OrRR6StxOfescQbGj3eZu13xYMpuhFabb7zz9l6TcbeD+BrU7"
    + "P37R2EAZAAAAAElFTkSuQmCC";

var captchaImageAudioIcon : string
    = "iVBORw0KGgoAAAANSUhEUgAAAGkAAAAnCAAAAAApuzn6AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA"
    + "B3RJTUUH4AEHCCQB8tsgowAAAgRJREFUWMPtlj9oE2EYxn/f9ZI7c0mxSoaQZmoqAbE4iPhvUBJc"
    + "XAQtCIKCQ4yDhWIJnZxFdAlWxJQO6aSjmFIRQV1qoaLgn8RSQcVqrVgKLSUplNfh7kov2ogiCnrP"
    + "cvB8D8+P97vvPk4Jf0gaPskn/Uekq0p9u/5WMWz9qETV7edIcK0bV/vWmyny/a94d/7XhphON9u9"
    + "EwEVHmUwDINhOKrrPTB2EfJBFa8C0BvUti44uTOpDtU6ymasz7ZNRtMvuy2NklUNRGScwqtkSoqW"
    + "SNGSK6ow0YaUQvKQC6+TCRGRO+r6/dBJJ5fjWGWnuSLUbLvMwbl0q9si6b2yRl7S/JjM7ki4pO27"
    + "RK4hpZAc7hCpsCwi6S6RmwUnlzNFltRdoWbbZWpyy3BbGki6Z0Az/9jQTXtW+HIA9gDwsR1SVLfB"
    + "hyR0U3dyG2GD+Tzj2iMBgxZPy7rvqW/i2dwRG1OB6CQ8AiA2DVW2ANH3UMy5uXmo11KrdkNLM9Kn"
    + "YNvL4WViSzemhiA7PvCkXwH0TF16c6jdAM4+HXrQO+PkqB2f3G9kYMa2vS1NT8S7TSpyXju90oVx"
    + "zhLpbtFOaVIKifQFiL0QEZGsTueik8tF44RviySYzep0LpYDImXDbWl6In5SuUTTZS/p79x7C+q3"
    + "Vsfvea8s/z/CJ/kkn+STfJJP+sdIXwHavoZF/OPGkQAAAABJRU5ErkJggg==";

var arrayBufferToBase64 = (data : ArrayBuffer) : string => {
    var binary = "";
    var buffer = new Uint8Array(data);
    for (var i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);

    // this variant with tail recursion causes stack to overflow:
    // return btoa(String.fromCharCode.apply(null, new Uint8Array(data)));
};

var encodeCaptchaImage = (
    audioEnabled : boolean,
    data : ArrayBuffer
) : string => {
    var result : string = "data:image/png;base64, ";

    if (audioEnabled) {
        result += captchaImageAudioIcon;
    } else if (!data) {
        result += captchaImageEmpty;
    } else {
        result += arrayBufferToBase64(data);
    }

    return result;
};

var encodeCaptchaAudio = (
    $sce : ng.ISCEService,
    data : ArrayBuffer
) : string => {
    if (data) {
        var result : string = "data:audio/wav;base64, ";
        result += arrayBufferToBase64(data);
        return $sce.trustAsResourceUrl(result);
    } else {
        return "";
    }
};

var fetchCaptchaImage = (
    adhConfig : AdhConfig.IService,
    $sce : ng.ISCEService,
    $http : angular.IHttpService,
    scope : IScopeRegister
) => {
    // remove old challenges
    scope.captcha.imageData = encodeCaptchaImage(false, null);
    scope.captcha.audioData = encodeCaptchaAudio($sce, null);
    scope.captcha.audioEnabled = false;

    // fetch new one
    var cfg : any = { responseType: "arraybuffer", headers: { "Accept": "image/png" } };
    $http.post(adhConfig.captcha_url + "captcha", null, cfg).then(
        (response) => {
            scope.captcha.id = response.headers("X-Thentos-Captcha-Id");
            scope.captcha.imageData = encodeCaptchaImage(false, <ArrayBuffer>response.data);
        },
        (exception) => {
            console.log("failed to fetch captcha image");
        });
};

var fetchCaptchaAudio = (
    adhConfig : AdhConfig.IService,
    $sce : ng.ISCEService,
    $http : angular.IHttpService,
    scope : IScopeRegister
) => {
    // remove old challenges
    scope.captcha.imageData = encodeCaptchaImage(true, null);
    scope.captcha.audioData = encodeCaptchaAudio($sce, null);

    // fetch new one
    var cfg : any = { responseType: "arraybuffer", headers: { "Accept": "audio/l16" } };
    var path : string = adhConfig.captcha_url + "audio_captcha/" + adhConfig.locale;
    $http.post(path, null, cfg).then(
        (response) => {
            scope.captcha.id = response.headers("X-Thentos-Captcha-Id");
            scope.captcha.audioData = encodeCaptchaAudio($sce, <ArrayBuffer>response.data);
            scope.captcha.audioEnabled = true;
        },
        (exception) => {
            console.log("failed to fetch audio captcha");
        });
};


export var registerDirective = (
    $sce : ng.ISCEService,
    $http : angular.IHttpService,
    adhConfig : AdhConfig.IService,
    adhCredentials : AdhCredentials.Service,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Register.html",
        scope: {},
        link: (scope : IScopeRegister) => {
            scope.siteName = adhConfig.site_name;
            scope.termsUrl = adhConfig.terms_url;
            scope.captcha = {
                enabled: adhConfig.captcha_enabled,
                audioEnabled: false,
                refreshCaptcha: () => {
                    if (scope.captcha.audioEnabled === false) {
                        fetchCaptchaImage(adhConfig, $sce, $http, scope);
                    } else {
                        fetchCaptchaAudio(adhConfig, $sce, $http, scope);
                    }
                },
                toggleAudio: () => {
                    if (scope.captcha.audioEnabled === false) {
                        scope.captcha.audioEnabled = true;
                    } else {
                        scope.captcha.audioEnabled = false;
                    }
                    scope.captcha.refreshCaptcha();
                },
                id: "",
                imageData: "",
                audioData: ""
            };
            if (scope.captcha.enabled) {
                fetchCaptchaImage(adhConfig, $sce, $http, scope);
            }

            scope.showError = adhShowError;

            scope.logOut = () => {
                adhUser.logOut();
            };

            scope.$watch(() => adhCredentials.loggedIn, (value) => {
                scope.loggedIn = value;
            });

            scope.$watch(() => adhUser.data, (value) => {
                if (value) {
                    scope.userName = value.name;
                }
            });

            scope.input = {
                username: "",
                email: "",
                password: "",
                passwordRepeat: "",
                captchaGuess: ""
            };

            scope.cancel = scope.goBack = () => {
                adhTopLevelState.goToCameFrom("/");
            };


            scope.errors = [];
            scope.supportEmail = adhConfig.support_email;

            scope.register = () : angular.IPromise<void> => {
                return adhUser.register(scope.input.username, scope.input.email, scope.input.password, scope.input.passwordRepeat,
                                        scope.captcha.id, scope.input.captchaGuess)
                    .then((response) => {
                        scope.errors = [];
                        scope.success = true;
                    }, (errors) => {
                        if (scope.captcha.enabled) {
                            if (scope.captcha.audioEnabled) {
                                fetchCaptchaAudio(adhConfig, $sce, $http, scope);
                            } else {
                                fetchCaptchaImage(adhConfig, $sce, $http, scope);
                            }
                        }
                        return bindServerErrors(scope, errors);
                    });
            };
        }
    };
};

export var passwordResetDirective = (
    adhConfig : AdhConfig.IService,
    adhHttp : AdhHttp.Service<any>,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/PasswordReset.html",
        scope: {},
        link: (scope) => {
            scope.showError = adhShowError;
            scope.success = false;
            scope.siteName = adhConfig.site_name;
            scope.embedOnly = adhConfig.custom["embed_only"] && adhConfig.custom["embed_only"].toLowerCase() === "true";

            scope.input = {
                password: "",
                passwordRepeat: ""
            };

            scope.goBack = scope.cancel = () => {
                 adhTopLevelState.goToCameFrom("/");
            };

            scope.errors = [];

            scope.passwordReset = () => {
                return adhUser.passwordReset(adhTopLevelState.get("path"), scope.input.password)
                    .then(() => {
                        scope.success = true;
                    },
                    (errors) => bindServerErrors(scope, errors));
            };
        }
    };
};

export var createPasswordResetDirective = (
    adhConfig : AdhConfig.IService,
    adhCredentials : AdhCredentials.Service,
    adhHttp : AdhHttp.Service<any>,
    adhUser : AdhUser.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhShowError
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/CreatePasswordReset.html",
        scope: {},
        link: (scope) => {
            scope.success = false;
            scope.showError = adhShowError;
            scope.siteName = adhConfig.site_name;

            scope.$watch(() => adhCredentials.loggedIn, (value) => {
                scope.loggedIn = value;
            });

            scope.input = {
                email: ""
            };

            scope.goBack = scope.cancel = () => {
                 adhTopLevelState.goToCameFrom("/");
            };

            scope.errors = [];

            scope.submit = () => {
                return adhHttp.postRaw(adhConfig.rest_url + "/create_password_reset", {
                    email: scope.input.email
                }).then(() => {
                    scope.success = true;
                }, AdhHttp.logBackendError)
                .catch((errors) => bindServerErrors(scope, errors));
            };
        }
    };
};


export var indicatorDirective = (
    adhConfig : AdhConfig.IService,
    adhResourceArea : AdhResourceArea.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhPermissions : AdhPermissions.Service,
    $location : angular.ILocationService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Indicator.html",
        scope: {},
        controller: ["adhUser", "adhCredentials", "$scope", (
            adhUser : AdhUser.Service,
            adhCredentials : AdhCredentials.Service,
            $scope
        ) => {
            $scope.user = adhUser;
            $scope.credentials = adhCredentials;
            $scope.noLink = !adhResourceArea.has(RIUser.content_type);

            adhPermissions.bindScope($scope, "/principals/users");

            $scope.logOut = () => {
                adhUser.logOut();
            };

            $scope.logIn = () => {
                adhTopLevelState.setCameFrom($location.url());
                $location.url("/login");
            };

            $scope.register = () => {
                adhTopLevelState.setCameFrom($location.url());
                $location.url("/register");
            };
        }]
    };
};

export var metaDirective = (
    adhConfig : AdhConfig.IService,
    adhResourceArea : AdhResourceArea.Service,
    adhGetBadges : AdhBadge.IGetBadges
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/Meta.html",
        scope: {
            path: "@",
            name: "@?"
        },
        controller: ["adhHttp", "$translate", "$scope", (adhHttp : AdhHttp.Service<any>, $translate, $scope) => {
            if ($scope.path) {
                adhHttp.resolve($scope.path)
                    .then((res) => {
                        $scope.userBasic = res.data[SIUserBasic.nick];
                        $scope.noLink = !adhResourceArea.has(RIUser.content_type);
                        adhGetBadges(res).then((assignments) => {
                            $scope.assignments = assignments;
                        });
                    });
            } else {
                $translate("TR__GUEST").then((translated) => {
                    $scope.userBasic = {
                        name: translated
                    };
                });
                $scope.noLink = true;
            }
        }]
    };
};

export var userListDirective = (adhCredentials : AdhCredentials.Service, adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserList.html",
        link: (scope) => {
            scope.contentType = RIUser.content_type;
            scope.credentials = adhCredentials;
            scope.initialLimit = 50;
            scope.frontendOrderPredicate = (id) => id;
            scope.frontendOrderReverse = true;
        }
    };
};


export var userListItemDirective = (adhConfig : AdhConfig.IService) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserListItem.html",
        scope: {
            path: "@",
            me: "=?"
        },
        controller: ["adhHttp", "$scope", "adhTopLevelState", "adhGetBadges", (
            adhHttp : AdhHttp.Service<any>,
            $scope,
            adhTopLevelState : AdhTopLevelState.Service,
            adhGetBadges : AdhBadge.IGetBadges
        ) => {
            if ($scope.path) {
                adhHttp.resolve($scope.path)
                    .then((res) => {
                        $scope.userBasic = res.data[SIUserBasic.nick];
                        adhGetBadges(res).then((assignments) => {
                            $scope.assignments = assignments;
                        });
                    });
            }
            $scope.$on("$destroy", adhTopLevelState.on("userUrl", (userUrl) => {
                if (!userUrl) {
                    $scope.selectedState = "";
                } else if (userUrl === $scope.path) {
                    $scope.selectedState = "is-selected";
                } else {
                    $scope.selectedState = "is-not-selected";
                }
            }));
        }]
    };
};


export var userProfileDirective = (
    adhConfig : AdhConfig.IService,
    adhCredentials : AdhCredentials.Service,
    adhHttp : AdhHttp.Service<any>,
    adhPermissions : AdhPermissions.Service,
    adhTopLevelState : AdhTopLevelState.Service,
    adhUser : AdhUser.Service,
    adhGetBadges : AdhBadge.IGetBadges
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserProfile.html",
        transclude: true,
        require: "^adhMovingColumn",
        scope: {
            path: "@"
        },
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            adhPermissions.bindScope(scope, adhConfig.rest_url + "/message_user", "messageOptions");

            scope.showMessaging = () => {
                if (scope.messageOptions.POST) {
                    column.showOverlay("messaging");
                } else if (!adhCredentials.loggedIn) {
                    adhTopLevelState.setCameFromAndGo("/login");
                } else {
                    // FIXME
                }
            };

            if (scope.path) {
                adhHttp.resolve(scope.path)
                    .then((res) => {
                        scope.userBasic = res.data[SIUserBasic.nick];
                        adhGetBadges(res).then((assignments) => {
                            scope.assignments = assignments;
                        });
                    });
            }
        }
    };
};


export var userMessageDirective = (adhConfig : AdhConfig.IService, adhHttp : AdhHttp.Service<any>) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserMessage.html",
        scope: {
            recipientUrl: "@"
        },
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column)  => {
            adhHttp.get(scope.recipientUrl).then((recipient : RIUser) => {
                scope.recipientName = recipient.data[SIUserBasic.nick].name;
            });

            scope.messageSend = () => {
                return adhHttp.postRaw(adhConfig.rest_url + "/message_user", {
                    recipient: scope.recipientUrl,
                    title: scope.message.title,
                    text: scope.message.text
                }).then(() => {
                    column.hideOverlay();
                    column.alert("TR__MESSAGE_STATUS_OK", "success");
                }, () => {
                    // FIXME
                });
            };

            scope.cancel = () => {
                column.hideOverlay();
            };
        }
    };
};


export var userDetailColumnDirective = (
    adhPermissions : AdhPermissions.Service,
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserDetailColumn.html",
        require: "^adhMovingColumn",
        link: (scope, element, attrs, column : AdhMovingColumns.MovingColumnController) => {
            column.bindVariablesAndClear(scope, ["userUrl"]);
            adhPermissions.bindScope(scope, adhConfig.rest_url + "/message_user", "messageOptions");
        }
    };
};


export var adhUserManagementHeaderDirective = (
    adhConfig : AdhConfig.IService
) => {
    return {
        restrict: "E",
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserManagementHeader.html"
    };
};

/**
 * Usage:
 *
 *   <adh-user-activity-overview
 *       data-show-comments="true"
 *       data-show-proposals="true"
 *       data-show-ratings="true"
 *       data-path="{{userUrl}}"
 *   >
 *   </adh-user-activity-overview>
 */
export var adhUserActivityOverviewDirective = (
    adhConfig: AdhConfig.IService,
    adhHttp: AdhHttp.Service<any>
) => {
    return {
        restrict: "E",
        scope: {
            path: "@" // userUrl
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserActivityOverview.html",
        link: (scope, element, attrs) => {
            var requestCountInto = (contentType, scopeTarget, shouldRequest) => {
                // REFACT consider to just check that the tag is set instead of requiring it to be set to true
                if (shouldRequest !== "true") { return; }

                var params = {
                    depth: "all",
                    count: true,
                    elements: false,
                    content_type: contentType.content_type
                };
                params[SIMetadata.nick + ":creator"] = scope.path;

                adhHttp.get(adhConfig.rest_url, params)
                    .then((pool) => { scope[scopeTarget] = pool.data[SIPool.nick].count; });
            };

            requestCountInto(RIComment, "commentCount", attrs.showComments);
            requestCountInto(RIProposal, "proposalCount", attrs.showProposals);
            requestCountInto(RIRate, "rateCount", attrs.showRatings);
        }
    };
};

export var adhUserProfileImageDirective = (
    adhHttp: AdhHttp.Service<any>,
    adhConfig: AdhConfig.IService
) => {
    return {
        restrict: "E",
        scope: {
            path: "@",
            format: "@?", // thumbnail [default] or detail
            didFailToLoadImage: "&?",
            cssClass: "@?"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserProfileImage.html",
        link: (scope) => {
            scope.didFailToLoadImage = scope.didFailToLoadImage || (() => null);

            scope.config = adhConfig;
            scope.$watch("path", (path) => {
                if ( ! path) { return; }

                adhHttp.get(scope.path).then((user) => {
                    scope.assetPath = user.data[SIImageReference.nick].picture;
                    scope.userName = user.data[SIUserBasic.nick].name;
                    if ( ! scope.assetPath) {
                        scope.didFailToLoadImage();
                    }
                }, scope.didFailToLoadImage);
            });
        }
    };
};

export var adhUserProfileImageEditDirective = (
    adhHttp: AdhHttp.Service<any>,
    adhPermissions: AdhPermissions.Service,
    adhConfig: AdhConfig.IService
) => {
    return {
        restrict: "E",
        scope: {
            path: "@"
        },
        templateUrl: adhConfig.pkg_path + pkgLocation + "/UserProfileImageEdit.html",
        link: (scope) => {
            scope.config = adhConfig;
            adhHttp.get(AdhUtil.parentPath(scope.path)).then((userPool) => {
                scope.assetPool = userPool.data[SIHasAssetPool.nick].asset_pool;
            });
            scope.triggerUpload = () => {
                scope.isUploading = true;
            };
            scope.didUpload = () => {
               scope.isUploading = false;
            };
            scope.$watch("path", (path) => {
                adhPermissions.bindScope(scope, () => scope.path, "userOptions");
            });
        }
    };
};

export var registerRoutes = (
    context : string = ""
) => (
    adhResourceAreaProvider : AdhResourceArea.Provider
) => {
    adhResourceAreaProvider
        .default(RIUser, "", "", context, {
            space: "user",
            movingColumns: "is-show-hide-hide"
        })
        .specific(RIUser, "", "", context, () => (resource : RIUser) => {
            return {
                userUrl: resource.path
            };
        });
};
