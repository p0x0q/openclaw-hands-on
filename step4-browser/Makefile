.PHONY: start stop logs status restart doctor chat ask channels

CONTAINER := openclaw-server
EXEC := docker exec $(CONTAINER) npx openclaw

# =============================================================================
# Core
# =============================================================================

start:
	docker compose up

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
