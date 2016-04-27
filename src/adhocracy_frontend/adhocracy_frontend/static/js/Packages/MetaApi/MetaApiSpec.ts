/// <reference path="../../../lib2/types/jasmine.d.ts"/>

import * as AdhMetaApi from "./MetaApi";

var sampleMetaApi : AdhMetaApi.IMetaApi = {
    "resources" : {
        "adhocracy_core.resources.root.IRootPool" : {
            "sheets" : [
                "adhocracy_core.sheets.name.IName",
                "adhocracy_core.sheets.pool.IPool",
                "adhocracy_core.sheets.metadata.IMetadata"
            ],
            "element_types" : [
                "adhocracy_core.interfaces.IPool"
            ],
            "super_types" : []
        }
    },
    "sheets" : {
        "adhocracy_core.sheets.metadata.IMetadata" : {
            "fields" : [
                {
                    "name" : "creator",
                    "readable" : true,
                    "editable" : false,
                    "create_mandatory" : false,
                    "valuetype" : "adhocracy_core.schema.AbsolutePath",
                    "targetsheet" : "adhocracy_core.sheets.principal.IUserBasic",
                    "containertype" : "list",
                    "creatable" : false
                },
                {
                    "create_mandatory" : false,
                    "creatable" : false,
                    "readable" : true,
                    "editable" : false,
                    "valuetype" : "adhocracy_core.schema.DateTime",
                    "name" : "creation_date"
                },
                {
                    "editable" : false,
                    "readable" : true,
                    "create_mandatory" : false,
                    "creatable" : false,
                    "valuetype" : "adhocracy_core.schema.DateTime",
                    "name" : "modification_date"
                }
            ]
        },
        "adhocracy_core.sheets.name.IName" : {
            "fields" : [
                {
                    "readable" : true,
                    "editable" : false,
                    "create_mandatory" : true,
                    "creatable" : true,
                    "valuetype" : "adhocracy_core.schema.Name",
                    "name" : "name"
                }
            ]
        },
        "adhocracy_core.sheets.pool.IPool" : {
            "fields" : [
                {
                    "name" : "elements",
                    "create_mandatory" : false,
                    "readable" : true,
                    "editable" : false,
                    "valuetype" : "adhocracy_core.schema.AbsolutePath",
                    "targetsheet" : "adhocracy_core.interfaces.ISheet",
                    "containertype" : "list",
                    "creatable" : false
                }
            ]
        }
    }
};


export var register = () => {
    describe("MetaApi", () => {
        var adhMetaApi : AdhMetaApi.Service;

        beforeEach(() => {
            adhMetaApi = new AdhMetaApi.Service(sampleMetaApi);
        });

        it("returns the right resource meta data.", () => {
            var sheetsList = adhMetaApi.resource("adhocracy_core.resources.root.IRootPool").sheets;
            expect(sheetsList.indexOf("adhocracy_core.sheets.name.IName") >= 0).toBe(true);
        });

        it("returns the right sheet meta data.", () => {
            expect(adhMetaApi.sheet("adhocracy_core.sheets.metadata.IMetadata")).toBeTruthy();
        });

        it("returns the right field meta data.", () => {
            expect(adhMetaApi.field("adhocracy_core.sheets.pool.IPool", "elements").name).toBe("elements");
            expect(adhMetaApi.field("adhocracy_core.sheets.pool.IPool", "elements").editable).toBe(false);
        });

        it("crashes if unhappy", () => {
            expect(() => adhMetaApi.resource("blörg")).toThrow();
            expect(() => adhMetaApi.sheet("blürg")).toThrow();
            expect(() => adhMetaApi.field("adhocracy_core.sheets.name.IName", "fee")).toThrow();
        });
    });
};
