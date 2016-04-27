import * as _ from "lodash";

import * as AdhMetaApi from "../MetaApi/MetaApi";

import * as ResourcesBase from "../../ResourcesBase";

import * as SIVersionable from "../../Resources_/adhocracy_core/sheets/versions/IVersionable";

import * as AdhUtil from "./Util";


/**
 * Create a new version following an existing one.
 */
export var derive = <R extends ResourcesBase.IResource>(oldVersion : R, settings) : R => {
    var resource = new (<any>oldVersion).constructor(settings);

    _.forOwn(oldVersion.data, (sheet, key) => {
        resource.data[key] = new sheet.constructor(settings);

        _.forOwn(sheet, (value, field) => {
            resource.data[key][field] = _.cloneDeep(value);
        });
    });

    resource.data[SIVersionable.nick] = new SIVersionable.Sheet({follows: [oldVersion.path]});

    return resource;
};


export var hasEqualContent = (resource1 : ResourcesBase.IResource, resource2 : ResourcesBase.IResource) : boolean => {
    // note: this assumes that both resources share the same set of sheets, as it's currently
    // always used after derive.

    var equal = true;
    _.forOwn(resource1.data, (sheet, key) => {
        var sheet2 = resource2.data[key];

        if (key !== "adhocracy_core.sheets.versions.IVersionable") {
            _.forOwn(sheet, (value, field) => {
                if (!_.isEqual(value, sheet2[field])) {
                    equal = false;
                }
            });
        }
    });
    return equal;
};


export var isInstanceOf = (
    resource : ResourcesBase.IResource,
    resourceType : string,
    adhMetaApi : AdhMetaApi.Service
) : boolean => {
    var resourceMeta = adhMetaApi.resource(resource.content_type);
    return resourceType === resource.content_type || _.includes(resourceMeta.super_types, resourceType);
};


export var getReferences = (resource : ResourcesBase.IResource, adhMetaApi : AdhMetaApi.Service) : string[] => {
    var results : string[] = [];

    _.forOwn(resource.data, (sheet, sheetName : string) => {
        _.forOwn(sheet, (value, fieldName : string) => {
            if (adhMetaApi.fieldExists(sheetName, fieldName)) {
                var fieldMeta = adhMetaApi.field(sheetName, fieldName);
                if (fieldMeta.valuetype === "adhocracy_core.schema.AbsolutePath") {
                    results.push(value);
                }
            }
        });
    });

    return results;
};


/**
 * Create an IDag<Resource> out of given resources.
 *
 * FIXME: this should probably go into something like ResourcesUtil or Packages/Resources/Util
 */
export var sortResourcesTopologically = (
    resources : ResourcesBase.IResource[],
    adhPreliminaryNames,
    adhMetaApi : AdhMetaApi.Service
) : ResourcesBase.IResource[] => {
    // prepare DAG
    // sources are resource paths without incoming references
    // FIXME: DefinitelyTyped
    var dag : AdhUtil.IDag<ResourcesBase.IResource> = (<any>_).fromPairs(_.map(resources, (resource) => [resource.path, {
            content: resource, incoming: [], outgoing: [], done: false
    }]));
    var sources : string[] = [];

    // fill edges, determine possible starter sources
    _.forEach(dag, (vertex : AdhUtil.IVertex<ResourcesBase.IResource>, key, l) => {
        var references = getReferences(vertex.content, adhMetaApi);

        if (typeof vertex.content.parent !== "undefined") {
            references.push(vertex.content.parent);
        }

        references = _.uniq(references);
        references = _.filter(references, adhPreliminaryNames.isPreliminary);

        dag[key].incoming = references;

        if (_.isEmpty(references)) {
            sources.push(key);
        }

        _.forEach(references, (reference) => {
            dag[reference].outgoing.push(key);
        });
    });

    return AdhUtil.sortDagTopologically(dag, sources);
};
