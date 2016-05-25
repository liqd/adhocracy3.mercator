#!/usr/bin/env bash
./bin/import_resources etc/test.ini  src/adhocracy_meinberlin/adhocracy_meinberlin/scripts/sample_bplan.json
./bin/set_workflow_state etc/test.ini /organisation/bplan20 announce participate
