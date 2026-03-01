.PHONY: deploy stop logs status restart doctor chat ask
.PHONY: setup-slack channels

CONTAINER := openclaw-server
EXEC := docker exec $(CONTAINER) npx openclaw

# =============================================================================
# Core
# =============================================================================

deploy:
	docker compose down
	docker compose up -d

stop:
	docker compose stop

logs:
	docker compose logs -f openclaw

status:
	docker compose ps

restart:
	docker compose restart openclaw

# =============================================================================
# OpenClaw CLI
# =============================================================================

doctor:
	$(EXEC) doctor

chat:
	docker exec -it $(CONTAINER) npx openclaw tui

ask:
	$(EXEC) agent --agent default -m "$(MSG)"

channels:
	$(EXEC) channels status

# =============================================================================
# Slack Setup
# =============================================================================

# Usage: make setup-slack BOT_TOKEN=xoxb-xxx APP_TOKEN=xapp-xxx
setup-slack:
	@./scripts/setup-slack.sh "$(BOT_TOKEN)" "$(APP_TOKEN)"
