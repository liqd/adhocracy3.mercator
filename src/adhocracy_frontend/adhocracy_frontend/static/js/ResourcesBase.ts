export interface ISheetMetaApi {
    // meta api flags
    readable : string[];
    editable : string[];
    creatable : string[];
    create_mandatory : string[];

    // computed information
    references : string[];
}


export interface IResourceClass {
    content_type : string;
}


export interface IResource {
    data : Object;
    path : string;
    content_type : string;
    parent? : string;
    first_version_path? : string;
    root_versions? : string[];
}


export class Resource implements IResource {
    public data : Object;

    // these path attributes may be undefined or null.
    /* tslint:disable:variable-name */
    public path : string;
    public parent : string;
    public first_version_path : string;
    public root_versions : string[];
    public static super_types : string[];
    public static sheets : string[];

    constructor(public content_type : string) {
        this.data = {};
    }
    /* tslint:enable:variable-name */
}
