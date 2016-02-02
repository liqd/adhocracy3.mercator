import * as AdhComment from "./Comment";
import * as AdhUtil from "../Util/Util";

import * as ResourcesBase from "../../ResourcesBase";

import RICommentVersion from "../../Resources_/adhocracy_core/resources/comment/ICommentVersion";
import RIComment from "../../Resources_/adhocracy_core/resources/comment/IComment";
import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";
import * as SICommentable from "../../Resources_/adhocracy_core/sheets/comment/ICommentable";
import * as SIComment from "../../Resources_/adhocracy_core/sheets/comment/IComment";
import * as SIMetadata from "../../Resources_/adhocracy_core/sheets/metadata/IMetadata";


export class CommentAdapter implements AdhComment.ICommentAdapter<RICommentVersion> {
    contentType : string = RICommentVersion.content_type;
    itemContentType : string = RIComment.content_type;

    // FIXME: settings here is expected to be the union of the
    // constructor arguments of the resource and all sheets.  i would
    // like to suggest a couple of tasks:
    //
    // (0) rename "settings" to "args" for naming consistency with
    //     resource classes.
    // (1) annotate arguments with types to make this appearent.
    // (2) cast sheet parameters to restricted types.
    // (3) re-think whether we *really* want to pass around unions of
    //     argument sets.  not only is this weird to use for the
    //     caller, but it will fail tragically as soon as some sheet
    //     uses the a constructor parameter already used by some other
    //     sheet or by the resource.
    //
    // See ../Rating/Adapter for matthias' approach.
    create(settings) : RICommentVersion {
        var resource = new RICommentVersion(settings);
        resource.data[SIComment.nick] =
            new SIComment.Sheet(settings);
        resource.data[SIVersionable.nick] =
            new SIVersionable.Sheet(settings);
        return resource;
    }

    createItem(settings) : RIComment {
        return new RIComment(settings);
    }

    content(resource : RICommentVersion) : string;
    content(resource : RICommentVersion, value : string) : RICommentVersion;
    content(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data[SIComment.nick].content = value;
            return resource;
        } else {
            return resource.data[SIComment.nick].content;
        }
    }

    refersTo(resource : RICommentVersion) : string;
    refersTo(resource : RICommentVersion, value : string) : RICommentVersion;
    refersTo(resource, value?) {
        if (typeof value !== "undefined") {
            resource.data[SIComment.nick].refers_to = value;
            return resource;
        } else {
            return resource.data[SIComment.nick].refers_to;
        }
    }

    creator(resource : RICommentVersion) : string {
        return resource.data[SIMetadata.nick].creator;
    }

    creationDate(resource : RICommentVersion) : string {
        return resource.data[SIMetadata.nick].item_creation_date;
    }

    modificationDate(resource : RICommentVersion) : string {
        return resource.data[SIMetadata.nick].modification_date;
    }

    commentCount(resource : RICommentVersion) : number {
        return resource.data[SICommentable.nick].comments_count;
    }

    edited(resource : RICommentVersion) : boolean {
        // NOTE: this is lexicographic comparison. Might break if the datetime
        // encoding changes.
        var meta = resource.data[SIMetadata.nick];
        return meta.modification_date > meta.item_creation_date;
    }

    elemRefs(container : ResourcesBase.Resource) {
        return AdhUtil.eachItemOnce(container.data[SICommentable.nick].comments);
    }

    poolPath(container : ResourcesBase.Resource) {
        return container.data[SICommentable.nick].post_pool;
    }
}
