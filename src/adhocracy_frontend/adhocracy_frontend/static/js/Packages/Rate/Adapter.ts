import AdhPreliminaryNames = require("../PreliminaryNames/PreliminaryNames");

import ResourcesBase = require("../../ResourcesBase");

import RIRate = require("../../Resources_/adhocracy_core/resources/rate/IRate");
import RIRateVersion = require("../../Resources_/adhocracy_core/resources/rate/IRateVersion");
import SILikeable = require("../../Resources_/adhocracy_core/sheets/rate/ILikeable");
import SIMetadata = require("../../Resources_/adhocracy_core/sheets/metadata/IMetadata");
import SIRateable = require("../../Resources_/adhocracy_core/sheets/rate/IRateable");
import SIRate = require("../../Resources_/adhocracy_core/sheets/rate/IRate");
import SIVersionable = require("../../Resources_/adhocracy_core/sheets/versions/IVersionable");

import AdhRate = require("./Rate");


export class RateAdapter implements AdhRate.IRateAdapter<RIRateVersion> {
    create(args : {
        preliminaryNames : AdhPreliminaryNames.Service;
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

        resource.data[SIRate.nick] =
            new SIRate.Sheet({subject: args.subject, object: args.object, rate: <any>args.rate });

        resource.data[SIVersionable.nick] =
            new SIVersionable.Sheet({follows: [args.follows]});

        return resource;
    }

    createItem(args : { preliminaryNames : AdhPreliminaryNames.Service; path ?: string }) : RIRate {
        return new RIRate(args);
    }

    isRate(resource : ResourcesBase.Resource) : boolean {
        return resource.content_type === "adhocracy_core.resources.rate.IRateVersion";
    }

    isRateable(resource : ResourcesBase.Resource) : boolean {
        return (
            resource.data.hasOwnProperty(SIRateable.nick) ||
            resource.data.hasOwnProperty(SILikeable.nick)
        );
    }

    rateablePostPoolPath(resource : ResourcesBase.Resource) : string {
        if (resource.data.hasOwnProperty(SIRateable.nick)) {
            return resource.data[SIRateable.nick].post_pool;
        } else if (resource.data.hasOwnProperty(SILikeable.nick)) {
            return resource.data[SILikeable.nick].post_pool;
        } else {
            throw "could not find any sub-sheet of IRateable!";
        }
    }

    subject(resource : RIRateVersion) : string;
    subject(resource : RIRateVersion, value : string) : RIRateVersion;
    subject(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data[SIRate.nick].subject = value;
            return resource;
        } else {
            return resource.data[SIRate.nick].subject;
        }
    }

    object(resource : RIRateVersion) : string;
    object(resource : RIRateVersion, value : string) : RIRateVersion;
    object(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data[SIRate.nick].object = value;
            return resource;
        } else {
            return resource.data[SIRate.nick].object;
        }
    }

    rate(resource : RIRateVersion) : number;
    rate(resource : RIRateVersion, value : number) : RIRateVersion;
    rate(resource, value?) {
        var sheet : { rate: number } = resource.data[SIRate.nick];
        if (typeof value !== "undefined") {
            sheet.rate = value;
            return resource;
        } else {
            return parseInt(<any>sheet.rate, 10);
        }
    }

    creator(resource : RIRateVersion) : string {
        return resource.data[SIMetadata.nick].creator;
    }

    creationDate(resource : RIRateVersion) : string {
        return resource.data[SIMetadata.nick].item_creation_date;
    }

    modificationDate(resource : RIRateVersion) : string {
        return resource.data[SIMetadata.nick].modification_date;
    }
}
