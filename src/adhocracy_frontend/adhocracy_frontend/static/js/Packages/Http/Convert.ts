/// <reference path="../../../lib2/types/lodash.d.ts"/>

import * as _ from "lodash";

import * as AdhMetaApi from "../MetaApi/MetaApi";
import * as AdhPreliminaryNames from "../PreliminaryNames/PreliminaryNames";

import * as ResourcesBase from "../../ResourcesBase";
import * as Resources_ from "../../Resources_";

import * as SIPool from "../../Resources_/adhocracy_core/sheets/pool/IPool";

import * as AdhCache from "./Cache";


var sanityCheck = (obj : ResourcesBase.IResource) : void => {
    if (typeof obj !== "object") {
        throw ("unexpected type: " + (typeof obj).toString() + "\nin object:\n" + JSON.stringify(obj, null, 2));
    }

    if (!obj.hasOwnProperty("content_type")) {
        throw ("resource has no content_type field:\n" + JSON.stringify(obj, null, 2));
    }

    if (!Resources_.resourceRegistry.hasOwnProperty(obj.content_type)) {
        throw ("unknown content_type: " + obj.content_type + "\nin object:\n" + JSON.stringify(obj, null, 2));
    }
};


/**
 * transform objects on the way in (all request methods)
 */
export var importResource = <R extends ResourcesBase.IResource>(
    response : {data : R},
    metaApi : AdhMetaApi.Service,
    preliminaryNames : AdhPreliminaryNames.Service,
    adhCache : AdhCache.Service,
    warmupPoolCache : boolean = false,
    originalElements : string = "omit"
) : R => {
    "use strict";

    var obj = response.data;
    sanityCheck(obj);

    if (!obj.hasOwnProperty("path")) {
        throw ("resource has no path field: " + JSON.stringify(obj, null, 2));
    }

    // construct resource

    var _rclass = Resources_.resourceRegistry[obj.content_type];
    var _obj = new _rclass({
        preliminaryNames: preliminaryNames,
        path: obj.path
    });

    if (obj.hasOwnProperty("first_version_path")) {
        _obj.first_version_path = obj.first_version_path;
    }

    if (obj.hasOwnProperty("root_versions")) {
        _obj.root_versions = obj.root_versions;
    }

    // iterate over all delivered sheets and construct instances

    _.forOwn(obj.data, (jsonSheet, sheetName) => {
        if (!Resources_.sheetRegistry.hasOwnProperty(sheetName)) {
            throw ("unknown property sheet: " + sheetName + " " + JSON.stringify(obj, null, 2));
        }

        if (warmupPoolCache && (sheetName === SIPool.nick)) {
            var elementsPaths = [];

            _.forEach(jsonSheet.elements, (rawSubresource : any) => {
                var pseudoResponse = {
                    data: rawSubresource
                };
                var subresource = importResource(pseudoResponse, metaApi, preliminaryNames, adhCache);
                adhCache.putCached(rawSubresource.path, "", subresource);
                elementsPaths.push(rawSubresource.path);
            });

            if (originalElements === "content") {
                // do nothing
            } else if (originalElements === "paths") {
                jsonSheet.elements = elementsPaths;
            } else {
                jsonSheet.elements = [];
            }
        }

        var _sclass = Resources_.sheetRegistry[sheetName];
        _obj.data[sheetName] = _sclass.parse(jsonSheet);

        // the above four lines compile because we leave
        // typescript in the dark about the actual type of _class.
        // har!
        //
        // NOTE: passing the json sheet to the constructor rather than
        // iterating through it and assigning the values to the sheet
        // manually is important.  the constructor has to parse some
        // field types (e.g. Date).
    });

    // return

    return _obj;


    // FIXME: it would be nice if this function could throw an
    // exception at run-time if the type of obj does not match
    // R.  however, not only is R a compile-time entity,
    // but it may very well be based on an interface that has no
    // run-time entity anywhere.  two options:
    //
    // (1) http://stackoverflow.com/questions/24056019/is-there-a-way-to-check-instanceof-on-types-dynamically
    //
    // (2) typescript language feature request! :)
    //
    //
    // the following function would be useful if the problem of
    // turning abstract types into runtime objects could be solved.
    // (for the time being, it has been removed from the Util module
    // where it belongs.)
    //
    //
    //   // in a way another function in the deep* family: check that _super
    //   // has only attributes also available in _sub.  also check recursively
    //   // (if _super has an object attribute, its counterpart in _sub must
    //   // have the same attributes, and so on).
    //
    //   // FIXME: untested!
    //   export function subtypeof(_sub, _super) {
    //       if (typeof _sub !== typeof _super) {
    //           return false;
    //       }
    //
    //       if (typeof(_sub) === "object") {
    //           if (_sub === null || _super === null) {
    //               return true;
    //           }
    //
    //           for (var x in _super) {
    //               if (!(x in _sub)) { return false; }
    //               if (!subtypeof(_sub[x], _super[x])) { return false; }
    //           }
    //       }
    //
    //       return true;
    //   }
};


/**
 * transform batch request response into resource array
 *
 * NOTE: The single batched http requests listed in the response array
 * of the batch request confusingly call the response body 'body',
 * while $http calls it 'data'.  `logBackendBatchError` and
 * `importBatchResources` are (the only two) places where this requires
 * writing a few lines of awkward code.  Fixing it would require
 * changes to /docs/source/rest_api.rst, backend, and these two
 * functions simultaneously and has not been deemed worthwhile so
 * far.
 */
export var importBatchResources = (
    responses,
    metaApi : AdhMetaApi.Service,
    preliminaryNames : AdhPreliminaryNames.Service,
    adhCache : AdhCache.Service
) : ResourcesBase.IResource[] => {

    return responses.map((response) => {
        response.data = response.body;
        delete response.body;
        return importResource(response, metaApi, preliminaryNames, adhCache);
    });
};


/**
 * prepare object for post or put.  remove all fields that are none of
 * editable, creatable, create_mandatory.  remove all sheets that have
 * no fields after this.
 *
 * FIXME: there is a difference between put and post.  namely, fields
 * that may be created but not edited should be treated differently.
 * also, fields with create_mandatory should not be missing from the
 * posted object.
 */
export var exportResource = <R extends ResourcesBase.IResource>(
    adhMetaApi : AdhMetaApi.Service,
    obj : R,
    keepMetadata : boolean = false
) : R => {
    "use strict";

    sanityCheck(obj);
    var newobj : R = _.cloneDeep(obj);

    // remove some fields from newobj.data[*] and empty sheets from
    // newobj.data.
    for (var sheetName in newobj.data) {
        if (newobj.data.hasOwnProperty(sheetName) && adhMetaApi.sheetExists(sheetName)) {
            var sheet : AdhMetaApi.ISheet = newobj.data[sheetName];
            var keepSheet : boolean = false;

            for (var fieldName in sheet) {
                if (sheet.hasOwnProperty(fieldName) && adhMetaApi.fieldExists(sheetName, fieldName)) {
                    var fieldMeta : AdhMetaApi.ISheetField = adhMetaApi.field(sheetName, fieldName);

                    if (fieldMeta.editable || fieldMeta.creatable || fieldMeta.create_mandatory) {
                        keepSheet = true;
                    } else {
                        delete sheet[fieldName];
                    }
                    // workaround, as normal users can not set `hidden` field
                    // FIXME: use more appropriate place, e.g. expose in meta api
                    if (!keepMetadata && sheetName === "adhocracy_core.sheets.metadata.IMetadata" && fieldName === "hidden") {
                        delete sheet[fieldName];
                    }
                }
            }

            if (!keepSheet) {
                delete newobj.data[sheetName];
            }
        }
    }

    delete newobj.path;
    return newobj;
};
