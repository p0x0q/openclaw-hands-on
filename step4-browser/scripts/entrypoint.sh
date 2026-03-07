#!/bin/sh
set -e

# Install Chromium system dependencies if missing (needed after container recreation)
if ! ldconfig -p 2>/dev/null | grep -q libnspr4; then
  echo "[entrypoint] Installing Chromium dependencies..."
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libxshmfence1 libx11-6 libx11-xcb1 libxcb1 libxext6 \
    libxfixes3 libxi6 libxtst6 fonts-liberation fonts-freefont-ttf \
    > /dev/null 2>&1
  apt-get clean
  rm -rf /var/lib/apt/lists/*
  echo "[entrypoint] Dependencies installed."
else
  echo "[entrypoint] Chromium dependencies present."
fi

# Create stable symlink for Chromium (version-independent path)
PW_PATH="/home/node/.openclaw/.cache/ms-playwright"
CHROME_BIN=$(ls ${PW_PATH}/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)
if [ -n "$CHROME_BIN" ] && [ ! -L "${PW_PATH}/chromium" ]; then
  ln -sfn "$(dirname "$CHROME_BIN")" "${PW_PATH}/chromium"
  chown -h node:node "${PW_PATH}/chromium"
fi

# Drop privileges and start gateway (exec replaces this process -> node is PID 1)
export HOME=/home/node
exec setpriv --reuid=1000 --regid=1000 --init-groups node /app/openclaw.mjs gateway --allow-unconfigured
