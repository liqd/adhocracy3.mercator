/**
 * The configuration is actually created by the server and provided
 * as a json file at `/config.json`.  It is then injected
 * as a service.
 *
 * This module only holds the interface for type-checking.
 */

export interface Type {
    rest_url : string;
    rest_platform_path : string;
    pkg_path : string;
    ws_url : string;
    embedded : boolean;
    trusted_domains : string[];
    locale : string;
}
