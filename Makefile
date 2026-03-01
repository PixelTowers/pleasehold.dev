# ABOUTME: Dev automation and Infisical secret management for pleasehold.
# ABOUTME: Provides make targets for dev workflow, Docker, database, and optional Infisical integration.

PACKAGE_MANAGER := pnpm
INFISICAL_DOMAIN := https://secrets.pixeltowers.io
INFISICAL_PATH := /

.DEFAULT_GOAL := help

# ============================================================
#  Help
# ============================================================

.PHONY: help
help: ## Show available targets
	@echo ""
	@echo "pleasehold - Development Targets"
	@echo "================================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================
#  Development
# ============================================================

.PHONY: install
install: ## Install dependencies
	$(PACKAGE_MANAGER) install

.PHONY: setup
setup: install infisical-check db-setup ## Full project setup (install + infisical check + db)

.PHONY: dev
dev: ## Start dev with Infisical secrets
	infisical run \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN) \
		-- $(PACKAGE_MANAGER) dev

.PHONY: dev-no-secrets
dev-no-secrets: ## Start dev with .env file (self-hoster path)
	$(PACKAGE_MANAGER) dev

.PHONY: dev-api
dev-api: ## Start only API with Infisical secrets
	infisical run \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN) \
		-- $(PACKAGE_MANAGER) turbo dev --filter=@pleasehold/api

.PHONY: dev-web
dev-web: ## Start only web dashboard with Infisical secrets
	infisical run \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN) \
		-- $(PACKAGE_MANAGER) turbo dev --filter=@pleasehold/web

.PHONY: dev-worker
dev-worker: ## Start only worker with Infisical secrets
	infisical run \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN) \
		-- $(PACKAGE_MANAGER) turbo dev --filter=@pleasehold/worker

# ============================================================
#  Database
# ============================================================

.PHONY: db-up
db-up: ## Start dev database (PostgreSQL + Redis + MinIO)
	docker compose -f docker-compose.dev.yml up -d

.PHONY: db-down
db-down: ## Stop dev database
	docker compose -f docker-compose.dev.yml down

.PHONY: db-migrate
db-migrate: ## Run database migrations
	$(PACKAGE_MANAGER) db:migrate

.PHONY: db-generate
db-generate: ## Generate migration files from schema changes
	$(PACKAGE_MANAGER) db:generate

.PHONY: db-studio
db-studio: ## Open Drizzle Studio
	$(PACKAGE_MANAGER) db:studio

.PHONY: db-setup
db-setup: db-up db-migrate ## Start database and run migrations

# ============================================================
#  Quality
# ============================================================

.PHONY: lint
lint: ## Run linting and formatting checks
	$(PACKAGE_MANAGER) lint

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	$(PACKAGE_MANAGER) typecheck

.PHONY: test
test: ## Run tests
	$(PACKAGE_MANAGER) test

.PHONY: build
build: ## Build all packages and apps
	$(PACKAGE_MANAGER) build

# ============================================================
#  Docker (Production)
# ============================================================

.PHONY: docker-build
docker-build: ## Build all Docker images
	docker compose build

.PHONY: docker-up
docker-up: ## Start production stack
	docker compose up -d

.PHONY: docker-down
docker-down: ## Stop production stack
	docker compose down

.PHONY: docker-logs
docker-logs: ## Tail production logs
	docker compose logs -f

# ============================================================
#  Infisical
# ============================================================

.PHONY: infisical-login
infisical-login: ## Log in to Infisical
	infisical login --domain=$(INFISICAL_DOMAIN)

.PHONY: infisical-init
infisical-init: ## Initialize Infisical workspace (creates .infisical.json)
	infisical init --domain=$(INFISICAL_DOMAIN)

.PHONY: infisical-check
infisical-check: ## Verify Infisical CLI is installed and workspace is configured
	@if ! command -v infisical >/dev/null 2>&1; then \
		echo "Warning: infisical CLI not found."; \
		echo "Install: https://infisical.com/docs/cli/overview"; \
		echo "Or use 'make dev-no-secrets' to run with .env file."; \
	elif [ ! -f .infisical.json ]; then \
		echo "Warning: .infisical.json not found. Run 'make infisical-init'."; \
	elif [ "$$(grep -o '"workspaceId":\s*"[^"]*"' .infisical.json | cut -d'"' -f4)" = "CHANGEME" ]; then \
		echo "Warning: workspaceId is still 'CHANGEME'. Run 'make infisical-init'."; \
	else \
		echo "Infisical: CLI installed, workspace configured."; \
	fi

.PHONY: infisical-secrets
infisical-secrets: ## View secrets for current environment
	infisical secrets \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN)

.PHONY: infisical-set
infisical-set: ## Set a secret (usage: make infisical-set KEY=name VALUE=value)
	@if [ -z "$(KEY)" ] || [ -z "$(VALUE)" ]; then \
		echo "Usage: make infisical-set KEY=name VALUE=value"; \
		exit 1; \
	fi
	infisical secrets set "$(KEY)=$(VALUE)" \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN)

.PHONY: infisical-get
infisical-get: ## Get a secret value (usage: make infisical-get KEY=name)
	@if [ -z "$(KEY)" ]; then \
		echo "Usage: make infisical-get KEY=name"; \
		exit 1; \
	fi
	infisical secrets get "$(KEY)" \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN)

.PHONY: infisical-delete
infisical-delete: ## Delete a secret (usage: make infisical-delete KEY=name)
	@if [ -z "$(KEY)" ]; then \
		echo "Usage: make infisical-delete KEY=name"; \
		exit 1; \
	fi
	infisical secrets delete "$(KEY)" \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN)

.PHONY: infisical-export
infisical-export: ## Export secrets to .env file
	infisical export \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN) \
		--format=dotenv > .env
	@echo "Secrets exported to .env"

.PHONY: infisical-run
infisical-run: ## Run command with secrets (usage: make infisical-run CMD="your command")
	@if [ -z "$(CMD)" ]; then \
		echo "Usage: make infisical-run CMD=\"your command\""; \
		exit 1; \
	fi
	infisical run \
		--env=dev \
		--path=$(INFISICAL_PATH) \
		--domain=$(INFISICAL_DOMAIN) \
		-- $(CMD)

.PHONY: infisical-setup
infisical-setup: ## Interactive secret population script
	bash scripts/setup-env.sh
