#!/bin/sh
# Starts the evaluation worker and gunicorn side by side and stops both on SIGTERM.
set -u

PORT="${PORT:-10000}"

(
  # Run as a module from the backend directory so the backend's config package wins over
  # worker/config.py, which the legacy Lambda image still needs under that name.
  cd /app/backend
  # Restart the worker if it ever exits so a crash cannot silently stop evaluations.
  while true; do
    python -m evaluation_worker || echo "evaluation worker exited with status $?, restarting in 5s"
    sleep 5
  done
) &
SUPERVISOR=$!

# One process with threads keeps memory inside the 512 MB limit. The timeout is generous
# because the first request after a database suspend waits for Neon to resume.
gunicorn config.wsgi:application \
  --chdir /app/backend \
  --bind "0.0.0.0:${PORT}" \
  --workers 1 --threads 4 \
  --timeout 120 \
  --access-logfile - --error-logfile - &
GUNICORN=$!

stop() {
  kill -TERM "$GUNICORN" 2>/dev/null
  pkill -TERM -P "$SUPERVISOR" 2>/dev/null
  kill -TERM "$SUPERVISOR" 2>/dev/null
}
trap stop TERM INT

wait "$GUNICORN"
STATUS=$?
stop
exit "$STATUS"
