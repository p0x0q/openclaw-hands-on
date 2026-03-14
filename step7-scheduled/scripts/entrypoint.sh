#!/bin/sh
set -e

# Install Google Workspace CLI into persistent volume (cached across restarts)
GWS_DIR="/home/node/.openclaw/gws-cli"
GWS_MARKER="${GWS_DIR}/.installed"

if [ ! -f "$GWS_MARKER" ]; then
  echo "[entrypoint] Installing Google Workspace CLI..."
  mkdir -p "$GWS_DIR"
  cd "$GWS_DIR"
  npm init -y
  npm install @googleworkspace/cli
  touch "$GWS_MARKER"
  chown -R 1000:1000 "$GWS_DIR"
  echo "[entrypoint] Google Workspace CLI installed."
else
  echo "[entrypoint] Google Workspace CLI already installed."
fi

# Create symlink for global access (needed after container recreation)
ln -sf "${GWS_DIR}/node_modules/.bin/gws" /usr/local/bin/gws

# Start scheduled action item scanner in background
INTERVAL="${SCAN_INTERVAL:-86400}"
if [ -n "$SCAN_CHANNELS" ]; then
  echo "[entrypoint] Starting action item scanner (interval: ${INTERVAL}s)..."
  (
    sleep 30  # Wait for OpenClaw to fully start
    while true; do
      echo "[scan] $(date -u '+%Y-%m-%dT%H:%M:%SZ') Running action item scan..."
      setpriv --reuid=1000 --regid=1000 --init-groups \
        node /scripts/scan-actions.js 2>&1 | sed 's/^/[scan] /'
      echo "[scan] Next scan in ${INTERVAL}s"
      sleep "$INTERVAL"
    done
  ) &
fi

# Drop privileges and start gateway
export HOME=/home/node
exec setpriv --reuid=1000 --regid=1000 --init-groups node /app/openclaw.mjs gateway --allow-unconfigured
