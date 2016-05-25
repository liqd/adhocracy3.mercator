#!/usr/bin/env bash
./bin/import_resources etc/test.ini src/adhocracy_mercator/adhocracy_mercator/workflows/test_mercator2/resources.json
./bin/set_workflow_state etc/test.ini /organisation/advocate-europe2 announce participate
