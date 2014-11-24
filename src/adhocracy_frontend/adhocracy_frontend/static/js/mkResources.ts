/// <reference path="../lib/DefinitelyTyped/requirejs/require.d.ts"/>
/// <reference path="../lib/DefinitelyTyped/lodash/lodash.d.ts"/>

/* tslint:disable:no-var-requires */
var http : any = require("http");
var fs : any = require("fs");
var _fs : any = require("node-fs");
var _s : any = require("underscore.string");
/* tslint:enable:no-var-requires */

declare var process : any;

import Base = require("./ResourcesBase");
import UtilR = require("./mkResources/Util");
import MetaApi = require("./Packages/Http/MetaApi");



/**
 * How to handle API changes
 * ~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * The effect of changes in the meta api on the existing code are very
 * limited.  The local name of an imported module never has to change,
 * because it is local, and new names can be chosen such that name
 * clashes are always avoided.  For example, if some module in some
 * package contains the line:
 *
 * | import RIPropsal = "...";
 *
 * The name RIProposal never needs to change.
 *
 * The content_type strings and the dictionary keys for the sheets
 * never need to be changed in the code either, as they are exported
 * from the generated modules.  If they change, they will do so
 * transparently, and the code will use the new names consistently.
 *
 * To make sure that no string literals are used anywhere outside the
 * generated modules for naming content_type fields of resources or
 * sheet keys, there is a script that scans for them.  FIXME: to be done!
 *
 * Changes that may require changing code manually:
 *
 *   1. module path changes (e.g., RIProposal moves from
 *      ".../adh/IProposal.ts" to ".../adh/core/IProposal.ts"
 *
 *   2. a resource drops a sheet (that is used somewhere).
 *
 *   3. a sheet drops a field (that is used somewhere).
 *
 *   4. a sheet changes its type and semantics without changing its
 *      name.
 *
 * (4) is bad practice and therefore disallowed.  All other changes
 * will be caught by the compiler and have to be fixed before the code
 * builds again, so they impose a very small productivity penalty on
 * the evolution of the content type hierarchy.
 *
 * (The only CAVEAT is that if you change the path of one module to be
 * the path of another, formerly existing module, you may get
 * confusing type errors or unit test failures instead of "import path
 * does not exist".  But even then, the errors should point you in the
 * right direction if you know about the recent API changes.)
 */


// FIXME: adapter code will be written manually written files in the
// directory tree under Resources_.  this means that we will commit
// auto-generated code, and also that we will have to think of a
// better solution for cleanup than `rm -r Resources`.  one option is
// to auto-generate a shell script during module generation that
// removes all generated files if executed.  (or, a bit less
// extravagant, just a file list that can be processed by a cleanup
// make or buildout rule or whatnot.)


// FIXME:
// mv Resources.Content to ResourcesBase.
// rm Resources.ts
// mv Resources_.ts to Resources.ts
// since Resources.ts is not required any more, add it to the Makefile explicitly



/***********************************************************************
 * config section
 */

interface IConfig {
    nickNames : boolean;
    sheetGetters : boolean;
    sheetSetters : boolean;
    httpOptions : {
        host: string;
        port: number;
        path: string;
    }
}

var config : IConfig = {
    nickNames : false,
    sheetGetters : false,
    sheetSetters : false,
    httpOptions : {
        host: "127.0.0.1",
        port: 6541,
        path: "/meta_api/"
    }
};



/***********************************************************************
 * types
 */

interface FieldType {
    resultType : string;
    constructorType : string;
    parser? : string;
}


var compileAll : (metaApi: MetaApi.IMetaApi, outPath : string) => void;

var renderSheet : (modulePath : string, sheet : MetaApi.ISheet, modules : MetaApi.IModuleDict, metaApi : MetaApi.IMetaApi) => void;
var mkFieldSignatures : (fields : MetaApi.ISheetField[], tab : string, separator : string) => string;
var mkFieldSignaturesSheetCons : (fields : MetaApi.ISheetField[], tab : string, separator : string) => string;
var mkFieldAssignments : (fields : MetaApi.ISheetField[], tab : string) => string;
var enabledFields : (fields : MetaApi.ISheetField[], enableFlags ?: string) => MetaApi.ISheetField[];
var mkSheetSetter : (modulePath : string, fields : MetaApi.ISheetField[], _selfType : string) => string;
var mkSheetGetter : (modulePath : string, _selfType : string) => string;

var renderResource : (modulePath : string, resource : MetaApi.IResource, modules : MetaApi.IModuleDict, metaApi : MetaApi.IMetaApi) => void;

var mkSheetName : (sheet : string) => string;
var mkHasSheetName : (sheet : string) => string;
var mkResourceClassName : (resource : string) => string;
var mkModuleName : (module : string, metaApi : MetaApi.IMetaApi) => string;
var mkImportStatement : (modulePath : string, relativeRoot : string, metaApi : MetaApi.IMetaApi) => string;
var mkNick : (modulePath : string, metaApi : MetaApi.IMetaApi) => string;
var mkFieldType : (field : MetaApi.ISheetField) => FieldType;
var mkFlags : (field : MetaApi.ISheetField, comment ?: boolean) => string;
var isReadableField : (field : MetaApi.ISheetField) => boolean;
var isWriteableField : (field : MetaApi.ISheetField) => boolean;

var mkdirForFile : (file : string) => void;
var pyModuleToTsModule : (module : string) => string;
var mkRelativeRoot : (source : string) => string;
var canonicalizePath : (path : string) => string;



/***********************************************************************
 * fetch api
 */

var callback = (response) => {
    var body : string = "";
    var bodyJs : MetaApi.IMetaApi;

    var cbData = (chunk : string) : void => {
        body += chunk;
    };

    var cbEnd = (chunk : string) : void => {
        if (typeof chunk !== "undefined") {
            body += chunk;
        };

        bodyJs = JSON.parse(body);
        console.log(JSON.stringify(bodyJs, null, 2));

        compileAll(bodyJs, ".");
    };

    var cbError = (x, y, z) : void => {
        console.log("error", x, y, z);
    };

    console.log(response.statusCode);

    response.on("data", cbData);
    response.on("end", cbEnd);
    response.on("error", cbError);
};

if (process.argv.length > 2) {
    // Use JSON data from given file (e.g. meta_api.json)
    // if called like `node mkResources.js meta_api.json`
    fs.readFile(process.argv[2], "utf8", (err, data) => {
        var bodyJs = JSON.parse(data);
        compileAll(bodyJs, process.argv[3]);
    });
} else {
    // Use JSON data from a running server if called without
    // further argument, e.g. `node mkResources.js`
    http.request(config.httpOptions, callback).end();
}



/***********************************************************************
 * renderers
 */

compileAll = (metaApi : MetaApi.IMetaApi, outPath : string) : void => {
    var modules : MetaApi.IModuleDict = {};

    if (config.nickNames) {
        UtilR.injectNickDict(metaApi.sheets);
        UtilR.injectNickDict(metaApi.resources);
    } else {
        var name : string;
        for (name in metaApi.sheets) {
            if (metaApi.sheets.hasOwnProperty(name)) {
                metaApi.sheets[name].nick = name;
            }
        }
        for (name in metaApi.resources) {
            if (metaApi.resources.hasOwnProperty(name)) {
                metaApi.resources[name].nick = name;
            }
        }
    }

    for (var sheetName in metaApi.sheets) {
        if (metaApi.sheets.hasOwnProperty(sheetName)) {
            renderSheet(sheetName, metaApi.sheets[sheetName], modules, metaApi);
        }
    }

    for (var resourceName in metaApi.resources) {
        if (metaApi.resources.hasOwnProperty(resourceName)) {
            renderResource(resourceName, metaApi.resources[resourceName], modules, metaApi);
        }
    }

    var headerFooter = (relativeRoot : string, contents : string) : string => {
        var header = "";
        header += "/* tslint:disable:variable-name */\n\n";
        header += "import Base = require(\"" + canonicalizePath(relativeRoot + "../ResourcesBase") + "\");\n";
        header += "import PreliminaryNames = require(\"" +
            canonicalizePath(relativeRoot + "../Packages/PreliminaryNames/PreliminaryNames") + "\");\n\n";

        var footer = "";
        footer += "/* tslint:enable:variable-name */\n";

        return header + contents + footer;
    };

    // generate sheet and resource modules
    (() => {
        for (var modulePath in modules) {
            if (modules.hasOwnProperty(modulePath)) {
                var absfp = outPath + "/Resources_/" + pyModuleToTsModule(modulePath) + ".ts";
                var relativeRoot = mkRelativeRoot(pyModuleToTsModule(modulePath));
                var contents = headerFooter(relativeRoot, modules[modulePath]);
                mkdirForFile(absfp);
                fs.writeFileSync(absfp, contents);
            }
        }
    })();

    // generate root module Resources_.ts
    (() => {
        var rootModule = "";
        var relativeRoot = outPath + "/Resources_/";
        var imports : string[] = [];
        (() => {
            for (var modulePath in modules) {
                if (modules.hasOwnProperty(modulePath)) {
                    imports.push(mkImportStatement(modulePath, relativeRoot, metaApi));
                }
            }
            imports.sort();
            rootModule += imports.join("") + "\n";
        })();

        // resource registry.
        (() => {
            var dictEntries : string[] = [];
            for (var modulePath in metaApi.resources) {
                if (metaApi.resources.hasOwnProperty(modulePath)) {
                    dictEntries.push("    \"" + modulePath + "\": " + mkModuleName(modulePath, metaApi));
                }
            }
            dictEntries.sort();
            rootModule += "export var resourceRegistry = {\n" + dictEntries.join(",\n") + "\n};\n\n";
        })();

        // sheet registry.
        (() => {
            var dictEntries : string[] = [];
            for (var modulePath in metaApi.sheets) {
                if (metaApi.sheets.hasOwnProperty(modulePath)) {
                    dictEntries.push(
                            "    \"" + modulePath + "\": "
                            + mkModuleName(modulePath, metaApi) + ".Sheet");
                }
            }
            dictEntries.sort();
            rootModule += "export var sheetRegistry = {\n" + dictEntries.join(",\n") + "\n};\n";
        })();

        var absfp = outPath + "/Resources_.ts";
        fs.writeFileSync(absfp, headerFooter(relativeRoot, rootModule));
    })();
};

renderSheet = (modulePath : string, sheet : MetaApi.ISheet, modules : MetaApi.IModuleDict, metaApi : MetaApi.IMetaApi) : void => {
    var sheetI : string = "";
    var hasSheetI : string = "";

    var sheetMetaApi : Base.ISheetMetaApi = {
        readable: [],
        editable: [],
        creatable: [],
        create_mandatory: [],
        references: []
    };

    (() => {
        for (var x in sheet.fields) {
            if (sheet.fields.hasOwnProperty(x)) {
                var field = sheet.fields[x];

                if (field.readable) {
                    sheetMetaApi.readable.push(field.name);
                }
                if (field.editable) {
                    sheetMetaApi.editable.push(field.name);
                }
                if (field.creatable) {
                    sheetMetaApi.creatable.push(field.name);
                }
                if (field.create_mandatory) {
                    sheetMetaApi.create_mandatory.push(field.name);
                }
                if (field.valuetype === "adhocracy_core.schema.AbsolutePath") {
                    sheetMetaApi.references.push(field.name);
                }
            }
        }
    })();

    var mkConstructor = () => {
        var args : string[] = [];
        var lines : string[] = [];

        if (sheet.fields.length > 0) {
            args.push("args : {");
            args.push(mkFieldSignaturesSheetCons(sheet.fields, "        ", ";\n") + ";");
            args.push("    }");

            for (var x in sheet.fields) {
                if (sheet.fields.hasOwnProperty(x)) {
                    var codeLine : string;
                    var fieldName : string = sheet.fields[x].name;
                    var fieldParser : string = mkFieldType(sheet.fields[x]).parser;

                    if (fieldParser) {
                        codeLine = "this." + fieldName + " = (" + fieldParser + ")(args." + fieldName + ");";
                    } else {
                        codeLine = "this." + fieldName + " = args." + fieldName + ";";
                    }

                    if (!isWriteableField(sheet.fields[x])) {
                        codeLine = "if (args.hasOwnProperty(\"" + fieldName + "\")) { " + codeLine + "}";
                    }

                    lines.push("        " + codeLine);
                }
            }
        }

        var s = "";
        s += "    constructor(" + args.join("\n") + ") {\n";
        s += "        super();\n";
        if (lines.length > 0) {
            s += lines.join("\n") + "\n";
        }

        // FIXME: workaround for #261.  Remove if ticket is closed.
        if (sheet.fields.length > 0) {
            s += "\n";
            s += "        // FIXME: workaround for #261.  Remove if ticket is closed.\n";
            s += "        _.forOwn(args, (value, key) => {\n";
            s += "            if (!_.contains(" + JSON.stringify(sheet.fields.map((fieldName) => fieldName.name)) + ", key)) {\n";
            s += "                this[key] = value;\n";
            s += "            }\n";
            s += "        });\n";
        }

        s += "    }\n";
        return s;
    };

    var showList = (elems : string[]) : string => {
        if (elems.length === 0) {
            return "[]";
        } else {
            return "[\"" + elems.join("\", \"") + "\"]";
        }
    };

    sheetI += "export var nick : string = \"" + sheet.nick + "\";\n\n";

    sheetI += "export class Sheet extends Base.Sheet {\n";

    sheetI += "    public static _meta : Base.ISheetMetaApi = {\n";
    sheetI += "        readable: " + showList(sheetMetaApi.readable) + ",\n";
    sheetI += "        editable: " + showList(sheetMetaApi.editable) + ",\n";
    sheetI += "        creatable: " + showList(sheetMetaApi.creatable) + ",\n";
    sheetI += "        create_mandatory: " + showList(sheetMetaApi.create_mandatory) + ",\n";
    sheetI += "        references: " + showList(sheetMetaApi.references) + "\n";
    sheetI += "    };\n\n";

    sheetI += mkConstructor() + "\n";
    sheetI += mkFieldSignatures(sheet.fields, "    public ", ";\n") + "\n";
    sheetI += "}\n\n";

    sheetI += "export interface HasSheet {\n";
    sheetI += "    data : { \"" + modulePath + "\": Sheet }\n";
    sheetI += "}\n\n";

    hasSheetI += mkSheetSetter(sheet.nick, sheet.fields, "HasSheet");
    hasSheetI += mkSheetGetter(sheet.nick, "HasSheet");

    modules[modulePath] = sheetI + hasSheetI;
};

mkFieldSignatures = (fields : MetaApi.ISheetField[], tab : string, separator : string) : string =>
    UtilR.mkThingList(
        fields,
        (field) => field.name + " : " + mkFieldType(field).resultType,
        tab, separator
    );

mkFieldSignaturesSheetCons = (fields : MetaApi.ISheetField[], tab : string, separator : string) : string =>
    UtilR.mkThingList(
        fields,
        (field) => field.name + (isWriteableField(field) ? "" : "?") + " : " + mkFieldType(field).constructorType,
        tab, separator
    );

mkFieldAssignments = (fields : MetaApi.ISheetField[], tab : string) : string => {
    if (fields.length === 0) {
        return "";
    } else {
        return UtilR.mkThingList(
            fields,
            (field) => field.name + ": " + field.name,
            tab, ",\n"
        );
    }
};

enabledFields = (fields : MetaApi.ISheetField[], enableFlags ?: string) : MetaApi.ISheetField[] => {
    if (typeof enableFlags !== "string") {
        // if `flags` is not set, enable all fields
        return fields;
    } else {
        // if it is set, only enable those that have a least one flag
        // listed.  example: if a field has flags "ECM", and
        // `enabledFlags` is "CR", the field is enabled because it has
        // "C".
        var enabledFields = [];
        fields.map((field) => {
            if (mkFlags(field).match(new RegExp("[" + enableFlags + "]"))) {
                enabledFields.push(field);
            }
        });
        return enabledFields;
    }
};

mkSheetSetter = (nick : string, fields : MetaApi.ISheetField[], _selfType : string) : string => {
    if (config.sheetSetters) {
        var ef = enabledFields(fields, "ECM");

        if (!ef.length) {
            return "";
        } else {
            var os = [];
            os.push("export var _set = (");
            os.push("    _self : " + _selfType + ",");
            os.push(mkFieldSignatures(ef, "    ", ",\n"));
            os.push(") : " + _selfType + " => {");
            os.push("    _self.data[\"" + nick + "\"] = {");
            // set writeable fields to corresponding setter argument
            os.push(mkFieldAssignments(ef, "        ") + ",");
            // set hidden fields to null (or we will get type errors)
            (() => {
                var disabledFields = [];
                fields.map((field) => {
                    if (ef.indexOf(field) === -1) {
                        disabledFields.push(field);
                    }
                });
                os.push(UtilR.mkThingList(disabledFields, (field) => field.name + ": null", "        ", ",\n"));
            })();
            os.push("    };");
            os.push("    return _self;");
            os.push("};\n");
            return os.join("\n");
        }
    } else {
        return "";
    }
};

mkSheetGetter = (nick : string, _selfType : string) : string => {
    if (config.sheetGetters) {
        var os = [];
        os.push("export var _get = (");
        os.push("    _self : " + _selfType);
        os.push(") : Sheet => {");
        os.push("    return _self.data[\"" + nick + "\"];");
        os.push("};\n");
        return os.join("\n");
    } else {
        return "";
    }
};

renderResource = (modulePath : string, resource : MetaApi.IResource, modules : MetaApi.IModuleDict, metaApi : MetaApi.IMetaApi) : void => {
    var resourceC : string = "";

    // imports
    var relativeRoot = mkRelativeRoot(pyModuleToTsModule(modulePath));
    for (var x in resource.sheets) {
        if (resource.sheets.hasOwnProperty(x)) {
            var name = resource.sheets[x];
            resourceC += mkImportStatement(name, relativeRoot, metaApi);
        }
    }
    resourceC += "\n";

    var mkConstructor = (tab : string) => {
        var os : string[] = [];

        // we use reqArgs, optArgs, and lines to group semantically
        // close constructor arguments and code lines.
        //
        // `{ [key : string] : string }` cannot be used with object
        // attribute syntax, so we type the args dictionaries as
        // `any`.
        var reqArgs : any = {};
        var optArgs : any = {};
        var lines : string[] = [];

        reqArgs.preliminaryNames = "PreliminaryNames.Service";

        // resource path is either optional arg or (if n/a)
        // preliminary name.
        optArgs.path = "string";
        lines.push("    if (args.hasOwnProperty(\"path\")) {");
        lines.push("        _self.path = args.path;");
        lines.push("    } else {");
        lines.push("        _self.path = args.preliminaryNames.nextPreliminary();");
        lines.push("    }");

        // first_version_path is set to a preliminary name iff
        // IVersions sheet is present.
        if (resource.sheets.indexOf("adhocracy_core.sheets.versions.IVersions") !== -1) {
            lines.push("    _self.first_version_path = args.preliminaryNames.nextPreliminary();");
        } else {
            lines.push("    _self.first_version_path = undefined;");
        }

        // root_versions is empty.
        lines.push("    _self.root_versions = [];");

        // if IName sheet is present, allow to set name in
        // constructor (optional arg).
        if (resource.sheets.indexOf("adhocracy_core.sheets.name.IName") !== -1) {
            optArgs.name = "string";
            lines.push("    if (args.hasOwnProperty(\"name\")) {");
            lines.push("        _self.data[\"adhocracy_core.sheets.name.IName\"] =");
            lines.push("            new " + mkModuleName("adhocracy_core.sheets.name.IName", metaApi) + ".Sheet" +
                       "({ name : args.name })");
            lines.push("    }");
        }

        // construct optargs
        var args : string[] = [];
        (() => {
            var x;
            for (x in reqArgs) {
                if (reqArgs.hasOwnProperty(x)) {
                    args.push(x + " : " + reqArgs[x]);
                }
            }
            for (x in optArgs) {
                if (optArgs.hasOwnProperty(x)) {
                    args.push(x + " ?: " + optArgs[x]);
                }
            }
        })();

        // construct constructor function code.
        os.push("constructor(args : { " + args.join("; ") + " }) {");
        os.push("    super(\"" + modulePath + "\");");
        os.push("    var _self = this;");
        lines.forEach((line) => os.push(line));
        os.push("}");

        return os.map((s) => tab + s).join("\n");
    };

    var mkDataDeclaration = (tab : string) : string => {
        var os : string[] = [];

        os.push("public data: {");
        for (var x in resource.sheets) {
            if (resource.sheets.hasOwnProperty(x)) {
                var name = resource.sheets[x];
                os.push("    \"" + name + "\" : " + mkModuleName(name, metaApi) + ".Sheet;");
            }
        }
        os.push("};");

        return os.map((s) => tab + s).join("\n");
    };

    var mkGettersSetters = (tab : string) : string => {
        var os : string[] = [];

        for (var x in resource.sheets) {
            if (resource.sheets.hasOwnProperty(x)) {
                var name = resource.sheets[x];
                if (config.sheetGetters) {
                    os.push("public get" + mkSheetName(mkNick(name, metaApi)) + "() {");
                    os.push("    return " + mkModuleName(name, metaApi) + "." + "_get(this);");
                    os.push("}");
                }

                if (config.sheetSetters) {
                    var ef = enabledFields(metaApi.sheets[name].fields, "ECM");
                    if (ef.length) {
                        os.push("public set" + mkSheetName(mkNick(name, metaApi)) + "(");
                        os.push(mkFieldSignatures(ef, "    ", ",\n"));
                        os.push(") {");
                        os.push("    var _self = this;\n");
                        os.push("    " + mkModuleName(name, metaApi) + "." + "_set(this,");
                        os.push(UtilR.mkThingList(ef, (field) => field.name, "        ", ",\n    "));
                        os.push("    );");
                        os.push("    return _self;");
                        os.push("}");
                    }
                }
            }
        }
        return os.map((s) => tab + s).join("\n") + "";
    };

    resourceC += "class " + mkResourceClassName(mkNick(modulePath, metaApi)) + " extends Base.Resource {\n";
    resourceC += "    public static content_type = \"" + modulePath + "\";\n\n";
    resourceC += mkConstructor("    ") + "\n\n";
    resourceC += mkDataDeclaration("    ") + "\n\n";
    resourceC += mkGettersSetters("    ") + "\n";
    resourceC += "}\n\n";
    resourceC += "export = " + mkResourceClassName(mkNick(modulePath, metaApi)) + ";\n\n";

    modules[modulePath] = resourceC;
};

mkSheetName = (name : string) : string =>
    UtilR.capitalizeHead(UtilR.dotAndUnderscoreToCaml(name));

mkHasSheetName = (name : string) : string =>
    "HasSheet" + UtilR.capitalizeHead(UtilR.dotAndUnderscoreToCaml(name));

mkResourceClassName = (name : string) : string =>
    UtilR.capitalizeHead(UtilR.dotAndUnderscoreToCaml(name));

mkModuleName = (modulePath : string, metaApi : MetaApi.IMetaApi) : string => {
    if (metaApi.sheets.hasOwnProperty(modulePath)) {
        return "S" + UtilR.capitalizeHead(UtilR.dotAndUnderscoreToCaml(metaApi.sheets[modulePath].nick));
    } else if (metaApi.resources.hasOwnProperty(modulePath)) {
        return "R" + UtilR.capitalizeHead(UtilR.dotAndUnderscoreToCaml(metaApi.resources[modulePath].nick));
    } else {
        throw "mkNick: " + modulePath;
    }

};

mkImportStatement = (modulePath : string, relativeRoot : string, metaApi : MetaApi.IMetaApi) : string => {
    var tsModName = mkModuleName(modulePath, metaApi);
    var tsModPath = pyModuleToTsModule(modulePath);
    var tsModPathCanonicalized = canonicalizePath(relativeRoot + tsModPath);
    return "import " + tsModName + " = require(\"" + tsModPathCanonicalized + "\");\n";
};

mkNick = (modulePath : string, metaApi : MetaApi.IMetaApi) : string => {
    if (metaApi.sheets.hasOwnProperty(modulePath)) {
        return metaApi.sheets[modulePath].nick;
    } else if (metaApi.resources.hasOwnProperty(modulePath)) {
        return metaApi.resources[modulePath].nick;
    } else {
        throw "mkNick: " + modulePath;
    }
};

mkFieldType = (field : MetaApi.ISheetField) : FieldType => {
    var resultType : string;
    var constructorType : string = "string";
    var parser : string;

    // parse dates
    var stringToDate : string = "(field : string) => new Date(field)";

    // let javascript's weak-dynamic type system figure it out.
    var stringToAny : string = "(field : string) => <any>field";

    switch (field.valuetype) {
    case "adhocracy_core.schema.Boolean":
        resultType = "string";
        break;
    case "adhocracy_core.schema.AbsolutePath":
        resultType = "string";
        break;
    case "adhocracy_core.schema.Name":
        resultType = "string";
        break;
    case "adhocracy_core.schema.SingleLine":
        resultType = "string";
        break;
    case "adhocracy_core.schema.Text":
        resultType = "string";
        break;
    case "adhocracy_core.schema.Email":
        resultType = "string";
        break;
    case "adhocracy_core.schema.Password":
        resultType = "string";
        break;
    case "adhocracy_core.schema.DateTime":
        resultType = "Date";
        parser = stringToDate;
        break;
    case "adhocracy_core.schema.URL":
        resultType = "string";
        break;
    case "Integer":
        resultType = "number";
        parser = stringToAny;
        break;
    case "adhocracy_core.schema.Integer":
        resultType = "number";
        parser = stringToAny;
        break;
    case "adhocracy_core.schema.Rate":
        resultType = "number";
        parser = stringToAny;
        break;
    case "adhocracy_core.schema.TimeZoneName":
        resultType = "string";
        break;
    case "adhocracy_core.schema.Reference":
        resultType = "string";
        break;
    case "adhocracy_core.schema.PostPool":
        resultType = "string";
        break;
    case "adhocracy_core.schema.Role":
        resultType = "string";
        break;
    case "adhocracy_core.schema.CurrencyAmount":
        resultType = "string";
        break;
    case "adhocracy_core.schema.ISOCountryCode":
        resultType = "number";
        parser = stringToAny;
        break;
    case "adhocracy_mercator.sheets.mercator.StatusEnum":  // FIXME: this needs to go to the mercator package
        resultType = "string";
        break;
    case "adhocracy_mercator.sheets.mercator.SizeEnum":  // FIXME: this needs to go to the mercator package
        resultType = "string";
        break;
    default:
        throw "mkFieldType: unknown value " + field.valuetype;
    }

    if (field.hasOwnProperty("containertype")) {
        switch (field.containertype) {
        case "list":
            resultType += "[]";
            constructorType += "[]";
            if (parser) {
                throw "not implemented: parsers for list fields.  email mf@zerobuzz.net to fix this.";

                // FIXME: (this can be done.  we need to take the
                // parser string and construct a string that maps the
                // parser over a list.  it's just awkward, and we
                // don't need it yet.)
            }
            break;
        default:
            throw "mkFieldType: unknown container " + field.containertype;
        }
    }

    resultType += mkFlags(field, true);

    return {
        resultType: resultType,
        constructorType: constructorType,
        parser: parser
    };
};

mkFlags = (field : MetaApi.ISheetField, comment ?: boolean) : string => {
    var flags : string = "";

    if (field.hasOwnProperty("readable") && field.readable) {
        flags += "R";
    }
    if (field.hasOwnProperty("editable") && field.editable) {
        flags += "E";
    }
    if (field.hasOwnProperty("creatable") && field.creatable) {
        flags += "C";
    }
    if (field.hasOwnProperty("create_mandatory") && field.create_mandatory) {
        flags += "M";
    }

    var result : string;
    if (comment) {
        result = "/* " + field.valuetype;
        if (field.containertype) {
            result += " [" + field.containertype + "]";
        }
        if (flags !== "") {
            result += " " + flags;
        }
        result += " */";
    }

    return result;
};

isReadableField = (field) => field.readable;

isWriteableField = (field) => field.editable || field.creatable || field.create_mandatory;



/***********************************************************************
 * more general-purpose code
 */

mkdirForFile = (filepath : string) : void => {
    var dirpath : string[] = _s.words(filepath, "/");
    dirpath.pop();
    _fs.mkdirSync(dirpath.join("/"), 0755, true);
};

pyModuleToTsModule = (filepath : string) : string =>
    "./" + _s.words(filepath, "\.").join("/");

/**
 * The `relativeRoot` always points from file containing contents to
 * `.../Resources_/`.  The trailing `/` is important!
 */
mkRelativeRoot = (source : string) : string => {
    var arr = _s.words(source, "/");
    arr.pop();  // don't count leading `.`.
    arr.pop();  // just count directories, not the file name.
    return arr.map(() => "..").join("/") + "/";
};

canonicalizePath = (filepath : string) : string => {
    return filepath
        .replace(/([^\.])\.\//g, "$1")
        .replace(/(\/)[^\/\.]+\/\.\.\//g, "$1");
};
