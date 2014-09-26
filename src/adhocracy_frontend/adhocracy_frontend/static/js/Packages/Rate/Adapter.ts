import _ = require("lodash");

import ResourcesBase = require("../../ResourcesBase");
import PreliminaryNames = require("../PreliminaryNames/PreliminaryNames");

import RIRate = require("../../Resources_/adhocracy_core/resources/rate/IRate");
import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
// import SICanRate = require("../../Resources_/adhocracy_core/sheets/rate/ICanRate");
// import SIRateable = require("../../Resources_/adhocracy_core/sheets/rate/IRateable");
import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");

import AdhRate = require("./Rate");


export class RateAdapter implements AdhRate.IRateAdapter<RIRateVersion> {
    create(args : {
        preliminaryNames : PreliminaryNames;
        path ?: string;
        name ?: string;
        subject : string;
        object : string;
        rate ?: number;
        follows : string;
    }) : RIRateVersion {
        var resource = new RIRateVersion({
            preliminaryNames: args.preliminaryNames,
            path: args.path,
            name: args.name
        });
        if (typeof args.rate === "undefined") {
            args.rate = 0;
        }

        resource.data["adhocracy_core.sheets.rate.IRate"] =
            new SIRate.AdhocracyCoreSheetsRateIRate({subject: args.subject, object: args.object, rate: args.rate });

        resource.data["adhocracy_core.sheets.versions.IVersionable"] =
            new SIVersionable.AdhocracyCoreSheetsVersionsIVersionable({follows: [args.follows]});

        return resource;
    }

    createItem(args : { preliminaryNames : PreliminaryNames; path ?: string }) : RIRate {
        return new RIRate(args);
    }

    // FIXME: move to a service (also do it in Comment)
    derive<R extends ResourcesBase.Resource>(oldVersion : R, settings) : R {
        var resource = new (<any>oldVersion).constructor(settings);

        _.forOwn(oldVersion.data, (sheet, key) => {
            resource.data[key] = new sheet.constructor(settings);

            _.forOwn(sheet, (value, field) => {
                resource.data[key][field] = _.cloneDeep(value);
            });
        });

        resource.data["adhocracy_core.sheets.versions.IVersionable"] =
            new SIVersionable.AdhocracyCoreSheetsVersionsIVersionable({follows: [oldVersion.path]});

        return resource;
    }

    isRate(resource : ResourcesBase.Resource) : boolean {
        return resource.content_type === "adhocracy_core.resources.rate.IRateVersion";
    }

    isRateable(resource : ResourcesBase.Resource) : boolean {
        return resource.data.hasOwnProperty("adhocracy_core.sheets.rate.IRateable");
    }

    rateablePostPoolPath(resource : ResourcesBase.Resource) : string {
        return resource.data["adhocracy_core.sheets.rate.IRateable"].post_pool;
    }

    subject(resource : RIRateVersion) : string;
    subject(resource : RIRateVersion, value : string) : RIRateVersion;
    subject(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data["adhocracy_core.sheets.rate.IRate"].subject = value;
            return resource;
        } else {
            return resource.data["adhocracy_core.sheets.rate.IRate"].subject;
        }
    }

    object(resource : RIRateVersion) : string;
    object(resource : RIRateVersion, value : string) : RIRateVersion;
    object(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data["adhocracy_core.sheets.rate.IRate"].object = value;
            return resource;
        } else {
            return resource.data["adhocracy_core.sheets.rate.IRate"].object;
        }
    }

    rate(resource : RIRateVersion) : number;
    rate(resource : RIRateVersion, value : number) : RIRateVersion;
    rate(resource, value?) {
        var sheet : { rate: number } = resource.data["adhocracy_core.sheets.rate.IRate"];
        if (typeof value !== "undefined") {
            sheet.rate = value;
            return resource;
        } else {
            return parseInt(<any>sheet.rate, 10);
        }
    }

    creator(resource : RIRateVersion) : string {
        return resource.data["adhocracy_core.sheets.metadata.IMetadata"].creator;
    }

    creationDate(resource : RIRateVersion) : string {
        return resource.data["adhocracy_core.sheets.metadata.IMetadata"].item_creation_date;
    }

    modificationDate(resource : RIRateVersion) : string {
        return resource.data["adhocracy_core.sheets.metadata.IMetadata"].modification_date;
    }
}
