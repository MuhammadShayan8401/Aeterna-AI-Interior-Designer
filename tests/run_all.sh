#!/usr/bin/env bash
# Runs unit tests, then starts a mock backend on :7861 and runs the live API tests against it.
set -e
cd "$(dirname "$0")/.."
python3 -m pytest tests/test_unit.py -q
DB=$(mktemp -d)/api.db
( cd space && AETERNA_MOCK=1 AETERNA_DB=$DB JWT_SECRET=test-secret-test-secret-test-secret-123 DAILY_LIMIT=20 PRO_DAILY_LIMIT=40 \
  REQUIRE_EMAIL_VERIFICATION=0 OWNER_KEY=owner-key-owner-key-owner-key-1 GRADIO_SERVER_PORT=7861 python3 app.py >"$DB.log" 2>&1 ) &
PID=$!; trap "kill $PID 2>/dev/null" EXIT
for i in $(seq 1 60); do curl -sf http://127.0.0.1:7861/ >/dev/null && break; sleep 1; done
SPACE=http://127.0.0.1:7861 python3 -m pytest tests/test_api.py -q
