#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup-slack.sh <bot-token> <app-token>
#
# bot-token: xoxb-... (Bot User OAuth Token)
# app-token: xapp-... (App-Level Token with connections:write scope)
#
# Example:
#   ./scripts/setup-slack.sh "xoxb-xxx" "xapp-xxx"

CONTAINER="openclaw-server"
EXEC="docker exec ${CONTAINER} npx openclaw"

BOT_TOKEN="${1:?Usage: $0 <bot-token> <app-token>}"
APP_TOKEN="${2:?Usage: $0 <bot-token> <app-token>}"

echo "==> Configuring Slack channel..."
${EXEC} channels add --channel slack --bot-token "${BOT_TOKEN}" --app-token "${APP_TOKEN}"

echo "==> Restarting gateway..."
docker restart "${CONTAINER}"

echo "==> Slack setup complete. Waiting for gateway..."
sleep 5
${EXEC} channels status
