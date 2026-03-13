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

# Drop privileges and start gateway
export HOME=/home/node
exec setpriv --reuid=1000 --regid=1000 --init-groups node /app/openclaw.mjs gateway --allow-unconfigured
