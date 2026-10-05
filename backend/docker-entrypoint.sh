#!/bin/sh
set -e
mkdir -p /app/data/dem
if [ ! -s /app/data/talus.db ]; then
  cp /seed/talus.db /app/data/talus.db
fi
node /app/scripts/downloadDem.mjs &
exec node /app/dist/index.js
