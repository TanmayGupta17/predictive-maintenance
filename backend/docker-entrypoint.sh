#!/bin/sh
set -e

# Apply pending database migrations before starting the server. The backend
# waits on a healthy Postgres via docker-compose, so the DB is reachable here.
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting backend..."
exec node dist/server.js
