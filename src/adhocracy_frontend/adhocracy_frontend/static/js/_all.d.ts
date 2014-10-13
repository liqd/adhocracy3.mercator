/* tslint:disable */
/// <reference path="../lib/DefinitelyTyped/modernizr/modernizr.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/angularjs/angular.d.ts"/>

declare module "angular" {
    // FIXME: complete this, fill in more concise types, and write a pull request for definitely typed.
    export var module: any;
    export var bootstrap: any;
}
declare module "angularRoute" {}

declare module "angularAnimate" {}
declare module "angularTranslate" {}
declare module "angularTranslateLoader" {}
declare module "angularElastic" {}
declare module "angularUiSelect" {}

declare module "modernizr" {
    export var Modernizr : ModernizrStatic;
}

/**
 * Fake module description for Kris Kowal's q
 *
 * This is actually the description of ng.IQService.
 *
 * We use q as a drop-in replacement in testing as it is compatible with both
 * node.js and browsers and does not require angular.
 *
 * While both modules are very much compatible[0], the descriptions from
 * DefinitelyTyped are not.  So we use this one instead.
 *
 * I did not find a simple way of saying "this module has just the same API as
 * ng.IQService" because one is a module and the other is an interface. So I
 * copied the whole description over.
 *
 * [0]: https://docs.angularjs.org/api/ng/service/$q#differences-between-kris-kowal-s-q-and-q
 */
declare module "q" {
    export function all(promises: ng.IPromise<any>[]): ng.IPromise<any[]>;
    export function all(promises: { [id: string]: ng.IPromise<any>; }): ng.IPromise<{ [id: string]: any }>;
    export function defer<T>(): ng.IDeferred<T>;
    export function reject(reason?: any): ng.IPromise<void>;
    export function when<T>(value: ng.IPromise<T>): ng.IPromise<T>;
    export function when<T>(value: T): ng.IPromise<T>;
    export function when(): ng.IPromise<void>;
}
