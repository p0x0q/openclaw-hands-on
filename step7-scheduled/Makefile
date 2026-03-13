.PHONY: start stop logs status restart doctor chat-general chat-expense ask-general ask-expense channels gws-version gws-sheet-read process-now

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

chat-general:
	docker compose exec -it openclaw npx openclaw tui --agent general

chat-expense:
	docker compose exec -it openclaw npx openclaw tui --agent expense

ask-general:
	$(EXEC) agent --agent general -m "$(MSG)"

ask-expense:
	$(EXEC) agent --agent expense -m "$(MSG)"

channels:
	$(EXEC) channels status

# =============================================================================
# Google Workspace CLI
# =============================================================================

gws-version:
	docker compose exec openclaw gws --version

gws-sheet-read:
	docker compose exec openclaw gws sheets +read --spreadsheet $(SHEET_ID) --range "Sheet1!A1:I100"

# =============================================================================
# Scheduled Processing
# =============================================================================

process-now:
	docker compose exec openclaw node /scripts/process-uploads.js
