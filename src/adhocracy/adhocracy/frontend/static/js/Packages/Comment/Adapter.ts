import RICommentVersion = require("../../Resources_/adhocracy_sample/resources/comment/ICommentVersion");
import SIComment = require("../../Resources_/adhocracy_sample/sheets/comment/IComment");

import AdhComment = require("./Comment");
import AdhPreliminaryNames = require("../../Packages/PreliminaryNames/PreliminaryNames");

import Util = require("../Util/Util");


export class CommentAdapter implements AdhComment.ICommentAdapter<RICommentVersion> {
    create(adhPreliminaryNames : AdhPreliminaryNames) : RICommentVersion {
        var resource = new RICommentVersion({preliminaryNames: adhPreliminaryNames});
        resource.data["adhocracy_sample.sheets.comment.IComment"] =
            new SIComment.AdhocracySampleSheetsCommentIComment({
                refers_to: null,
                content: null
            });
        return resource;
    }

    content(resource : RICommentVersion) : string;
    content(resource : RICommentVersion, value : string) : RICommentVersion;
    content(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data["adhocracy_sample.sheets.comment.IComment"].content = value;
            return resource;
        } else {
            return resource.data["adhocracy_sample.sheets.comment.IComment"].content;
        }
    }

    refersTo(resource : RICommentVersion) : string;
    refersTo(resource : RICommentVersion, value : string) : RICommentVersion;
    refersTo(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data["adhocracy_sample.sheets.comment.IComment"].refers_to = value;
            return resource;
        } else {
            return resource.data["adhocracy_sample.sheets.comment.IComment"].refers_to;
        }
    }

    creator(resource : RICommentVersion) : string {
        return resource.data["adhocracy.sheets.metadata.IMetadata"].creator;
    }

    creationDate(resource : RICommentVersion) : string {
        return resource.data["adhocracy.sheets.metadata.IMetadata"].item_creation_date;
    }

    modificationDate(resource : RICommentVersion) : string {
        return resource.data["adhocracy.sheets.metadata.IMetadata"].modification_date;
    }

    commentCount(resource : RICommentVersion) : number {
        return Util.latestVersionsOnly(resource.data["adhocracy_sample.sheets.comment.ICommentable"].comments).length;
    }
}
