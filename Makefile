# Requires Node.js 26 and the pnpm version pinned in package.json.
SHELL = /bin/sh

.PHONY: help init dev dev-cloudflare preview-cloudflare check build test docker-up docker-down docker-logs
help: ## show commands
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_\-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

init: ## install dependencies and initialize the database
	pnpm install --frozen-lockfile
	pnpm migrate

dev: ## start API, dump and frontend watchers
	pnpm dev

dev-cloudflare: ## start local Workers, D1 and frontend hot reload
	pnpm cloudflare:dev

preview-cloudflare: ## preview the built frontend on local Workers and D1
	pnpm cloudflare:preview

check: ## lint, format-check and type-check
	pnpm lint
	pnpm format:check
	pnpm check

build: ## build all production outputs
	pnpm build

test: ## build and run isolated tests
	pnpm test

docker-up: ## start the container
	docker compose up -d --build --remove-orphans

docker-down: ## stop the container
	docker compose down

docker-logs: ## follow container logs
	docker compose logs -f
