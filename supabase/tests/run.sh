#!/usr/bin/env bash
# Applies all migrations + seed to a throwaway local Postgres and runs the RLS tests.
# Usage: supabase/tests/run.sh   (needs local postgres binaries; PGPORT optional)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGDATA="${PGDATA_DIR:-/tmp/cc-pg}"
PORT="${PGPORT:-55432}"
BIN="$(ls -d /usr/lib/postgresql/*/bin | tail -1)"
rm -rf "$PGDATA"; mkdir -p "$PGDATA"; chown postgres "$PGDATA" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $PGDATA -U postgres -A trust >/dev/null"
run "$BIN/pg_ctl -D $PGDATA -o '-p $PORT -k /tmp' -l $PGDATA/log start -w >/dev/null"
trap 'run "$BIN/pg_ctl -D $PGDATA stop -m fast >/dev/null"' EXIT
P="psql -h /tmp -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$P -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "migrate: $(basename "$f")"; $P -f "$f"; done
if [ -f "$ROOT/supabase/seed.sql" ]; then echo "seed"; $P -f "$ROOT/supabase/seed.sql"; fi
for f in "$ROOT"/supabase/tests/[1-9]*.sql; do echo "test: $(basename "$f")"; $P -f "$f"; done
echo "ALL DATABASE TESTS PASSED"
