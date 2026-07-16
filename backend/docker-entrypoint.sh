#!/bin/sh
set -e

# Wait for the database to accept connections, then apply migrations. Managed /
# free-tier databases can take a while to become reachable after a deploy or
# restart, so retry rather than failing the whole deploy on a transient P1001.
echo "Running database migrations..."
attempt=1
max_attempts=12
until node node_modules/prisma/build/index.js migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database still unreachable after $max_attempts attempts; giving up."
    exit 1
  fi
  echo "Database not ready yet (attempt $attempt/$max_attempts) - retrying in 5s..."
  attempt=$((attempt + 1))
  sleep 5
done

echo "Starting backend..."
exec node dist/server.js
