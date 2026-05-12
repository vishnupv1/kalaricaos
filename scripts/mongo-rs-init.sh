#!/usr/bin/env sh
# Idempotent: init replica set rs0 for docker-compose mongo (member = container hostname).
set -e
CONTAINER="${MONGO_CONTAINER:-kalarica-mongo}"
docker exec "$CONTAINER" mongosh --quiet --eval '
  try {
    const s = rs.status();
    if (s.ok) { print("Replica set already initialized."); quit(0); }
  } catch (e) {}
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "'"$CONTAINER"':27017" }] });
  print("Replica set rs0 initialized.");
'
