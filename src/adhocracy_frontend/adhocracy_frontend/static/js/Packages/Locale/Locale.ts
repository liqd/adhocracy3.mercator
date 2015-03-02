import _ = require("lodash");


export var allCountries = [

"AF",
"AL",
"DZ",
"AS",
"AD",
"AO",
"AR",
"AM",
"AU",
"AT",
"AZ",
"BS",
"BH",
"BD",
"BB",
"BY",
"BE",
"BZ",
"BJ",
"BT",
"BO",
"BA",
"BW",
"BR",
"BN",
"BG",
"BF",
"BI",
"KH",
"CM",
"CA",
"CV",
"CF",
"CL",
"CN",
"CO",
"KM",
"CK",
"CR",
"HR",
"CU",
"CY",
"CZ",
"CD",
"DK",
"DJ",
"DM",
"DO",
"TL",
"EC",
"EG",
"SV",
"GQ",
"ER",
"EE",
"ET",
"FK",
"FO",
"FJ",
"FI",
"FR",
"GA",
"GM",
"GE",
"DE",
"GH",
"GR",
"GU",
"GT",
"GN",
"GW",
"GY",
"HT",
"HN",
"HU",
"IS",
"IN",
"ID",
"IR",
"IQ",
"IE",
"IL",
"IT",
"CI",
"JM",
"JP",
"JO",
"KZ",
"KE",
"KI",
"KW",
"KG",
"LA",
"LV",
"LB",
"LS",
"LR",
"LY",
"LI",
"LT",
"LU",
"MK",
"MG",
"MW",
"MY",
"MV",
"ML",
"MT",
"MH",
"MR",
"MU",
"MX",
"FM",
"MD",
"MC",
"MN",
"ME",
"MA",
"MZ",
"MM",
"NA",
"NR",
"NP",
"NL",
"NZ",
"NI",
"NE",
"NG",
"NU",
"KP",
"NO",
"OM",
"PK",
"PW",
"PA",
"PG",
"PY",
"PE",
"PH",
"PL",
"PT",
"PR",
"QA",
"CG",
"RO",
"RU",
"RW",
"KN",
"LC",
"VC",
"WS",
"SM",
"ST",
"SA",
"SN",
"RS",
"SC",
"SL",
"SG",
"SK",
"SI",
"SB",
"SO",
"ZA",
"KR",
"SS",
"ES",
"LK",
"SD",
"SR",
"SZ",
"SE",
"CH",
"SY",
"TW",
"TJ",
"TZ",
"TH",
"TG",
"TT",
"TN",
"TR",
"TM",
"TV",
"UG",
"UA",
"AE",
"GB",
"US",
"UY",
"UZ",
"VU",
"VA",
"VE",
"VN",
"EH",
"YE",
"ZM",
"ZW"
];



export var europeanCountries = [
"AL",
"AD",
"AM",
"AT",
"AZ",
"BY",
"BE",
"BA",
"BG",
"HR",
"CY",
"DK",
"EE",
"FI",
"FR",
"GE",
"DE",
"GR",
"HU",
"IE",
"IS",
"IT",
"XK",
"LV",
"LI",
"LT",
"LU",
"ME",
"MK",
"MT",
"MD",
"MC",
"NL",
"NO",
"PL",
"PT",
"RO",
"RU",
"SM",
"SE",
"CH",
"RS",
"SK",
"SI",
"ES",
"CZ",
"TR",
"UA",
"GB",
"VA"
];


export var countrySelect = ($scope) => {

    return {
        scope: {
            name: "@",
            required: "@",
            value: "=ngModel"
        },
        restrict: "E",
        template:
            (elm, attr) => {
                attr.star = (attr.required === "required") ? "*" : "";
                return "<select data-ng-model=\"value\" name=\"{{name}}\"" +
                "       data-ng-options=\"c as (c | translate) for c in countries\" data-ng-required=\"required\">" +
                "           <option value=\"\" selected>{{ 'TR__COUNTRY' | translate }}" + attr.star + "</option>" +
                "</select>";
            },
        link: (scope) => {

                scope.countries = europeanCountries;

        }
    };
};


export var countryName = () => (code) => {
    var candidates = _.filter(europeanCountries, (i) => i === code);
    return candidates.length !== 0 ? candidates[0] : code;
};


/**
 * A service to wrap parts of a string in templates.
 *
 * wrap.replace("Hello [[:World]]!");
 * -> "Hello World!"
 *
 * wrap.replace("Hello [[link:World]]!", {
 *   link: "<a>{{content}}</a>"
 * });
 * -> "Hello <a>World</a>!"
 */
export class Wrap {
    private openMarker : string = "[";
    private closeMarker : string = "]";
    private keySeparator : string = ":";
    private escapeMarker : string = "\\";

    constructor(private $interpolate) {}

    public encode(msg : string) : string {
        return msg
            .replace(this.openMarker, this.escapeMarker + this.openMarker)
            .replace(this.closeMarker, this.escapeMarker + this.closeMarker);
    }

    public decode(msg : string) : string {
        return msg
            .replace(this.escapeMarker + this.openMarker, this.openMarker)
            .replace(this.escapeMarker + this.closeMarker, this.closeMarker);
    }

    public wrap(msg : string, templates) : string {
        var a = msg.split(this.openMarker + this.openMarker);
        if (a.length < 2) {
            return msg;
        }
        var before = a.shift();
        var after = a.join(this.openMarker + this.openMarker);

        var b = after.split(this.closeMarker + this.closeMarker);
        if (b.length < 2) {
            throw "No matching closing marker found in " + msg;
        }
        var inside = b.shift();
        after = b.join(this.closeMarker + this.closeMarker);

        var c = inside.split(this.keySeparator);
        if (c.length < 2) {
            throw "No key seperator found in " + msg;
        }
        var key = c.shift();
        inside = c.join(this.keySeparator);

        var template = templates[key];
        if (typeof template !== "undefined") {
            inside = this.$interpolate(template)({
                content: inside
            });
        }

        return before + inside + this.wrap(after, templates);
    }
}


/**
 * Translate directive for strings that contain HTML.
 *
 * Imagine you want to translate some HTML like this:
 *
 *     Click <a href="#">here</a>!
 *
 * The issue of course is that a part of the string is wrapped in HTML.
 * With plain translation, you can not easily translate this. Your only
 * option is to split this into several translatable strings which might
 * not work in some languages.
 *
 * This directive tries to solve the problem by using adhWrap. So the
 * above could be written like this:
 *
 *     <span adh-html-translate="Click [[link:here]]!" translate-templates="{
 *         link: '&lt;a href=&quot;#&quot;&gt;{{content}}&lt;/a&gt;'
 *     }"></span>
 */
export var htmlTranslateDirective = ($translate, adhWrap : Wrap) => {
    return {
        restrict: "A",
        scope: {
            translateValues: "=?",
            translateTemplates: "=?"
        },
        link: (scope, element, attrs) => {
            // NOTE: we could use another element for this
            var escapeHTML = (s : string) => element.text(s).html();

            var update = () => {
                var msg = attrs.adhHtmlTranslate || "";
                var values = scope.translateValues || {};
                var templates = scope.translateTemplates || {};

                // FIXME: adhWrap.encode values before interpolating
                $translate(msg, values).then((translated : string) => {
                    var html = escapeHTML(translated);
                    var wrapped = adhWrap.decode(adhWrap.wrap(html, templates));
                    // FIXME: do some $sce related magic here
                    element.html(wrapped);
                });
            };

            scope.$watch(() => attrs.htmlTranslate, update);
            scope.$watch("translateValues", update);
            scope.$watch("translateTemplates", update);
        }
    };
};


export var moduleName = "adhLocale";

export var register = (angular) => {
    angular
        .module(moduleName, [])
        .filter("adhCountryName", countryName)
        .service("adhWrap", ["$interpolate", Wrap])
        .directive("adhHtmlTranslate", ["$translate", "adhWrap", htmlTranslateDirective])
        .directive("countrySelect", ["adhConfig", countrySelect]);
};
