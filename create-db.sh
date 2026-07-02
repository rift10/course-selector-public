#!/bin/bash

set -euo pipefail

# if [[ ! -f "$DB_DIR/$DB_FILE" ]]; then
#     echo "did not find db, copying it now"
#! this is currently set up to fully wipe the db and remake it
    rm -f "$DB_DIR/$DB_FILE"
    sqlite3 "$DB_DIR/$DB_FILE" < dump.sql
# fi

node index.js