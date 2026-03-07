.PHONY: start stop logs status restart doctor chat ask channels

EXEC := docker compose exec openclaw npx openclaw

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
	docker compose exec -it openclaw npx openclaw tui

ask:
	$(EXEC) agent --agent default -m "$(MSG)"

channels:
	$(EXEC) channels status
